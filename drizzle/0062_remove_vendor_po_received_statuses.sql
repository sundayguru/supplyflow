UPDATE `vendor_purchase_orders`
SET `status` = 'acknowledged'
WHERE `status` IN ('partially_received', 'received');
