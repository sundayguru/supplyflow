CREATE TABLE `llm_usages` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`organization_id` text,
	`user_id` text,
	`provider` text(32) NOT NULL,
	`model` text(255) NOT NULL,
	`feature` text(64) NOT NULL,
	`input_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `llm_usages_org_created_idx` ON `llm_usages` (`organization_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `llm_usages_user_created_idx` ON `llm_usages` (`user_id`,`created_at`);