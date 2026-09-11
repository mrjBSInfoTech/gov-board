import express from "express";
import bcrypt from "bcryptjs";
import supabase from "../../config/supabase.js";
import { authenticateAdmin } from "../../middleware/adminAuthMiddleware.js";

const router = express.Router();

// ─── Helpers ────────────────────────────────────────────────────────────────

const toBoolean = (value) =>
  value === true ||
  value === 1 ||
  ["1", "true"].includes(String(value).toLowerCase());

// Map role → default permissions
const rolePermissions = (role, values = {}) => {
  const r = String(role || "officer").toLowerCase();
  if (r === "officer") {
    return { can_add: 1, can_edit: 1, can_delete: 1, can_moderate: 0 };
  }
  if (r === "moderator") {
    return { can_add: 1, can_edit: 1, can_delete: 0, can_moderate: 1 };
  }
  if (r === "viewer") {
    return { can_add: 0, can_edit: 0, can_delete: 0, can_moderate: 0 };
  }
  // customize — use provided values
  return {
    can_add: toBoolean(values.can_add) ? 1 : 0,
    can_edit: toBoolean(values.can_edit) ? 1 : 0,
    can_delete: toBoolean(values.can_delete) ? 1 : 0,
    can_moderate: toBoolean(values.can_moderate) ? 1 : 0,
  };
};

// ─── GET all officer accounts (with roles) ──────────────────────────────────
router.get("/", authenticateAdmin, async (req, res) => {
  try {
    // Supabase auto-joins using foreign keys when you query related tables
    const { data: result, error } = await supabase
      .from("officer")
      .select(`
        officer_id,
        admin_id,
        student_number,
        first_name,
        last_name,
        date_created,
        officer_role (
          officer_role_id,
          role,
          can_add,
          can_edit,
          can_delete,
          can_moderate
        )
      `)
      .order("date_created", { ascending: false });

    if (error) {
      console.error("DB error:", error);
      return res.status(500).json({ message: "Database error" });
    }

    // Flatten the Supabase nested object response to match your old MySQL structure
    const flattenedResult = result.map((officer) => {
      // Handle cases where an officer might not have a role row yet
      const roleData = officer.officer_role && officer.officer_role.length > 0 
          ? officer.officer_role[0] 
          : (officer.officer_role || {});
          
      return {
        officer_id: officer.officer_id,
        admin_id: officer.admin_id,
        student_number: officer.student_number,
        first_name: officer.first_name,
        last_name: officer.last_name,
        date_created: officer.date_created,
        officer_role_id: roleData.officer_role_id || null,
        role: roleData.role || null,
        can_add: roleData.can_add || 0,
        can_edit: roleData.can_edit || 0,
        can_delete: roleData.can_delete || 0,
        can_moderate: roleData.can_moderate || 0,
      };
    });

    res.json(flattenedResult);
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── POST create new officer account ─────────────────────────────────
router.post("/", authenticateAdmin, async (req, res) => {
  const {
    student_number,
    first_name,
    last_name,
    password,
    role,
    can_add,
    can_edit,
    can_delete,
    can_moderate,
  } = req.body;

  if (!first_name || !last_name || !password || !student_number) {
    return res.status(400).json({ message: "Please fill all the required fields" });
  }

  const permissions = rolePermissions(role, { can_add, can_edit, can_delete, can_moderate });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const adminId = req.user.admin_id;

    // Step 1: Insert officer
    const { data: newOfficer, error: officerError } = await supabase
      .from("officer")
      .insert([{
        admin_id: adminId,
        student_number: student_number.trim(),
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        password: hashedPassword
      }])
      .select()
      .single();

    if (officerError) {
      console.error("DB error (officer):", officerError);
      return res.status(500).json({ message: "Database error" });
    }

    const officerId = newOfficer.officer_id;

    // Step 2: Insert officer_role
    const { error: roleError } = await supabase
      .from("officer_role")
      .insert([{
        officer_id: officerId,
        role: role,
        can_add: permissions.can_add,
        can_edit: permissions.can_edit,
        can_delete: permissions.can_delete,
        can_moderate: permissions.can_moderate
      }]);

    if (roleError) {
      // Manual Rollback: Delete the newly created officer if role fails
      await supabase.from("officer").delete().eq("officer_id", officerId);
      console.error("DB error (role):", roleError);
      return res.status(500).json({ message: "Database error during role assignment" });
    }

    res.status(201).json({ message: "Officer account created successfully" });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── PUT update officer account + role ──────────────────────────────────────
router.put("/:id", authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const {
    student_number,
    first_name,
    last_name,
    password,
    role,
    can_add,
    can_edit,
    can_delete,
    can_moderate,
  } = req.body;

  if (!first_name || !last_name) {
    return res.status(400).json({ message: "Please fill all the required fields" });
  }

  try {
    // Prepare update object
    const updateData = {
      student_number: student_number.trim(),
      first_name: first_name.trim(),
      last_name: last_name.trim()
    };
    
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Update officer
    const { data: updatedOfficer, error: officerError } = await supabase
      .from("officer")
      .update(updateData)
      .eq("officer_id", id)
      .select();

    if (officerError) {
      console.error("DB error:", officerError);
      return res.status(500).json({ message: "Database error" });
    }

    if (!updatedOfficer || updatedOfficer.length === 0) {
      return res.status(404).json({ message: "Officer not found" });
    }

    // Upsert officer_role
    const permissions = rolePermissions(role || "officer", { can_add, can_edit, can_delete, can_moderate });
    
    const { error: roleError } = await supabase
      .from("officer_role")
      .upsert({
        officer_id: id,
        role: role || "officer",
        can_add: permissions.can_add,
        can_edit: permissions.can_edit,
        can_delete: permissions.can_delete,
        can_moderate: permissions.can_moderate
      }, { onConflict: 'officer_id' }); // Relies on officer_id being UNIQUE in officer_role table

    if (roleError) {
      console.error("DB error:", roleError);
      return res.status(500).json({ message: "Database error while updating roles" });
    }

    res.json({ message: "Officer account updated" });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── DELETE officer account ──────────────────────────────────────────────────
router.delete("/:id", authenticateAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    // Delete role first to mimic the original manual cascading logic
    const { error: roleError } = await supabase
      .from("officer_role")
      .delete()
      .eq("officer_id", id);

    if (roleError) {
      console.error("DB error:", roleError);
      return res.status(500).json({ message: "Database error deleting roles" });
    }

    // Delete officer
    const { data, error: officerError } = await supabase
      .from("officer")
      .delete()
      .eq("officer_id", id)
      .select();

    if (officerError) {
      console.error("DB error:", officerError);
      return res.status(500).json({ message: "Database error deleting officer" });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ message: "Officer not found" });
    }

    res.json({ message: "Officer account deleted successfully" });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;


// Backup Code
{/*
import express from "express";
import bcrypt from "bcryptjs";
import db from "../../database/db.js";
import { authenticateAdmin } from "../../middleware/adminAuthMiddleware.js";

const router = express.Router();

// ─── Helpers ────────────────────────────────────────────────────────────────

const toBoolean = (value) =>
  value === true ||
  value === 1 ||
  ["1", "true"].includes(String(value).toLowerCase());

// Map role → default permissions
const rolePermissions = (role, values = {}) => {
  const r = String(role || "officer").toLowerCase();
  if (r === "officer") {
    return { can_add: 1, can_edit: 1, can_delete: 1, can_moderate: 0 };
  }
  if (r === "moderator") {
    return { can_add: 1, can_edit: 1, can_delete: 0, can_moderate: 1 };
  }
  if (r === "viewer") {
    return { can_add: 0, can_edit: 0, can_delete: 0, can_moderate: 0 };
  }
  // customize — use provided values
  return {
    can_add: toBoolean(values.can_add) ? 1 : 0,
    can_edit: toBoolean(values.can_edit) ? 1 : 0,
    can_delete: toBoolean(values.can_delete) ? 1 : 0,
    can_moderate: toBoolean(values.can_moderate) ? 1 : 0,
  };
};

// ─── GET all officer accounts (with roles) ──────────────────────────────────
router.get("/", authenticateAdmin, (req, res) => {
  const sql = `
    SELECT
      o.officer_id,
      o.admin_id,
      o.student_number,
      o.first_name,
      o.last_name,
      o.date_created,
      r.officer_role_id,
      r.role,
      r.can_add,
      r.can_edit,
      r.can_delete,
      r.can_moderate
    FROM officer o
    LEFT JOIN officer_role r ON o.officer_id = r.officer_id
    ORDER BY o.date_created DESC`;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ message: "Database error" });
    }
    res.json(result);
  });
});

// ─── POST create new officer account ─────────────────────────────────
router.post("/", authenticateAdmin, async (req, res) => {
  const {
    student_number,
    first_name,
    last_name,
    password,
    role,
    can_add,
    can_edit,
    can_delete,
    can_moderate,
  } = req.body;

  if (!first_name || !last_name || !password || !student_number) {
    return res.status(400).json({ message: "Please fill all the required fields" });
  }

  const permissions = rolePermissions(role, { can_add, can_edit, can_delete, can_moderate });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const adminId = req.user.admin_id;

    db.beginTransaction((err) => {
      if (err) return res.status(500).json({ message: "Transaction error" });

      // Insert officer
      const sqlOfficer = `
        INSERT INTO officer (admin_id, student_number, first_name, last_name, password, date_created)
        VALUES (?, ?, ?, ?, ?, NOW())`;

      db.query(sqlOfficer, [adminId, student_number.trim(), first_name.trim(), last_name.trim(), hashedPassword], (err, result) => {
        if (err) {
          return db.rollback(() => {
            console.error("DB error:", err);
            res.status(500).json({ message: "Database error" });
          });
        }

        const officerId = result.insertId;

        // Insert officer_role
        const sqlRole = `
          INSERT INTO officer_role (officer_id, role, can_add, can_edit, can_delete, can_moderate)
          VALUES (?, ?, ?, ?, ?, ?)`;

        db.query(
          sqlRole,
          [officerId, role, permissions.can_add, permissions.can_edit, permissions.can_delete, permissions.can_moderate],
          (err) => {
            if (err) {
              return db.rollback(() => {
                console.error("DB error:", err);
                res.status(500).json({ message: "Database error" });
              });
            }

            db.commit((err) => {
              if (err) {
                return db.rollback(() => res.status(500).json({ message: "Commit error" }));
              }
              res.status(201).json({ message: "Officer account created sucessfully"});
            });
          }
        );
      });
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── PUT update officer account + role ──────────────────────────────────────
router.put("/:id", authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const {
    student_number,
    first_name,
    last_name,
    password,
    role,
    can_add,
    can_edit,
    can_delete,
    can_moderate,
  } = req.body;

  if (!first_name || !last_name) {
    return res.status(400).json({ message: "Please fill all the required fields" });
  }

  try {
    db.beginTransaction(async (err) => {
      if (err) return res.status(500).json({ message: "Transaction error" });

      // Update officer
      let sqlOfficer, officerParams;
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        sqlOfficer = `UPDATE officer SET student_number = ?, first_name = ?, last_name = ?, password = ? WHERE officer_id = ?`;
        officerParams = [student_number.trim(), first_name.trim(), last_name.trim(), hashedPassword, id];
      } else {
        sqlOfficer = `UPDATE officer SET student_number = ?, first_name = ?, last_name = ? WHERE officer_id = ?`;
        officerParams = [student_number.trim(), first_name.trim(), last_name.trim(), id];
      }

      db.query(sqlOfficer, officerParams, (err, result) => {
        if (err) {
          return db.rollback(() => {
            console.error("DB error:", err);
            res.status(500).json({ message: "Database error" });
          });
        }
        if (result.affectedRows === 0) {
          return db.rollback(() => res.status(404).json({ message: "Officer not found" }));
        }

        // Update officer_role (upsert)
        const permissions = rolePermissions(role || "officer", { can_add, can_edit, can_delete, can_moderate });

        const sqlRole = `
          INSERT INTO officer_role (officer_id, role, can_add, can_edit, can_delete, can_moderate)
          VALUES (?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            role = VALUES(role),
            can_add = VALUES(can_add),
            can_edit = VALUES(can_edit),
            can_delete = VALUES(can_delete),
            can_moderate = VALUES(can_moderate)`;

        db.query(
          sqlRole,
          [id, role || "officer", permissions.can_add, permissions.can_edit, permissions.can_delete, permissions.can_moderate],
          (err) => {
            if (err) {
              return db.rollback(() => {
                console.error("DB error:", err);
                res.status(500).json({ message: "Database error" });
              });
            }

            db.commit((err) => {
              if (err) return db.rollback(() => res.status(500).json({ message: "Commit error" }));
              res.json({ message: "Officer account updated" });
            });
          }
        );
      });
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── DELETE officer account ──────────────────────────────────────────────────
router.delete("/:id", authenticateAdmin, (req, res) => {
  const { id } = req.params;

  // officer_role will cascade if FK is set; otherwise delete manually first
  db.query("DELETE FROM officer_role WHERE officer_id = ?", [id], (err) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    db.query("DELETE FROM officer WHERE officer_id = ?", [id], (err, result) => {
      if (err) {
        console.error("DB error:", err);
        return res.status(500).json({ message: "Database error" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Officer not found" });
      }
      res.json({ message: "Officer account deleted sucessfully" });
    });
  });
});

export default router;
*/}