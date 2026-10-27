UPDATE `plans`
SET `features` = json_set(`features`, '$.emailNotifications', false);
