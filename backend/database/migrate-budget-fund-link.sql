-- Run after migrate-budget.sql and migrate-funds.sql.
-- Existing funds stay unlinked; each existing budget receives a new collection plan.
ALTER TABLE `budgets`
  ADD COLUMN `deadline` date DEFAULT NULL AFTER `budget_period`;

ALTER TABLE `funds`
  ADD COLUMN `budget_id` int(11) DEFAULT NULL AFTER `room_id`,
  ADD UNIQUE KEY `uq_funds_budget_id` (`budget_id`),
  ADD CONSTRAINT `fk_funds_budget`
    FOREIGN KEY (`budget_id`) REFERENCES `budgets` (`budget_id`)
    ON UPDATE CASCADE ON DELETE CASCADE;

UPDATE `budgets`
   SET `deadline` = STR_TO_DATE(`budget_period`, '%Y-%m-%d')
 WHERE `budget_period` REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$';

INSERT INTO `funds`
  (`room_id`, `budget_id`, `fund_name`, `description`, `target_amount`,
   `contribution_amount`, `deadline`, `status`, `created_by`)
SELECT b.`room_id`,
       b.`budget_id`,
       b.`budget_name`,
       b.`description`,
       b.`planned_amount`,
       GREATEST(
         0.01,
         FLOOR(b.`planned_amount` * 100 /
           GREATEST((SELECT COUNT(DISTINCT rm.`member_id`)
                       FROM `room_member` rm
                      WHERE rm.`room_id` = b.`room_id`), 1)) / 100
       ),
       b.`deadline`,
       CASE b.`status`
         WHEN 'Completed' THEN 'Closed'
         WHEN 'Ongoing' THEN 'Active'
         ELSE 'Collecting'
       END,
       b.`created_by`
  FROM `budgets` b
 WHERE NOT EXISTS (
   SELECT 1 FROM `funds` f WHERE f.`budget_id` = b.`budget_id`
 );
