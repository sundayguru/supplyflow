ALTER TABLE `rfqs` ADD `status_reason` text;--> statement-breakpoint
ALTER TABLE `purchase_order_items` ADD `status_reason` text;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD `status_reason` text;--> statement-breakpoint
ALTER TABLE `vendor_purchase_order_items` ADD `status_reason` text;--> statement-breakpoint
ALTER TABLE `vendor_purchase_orders` ADD `status_reason` text;--> statement-breakpoint
ALTER TABLE `vendor_purchase_order_acknowledgement_items` ADD `status_reason` text;--> statement-breakpoint
ALTER TABLE `vendor_purchase_order_acknowledgements` ADD `status_reason` text;