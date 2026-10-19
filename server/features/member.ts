import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  challengeParticipation,
  facilities,
  facilityChallenges,
  facilityFavorites,
  facilityReviews,
  memberMilestones,
} from "../../drizzle/schema";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { dateSchema, publicFacility, publicReview, requireDb, ratingSchema } from "./shared";

const facilityIdInput = z.object({ facilityId: z.number().int().positive() });
const milestoneCreateInput = z.object({ title: z.string().trim().min(1).max(255), targetDate: dateSchema.optional() });
const milestoneUpdateInput = z.object({
  id: z.number().int().positive(),
  title: z.string().trim().min(1).max(255).optional(),
  targetDate: dateSchema.optional(),
  completed: z.boolean().optional(),
});
const reviewInput = facilityIdInput.extend({
  venueRating: ratingSchema,
  staffRating: ratingSchema,
  cleanlinessRating: ratingSchema,
  crowdingRating: ratingSchema,
  body: z.string().trim().min(1).max(5000),
});

function challengePublicRow(challenge: typeof facilityChallenges.$inferSelect) {
  return {
    id: challenge.id,
    facilityId: challenge.facilityId,
    title: challenge.title,
    description: challenge.description,
    startsAt: challenge.startsAt,
    endsAt: challenge.endsAt,
    targetCount: challenge.targetCount,
  };
}

export const memberRouter = router({
  dashboard: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    const [favorites, reviews, milestones, joined] = await Promise.all([
      db.select().from(facilityFavorites).where(eq(facilityFavorites.memberUserId, ctx.user.id)),
      db.select().from(facilityReviews).where(eq(facilityReviews.memberUserId, ctx.user.id)),
      db.select().from(memberMilestones).where(eq(memberMilestones.memberUserId, ctx.user.id)).orderBy(asc(memberMilestones.targetDate)),
      db
        .select({ participation: challengeParticipation, challenge: facilityChallenges, facility: facilities })
        .from(challengeParticipation)
        .innerJoin(facilityChallenges, eq(challengeParticipation.challengeId, facilityChallenges.id))
        .innerJoin(facilities, eq(facilityChallenges.facilityId, facilities.id))
        .where(eq(challengeParticipation.memberUserId, ctx.user.id))
        .orderBy(desc(challengeParticipation.joinedAt)),
    ]);
    const favoriteFacilities = favorites.length
      ? await db.select().from(facilities).where(and(eq(facilities.visibility, "published"), inArray(facilities.id, favorites.map(favorite => favorite.facilityId))))
      : [];
    const favoriteById = new Map(favoriteFacilities.map(facility => [facility.id, facility]));
    const reviewFacilities = reviews.length
      ? await db.select().from(facilities).where(inArray(facilities.id, reviews.map(review => review.facilityId)))
      : [];
    const reviewFacilityById = new Map(reviewFacilities.map(facility => [facility.id, facility]));
    return {
      favorites: favorites.flatMap(favorite => {
        const facility = favoriteById.get(favorite.facilityId);
        return facility ? [{ ...publicFacility(facility, { tasseiScore: null, reviewCount: 0 }), favoriteId: favorite.id }] : [];
      }),
      reviews: reviews.map(review => ({
        id: review.id,
        facilityId: review.facilityId,
        facilityName: reviewFacilityById.get(review.facilityId)?.name,
        rating: Math.round(((review.venueRating + review.staffRating + review.cleanlinessRating + review.crowdingRating) / 4) * 100) / 100,
        venueRating: review.venueRating,
        staffRating: review.staffRating,
        cleanlinessRating: review.cleanlinessRating,
        crowdingRating: review.crowdingRating,
        body: review.body,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
      })),
      milestones,
      joinedChallenges: joined.map(({ participation, challenge, facility }) => ({
        ...challengePublicRow(challenge),
        facilityName: facility.name,
        progress: participation.progress,
        completed: participation.progress >= challenge.targetCount,
        joinedAt: participation.joinedAt,
      })),
    };
  }),

  favorites: router({
    isSaved: protectedProcedure.input(facilityIdInput).query(async ({ ctx, input }) => {
      const db = await requireDb();
      const rows = await db
        .select({ id: facilityFavorites.id })
        .from(facilityFavorites)
        .where(and(eq(facilityFavorites.facilityId, input.facilityId), eq(facilityFavorites.memberUserId, ctx.user.id)))
        .limit(1);
      return Boolean(rows[0]);
    }),
    add: protectedProcedure.input(facilityIdInput).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const facility = await db.select().from(facilities).where(and(eq(facilities.id, input.facilityId), eq(facilities.visibility, "published"))).limit(1);
      if (!facility[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Published facility not found" });
      await db.insert(facilityFavorites).values({ facilityId: input.facilityId, memberUserId: ctx.user.id }).onDuplicateKeyUpdate({ set: { facilityId: input.facilityId } });
      return { success: true as const };
    }),
    remove: protectedProcedure.input(facilityIdInput).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      await db.delete(facilityFavorites).where(and(eq(facilityFavorites.facilityId, input.facilityId), eq(facilityFavorites.memberUserId, ctx.user.id)));
      return { success: true as const };
    }),
  }),

  reviews: router({
    myReview: protectedProcedure.input(facilityIdInput).query(async ({ ctx, input }) => {
      const db = await requireDb();
      const rows = await db
        .select({ review: facilityReviews })
        .from(facilityReviews)
        .innerJoin(facilities, eq(facilityReviews.facilityId, facilities.id))
        .where(
          and(
            eq(facilityReviews.facilityId, input.facilityId),
            eq(facilityReviews.memberUserId, ctx.user.id),
            eq(facilities.visibility, "published"),
          ),
        )
        .limit(1);
      return rows[0] ? publicReview(rows[0].review) : null;
    }),
    upsert: protectedProcedure.input(reviewInput).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const facility = await db.select().from(facilities).where(and(eq(facilities.id, input.facilityId), eq(facilities.visibility, "published"))).limit(1);
      if (!facility[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Published facility not found" });
      if (facility[0].ownerId === ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Facility owners cannot review their own listing" });
      }
      const values = {
        facilityId: input.facilityId,
        memberUserId: ctx.user.id,
        venueRating: input.venueRating,
        staffRating: input.staffRating,
        cleanlinessRating: input.cleanlinessRating,
        crowdingRating: input.crowdingRating,
        body: input.body,
      };
      await db.insert(facilityReviews).values(values).onDuplicateKeyUpdate({
        set: {
          venueRating: input.venueRating,
          staffRating: input.staffRating,
          cleanlinessRating: input.cleanlinessRating,
          crowdingRating: input.crowdingRating,
          body: input.body,
          updatedAt: new Date(),
        },
      });
      const rows = await db.select().from(facilityReviews).where(and(eq(facilityReviews.facilityId, input.facilityId), eq(facilityReviews.memberUserId, ctx.user.id))).limit(1);
      return rows[0] ?? null;
    }),
  }),

  milestones: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await requireDb();
      return db.select().from(memberMilestones).where(eq(memberMilestones.memberUserId, ctx.user.id)).orderBy(asc(memberMilestones.targetDate), desc(memberMilestones.createdAt));
    }),
    create: protectedProcedure.input(milestoneCreateInput).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const result = await db.insert(memberMilestones).values({ memberUserId: ctx.user.id, title: input.title, targetDate: input.targetDate });
      const rows = await db.select().from(memberMilestones).where(eq(memberMilestones.id, result[0].insertId)).limit(1);
      return rows[0];
    }),
    update: protectedProcedure.input(milestoneUpdateInput).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const existing = await db.select().from(memberMilestones).where(and(eq(memberMilestones.id, input.id), eq(memberMilestones.memberUserId, ctx.user.id))).limit(1);
      if (!existing[0]) return null;
      const updates: Partial<typeof memberMilestones.$inferInsert> = {};
      if (input.title !== undefined) updates.title = input.title;
      if (input.targetDate !== undefined) updates.targetDate = input.targetDate;
      if (input.completed !== undefined) updates.completed = input.completed;
      if (Object.keys(updates).length) await db.update(memberMilestones).set(updates).where(and(eq(memberMilestones.id, input.id), eq(memberMilestones.memberUserId, ctx.user.id)));
      const rows = await db.select().from(memberMilestones).where(and(eq(memberMilestones.id, input.id), eq(memberMilestones.memberUserId, ctx.user.id))).limit(1);
      return rows[0] ?? null;
    }),
    delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      await db.delete(memberMilestones).where(and(eq(memberMilestones.id, input.id), eq(memberMilestones.memberUserId, ctx.user.id)));
      return { success: true as const };
    }),
  }),

  challenges: router({
    list: publicProcedure.query(async () => {
      const db = await requireDb();
      const now = new Date();
      const rows = await db
        .select({ challenge: facilityChallenges, facility: facilities })
        .from(facilityChallenges)
        .innerJoin(facilities, eq(facilityChallenges.facilityId, facilities.id))
        .where(and(eq(facilities.visibility, "published"), lte(facilityChallenges.startsAt, now), gte(facilityChallenges.endsAt, now)))
        .orderBy(asc(facilityChallenges.endsAt));
      return rows.map(({ challenge, facility }) => ({ ...challengePublicRow(challenge), facilityName: facility.name, city: facility.city, area: facility.area }));
    }),
    join: protectedProcedure.input(z.object({ challengeId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const now = new Date();
      const rows = await db
        .select({ challenge: facilityChallenges, facility: facilities })
        .from(facilityChallenges)
        .innerJoin(facilities, eq(facilityChallenges.facilityId, facilities.id))
        .where(and(eq(facilityChallenges.id, input.challengeId), eq(facilities.visibility, "published"), lte(facilityChallenges.startsAt, now), gte(facilityChallenges.endsAt, now)))
        .limit(1);
      if (!rows[0]) return null;
      await db.insert(challengeParticipation).values({ challengeId: input.challengeId, memberUserId: ctx.user.id }).onDuplicateKeyUpdate({ set: { challengeId: input.challengeId } });
      const joined = await db.select().from(challengeParticipation).where(and(eq(challengeParticipation.challengeId, input.challengeId), eq(challengeParticipation.memberUserId, ctx.user.id))).limit(1);
      return joined[0] ?? null;
    }),
    updateProgress: protectedProcedure.input(z.object({ challengeId: z.number().int().positive(), progress: z.number().int().nonnegative() })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const now = new Date();
      const rows = await db
        .select({ challenge: facilityChallenges, facility: facilities })
        .from(facilityChallenges)
        .innerJoin(facilities, eq(facilityChallenges.facilityId, facilities.id))
        .where(and(eq(facilityChallenges.id, input.challengeId), eq(facilities.visibility, "published"), lte(facilityChallenges.startsAt, now), gte(facilityChallenges.endsAt, now)))
        .limit(1);
      if (!rows[0]) return null;
      const participation = await db.select().from(challengeParticipation).where(and(eq(challengeParticipation.challengeId, input.challengeId), eq(challengeParticipation.memberUserId, ctx.user.id))).limit(1);
      if (!participation[0]) return null;
      const progress = Math.min(input.progress, rows[0].challenge.targetCount);
      await db.update(challengeParticipation).set({ progress, updatedAt: new Date() }).where(and(eq(challengeParticipation.challengeId, input.challengeId), eq(challengeParticipation.memberUserId, ctx.user.id)));
      const updated = await db.select().from(challengeParticipation).where(and(eq(challengeParticipation.challengeId, input.challengeId), eq(challengeParticipation.memberUserId, ctx.user.id))).limit(1);
      return updated[0] ?? null;
    }),
  }),
});
