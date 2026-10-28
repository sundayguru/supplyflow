ALTER TABLE `notifications` ADD `actor_name` text(511);

UPDATE `notifications`
SET `action_url` = replace(`action_url`, '?rfq=', '?id=')
WHERE substr(`action_url`, 1, length('/rfqs?rfq=')) = '/rfqs?rfq=';

UPDATE `notifications`
SET `action_url` = replace(`action_url`, '?po=', '?id=')
WHERE substr(`action_url`, 1, length('/purchase-orders?po=')) = '/purchase-orders?po=';

UPDATE `notifications`
SET `action_url` = replace(`action_url`, '?vendorPo=', '?id=')
WHERE substr(`action_url`, 1, length('/vendor-purchase-orders?vendorPo=')) = '/vendor-purchase-orders?vendorPo=';

UPDATE `notifications`
SET `action_url` = replace(`action_url`, '?vendorPoAck=', '?id=')
WHERE substr(`action_url`, 1, length('/vendor-purchase-order-acknowledgements?vendorPoAck=')) = '/vendor-purchase-order-acknowledgements?vendorPoAck=';
