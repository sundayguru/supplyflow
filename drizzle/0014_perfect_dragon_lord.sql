CREATE TABLE `manufacturers` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`created_by` text NOT NULL,
	`name` text(255) NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `manufacturers_organization_name_unique` ON `manufacturers` (`organization_id`,`name`);--> statement-breakpoint
CREATE INDEX `manufacturers_organization_idx` ON `manufacturers` (`organization_id`);--> statement-breakpoint
DROP INDEX `product_prices_manufacturer_part_idx`;--> statement-breakpoint
ALTER TABLE `product_prices` ADD `manufacturer_id` text REFERENCES manufacturers(id);--> statement-breakpoint
CREATE INDEX `product_prices_manufacturer_part_idx` ON `product_prices` (`organization_id`,`manufacturer_id`,`manufacturer`,`part_number`);--> statement-breakpoint
ALTER TABLE `rfq_items` ADD `manufacturer_id` text REFERENCES manufacturers(id);--> statement-breakpoint
CREATE INDEX `rfq_items_manufacturer_id_idx` ON `rfq_items` (`manufacturer_id`);--> statement-breakpoint
INSERT OR IGNORE INTO `manufacturers` (`id`, `organization_id`, `created_by`, `name`)
SELECT lower(hex(randomblob(16))), `organization_id`, `created_by`, trim(`manufacturer`)
FROM `product_prices`
WHERE `manufacturer` IS NOT NULL AND trim(`manufacturer`) != '';--> statement-breakpoint
INSERT OR IGNORE INTO `manufacturers` (`id`, `organization_id`, `created_by`, `name`)
SELECT lower(hex(randomblob(16))), `rfqs`.`organization_id`, `rfqs`.`user_id`, trim(`rfq_items`.`manufacturer`)
FROM `rfq_items`
INNER JOIN `rfqs` ON `rfq_items`.`rfq_id` = `rfqs`.`id`
WHERE `rfqs`.`organization_id` IS NOT NULL
	AND `rfq_items`.`manufacturer` IS NOT NULL
	AND trim(`rfq_items`.`manufacturer`) != '';--> statement-breakpoint
UPDATE `product_prices`
SET `manufacturer_id` = (
	SELECT `manufacturers`.`id`
	FROM `manufacturers`
	WHERE `manufacturers`.`organization_id` = `product_prices`.`organization_id`
		AND lower(`manufacturers`.`name`) = lower(trim(`product_prices`.`manufacturer`))
	LIMIT 1
)
WHERE `manufacturer` IS NOT NULL AND trim(`manufacturer`) != '';--> statement-breakpoint
UPDATE `rfq_items`
SET `manufacturer_id` = (
	SELECT `manufacturers`.`id`
	FROM `manufacturers`
	INNER JOIN `rfqs` ON `rfq_items`.`rfq_id` = `rfqs`.`id`
	WHERE `manufacturers`.`organization_id` = `rfqs`.`organization_id`
		AND lower(`manufacturers`.`name`) = lower(trim(`rfq_items`.`manufacturer`))
	LIMIT 1
)
WHERE `manufacturer` IS NOT NULL AND trim(`manufacturer`) != '';
