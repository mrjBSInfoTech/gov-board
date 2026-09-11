import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
// Make sure to point this to your actual Supabase configuration file
import supabase from "../../config/supabase.js"; 

const router = express.Router();

// Login route
router.post("/login", async (req, res) => {
  const { first_name, password } = req.body;

  if (!first_name || !password) {
    return res
      .status(400)
      .json({ message: "First name and password are required" });
  }

  try {
    // Supabase query replacing the raw SQL
    const { data: user, error } = await supabase
      .from("admin")
      .select("admin_id, password, first_name, last_name")
      .eq("first_name", first_name)
      .maybeSingle();

    if (error) {
      console.error("DB error:", error);
      return res.status(500).json({ message: "Database error" });
    }

    // If no user is found, user will be null
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = bcrypt.compareSync(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        id: user.admin_id,
        admin_id: user.admin_id,
        first_name: user.first_name,
        last_name: user.last_name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "10d" },
    );

    res.json({
      token,
      admin_id: user.admin_id,
      first_name: user.first_name,
      last_name: user.last_name,
    });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;

// Backup Code
{/*
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../../database/db.js";

const router = express.Router();

// Login route
router.post("/login", async (req, res) => {
  const { first_name, password } = req.body;

  if (!first_name || !password) {
    return res
      .status(400)
      .json({ message: "First name and password are required" });
  }

  const sql = `
    SELECT admin_id, password, first_name, last_name
    FROM admin
    WHERE first_name = ?`;

  db.query(sql, [first_name], (err, result) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (result.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result[0];
    const isMatch = bcrypt.compareSync(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        id: user.admin_id,
        admin_id: user.admin_id,
        first_name: user.first_name,
        last_name: user.last_name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "10d" },
    );

    res.json({
      token,
      admin_id: user.admin_id,
      first_name: user.first_name,
      last_name: user.last_name,
    });
  });
});

export default router;
*/}
