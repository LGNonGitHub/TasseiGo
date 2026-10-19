CREATE TABLE `attendance_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`facilityId` int NOT NULL,
	`memberId` int NOT NULL,
	`sessionLabel` varchar(255) NOT NULL,
	`attendedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attendance_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `challenge_participation` (
	`id` int AUTO_INCREMENT NOT NULL,
	`challengeId` int NOT NULL,
	`memberUserId` int NOT NULL,
	`progress` int NOT NULL DEFAULT 0,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `challenge_participation_id` PRIMARY KEY(`id`),
	CONSTRAINT `challenge_participation_challenge_member_uq` UNIQUE(`challengeId`,`memberUserId`)
);
--> statement-breakpoint
CREATE TABLE `facilities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` enum('gym','yoga','pool','wellness') NOT NULL,
	`description` text NOT NULL,
	`city` varchar(128) NOT NULL,
	`area` varchar(128) NOT NULL,
	`address` text,
	`latitude` decimal(9,6),
	`longitude` decimal(9,6),
	`feeMin` decimal(12,2),
	`feeMax` decimal(12,2),
	`currencyCode` varchar(3),
	`visibility` enum('draft','published') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `facilities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `facility_challenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`facilityId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp NOT NULL,
	`targetCount` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `facility_challenges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `facility_favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`facilityId` int NOT NULL,
	`memberUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `facility_favorites_id` PRIMARY KEY(`id`),
	CONSTRAINT `facility_favorites_facility_member_uq` UNIQUE(`facilityId`,`memberUserId`)
);
--> statement-breakpoint
CREATE TABLE `facility_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`facilityId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`contactEmail` varchar(320),
	`membershipLabel` varchar(128),
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp,
	`status` enum('active','expired','paused','cancelled') NOT NULL DEFAULT 'active',
	`sessionCredits` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `facility_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `facility_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`facilityId` int NOT NULL,
	`memberUserId` int NOT NULL,
	`venueRating` int NOT NULL,
	`staffRating` int NOT NULL,
	`cleanlinessRating` int NOT NULL,
	`crowdingRating` int NOT NULL,
	`body` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `facility_reviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `facility_reviews_facility_member_uq` UNIQUE(`facilityId`,`memberUserId`)
);
--> statement-breakpoint
CREATE TABLE `member_milestones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberUserId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`targetDate` timestamp,
	`completed` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `member_milestones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `attendance_entries` ADD CONSTRAINT `attendance_entries_facility_fk` FOREIGN KEY (`facilityId`) REFERENCES `facilities`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendance_entries` ADD CONSTRAINT `attendance_entries_member_fk` FOREIGN KEY (`memberId`) REFERENCES `facility_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `challenge_participation` ADD CONSTRAINT `challenge_participation_challenge_fk` FOREIGN KEY (`challengeId`) REFERENCES `facility_challenges`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `challenge_participation` ADD CONSTRAINT `challenge_participation_member_fk` FOREIGN KEY (`memberUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `facilities` ADD CONSTRAINT `facilities_owner_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `facility_challenges` ADD CONSTRAINT `facility_challenges_facility_fk` FOREIGN KEY (`facilityId`) REFERENCES `facilities`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `facility_favorites` ADD CONSTRAINT `facility_favorites_facility_fk` FOREIGN KEY (`facilityId`) REFERENCES `facilities`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `facility_favorites` ADD CONSTRAINT `facility_favorites_member_fk` FOREIGN KEY (`memberUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `facility_members` ADD CONSTRAINT `facility_members_facility_fk` FOREIGN KEY (`facilityId`) REFERENCES `facilities`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `facility_reviews` ADD CONSTRAINT `facility_reviews_facility_fk` FOREIGN KEY (`facilityId`) REFERENCES `facilities`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `facility_reviews` ADD CONSTRAINT `facility_reviews_member_fk` FOREIGN KEY (`memberUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `member_milestones` ADD CONSTRAINT `member_milestones_member_fk` FOREIGN KEY (`memberUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `attendance_entries_facility_idx` ON `attendance_entries` (`facilityId`,`attendedAt`);--> statement-breakpoint
CREATE INDEX `attendance_entries_member_idx` ON `attendance_entries` (`memberId`,`attendedAt`);--> statement-breakpoint
CREATE INDEX `challenge_participation_member_idx` ON `challenge_participation` (`memberUserId`);--> statement-breakpoint
CREATE INDEX `facilities_owner_idx` ON `facilities` (`ownerId`);--> statement-breakpoint
CREATE INDEX `facilities_public_search_idx` ON `facilities` (`visibility`,`category`,`city`);--> statement-breakpoint
CREATE INDEX `facility_challenges_facility_idx` ON `facility_challenges` (`facilityId`,`startsAt`,`endsAt`);--> statement-breakpoint
CREATE INDEX `facility_favorites_member_idx` ON `facility_favorites` (`memberUserId`);--> statement-breakpoint
CREATE INDEX `facility_members_facility_idx` ON `facility_members` (`facilityId`);--> statement-breakpoint
CREATE INDEX `facility_members_expiry_idx` ON `facility_members` (`facilityId`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `facility_reviews_facility_idx` ON `facility_reviews` (`facilityId`);--> statement-breakpoint
CREATE INDEX `facility_reviews_member_idx` ON `facility_reviews` (`memberUserId`);--> statement-breakpoint
CREATE INDEX `member_milestones_member_idx` ON `member_milestones` (`memberUserId`);