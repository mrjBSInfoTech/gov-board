import jwt from "jsonwebtoken";

export const authenticateStudent = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!authHeader) {
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });
  }
  if (!token) {
    return res.status(401).json({ message: "Invalid token format." });
  }

  jwt.verify(
    token,
    process.env.JWT_SECRET || "your_secret_key",
    (err, user) => {
      if (err) {
        return res.status(403).json({ message: "Invalid or expired token." });
      }

      const studentId = user.student_id || user.id;
      if (!studentId) {
        return res.status(403).json({ message: "Unable to identify student." });
      }

      req.user = { ...user, student_id: studentId };
      next();
    },
  );
};
