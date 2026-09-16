-- Remove duplicate permission rows, retaining the oldest row for each officer.
DELETE duplicate_role
FROM `officer_role` AS duplicate_role
JOIN `officer_role` AS retained_role
  ON duplicate_role.`officer_id` = retained_role.`officer_id`
  AND duplicate_role.`officer_role_id` > retained_role.`officer_role_id`;

ALTER TABLE `officer_role`
  DROP INDEX `officer_id`,
  ADD UNIQUE KEY `officer_id` (`officer_id`);