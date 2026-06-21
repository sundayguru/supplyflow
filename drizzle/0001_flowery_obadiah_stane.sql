CREATE TABLE `rfqs` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`reference` text(32) NOT NULL,
	`customer_name` text(255) NOT NULL,
	`customer_email` text(255),
	`description` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`due_date` text,
	`estimated_value` integer DEFAULT 0 NOT NULL,
	`currency` text(3) DEFAULT 'EUR' NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rfqs_reference_unique` ON `rfqs` (`reference`);--> statement-breakpoint
CREATE INDEX `rfqs_user_id_idx` ON `rfqs` (`user_id`);--> statement-breakpoint
CREATE INDEX `rfqs_user_status_idx` ON `rfqs` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `rfqs_created_at_idx` ON `rfqs` (`created_at`);