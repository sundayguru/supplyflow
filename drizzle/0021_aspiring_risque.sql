ALTER TABLE `rfqs` ADD `quotation_sent_at` text;--> statement-breakpoint
ALTER TABLE `rfqs` ADD `quote_reminder_sent_at` text;--> statement-breakpoint
UPDATE `rfqs` SET `quotation_sent_at` = `updated_at` WHERE `status` = 'sent' AND `quotation_sent_at` IS NULL;
