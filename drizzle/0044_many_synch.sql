CREATE TABLE `addresses` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`created_by` text NOT NULL,
	`name` text(255) NOT NULL,
	`address` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `addresses_organization_idx` ON `addresses` (`organization_id`);--> statement-breakpoint
ALTER TABLE `vendor_purchase_orders` ADD `ship_to` text;--> statement-breakpoint
ALTER TABLE `manufacturers` ADD `address` text;