DROP INDEX `vendor_po_items_status_idx`;
ALTER TABLE `vendor_purchase_order_items` DROP COLUMN `status`;
ALTER TABLE `vendor_purchase_order_items` DROP COLUMN `status_reason`;
