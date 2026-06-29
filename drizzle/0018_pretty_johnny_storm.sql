ALTER TABLE `rfq_items` ADD `discount_type` text DEFAULT 'percentage' NOT NULL;--> statement-breakpoint
ALTER TABLE `rfq_items` ADD `discount_value` integer DEFAULT 0 NOT NULL;