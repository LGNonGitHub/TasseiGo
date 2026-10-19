import { and, asc, desc, eq, gte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  attendanceEntries,
  facilities,
  facilityChallenges,
  facilityMembers,
} from "../../drizzle/schema";
import { protectedProcedure, router } from "../_core/trpc";
import {
  categorySchema,
  coordinateSchema,
  dateSchema,
  requireDb,
  requireOwnedFacility,
  statusSchema,
} from "./shared";

const feeSchema = z.number().finite().nonnegative();
const optionalCoordinates = {
  latitude: coordinateSchema.refine(value => value >= -90 && value <= 90, "Latitude must be between -90 and 90").nullable().optional(),
  longitude: coordinateSchema.refine(value => value >= -180 && value <= 180, "Longitude must be between -180 and 180").nullable().optional(),
};
const facilityBase = z.object({
  name: z.string().trim().min(1).max(255),
  category: categorySchema,
  description: z.string().trim().max(10000),
  city: z.string().trim().min(1).max(128),
  area: z.string().trim().min(1).max(128),
  address: z.string().trim().max(1000).nullable().optional(),
  ...optionalCoordinates,
  feeMin: feeSchema.nullable().optional(),
  feeMax: feeSchema.nullable().optional(),
  currencyCode: z.string().trim().regex(/^[A-Za-z]{3}$/).toUpperCase().nullable().optional(),
}).superRefine((value, ctx) => {
  if ((value.latitude == null) !== (value.longitude == null)) {
    ctx.addIssue({ code: "custom", path: ["longitude"], message: "Enter both coordinates or leave both blank" });
  }
  if ((value.feeMin != null || value.feeMax != null) && !value.currencyCode) {
    ctx.addIssue({ code: "custom", path: ["currencyCode"], message: "Enter a 3-letter currency code when listing a fee" });
  }
  if (value.feeMin != null && value.feeMax != null && value.feeMin > value.feeMax) {
    ctx.addIssue({ code: "custom", path: ["feeMax"], message: "feeMax must be at least feeMin" });
  }
});
const facilityUpdate = facilityBase.safeExtend({ id: z.number().int().positive() });
const memberCreate = z.object({
  facilityId: z.number().int().positive(),
  name: z.string().trim().min(1).max(255),
  contactEmail: z.string().email().max(320).optional(),
  membershipLabel: z.string().trim().max(128).optional(),
  joinedAt: dateSchema.optional(),
  expiresAt: dateSchema.optional(),
  status: statusSchema.optional(),
  sessionCredits: z.number().int().nonnegative().optional(),
});
const memberUpdate = z.object({
  id: z.number().int().positive(),
  name: z.string().trim().min(1).max(255).optional(),
  contactEmail: z.string().email().max(320).nullable().optional(),
  membershipLabel: z.string().trim().max(128).nullable().optional(),
  joinedAt: dateSchema.optional(),
  expiresAt: dateSchema.nullable().optional(),
  status: statusSchema.optional(),
  sessionCredits: z.number().int().nonnegative().nullable().optional(),
});
const challengeFields = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(10000),
  startsAt: dateSchema,
  endsAt: dateSchema,
  targetCount: z.number().int().positive(),
});
const challengeBase = challengeFields.superRefine((value, ctx) => {
  if (value.endsAt <= value.startsAt) ctx.addIssue({ code: "custom", path: ["endsAt"], message: "endsAt must be after startsAt" });
});
const challengeCreate = challengeBase.safeExtend({ facilityId: z.number().int().positive() });
const challengeUpdate = challengeFields.partial().extend({ id: z.number().int().positive() });

async function requireOwnedMember(db: Awaited<ReturnType<typeof requireDb>>, memberId: number, ownerId: number) {
  const rows = await db
    .select({ member: facilityMembers, facility: facilities })
    .from(facilityMembers)
    .innerJoin(facilities, eq(facilityMembers.facilityId, facilities.id))
    .where(and(eq(facilityMembers.id, memberId), eq(facilities.ownerId, ownerId)))
    .limit(1);
  if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Member record not found" });
  return rows[0];
}

export const businessRouter = router({
  myFacilities: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    const rows = await db.select().from(facilities).where(eq(facilities.ownerId, ctx.user.id)).orderBy(desc(facilities.updatedAt));
    return rows.map(facility => ({ ...facility, published: facility.visibility === "published" }));
  }),

  createFacility: protectedProcedure.input(facilityBase).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const result = await db.insert(facilities).values({ ...input, ownerId: ctx.user.id, visibility: "draft" });
    const rows = await db.select().from(facilities).where(eq(facilities.id, result[0].insertId)).limit(1);
    return rows[0] ? { ...rows[0], published: rows[0].visibility === "published" } : undefined;
  }),

  updateFacility: protectedProcedure.input(facilityUpdate).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    await requireOwnedFacility(db, input.id, ctx.user.id);
    const { id, ...updates } = input;
    await db.update(facilities).set(updates).where(and(eq(facilities.id, id), eq(facilities.ownerId, ctx.user.id)));
    const rows = await db.select().from(facilities).where(and(eq(facilities.id, id), eq(facilities.ownerId, ctx.user.id))).limit(1);
    return rows[0] ? { ...rows[0], published: rows[0].visibility === "published" } : null;
  }),

  setFacilityPublished: protectedProcedure.input(z.object({ id: z.number().int().positive(), published: z.boolean() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    await requireOwnedFacility(db, input.id, ctx.user.id);
    await db.update(facilities).set({ visibility: input.published ? "published" : "draft" }).where(and(eq(facilities.id, input.id), eq(facilities.ownerId, ctx.user.id)));
    const rows = await db.select().from(facilities).where(and(eq(facilities.id, input.id), eq(facilities.ownerId, ctx.user.id))).limit(1);
    return rows[0] ? { ...rows[0], published: rows[0].visibility === "published" } : null;
  }),

  dashboard: protectedProcedure.input(z.object({ facilityId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const facility = await requireOwnedFacility(db, input.facilityId, ctx.user.id);
    const now = new Date();
    const since = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    const expiryHorizon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const [members, attendance] = await Promise.all([
      db.select().from(facilityMembers).where(eq(facilityMembers.facilityId, facility.id)).orderBy(asc(facilityMembers.expiresAt)),
      db.select().from(attendanceEntries).where(and(eq(attendanceEntries.facilityId, facility.id), gte(attendanceEntries.attendedAt, since))).orderBy(asc(attendanceEntries.attendedAt)),
    ]);
    const history = Array.from({ length: 7 }, (_, offset) => {
      const day = new Date(since);
      day.setDate(since.getDate() + offset);
      const key = day.toISOString().slice(0, 10);
      return { date: key, total: attendance.filter(entry => entry.attendedAt.toISOString().slice(0, 10) === key).length };
    });
    const upcomingExpiryRows = members.filter(
      member => member.status === "active" && member.expiresAt !== null && member.expiresAt >= now && member.expiresAt <= expiryHorizon,
    );
    return {
      facility,
      memberCount: members.length,
      upcomingExpiryRows,
      upcomingExpiries: upcomingExpiryRows,
      attendanceTotals: { last7Days: attendance.length },
      attendanceTotal: attendance.length,
      attendanceHistory: history,
    };
  }),

  members: router({
    list: protectedProcedure.input(z.object({ facilityId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const db = await requireDb();
      await requireOwnedFacility(db, input.facilityId, ctx.user.id);
      return db.select().from(facilityMembers).where(eq(facilityMembers.facilityId, input.facilityId)).orderBy(desc(facilityMembers.createdAt));
    }),
    create: protectedProcedure.input(memberCreate).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      await requireOwnedFacility(db, input.facilityId, ctx.user.id);
      const result = await db.insert(facilityMembers).values({ ...input, joinedAt: input.joinedAt ?? new Date() });
      const rows = await db.select().from(facilityMembers).where(and(eq(facilityMembers.id, result[0].insertId), eq(facilityMembers.facilityId, input.facilityId))).limit(1);
      return rows[0];
    }),
    update: protectedProcedure.input(memberUpdate).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const owned = await requireOwnedMember(db, input.id, ctx.user.id);
      const { id, ...updates } = input;
      await db.update(facilityMembers).set(updates).where(and(eq(facilityMembers.id, id), eq(facilityMembers.facilityId, owned.facility.id)));
      const rows = await db.select().from(facilityMembers).where(and(eq(facilityMembers.id, id), eq(facilityMembers.facilityId, owned.facility.id))).limit(1);
      return rows[0] ?? null;
    }),
    delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const owned = await requireOwnedMember(db, input.id, ctx.user.id);
      await db.delete(facilityMembers).where(and(eq(facilityMembers.id, input.id), eq(facilityMembers.facilityId, owned.facility.id)));
      return { success: true as const };
    }),
  }),

  attendance: router({
    list: protectedProcedure.input(z.object({ facilityId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const db = await requireDb();
      await requireOwnedFacility(db, input.facilityId, ctx.user.id);
      return db.select().from(attendanceEntries).where(eq(attendanceEntries.facilityId, input.facilityId)).orderBy(desc(attendanceEntries.attendedAt));
    }),
    log: protectedProcedure.input(z.object({ facilityId: z.number().int().positive(), memberId: z.number().int().positive(), sessionLabel: z.string().trim().min(1).max(255) })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      await requireOwnedFacility(db, input.facilityId, ctx.user.id);
      const member = await db.select().from(facilityMembers).where(and(eq(facilityMembers.id, input.memberId), eq(facilityMembers.facilityId, input.facilityId))).limit(1);
      if (!member[0]) return null;
      const result = await db.insert(attendanceEntries).values({ facilityId: input.facilityId, memberId: input.memberId, sessionLabel: input.sessionLabel });
      const rows = await db.select().from(attendanceEntries).where(eq(attendanceEntries.id, result[0].insertId)).limit(1);
      return rows[0];
    }),
  }),

  challenges: router({
    list: protectedProcedure.input(z.object({ facilityId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const db = await requireDb();
      await requireOwnedFacility(db, input.facilityId, ctx.user.id);
      return db.select().from(facilityChallenges).where(eq(facilityChallenges.facilityId, input.facilityId)).orderBy(desc(facilityChallenges.startsAt));
    }),
    create: protectedProcedure.input(challengeCreate).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      await requireOwnedFacility(db, input.facilityId, ctx.user.id);
      const result = await db.insert(facilityChallenges).values(input);
      const rows = await db.select().from(facilityChallenges).where(and(eq(facilityChallenges.id, result[0].insertId), eq(facilityChallenges.facilityId, input.facilityId))).limit(1);
      return rows[0];
    }),
    update: protectedProcedure.input(challengeUpdate).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const rows = await db.select({ challenge: facilityChallenges, facility: facilities }).from(facilityChallenges).innerJoin(facilities, eq(facilityChallenges.facilityId, facilities.id)).where(and(eq(facilityChallenges.id, input.id), eq(facilities.ownerId, ctx.user.id))).limit(1);
      if (!rows[0]) return null;
      const { id, ...updates } = input;
      const startsAt = input.startsAt ?? rows[0].challenge.startsAt;
      const endsAt = input.endsAt ?? rows[0].challenge.endsAt;
      if (endsAt <= startsAt) throw new TRPCError({ code: "BAD_REQUEST", message: "endsAt must be after startsAt" });
      await db.update(facilityChallenges).set(updates).where(and(eq(facilityChallenges.id, id), eq(facilityChallenges.facilityId, rows[0].facility.id)));
      const updated = await db.select().from(facilityChallenges).where(and(eq(facilityChallenges.id, id), eq(facilityChallenges.facilityId, rows[0].facility.id))).limit(1);
      return updated[0] ?? null;
    }),
    delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const rows = await db.select({ challenge: facilityChallenges, facility: facilities }).from(facilityChallenges).innerJoin(facilities, eq(facilityChallenges.facilityId, facilities.id)).where(and(eq(facilityChallenges.id, input.id), eq(facilities.ownerId, ctx.user.id))).limit(1);
      if (!rows[0]) return { success: false as const };
      await db.delete(facilityChallenges).where(and(eq(facilityChallenges.id, input.id), eq(facilityChallenges.facilityId, rows[0].facility.id)));
      return { success: true as const };
    }),
  }),
});
