CREATE TABLE `rfq_items` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`rfq_id` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`quantity` real NOT NULL,
	`unit` text(32) NOT NULL,
	`description` text NOT NULL,
	`manufacturer` text(255),
	`manufacturer_part_number` text(255),
	`specifications` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`rfq_id`) REFERENCES `rfqs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `rfq_items_rfq_id_idx` ON `rfq_items` (`rfq_id`);--> statement-breakpoint
CREATE INDEX `rfq_items_manufacturer_part_idx` ON `rfq_items` (`manufacturer_part_number`);--> statement-breakpoint
INSERT INTO `rfq_items` (`id`, `rfq_id`, `position`, `quantity`, `unit`, `description`, `created_at`, `updated_at`)
SELECT `id`, `id`, 0, 1, 'unit', `description`, `created_at`, `updated_at` FROM `rfqs`;--> statement-breakpoint
ALTER TABLE `rfqs` DROP COLUMN `description`;
