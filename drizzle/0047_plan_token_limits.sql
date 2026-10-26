ALTER TABLE `plans` ADD `amount` real DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `plans` ADD `input_token_limit` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `plans` ADD `output_token_limit` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE `plans` SET `input_token_limit` = 100000, `output_token_limit` = 20000 WHERE `id` = 'free';
--> statement-breakpoint
UPDATE `plans` SET `input_token_limit` = 1000000, `output_token_limit` = 200000 WHERE `id` = 'standard';
--> statement-breakpoint
UPDATE `plans` SET `input_token_limit` = 5000000, `output_token_limit` = 1000000 WHERE `id` = 'business';
