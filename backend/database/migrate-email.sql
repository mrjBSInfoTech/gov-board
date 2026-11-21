-- Run against an existing gov-board database.
-- Adds student email storage for announcement notifications via Gmail SMTP.
ALTER TABLE `student`
  ADD COLUMN IF NOT EXISTS `email` varchar(255) DEFAULT NULL AFTER `student_number`,
  ADD UNIQUE KEY IF NOT EXISTS `uq_student_email` (`email`);
