import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
// Replaced MySQL db with Supabase client
import supabase from "../../config/supabase.js"; 

const router = express.Router();

// REGISTER 
// Table: student (student_id, officer_id, room_id, first_name, last_name, student_number, password, date_created)
router.post("/register", async (req, res) => {
  const { first_name, last_name, student_number, password } = req.body;

  if (!first_name || !last_name || !student_number || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Check if student_number already exists
    const { data: existing, error: checkError } = await supabase
      .from("student")
      .select("student_id")
      .eq("student_number", student_number.trim())
      .maybeSingle();

    if (checkError) {
      console.error("DB error:", checkError);
      return res.status(500).json({ message: "Database error" });
    }

    if (existing) {
      return res.status(409).json({ message: "Student number already exists" });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    // Insert new student
    const { data: newStudent, error: insertError } = await supabase
      .from("student")
      .insert([{
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        student_number: student_number.trim(),
        password: hashedPassword
      }])
      .select()
      .single();

    if (insertError) {
      if (insertError.code === "23505") { // PostgreSQL unique violation code
        return res.status(409).json({ message: "Student number already exists" });
      }
      console.error("DB error:", insertError);
      return res.status(500).json({ message: "Database error" });
    }

    res.status(201).json({
      message: "Account created successfully",
      student_id: newStudent.student_id,
    });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// LOGIN 
router.post("/login", async (req, res) => {
  const { student_number, password } = req.body;

  if (!student_number || !password) {
    return res.status(400).json({ message: "Student number and password are required" });
  }

  try {
    const { data: user, error } = await supabase
      .from("student")
      .select("student_id, first_name, last_name, student_number, password")
      .eq("student_number", student_number.trim())
      .maybeSingle();

    if (error) {
      console.error("DB error:", error);
      return res.status(500).json({ message: "Database error" });
    }

    if (!user) {
      return res.status(401).json({ message: "Invalid student number or password" });
    }

    const isMatch = bcrypt.compareSync(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid student number or password" });
    }

    const token = jwt.sign(
      {
        id: user.student_id,
        student_id: user.student_id,
        student_number: user.student_number,
      },
      process.env.JWT_SECRET,
      { expiresIn: "10d" }
    );

    res.json({
      token,
      student_id: user.student_id,
      first_name: user.first_name,
      last_name: user.last_name,
      student_number: user.student_number,
    });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;

{/* 
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../../database/db.js";

const router = express.Router();

// REGISTER 
// Table: student (student_id, officer_id, room_id, first_name, last_name, student_number, password, date_created)
router.post("/register", (req, res) => {
  const { first_name, last_name, student_number, password } = req.body;

  if (!first_name || !last_name || !student_number || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Check if student_number already exists
  db.query(
    "SELECT student_id FROM student WHERE student_number = ?",
    [student_number],
    (err, existing) => {
      if (err) {
        console.error("DB error:", err);
        return res.status(500).json({ message: "Database error" });
      }
      if (existing.length > 0) {
        return res.status(409).json({ message: "Student number already exists" });
      }

      const hashedPassword = bcrypt.hashSync(password, 10);

      const sql = `
        INSERT INTO student (first_name, last_name, student_number, password)
        VALUES (?, ?, ?, ?)`;

      db.query(sql, [first_name.trim(), last_name.trim(), student_number.trim(), hashedPassword], (err, result) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ message: "Student number already exists" });
          }
          console.error("DB error:", err);
          return res.status(500).json({ message: "Database error" });
        }

        res.status(201).json({
          message: "Account created successfully",
          student_id: result.insertId,
        });
      });
    }
  );
});

// LOGIN 
router.post("/login", (req, res) => {
  const { student_number, password } = req.body;

  if (!student_number || !password) {
    return res.status(400).json({ message: "Student number and password are required" });
  }

  const sql = `
    SELECT student_id, first_name, last_name, student_number, password
    FROM student
    WHERE student_number = ?
    LIMIT 1`;

  db.query(sql, [student_number.trim()], (err, result) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (result.length === 0) {
      return res.status(401).json({ message: "Invalid student number or password" });
    }

    const user = result[0];
    const isMatch = bcrypt.compareSync(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid student number or password" });
    }

    const token = jwt.sign(
      {
        id: user.student_id,
        student_id: user.student_id,
        student_number: user.student_number,
      },
      process.env.JWT_SECRET,
      { expiresIn: "10d" }
    );

    res.json({
      token,
      student_id: user.student_id,
      first_name: user.first_name,
      last_name: user.last_name,
      student_number: user.student_number,
    });
  });
});

export default router;
*/}