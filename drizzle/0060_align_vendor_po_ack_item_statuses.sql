UPDATE `vendor_purchase_order_acknowledgement_items`
SET `status` = CASE `status`
  WHEN 'acknowledged' THEN 'ordered'
  WHEN 'partially_acknowledged' THEN 'ordered'
  WHEN 'backordered' THEN 'pending'
  WHEN 'rejected' THEN 'cancelled'
  ELSE `status`
END
WHERE `status` IN ('acknowledged', 'partially_acknowledged', 'backordered', 'rejected');
