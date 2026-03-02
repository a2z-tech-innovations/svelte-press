CREATE TABLE `form_submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`form_id` integer NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`status` text DEFAULT 'unread' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_form_submissions_form_id` ON `form_submissions` (`form_id`);--> statement-breakpoint
CREATE INDEX `idx_form_submissions_status` ON `form_submissions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_form_submissions_created_at` ON `form_submissions` (`created_at`);--> statement-breakpoint
CREATE TABLE `forms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`node_id` text NOT NULL,
	`post_id` integer,
	`title` text DEFAULT '' NOT NULL,
	`fields` text DEFAULT '[]' NOT NULL,
	`settings` text DEFAULT '{}' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `forms_node_id_unique` ON `forms` (`node_id`);--> statement-breakpoint
CREATE INDEX `idx_forms_post_id` ON `forms` (`post_id`);