CREATE TABLE `vendor_purchase_order_acknowledgement_items` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`acknowledgement_id` text NOT NULL,
	`vendor_purchase_order_item_id` text,
	`position` integer DEFAULT 0 NOT NULL,
	`quantity` real NOT NULL,
	`unit` text(32) NOT NULL,
	`description` text NOT NULL,
	`manufacturer_part_number` text(255),
	`delivery_date` text,
	`status` text DEFAULT 'acknowledged' NOT NULL,
	`notes` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`acknowledgement_id`) REFERENCES `vendor_purchase_order_acknowledgements`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`vendor_purchase_order_item_id`) REFERENCES `vendor_purchase_order_items`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `vendor_po_ack_items_ack_id_idx` ON `vendor_purchase_order_acknowledgement_items` (`acknowledgement_id`);--> statement-breakpoint
CREATE INDEX `vendor_po_ack_items_vendor_po_item_id_idx` ON `vendor_purchase_order_acknowledgement_items` (`vendor_purchase_order_item_id`);--> statement-breakpoint
CREATE INDEX `vendor_po_ack_items_status_idx` ON `vendor_purchase_order_acknowledgement_items` (`status`);--> statement-breakpoint
CREATE TABLE `vendor_purchase_order_acknowledgements` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`organization_id` text,
	`vendor_purchase_order_id` text NOT NULL,
	`reference` text(32) NOT NULL,
	`acknowledgement_reference` text(255),
	`status` text DEFAULT 'received' NOT NULL,
	`acknowledged_at` text,
	`notes` text,
	`source_email_ingestion_id` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`vendor_purchase_order_id`) REFERENCES `vendor_purchase_orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vendor_purchase_order_acknowledgements_reference_unique` ON `vendor_purchase_order_acknowledgements` (`reference`);--> statement-breakpoint
CREATE UNIQUE INDEX `vendor_purchase_order_acknowledgements_source_email_ingestion_id_unique` ON `vendor_purchase_order_acknowledgements` (`source_email_ingestion_id`);--> statement-breakpoint
CREATE INDEX `vendor_po_ack_org_idx` ON `vendor_purchase_order_acknowledgements` (`organization_id`);--> statement-breakpoint
CREATE INDEX `vendor_po_ack_vendor_po_id_idx` ON `vendor_purchase_order_acknowledgements` (`vendor_purchase_order_id`);--> statement-breakpoint
CREATE INDEX `vendor_po_ack_status_idx` ON `vendor_purchase_order_acknowledgements` (`status`);--> statement-breakpoint
CREATE INDEX `vendor_po_ack_created_at_idx` ON `vendor_purchase_order_acknowledgements` (`created_at`);