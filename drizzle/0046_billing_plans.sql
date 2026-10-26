CREATE TABLE `plans` (
	`id` text(64) PRIMARY KEY NOT NULL,
	`name` text(128) NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`price_label` text(128) DEFAULT 'Contact us' NOT NULL,
	`features` text NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `billing_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`suggested_plan_id` text DEFAULT 'business' NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
INSERT INTO `plans` (`id`, `name`, `description`, `price_label`, `features`, `display_order`) VALUES
('free', 'Free', 'Core tools to manage purchasing documents.', 'Free', '{"vendorPurchaseOrders":false,"emailAutomation":false,"customPdfTemplates":false,"teamManagement":false,"productPricing":false}', 0),
('standard', 'Standard', 'More tools for growing purchasing teams.', 'Contact us', '{"vendorPurchaseOrders":true,"emailAutomation":false,"customPdfTemplates":false,"teamManagement":false,"productPricing":true}', 1),
('business', 'Business', 'Automation and collaboration for established teams.', 'Contact us', '{"vendorPurchaseOrders":true,"emailAutomation":true,"customPdfTemplates":true,"teamManagement":true,"productPricing":true}', 2),
('enterprise', 'Enterprise', 'Flexible features for larger organizations.', 'Contact us', '{"vendorPurchaseOrders":true,"emailAutomation":true,"customPdfTemplates":true,"teamManagement":true,"productPricing":true}', 3);
--> statement-breakpoint
INSERT INTO `billing_settings` (`id`, `suggested_plan_id`) VALUES (1, 'business');
--> statement-breakpoint
ALTER TABLE `organizations` ADD `plan_id` text DEFAULT 'free' NOT NULL;
