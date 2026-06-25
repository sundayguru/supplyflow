CREATE TABLE `product_prices` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`created_by` text NOT NULL,
	`name` text(255) NOT NULL,
	`manufacturer` text(255),
	`part_number` text(255),
	`price` integer DEFAULT 0 NOT NULL,
	`currency` text(3) DEFAULT 'EUR' NOT NULL,
	`price_last_updated` text,
	`description` text,
	`specifications` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `product_prices_organization_idx` ON `product_prices` (`organization_id`);--> statement-breakpoint
CREATE INDEX `product_prices_manufacturer_part_idx` ON `product_prices` (`organization_id`,`manufacturer`,`part_number`);--> statement-breakpoint
CREATE INDEX `product_prices_updated_at_idx` ON `product_prices` (`updated_at`);