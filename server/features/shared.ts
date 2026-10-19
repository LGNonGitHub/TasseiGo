import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import { facilities, facilityReviews } from "../../drizzle/schema";

export const categorySchema = z.enum(["gym", "yoga", "pool", "wellness"]);
export const statusSchema = z.enum(["active", "expired", "paused", "cancelled"]);
export const ratingSchema = z.number().int().min(1).max(5);
export const coordinateSchema = z.number().finite();
export const dateSchema = z.coerce.date();

export type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export async function requireDb(): Promise<Db> {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" });
  }
  return db;
}

export async function requireOwnedFacility(db: Db, facilityId: number, ownerId: number) {
  const rows = await db
    .select()
    .from(facilities)
    .where(and(eq(facilities.id, facilityId), eq(facilities.ownerId, ownerId)))
    .limit(1);
  if (!rows[0]) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Facility not found" });
  }
  return rows[0];
}

export function publicFacility(facility: typeof facilities.$inferSelect, summary: ReviewSummary) {
  return {
    id: facility.id,
    name: facility.name,
    category: facility.category,
    description: facility.description,
    city: facility.city,
    area: facility.area,
    address: facility.address,
    latitude: facility.latitude,
    longitude: facility.longitude,
    feeMin: facility.feeMin,
    feeMax: facility.feeMax,
    currencyCode: facility.currencyCode,
    tasseiScore: summary.tasseiScore,
    reviewCount: summary.reviewCount,
  };
}

export type ReviewRow = Pick<
  typeof facilityReviews.$inferSelect,
  "venueRating" | "staffRating" | "cleanlinessRating" | "crowdingRating"
>;

export type ReviewSummary = { tasseiScore: number | null; reviewCount: number };

export function summarizeReviews(rows: ReviewRow[]): ReviewSummary {
  if (rows.length === 0) return { tasseiScore: null, reviewCount: 0 };
  const total = rows.reduce(
    (sum, row) =>
      sum + row.venueRating + row.staffRating + row.cleanlinessRating + row.crowdingRating,
    0,
  );
  return { tasseiScore: Math.round((total / (rows.length * 4)) * 100) / 100, reviewCount: rows.length };
}

export function publicReview(review: typeof facilityReviews.$inferSelect) {
  return {
    id: review.id,
    facilityId: review.facilityId,
    venueRating: review.venueRating,
    staffRating: review.staffRating,
    cleanlinessRating: review.cleanlinessRating,
    crowdingRating: review.crowdingRating,
    body: review.body,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  };
}

export function haversineDistanceKm(
  latitude: number,
  longitude: number,
  targetLatitude: number,
  targetLongitude: number,
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(targetLatitude - latitude);
  const dLon = toRadians(targetLongitude - longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(latitude)) *
      Math.cos(toRadians(targetLatitude)) *
      Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
