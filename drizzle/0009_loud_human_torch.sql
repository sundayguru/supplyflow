CREATE TABLE `rfq_pdf_templates` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text(255) NOT NULL,
	`header_banner_key` text(511),
	`footer_banner_key` text(511),
	`terms_html` text DEFAULT '' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `rfq_pdf_templates_org_idx` ON `rfq_pdf_templates` (`organization_id`);--> statement-breakpoint
ALTER TABLE `rfqs` ADD `template_id` text REFERENCES rfq_pdf_templates(id);