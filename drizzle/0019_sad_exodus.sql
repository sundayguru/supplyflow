ALTER TABLE `connected_email_accounts` ADD `needs_reconnect` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `connected_email_accounts` ADD `reconnect_reason` text(511);--> statement-breakpoint
ALTER TABLE `connected_email_accounts` ADD `reconnect_required_at` text;--> statement-breakpoint
CREATE INDEX `connected_email_accounts_reconnect_idx` ON `connected_email_accounts` (`needs_reconnect`);