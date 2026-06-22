ALTER TABLE `rfq_items` ADD `price` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `rfq_items` ADD `price_markup` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `organizations` ADD `preferred_model` text DEFAULT 'llama-3.3-70b-versatile' NOT NULL;--> statement-breakpoint
ALTER TABLE `organizations` ADD `vat` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `organizations` ADD `price_markup` real DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `rfq_items`
SET `price_markup` = COALESCE((
	SELECT `organizations`.`price_markup`
	FROM `rfqs`
	INNER JOIN `organizations` ON `organizations`.`id` = `rfqs`.`organization_id`
	WHERE `rfqs`.`id` = `rfq_items`.`rfq_id`
), 0);
