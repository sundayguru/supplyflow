CREATE TABLE `purchase_order_items` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`purchase_order_id` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`quantity` real NOT NULL,
	`price` integer DEFAULT 0 NOT NULL,
	`unit` text(32) NOT NULL,
	`description` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`manufacturer` text(255),
	`manufacturer_id` text,
	`manufacturer_part_number` text(255),
	`specifications` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`manufacturer_id`) REFERENCES `manufacturers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `purchase_order_items_po_id_idx` ON `purchase_order_items` (`purchase_order_id`);--> statement-breakpoint
CREATE INDEX `purchase_order_items_status_idx` ON `purchase_order_items` (`status`);--> statement-breakpoint
CREATE INDEX `purchase_order_items_manufacturer_id_idx` ON `purchase_order_items` (`manufacturer_id`);--> statement-breakpoint
CREATE INDEX `purchase_order_items_manufacturer_part_idx` ON `purchase_order_items` (`manufacturer_part_number`);--> statement-breakpoint
CREATE TABLE `purchase_orders` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`organization_id` text,
	`rfq_id` text,
	`reference` text(32) NOT NULL,
	`supplier_name` text(255) NOT NULL,
	`supplier_email` text(255),
	`status` text DEFAULT 'draft' NOT NULL,
	`order_date` text,
	`expected_date` text,
	`apply_vat` integer DEFAULT false NOT NULL,
	`currency` text(3) DEFAULT 'EUR' NOT NULL,
	`notes` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`rfq_id`) REFERENCES `rfqs`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `purchase_orders_reference_unique` ON `purchase_orders` (`reference`);--> statement-breakpoint
CREATE INDEX `purchase_orders_user_id_idx` ON `purchase_orders` (`user_id`);--> statement-breakpoint
CREATE INDEX `purchase_orders_organization_id_idx` ON `purchase_orders` (`organization_id`);--> statement-breakpoint
CREATE INDEX `purchase_orders_rfq_id_idx` ON `purchase_orders` (`rfq_id`);--> statement-breakpoint
CREATE INDEX `purchase_orders_organization_status_idx` ON `purchase_orders` (`organization_id`,`status`);--> statement-breakpoint
CREATE INDEX `purchase_orders_created_at_idx` ON `purchase_orders` (`created_at`);