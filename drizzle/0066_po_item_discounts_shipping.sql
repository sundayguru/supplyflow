ALTER TABLE `purchase_order_items` ADD `discount_type` text NOT NULL DEFAULT 'percentage';
--> statement-breakpoint
ALTER TABLE `purchase_order_items` ADD `discount_value` real NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `purchase_order_items` ADD `shipping_cost` integer NOT NULL DEFAULT 0;
