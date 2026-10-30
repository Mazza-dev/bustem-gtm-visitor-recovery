CREATE TABLE `contacts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lead_id` integer NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`linkedin` text DEFAULT '' NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`visitor_id` text NOT NULL,
	`kind` text NOT NULL,
	`source` text DEFAULT 'direct' NOT NULL,
	`page` text DEFAULT '/' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `followups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lead_id` integer NOT NULL,
	`contact_id` integer,
	`channel` text NOT NULL,
	`message` text NOT NULL,
	`state` text DEFAULT 'draft' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`visitor_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`brand_url` text NOT NULL,
	`company` text NOT NULL,
	`report_summary` text DEFAULT '' NOT NULL,
	`report_url` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'submitted' NOT NULL,
	`submitted_at` text NOT NULL,
	`report_sent_at` text,
	`last_activity_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `leads_visitor_id_unique` ON `leads` (`visitor_id`);