UPDATE `accounts`
SET
  `refresh_token` = NULL,
  `access_token` = NULL,
  `expires_at` = NULL,
  `token_type` = NULL,
  `scope` = NULL,
  `id_token` = NULL,
  `session_state` = NULL
WHERE `provider` = 'google';
