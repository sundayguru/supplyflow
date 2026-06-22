DROP INDEX `connected_email_accounts_user_provider_unique`;--> statement-breakpoint
ALTER TABLE `connected_email_accounts` ADD `organization_id` text REFERENCES organizations(id);--> statement-breakpoint
UPDATE `connected_email_accounts`
SET `organization_id` = (
	SELECT `organization_id`
	FROM `organization_members`
	WHERE `organization_members`.`user_id` = `connected_email_accounts`.`user_id`
);--> statement-breakpoint
CREATE UNIQUE INDEX `connected_email_accounts_org_provider_unique` ON `connected_email_accounts` (`organization_id`,`provider`,`provider_account_id`);--> statement-breakpoint
CREATE INDEX `connected_email_accounts_org_idx` ON `connected_email_accounts` (`organization_id`);--> statement-breakpoint
ALTER TABLE `rfqs` ADD `organization_id` text REFERENCES organizations(id);--> statement-breakpoint
UPDATE `rfqs`
SET `organization_id` = (
	SELECT `organization_id`
	FROM `organization_members`
	WHERE `organization_members`.`user_id` = `rfqs`.`user_id`
);--> statement-breakpoint
CREATE INDEX `rfqs_organization_id_idx` ON `rfqs` (`organization_id`);--> statement-breakpoint
CREATE INDEX `rfqs_organization_status_idx` ON `rfqs` (`organization_id`,`status`);
