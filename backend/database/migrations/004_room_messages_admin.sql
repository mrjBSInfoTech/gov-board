ALTER TABLE room_message
  MODIFY sender_type ENUM('admin', 'officer', 'student') NOT NULL;
