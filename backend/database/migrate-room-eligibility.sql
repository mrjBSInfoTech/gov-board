-- Run after migrate-college-scope.sql against an existing gov-board database.
-- Room membership is the source of per-room student/officer status.
ALTER TABLE `student`
  ADD COLUMN `course` varchar(150) DEFAULT NULL;

ALTER TABLE `room`
  ADD COLUMN `join_access` enum('all_colleges','selected_colleges')
    NOT NULL DEFAULT 'all_colleges',
  ADD COLUMN `eligible_year` varchar(50) DEFAULT NULL,
  ADD COLUMN `eligible_section` varchar(50) DEFAULT NULL,
  ADD COLUMN `eligible_course` varchar(150) DEFAULT NULL;

CREATE TABLE `room_allowed_college` (
  `room_id` int(11) NOT NULL,
  `college` varchar(150) NOT NULL,
  PRIMARY KEY (`room_id`, `college`),
  CONSTRAINT `room_allowed_college_room_fk`
    FOREIGN KEY (`room_id`) REFERENCES `room` (`room_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DELETE student_membership
FROM `room_member` student_membership
INNER JOIN `room_member` officer_membership
  ON officer_membership.room_id = student_membership.room_id
 AND officer_membership.member_id = student_membership.member_id
WHERE student_membership.member_type = 'student'
  AND officer_membership.member_type = 'officer';

ALTER TABLE `room_member`
  DROP INDEX `uq_room_member`,
  ADD UNIQUE KEY `uq_room_member` (`room_id`, `member_id`);

ALTER TABLE `room_member`
  ADD COLUMN `position` varchar(100) NOT NULL DEFAULT 'Student';

UPDATE `room_member` rm
INNER JOIN `student` s ON s.student_id = rm.member_id
SET rm.position = CASE
  WHEN rm.member_type = 'officer' THEN COALESCE(NULLIF(s.position, ''), 'Officer')
  ELSE 'Student'
END;
