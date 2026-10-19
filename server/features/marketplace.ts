import { and, eq, gte, inArray, like, lte, or } from "drizzle-orm";
import { z } from "zod";
import { facilities, facilityReviews } from "../../drizzle/schema";
import { publicProcedure, router } from "../_core/trpc";
import {
  coordinateSchema,
  haversineDistanceKm,
  publicFacility,
  publicReview,
  requireDb,
  summarizeReviews,
} from "./shared";

const searchInput = z.object({
  q: z.string().trim().min(1).max(128).optional(),
  category: z.enum(["gym", "yoga", "pool", "wellness"]).optional(),
  city: z.string().trim().min(1).max(128).optional(),
  minFee: z.number().finite().nonnegative().optional(),
  maxFee: z.number().finite().nonnegative().optional(),
  currencyCode: z.string().trim().regex(/^[A-Za-z]{3}$/).toUpperCase().optional(),
  near: z
    .object({
      latitude: coordinateSchema.refine(value => value >= -90 && value <= 90, "Latitude must be between -90 and 90"),
      longitude: coordinateSchema.refine(value => value >= -180 && value <= 180, "Longitude must be between -180 and 180"),
    })
    .optional(),
}).superRefine((value, ctx) => {
  if ((value.minFee !== undefined || value.maxFee !== undefined) && !value.currencyCode) {
    ctx.addIssue({ code: "custom", path: ["currencyCode"], message: "A 3-letter currency code is required to filter by fee" });
  }
  if (value.minFee !== undefined && value.maxFee !== undefined && value.minFee > value.maxFee) {
    ctx.addIssue({ code: "custom", path: ["maxFee"], message: "Maximum fee must be at least minimum fee" });
  }
});

async function reviewsForFacilities(db: Awaited<ReturnType<typeof requireDb>>, ids: number[]) {
  if (ids.length === 0) return [];
  return db
    .select()
    .from(facilityReviews)
    .where(inArray(facilityReviews.facilityId, ids));
}

export const marketplaceRouter = router({
  search: publicProcedure.input(searchInput).query(async ({ input }) => {
    const db = await requireDb();
    const filters = [eq(facilities.visibility, "published")];
    if (input.q) {
      const pattern = `%${input.q}%`;
      filters.push(or(like(facilities.name, pattern), like(facilities.city, pattern), like(facilities.area, pattern))!);
    }
    if (input.category) filters.push(eq(facilities.category, input.category));
    if (input.city) filters.push(like(facilities.city, `%${input.city}%`));
    if (input.currencyCode) filters.push(eq(facilities.currencyCode, input.currencyCode));
    if (input.minFee !== undefined) filters.push(gte(facilities.feeMax, input.minFee));
    if (input.maxFee !== undefined) filters.push(lte(facilities.feeMin, input.maxFee));

    // The server always applies the published predicate and hard result cap.
    const rows = await db.select().from(facilities).where(and(...filters)).limit(50);
    const reviews = await reviewsForFacilities(db, rows.map(row => row.id));
    const byFacility = new Map<number, typeof reviews>();
    for (const review of reviews) {
      const current = byFacility.get(review.facilityId) ?? [];
      current.push(review);
      byFacility.set(review.facilityId, current);
    }

    const results = rows.map(facility => {
      const summary = summarizeReviews(byFacility.get(facility.id) ?? []);
      const result = { ...publicFacility(facility, summary) } as ReturnType<typeof publicFacility> & { distanceKm?: number };
      if (
        input.near &&
        facility.latitude !== null &&
        facility.latitude !== undefined &&
        facility.longitude !== null &&
        facility.longitude !== undefined
      ) {
        result.distanceKm = Math.round(haversineDistanceKm(input.near.latitude, input.near.longitude, facility.latitude, facility.longitude) * 100) / 100;
      }
      return result;
    });
    if (input.near) results.sort((a, b) => (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY));
    return results;
  }),

  getById: publicProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
    const db = await requireDb();
    const rows = await db
      .select()
      .from(facilities)
      .where(and(eq(facilities.id, input.id), eq(facilities.visibility, "published")))
      .limit(1);
    const facility = rows[0];
    if (!facility) return null;
    const reviews = await db
      .select()
      .from(facilityReviews)
      .where(eq(facilityReviews.facilityId, facility.id));
    return {
      facility: publicFacility(facility, summarizeReviews(reviews)),
      reviews: reviews.map(review => ({
        ...publicReview(review),
        rating: Math.round(((review.venueRating + review.staffRating + review.cleanlinessRating + review.crowdingRating) / 4) * 100) / 100,
        date: review.createdAt,
        memberLabel: null,
      })),
    };
  }),
});
