ALTER TABLE `vendor_purchase_orders` ADD `vendor_manufacturer_id` text REFERENCES manufacturers(id);--> statement-breakpoint
CREATE INDEX `vendor_purchase_orders_vendor_manufacturer_id_idx` ON `vendor_purchase_orders` (`vendor_manufacturer_id`);--> statement-breakpoint
ALTER TABLE `manufacturers` ADD `email` text(255);--> statement-breakpoint
ALTER TABLE `manufacturers` ADD `contact_name` text(255);