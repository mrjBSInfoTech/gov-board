ALTER TABLE `admin`
  ADD COLUMN `position` enum('Governor','College Head','Super Admin') NOT NULL DEFAULT 'College Head',
  ADD COLUMN `college` varchar(150) DEFAULT NULL;

UPDATE `admin`
SET `position` = 'Super Admin'
WHERE `admin_id` = 1;

ALTER TABLE `student`
  ADD COLUMN `college` varchar(150) DEFAULT NULL;

ALTER TABLE `room`
  ADD COLUMN `college` varchar(150) DEFAULT NULL;
