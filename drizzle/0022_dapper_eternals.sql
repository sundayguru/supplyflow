ALTER TABLE `rfqs` ADD `incoterms` text(64);--> statement-breakpoint
ALTER TABLE `rfqs` ADD `delivery_terms` text;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD `incoterms` text(64);--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD `delivery_terms` text;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD `validation_summary` text;