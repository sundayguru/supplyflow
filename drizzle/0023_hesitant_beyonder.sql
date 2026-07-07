ALTER TABLE `purchase_orders` ADD `proforma_invoice_draft_id` text(255);--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD `proforma_invoice_draft_updated_at` text;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD `proforma_invoice_sent_at` text;