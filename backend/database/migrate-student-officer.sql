-- Run once against an existing gov-board database after backing it up.
-- This migrates officer records into student and removes the old officer tables.

START TRANSACTION;

ALTER TABLE `student`
  ADD COLUMN IF NOT EXISTS `admin_id` int(11) DEFAULT NULL AFTER `student_id`,
  ADD COLUMN IF NOT EXISTS `role` varchar(100) DEFAULT NULL AFTER `password`,
  ADD COLUMN IF NOT EXISTS `can_add` tinyint(1) NOT NULL DEFAULT 0 AFTER `role`,
  ADD COLUMN IF NOT EXISTS `can_edit` tinyint(1) NOT NULL DEFAULT 0 AFTER `can_add`,
  ADD COLUMN IF NOT EXISTS `can_delete` tinyint(1) NOT NULL DEFAULT 0 AFTER `can_edit`,
  ADD COLUMN IF NOT EXISTS `can_moderate` tinyint(1) NOT NULL DEFAULT 0 AFTER `can_delete`;

-- Reuse an existing student row when the student number already exists.
UPDATE `student` s
INNER JOIN `officer` o ON o.student_number = s.student_number
LEFT JOIN `officer_role` r ON r.officer_id = o.officer_id
SET s.admin_id = o.admin_id,
    s.first_name = o.first_name,
    s.last_name = o.last_name,
    s.position = o.position,
    s.batch_id = o.batch_id,
    s.password = o.password,
    s.role = COALESCE(r.role, 'officer'),
    s.can_add = COALESCE(r.can_add, 0),
    s.can_edit = COALESCE(r.can_edit, 0),
    s.can_delete = COALESCE(r.can_delete, 0),
    s.can_moderate = COALESCE(r.can_moderate, 0);

-- Insert officers that do not already have a student row.
INSERT INTO `student` (
  `admin_id`, `first_name`, `last_name`, `student_number`, `position`,
  `batch_id`, `password`, `role`, `can_add`, `can_edit`, `can_delete`,
  `can_moderate`, `date_created`
)
SELECT
  o.admin_id, o.first_name, o.last_name, o.student_number, o.position,
  o.batch_id, o.password, COALESCE(r.role, 'officer'),
  COALESCE(r.can_add, 0), COALESCE(r.can_edit, 0),
  COALESCE(r.can_delete, 0), COALESCE(r.can_moderate, 0),
  o.date_created
FROM `officer` o
LEFT JOIN `officer_role` r ON r.officer_id = o.officer_id
LEFT JOIN `student` s ON s.student_number = o.student_number
WHERE s.student_id IS NULL;

-- Room membership IDs previously pointed at officer.officer_id.
CREATE TEMPORARY TABLE `officer_student_map` AS
SELECT o.officer_id, s.student_id
FROM `officer` o
INNER JOIN `student` s ON s.student_number = o.student_number;

UPDATE `room_member` rm
INNER JOIN `officer_student_map` m ON m.officer_id = rm.member_id
SET rm.member_id = m.student_id
WHERE rm.member_type = 'officer';

DROP TEMPORARY TABLE `officer_student_map`;

ALTER TABLE `student`
  ADD CONSTRAINT `fk_student_admin`
    FOREIGN KEY (`admin_id`) REFERENCES `admin` (`admin_id`) ON DELETE SET NULL;

DROP TABLE `officer_role`;
DROP TABLE `officer`;

COMMIT;
