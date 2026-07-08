CREATE TABLE `purchase_order_payment_confirmations` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`purchase_order_id` text NOT NULL,
	`amount_paid` integer NOT NULL,
	`payment_date` text NOT NULL,
	`payment_reference` text(255) NOT NULL,
	`confirmed_by_user_id` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`confirmed_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `purchase_order_payment_confirmations_po_id_idx` ON `purchase_order_payment_confirmations` (`purchase_order_id`);--> statement-breakpoint
CREATE INDEX `purchase_order_payment_confirmations_confirmed_by_idx` ON `purchase_order_payment_confirmations` (`confirmed_by_user_id`);