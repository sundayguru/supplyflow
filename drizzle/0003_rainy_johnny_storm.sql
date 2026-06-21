CREATE TABLE `email_ingestions` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`provider` text(32) NOT NULL,
	`external_id` text(255) NOT NULL,
	`thread_id` text(255),
	`status` text DEFAULT 'processing' NOT NULL,
	`subject` text(511),
	`from_address` text(255),
	`received_at` text,
	`rfq_id` text,
	`error` text,
	`attempts` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`rfq_id`) REFERENCES `rfqs`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_ingestions_provider_external_unique` ON `email_ingestions` (`provider`,`external_id`);--> statement-breakpoint
CREATE INDEX `email_ingestions_status_idx` ON `email_ingestions` (`status`);--> statement-breakpoint
CREATE INDEX `email_ingestions_received_at_idx` ON `email_ingestions` (`received_at`);--> statement-breakpoint
CREATE TABLE `email_sync_states` (
	`provider` text(32) PRIMARY KEY NOT NULL,
	`last_successful_at` text NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
