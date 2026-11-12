import jwt from "jsonwebtoken";

export const authenticateBudgetContributor = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!authHeader) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }
  if (!token) {
    return res.status(401).json({ message: "Invalid token format." });
  }

  jwt.verify(token, process.env.JWT_SECRET || "your_secret_key", (error, user) => {
    if (error) {
      return res.status(403).json({ message: "Invalid or expired token." });
    }

    const memberId = user.officer_id || user.student_id || user.id;
    if (!memberId) {
      return res.status(403).json({ message: "Unable to identify room member." });
    }

    req.user = {
      member_id: memberId,
      ...(user.officer_id
        ? { officer_id: memberId }
        : { student_id: memberId }),
    };
    next();
  });
};
