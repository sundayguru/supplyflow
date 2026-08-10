ALTER TABLE `vendor_purchase_orders` ADD `generated_email_draft_thread_id` text(255);--> statement-breakpoint
ALTER TABLE `vendor_purchase_orders` ADD `generated_email_draft_account_id` text REFERENCES connected_email_accounts(id);--> statement-breakpoint
CREATE INDEX `vendor_purchase_orders_draft_account_idx` ON `vendor_purchase_orders` (`generated_email_draft_account_id`);
