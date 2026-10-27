ALTER TABLE `plans` ADD `stripe_price_id` text;
--> statement-breakpoint
ALTER TABLE `organizations` ADD `stripe_customer_id` text;--> statement-breakpoint
ALTER TABLE `organizations` ADD `stripe_subscription_id` text;--> statement-breakpoint
ALTER TABLE `organizations` ADD `stripe_subscription_status` text;
