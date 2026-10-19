import {
  boolean,
  decimal,
  foreignKey,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/** Core user table backing the existing Manus OAuth flow. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const facilities = mysqlTable(
  "facilities",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    category: mysqlEnum("category", ["gym", "yoga", "pool", "wellness"]).notNull(),
    description: text("description").notNull(),
    city: varchar("city", { length: 128 }).notNull(),
    area: varchar("area", { length: 128 }).notNull(),
    address: text("address"),
    latitude: decimal("latitude", { precision: 9, scale: 6, mode: "number" }),
    longitude: decimal("longitude", { precision: 9, scale: 6, mode: "number" }),
    feeMin: decimal("feeMin", { precision: 12, scale: 2, mode: "number" }),
    feeMax: decimal("feeMax", { precision: 12, scale: 2, mode: "number" }),
    currencyCode: varchar("currencyCode", { length: 3 }),
    visibility: mysqlEnum("visibility", ["draft", "published"]).default("draft").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    ownerIdx: index("facilities_owner_idx").on(table.ownerId),
    publicSearchIdx: index("facilities_public_search_idx").on(
      table.visibility,
      table.category,
      table.city,
    ),
    ownerFk: foreignKey({
      name: "facilities_owner_fk",
      columns: [table.ownerId],
      foreignColumns: [users.id],
    }).onDelete("restrict"),
  }),
);

export const facilityReviews = mysqlTable(
  "facility_reviews",
  {
    id: int("id").autoincrement().primaryKey(),
    facilityId: int("facilityId").notNull(),
    memberUserId: int("memberUserId").notNull(),
    venueRating: int("venueRating").notNull(),
    staffRating: int("staffRating").notNull(),
    cleanlinessRating: int("cleanlinessRating").notNull(),
    crowdingRating: int("crowdingRating").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    facilityIdx: index("facility_reviews_facility_idx").on(table.facilityId),
    memberIdx: index("facility_reviews_member_idx").on(table.memberUserId),
    oneReviewPerMember: uniqueIndex("facility_reviews_facility_member_uq").on(
      table.facilityId,
      table.memberUserId,
    ),
    facilityFk: foreignKey({
      name: "facility_reviews_facility_fk",
      columns: [table.facilityId],
      foreignColumns: [facilities.id],
    }).onDelete("cascade"),
    memberFk: foreignKey({
      name: "facility_reviews_member_fk",
      columns: [table.memberUserId],
      foreignColumns: [users.id],
    }).onDelete("cascade"),
  }),
);

export const facilityFavorites = mysqlTable(
  "facility_favorites",
  {
    id: int("id").autoincrement().primaryKey(),
    facilityId: int("facilityId").notNull(),
    memberUserId: int("memberUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    memberIdx: index("facility_favorites_member_idx").on(table.memberUserId),
    oneFavoritePerMember: uniqueIndex("facility_favorites_facility_member_uq").on(
      table.facilityId,
      table.memberUserId,
    ),
    facilityFk: foreignKey({
      name: "facility_favorites_facility_fk",
      columns: [table.facilityId],
      foreignColumns: [facilities.id],
    }).onDelete("cascade"),
    memberFk: foreignKey({
      name: "facility_favorites_member_fk",
      columns: [table.memberUserId],
      foreignColumns: [users.id],
    }).onDelete("cascade"),
  }),
);

export const facilityMembers = mysqlTable(
  "facility_members",
  {
    id: int("id").autoincrement().primaryKey(),
    facilityId: int("facilityId").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    contactEmail: varchar("contactEmail", { length: 320 }),
    membershipLabel: varchar("membershipLabel", { length: 128 }),
    joinedAt: timestamp("joinedAt").defaultNow().notNull(),
    expiresAt: timestamp("expiresAt"),
    status: mysqlEnum("status", ["active", "expired", "paused", "cancelled"])
      .default("active")
      .notNull(),
    sessionCredits: int("sessionCredits"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    facilityIdx: index("facility_members_facility_idx").on(table.facilityId),
    expiryIdx: index("facility_members_expiry_idx").on(table.facilityId, table.expiresAt),
    facilityFk: foreignKey({
      name: "facility_members_facility_fk",
      columns: [table.facilityId],
      foreignColumns: [facilities.id],
    }).onDelete("cascade"),
  }),
);

export const attendanceEntries = mysqlTable(
  "attendance_entries",
  {
    id: int("id").autoincrement().primaryKey(),
    facilityId: int("facilityId").notNull(),
    memberId: int("memberId").notNull(),
    sessionLabel: varchar("sessionLabel", { length: 255 }).notNull(),
    attendedAt: timestamp("attendedAt").defaultNow().notNull(),
  },
  table => ({
    facilityIdx: index("attendance_entries_facility_idx").on(table.facilityId, table.attendedAt),
    memberIdx: index("attendance_entries_member_idx").on(table.memberId, table.attendedAt),
    facilityFk: foreignKey({
      name: "attendance_entries_facility_fk",
      columns: [table.facilityId],
      foreignColumns: [facilities.id],
    }).onDelete("cascade"),
    memberFk: foreignKey({
      name: "attendance_entries_member_fk",
      columns: [table.memberId],
      foreignColumns: [facilityMembers.id],
    }).onDelete("cascade"),
  }),
);

export const memberMilestones = mysqlTable(
  "member_milestones",
  {
    id: int("id").autoincrement().primaryKey(),
    memberUserId: int("memberUserId").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    targetDate: timestamp("targetDate"),
    completed: boolean("completed").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    memberIdx: index("member_milestones_member_idx").on(table.memberUserId),
    memberFk: foreignKey({
      name: "member_milestones_member_fk",
      columns: [table.memberUserId],
      foreignColumns: [users.id],
    }).onDelete("cascade"),
  }),
);

export const facilityChallenges = mysqlTable(
  "facility_challenges",
  {
    id: int("id").autoincrement().primaryKey(),
    facilityId: int("facilityId").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull(),
    startsAt: timestamp("startsAt").notNull(),
    endsAt: timestamp("endsAt").notNull(),
    targetCount: int("targetCount").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    facilityIdx: index("facility_challenges_facility_idx").on(table.facilityId, table.startsAt, table.endsAt),
    facilityFk: foreignKey({
      name: "facility_challenges_facility_fk",
      columns: [table.facilityId],
      foreignColumns: [facilities.id],
    }).onDelete("cascade"),
  }),
);

export const challengeParticipation = mysqlTable(
  "challenge_participation",
  {
    id: int("id").autoincrement().primaryKey(),
    challengeId: int("challengeId").notNull(),
    memberUserId: int("memberUserId").notNull(),
    progress: int("progress").default(0).notNull(),
    joinedAt: timestamp("joinedAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    memberIdx: index("challenge_participation_member_idx").on(table.memberUserId),
    oneJoinPerMember: uniqueIndex("challenge_participation_challenge_member_uq").on(
      table.challengeId,
      table.memberUserId,
    ),
    challengeFk: foreignKey({
      name: "challenge_participation_challenge_fk",
      columns: [table.challengeId],
      foreignColumns: [facilityChallenges.id],
    }).onDelete("cascade"),
    memberFk: foreignKey({
      name: "challenge_participation_member_fk",
      columns: [table.memberUserId],
      foreignColumns: [users.id],
    }).onDelete("cascade"),
  }),
);

export type Facility = typeof facilities.$inferSelect;
export type FacilityReview = typeof facilityReviews.$inferSelect;
export type FacilityMember = typeof facilityMembers.$inferSelect;
export type FacilityChallenge = typeof facilityChallenges.$inferSelect;
