CREATE TABLE `journal_entries` (
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`category` text NOT NULL,
	`amount` integer NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	PRIMARY KEY(`user_id`, `date`, `category`)
);
