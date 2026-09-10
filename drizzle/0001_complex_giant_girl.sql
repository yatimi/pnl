PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_journal_entries` (
	`id` text DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`category` text NOT NULL,
	`amount` integer NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	PRIMARY KEY(`user_id`, `id`)
);
--> statement-breakpoint
INSERT INTO `__new_journal_entries`("user_id", "date", "category", "amount", "note") SELECT "user_id", "date", "category", "amount", "note" FROM `journal_entries`;--> statement-breakpoint
DROP TABLE `journal_entries`;--> statement-breakpoint
ALTER TABLE `__new_journal_entries` RENAME TO `journal_entries`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `journal_entries_user_date_idx` ON `journal_entries` (`user_id`,`date`);
