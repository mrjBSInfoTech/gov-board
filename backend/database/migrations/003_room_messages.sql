CREATE TABLE IF NOT EXISTS room_message (
  message_id INT NOT NULL AUTO_INCREMENT,
  room_id INT NOT NULL,
  sender_id INT DEFAULT NULL,
  sender_type ENUM('officer', 'student') NOT NULL,
  sender_name VARCHAR(201) NOT NULL,
  message TEXT NOT NULL,
  date_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (message_id),
  KEY room_id (room_id),
  CONSTRAINT room_message_room_fk FOREIGN KEY (room_id) REFERENCES room (room_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
