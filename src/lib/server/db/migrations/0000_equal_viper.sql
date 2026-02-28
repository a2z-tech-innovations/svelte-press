CREATE TABLE `comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`author_id` integer,
	`author_name` text DEFAULT '' NOT NULL,
	`author_email` text DEFAULT '' NOT NULL,
	`author_url` text DEFAULT '',
	`author_ip` text DEFAULT '',
	`content` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`parent_id` integer,
	`date` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `comments_post_idx` ON `comments` (`post_id`);--> statement-breakpoint
CREATE INDEX `comments_status_idx` ON `comments` (`status`);--> statement-breakpoint
CREATE TABLE `media` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`filename` text NOT NULL,
	`original_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`size` integer DEFAULT 0 NOT NULL,
	`width` integer,
	`height` integer,
	`alt` text DEFAULT '',
	`caption` text DEFAULT '',
	`description` text DEFAULT '',
	`uploaded_by` integer,
	`uploaded_at` integer DEFAULT (unixepoch()) NOT NULL,
	`path` text NOT NULL,
	`sizes` text DEFAULT '{}',
	FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `menu_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`menu_id` integer NOT NULL,
	`title` text NOT NULL,
	`url` text DEFAULT '',
	`post_id` integer,
	`term_id` integer,
	`order` integer DEFAULT 0 NOT NULL,
	`parent_id` integer,
	`target` text DEFAULT '',
	`classes` text DEFAULT '',
	FOREIGN KEY (`menu_id`) REFERENCES `menus`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`term_id`) REFERENCES `terms`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `menu_items_menu_idx` ON `menu_items` (`menu_id`);--> statement-breakpoint
CREATE TABLE `menus` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`location` text DEFAULT ''
);
--> statement-breakpoint
CREATE UNIQUE INDEX `menus_slug_unique` ON `menus` (`slug`);--> statement-breakpoint
CREATE TABLE `options` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`option_name` text NOT NULL,
	`option_value` text DEFAULT '' NOT NULL,
	`autoload` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `options_option_name_unique` ON `options` (`option_name`);--> statement-breakpoint
CREATE TABLE `post_meta` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`meta_key` text NOT NULL,
	`meta_value` text DEFAULT '',
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `post_meta_post_idx` ON `post_meta` (`post_id`);--> statement-breakpoint
CREATE INDEX `post_meta_key_idx` ON `post_meta` (`meta_key`);--> statement-breakpoint
CREATE TABLE `post_terms` (
	`post_id` integer NOT NULL,
	`term_id` integer NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`term_id`) REFERENCES `terms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `post_terms_post_idx` ON `post_terms` (`post_id`);--> statement-breakpoint
CREATE INDEX `post_terms_term_idx` ON `post_terms` (`term_id`);--> statement-breakpoint
CREATE TABLE `posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`slug` text NOT NULL,
	`content` text DEFAULT '[]' NOT NULL,
	`excerpt` text DEFAULT '',
	`status` text DEFAULT 'draft' NOT NULL,
	`comment_status` text DEFAULT 'open' NOT NULL,
	`post_date` integer,
	`modified_date` integer DEFAULT (unixepoch()) NOT NULL,
	`author_id` integer NOT NULL,
	`parent_id` integer,
	`post_type` text DEFAULT 'post' NOT NULL,
	`menu_order` integer DEFAULT 0 NOT NULL,
	`format` text DEFAULT 'standard' NOT NULL,
	`sticky` integer DEFAULT false NOT NULL,
	`featured_image_id` integer,
	`template` text DEFAULT '',
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`featured_image_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `posts_slug_type_idx` ON `posts` (`slug`,`post_type`);--> statement-breakpoint
CREATE INDEX `posts_status_idx` ON `posts` (`status`);--> statement-breakpoint
CREATE INDEX `posts_author_idx` ON `posts` (`author_id`);--> statement-breakpoint
CREATE INDEX `posts_date_idx` ON `posts` (`post_date`);--> statement-breakpoint
CREATE INDEX `posts_type_idx` ON `posts` (`post_type`);--> statement-breakpoint
CREATE TABLE `revisions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`content` text DEFAULT '[]' NOT NULL,
	`excerpt` text DEFAULT '',
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`user_id` integer,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `revisions_post_idx` ON `revisions` (`post_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `terms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text DEFAULT '',
	`taxonomy` text NOT NULL,
	`parent_id` integer,
	`count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `terms_slug_taxonomy_idx` ON `terms` (`slug`,`taxonomy`);--> statement-breakpoint
CREATE INDEX `terms_taxonomy_idx` ON `terms` (`taxonomy`);--> statement-breakpoint
CREATE TABLE `user_meta` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`meta_key` text NOT NULL,
	`meta_value` text DEFAULT '',
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_meta_user_idx` ON `user_meta` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_meta_key_idx` ON `user_meta` (`meta_key`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`display_name` text NOT NULL,
	`bio` text DEFAULT '',
	`avatar` text DEFAULT '',
	`role` text DEFAULT 'subscriber' NOT NULL,
	`registered_at` integer DEFAULT (unixepoch()) NOT NULL,
	`last_login` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `widgets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`area` text NOT NULL,
	`widget_type` text NOT NULL,
	`settings` text DEFAULT '{}',
	`order` integer DEFAULT 0 NOT NULL
);
