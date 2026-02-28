CREATE TABLE `activity_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`user_display_name` text,
	`action` text NOT NULL,
	`object_type` text,
	`object_id` integer,
	`object_title` text,
	`details` text,
	`ip` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `activity_log_user_idx` ON `activity_log` (`user_id`);--> statement-breakpoint
CREATE INDEX `activity_log_action_idx` ON `activity_log` (`action`);--> statement-breakpoint
CREATE INDEX `activity_log_created_idx` ON `activity_log` (`created_at`);