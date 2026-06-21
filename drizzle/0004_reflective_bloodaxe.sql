CREATE TABLE `email_account_sync_states` (
	`account_id` text PRIMARY KEY NOT NULL,
	`last_successful_at` text NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `connected_email_accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `connected_email_accounts` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_account_id` text(255) NOT NULL,
	`email` text(255) NOT NULL,
	`display_name` text(255),
	`encrypted_refresh_token` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `connected_email_accounts_user_provider_unique` ON `connected_email_accounts` (`user_id`,`provider`,`provider_account_id`);--> statement-breakpoint
CREATE INDEX `connected_email_accounts_active_idx` ON `connected_email_accounts` (`is_active`);--> statement-breakpoint
CREATE INDEX `connected_email_accounts_user_idx` ON `connected_email_accounts` (`user_id`);--> statement-breakpoint
CREATE TABLE `email_account_oauth_states` (
	`state` text(64) PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
DROP TABLE `email_sync_states`;--> statement-breakpoint
DROP INDEX `email_ingestions_provider_external_unique`;--> statement-breakpoint
ALTER TABLE `email_ingestions` ADD `account_id` text REFERENCES connected_email_accounts(id);--> statement-breakpoint
CREATE UNIQUE INDEX `email_ingestions_account_external_unique` ON `email_ingestions` (`account_id`,`external_id`);