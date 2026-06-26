ALTER TABLE `rfqs` ADD `generated_reply_draft_updated_at` text;--> statement-breakpoint
UPDATE `rfqs`
SET `generated_reply_draft_updated_at` = `updated_at`
WHERE `generated_reply_draft_id` IS NOT NULL;
