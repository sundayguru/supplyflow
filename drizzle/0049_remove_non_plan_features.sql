UPDATE `plans`
SET `features` = json_remove(
  `features`,
  '$.settings',
  '$.organizationSettings',
  '$.notifications'
);
