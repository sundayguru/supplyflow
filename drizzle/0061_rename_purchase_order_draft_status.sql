UPDATE `purchase_orders`
SET `status` = 'new'
WHERE `status` IN ('draft', 'sent');
