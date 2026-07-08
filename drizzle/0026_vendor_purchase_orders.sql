CREATE TABLE `vendor_purchase_orders` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`organization_id` text,
	`purchase_order_id` text NOT NULL,
	`reference` text(32) NOT NULL,
	`vendor_name` text(255) NOT NULL,
	`vendor_email` text(255),
	`vendor_contact_name` text(255),
	`status` text DEFAULT 'draft' NOT NULL,
	`order_date` text,
	`expected_date` text,
	`currency` text(3) DEFAULT 'EUR' NOT NULL,
	`notes` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vendor_purchase_orders_reference_unique` ON `vendor_purchase_orders` (`reference`);--> statement-breakpoint
CREATE INDEX `vendor_purchase_orders_org_idx` ON `vendor_purchase_orders` (`organization_id`);--> statement-breakpoint
CREATE INDEX `vendor_purchase_orders_po_id_idx` ON `vendor_purchase_orders` (`purchase_order_id`);--> statement-breakpoint
CREATE INDEX `vendor_purchase_orders_status_idx` ON `vendor_purchase_orders` (`status`);--> statement-breakpoint
CREATE INDEX `vendor_purchase_orders_created_at_idx` ON `vendor_purchase_orders` (`created_at`);--> statement-breakpoint
CREATE TABLE `vendor_purchase_order_items` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`vendor_purchase_order_id` text NOT NULL,
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
	FOREIGN KEY (`vendor_purchase_order_id`) REFERENCES `vendor_purchase_orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`manufacturer_id`) REFERENCES `manufacturers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `vendor_po_items_vendor_po_id_idx` ON `vendor_purchase_order_items` (`vendor_purchase_order_id`);--> statement-breakpoint
CREATE INDEX `vendor_po_items_status_idx` ON `vendor_purchase_order_items` (`status`);--> statement-breakpoint
CREATE INDEX `vendor_po_items_manufacturer_id_idx` ON `vendor_purchase_order_items` (`manufacturer_id`);
