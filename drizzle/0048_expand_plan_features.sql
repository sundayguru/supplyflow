UPDATE `plans`
SET `features` = json_set(
  `features`,
  '$.dashboard', true,
  '$.rfqs', true,
  '$.purchaseOrders', true,
  '$.vendorPurchaseOrderAcknowledgements', json_extract(`features`, '$.vendorPurchaseOrders'),
  '$.activities', true,
  '$.llmUsage', true,
  '$.manufacturers', true,
  '$.addresses', true,
  '$.emailIngestions', json_extract(`features`, '$.emailAutomation')
);
