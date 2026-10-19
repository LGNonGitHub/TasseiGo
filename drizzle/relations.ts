import { relations } from "drizzle-orm";
import {
  attendanceEntries,
  challengeParticipation,
  facilities,
  facilityChallenges,
  facilityFavorites,
  facilityMembers,
  facilityReviews,
  memberMilestones,
  users,
} from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  ownedFacilities: many(facilities),
  reviews: many(facilityReviews),
  favorites: many(facilityFavorites),
  milestones: many(memberMilestones),
  challengeParticipation: many(challengeParticipation),
}));

export const facilitiesRelations = relations(facilities, ({ one, many }) => ({
  owner: one(users, {
    fields: [facilities.ownerId],
    references: [users.id],
  }),
  reviews: many(facilityReviews),
  favorites: many(facilityFavorites),
  members: many(facilityMembers),
  attendance: many(attendanceEntries),
  challenges: many(facilityChallenges),
}));

export const facilityReviewsRelations = relations(facilityReviews, ({ one }) => ({
  facility: one(facilities, {
    fields: [facilityReviews.facilityId],
    references: [facilities.id],
  }),
  member: one(users, {
    fields: [facilityReviews.memberUserId],
    references: [users.id],
  }),
}));

export const facilityFavoritesRelations = relations(facilityFavorites, ({ one }) => ({
  facility: one(facilities, {
    fields: [facilityFavorites.facilityId],
    references: [facilities.id],
  }),
  member: one(users, {
    fields: [facilityFavorites.memberUserId],
    references: [users.id],
  }),
}));

export const facilityMembersRelations = relations(facilityMembers, ({ one, many }) => ({
  facility: one(facilities, {
    fields: [facilityMembers.facilityId],
    references: [facilities.id],
  }),
  attendance: many(attendanceEntries),
}));

export const attendanceEntriesRelations = relations(attendanceEntries, ({ one }) => ({
  facility: one(facilities, {
    fields: [attendanceEntries.facilityId],
    references: [facilities.id],
  }),
  member: one(facilityMembers, {
    fields: [attendanceEntries.memberId],
    references: [facilityMembers.id],
  }),
}));

export const memberMilestonesRelations = relations(memberMilestones, ({ one }) => ({
  member: one(users, {
    fields: [memberMilestones.memberUserId],
    references: [users.id],
  }),
}));

export const facilityChallengesRelations = relations(facilityChallenges, ({ one, many }) => ({
  facility: one(facilities, {
    fields: [facilityChallenges.facilityId],
    references: [facilities.id],
  }),
  participants: many(challengeParticipation),
}));

export const challengeParticipationRelations = relations(challengeParticipation, ({ one }) => ({
  challenge: one(facilityChallenges, {
    fields: [challengeParticipation.challengeId],
    references: [facilityChallenges.id],
  }),
  member: one(users, {
    fields: [challengeParticipation.memberUserId],
    references: [users.id],
  }),
}));
