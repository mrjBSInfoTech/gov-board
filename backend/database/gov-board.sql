-- phpMyAdmin SQL Dump
-- Modified: consolidated academic_year + class_section into a single `batch` table
-- Original host: 127.0.0.1
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30
-- Students and officers share the `student` table.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `gov-board`
--

-- --------------------------------------------------------

--
-- Table structure for table `admin`
--

CREATE TABLE `admin` (
  `admin_id` int(11) NOT NULL,
  `username` varchar(100) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `role` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `date_created` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admin`
--

INSERT INTO `admin` (`admin_id`, `username`, `first_name`, `last_name`, `role`, `password`, `date_created`) VALUES
(1, 'Admin', 'John ', 'Doe', 'Admin', '$2b$10$su1lyrGJEUdG2/ROYcqFP.vvWjQdL9sVYPFdWv5uftynaZMAYGenW', '2026-09-10 15:21:28');

-- --------------------------------------------------------

--
-- Table structure for table `announcement`
--

CREATE TABLE `announcement` (
  `announcement_id` int(11) NOT NULL,
  `room_id` int(11) DEFAULT NULL,
  `announcement_body` text NOT NULL,
  `link` varchar(255) DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `date_created` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `batch`
-- (replaces `academic_year` + `class_section`; one row per year+section combo)
--

CREATE TABLE `batch` (
  `batch_id` int(11) NOT NULL,
  `year_name` varchar(50) NOT NULL,
  `section_name` varchar(50) NOT NULL,
  `date_created` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `batch`
--

INSERT INTO `batch` (`batch_id`, `year_name`, `section_name`, `date_created`) VALUES
(1, '1', 'A', '2026-09-22 00:00:00');

-- --------------------------------------------------------

--
-- Table structure for table `room`
--

CREATE TABLE `room` (
  `room_id` int(11) NOT NULL,
  `room_number` varchar(50) NOT NULL,
  `room_name` varchar(100) NOT NULL,
  `date_created` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `room`
--

INSERT INTO `room` (`room_id`, `room_number`, `room_name`, `date_created`) VALUES
(1, 'bly-ogts', 'John Doe\'s Room', '2026-09-10 22:49:57'),
(2, 'ncl-wh4x', 'Jane Doe\'s Room', '2026-09-10 23:23:56');

-- --------------------------------------------------------

--
-- Table structure for table `room_message`
--

CREATE TABLE `room_message` (
  `message_id` int(11) NOT NULL,
  `room_id` int(11) NOT NULL,
  `sender_id` int(11) DEFAULT NULL,
  `sender_type` enum('admin','officer','student') NOT NULL,
  `sender_name` varchar(201) NOT NULL,
  `message` text NOT NULL,
  `date_created` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Explicit membership records; only these records make a person a room member.
CREATE TABLE `room_member` (
  `room_member_id` int(11) NOT NULL,
  `room_id` int(11) NOT NULL,
  `member_type` enum('officer','student') NOT NULL,
  `member_id` int(11) NOT NULL,
  `date_joined` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `student`
--

CREATE TABLE `student` (
  `student_id` int(11) NOT NULL,
  `admin_id` int(11) DEFAULT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `student_number` varchar(150) NOT NULL,
  `position` varchar(100) DEFAULT 'Student',
  `batch_id` int(11) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `role` varchar(100) DEFAULT NULL,
  `can_add` tinyint(1) NOT NULL DEFAULT 0,
  `can_edit` tinyint(1) NOT NULL DEFAULT 0,
  `can_delete` tinyint(1) NOT NULL DEFAULT 0,
  `can_moderate` tinyint(1) NOT NULL DEFAULT 0,
  `date_created` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `student`
--

INSERT INTO `student` (`student_id`, `admin_id`, `first_name`, `last_name`, `student_number`, `position`, `batch_id`, `password`, `role`, `can_add`, `can_edit`, `can_delete`, `can_moderate`, `date_created`) VALUES
(1, 1, 'John', 'Doe', '3000000000', 'Mayor', 1, '$2b$10$70ad/kVr/tcGhcNtMCSk9eALW2w0J8iI3BUytDuO1Mqq0Frqzo5Se', 'officer', 1, 1, 1, 0, '2026-09-10 22:48:15'),
(4, NULL, 'Jake', 'Doe', '1000000000', 'Student', 1, '$2b$10$70ad/kVr/tcGhcNtMCSk9eALW2w0J8iI3BUytDuO1Mqq0Frqzo5Se', NULL, 0, 0, 0, 0, '2026-09-20 22:03:55'),
(5, NULL, 'Joy', 'Doe', '2000000000', 'Student', 1, '$2b$10$70ad/kVr/tcGhcNtMCSk9eALW2w0J8iI3BUytDuO1Mqq0Frqzo5Se', NULL, 0, 0, 0, 0, '2026-09-20 22:08:42');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admin`
--
ALTER TABLE `admin`
  ADD PRIMARY KEY (`admin_id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- Indexes for table `announcement`
--
ALTER TABLE `announcement`
  ADD PRIMARY KEY (`announcement_id`),
  ADD KEY `room_id` (`room_id`);

--
-- Indexes for table `batch`
--
ALTER TABLE `batch`
  ADD PRIMARY KEY (`batch_id`),
  ADD UNIQUE KEY `uq_batch_year_section` (`year_name`,`section_name`);

--
--
-- Indexes for table `room`
--
ALTER TABLE `room`
  ADD PRIMARY KEY (`room_id`);

--
-- Indexes for table `room_message`
--
ALTER TABLE `room_message`
  ADD PRIMARY KEY (`message_id`),
  ADD KEY `room_id` (`room_id`);

-- Indexes for table `room_member`
ALTER TABLE `room_member`
  ADD PRIMARY KEY (`room_member_id`),
  ADD UNIQUE KEY `uq_room_member` (`room_id`,`member_type`,`member_id`),
  ADD KEY `idx_room_member_room` (`room_id`);

--
-- Indexes for table `student`
--
ALTER TABLE `student`
  ADD PRIMARY KEY (`student_id`),
  ADD UNIQUE KEY `student_number` (`student_number`),
  ADD KEY `idx_student_batch_id` (`batch_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admin`
--
ALTER TABLE `admin`
  MODIFY `admin_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `announcement`
--
ALTER TABLE `announcement`
  MODIFY `announcement_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `batch`
--
ALTER TABLE `batch`
  MODIFY `batch_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
--
-- AUTO_INCREMENT for table `room`
--
ALTER TABLE `room`
  MODIFY `room_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `room_message`
--
ALTER TABLE `room_message`
  MODIFY `message_id` int(11) NOT NULL AUTO_INCREMENT;

-- AUTO_INCREMENT for table `room_member`
ALTER TABLE `room_member`
  MODIFY `room_member_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `student`
--
ALTER TABLE `student`
  MODIFY `student_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `announcement`
--
ALTER TABLE `announcement`
  ADD CONSTRAINT `announcement_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `room` (`room_id`) ON DELETE CASCADE;

--
--
-- Constraints for table `room_message`
--
ALTER TABLE `room_message`
  ADD CONSTRAINT `room_message_room_fk` FOREIGN KEY (`room_id`) REFERENCES `room` (`room_id`) ON DELETE CASCADE;

-- Constraints for table `room_member`
ALTER TABLE `room_member`
  ADD CONSTRAINT `room_member_room_fk` FOREIGN KEY (`room_id`) REFERENCES `room` (`room_id`) ON DELETE CASCADE;

--
-- Constraints for table `student`
--
ALTER TABLE `student`
  ADD CONSTRAINT `fk_student_admin` FOREIGN KEY (`admin_id`) REFERENCES `admin` (`admin_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_student_batch` FOREIGN KEY (`batch_id`) REFERENCES `batch` (`batch_id`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
