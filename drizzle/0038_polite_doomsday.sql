CREATE TABLE `activity_logs` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`organization_id` text,
	`actor_user_id` text NOT NULL,
	`source_type` text NOT NULL,
	`source_id` text(36) NOT NULL,
	`source_reference` text(64) NOT NULL,
	`action` text NOT NULL,
	`field_path` text(255) NOT NULL,
	`previous_value` text,
	`new_value` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `activity_logs_org_created_idx` ON `activity_logs` (`organization_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `activity_logs_source_idx` ON `activity_logs` (`source_type`,`source_id`);--> statement-breakpoint
CREATE INDEX `activity_logs_actor_idx` ON `activity_logs` (`actor_user_id`);--> statement-breakpoint
CREATE INDEX `activity_logs_action_idx` ON `activity_logs` (`action`);