ALTER TABLE `organizations` ADD `stripe_cancel_at_period_end` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `organizations` ADD `stripe_cancel_effective_at` integer;