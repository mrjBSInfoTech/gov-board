const COMMON_AUTH_KEYS = ["auth_section"];

// For admin part
const ADMIN_AUTH_KEYS = [
  "admin_token",
  "admin_first_name",
  "admin_last_name",
];

// For student part
const STUDENT_AUTH_KEYS = [
  "student_token",
  "student_student_number",
  "student_first_name",
  "student_middle_name",
  "student_last_name",
  "student_email",
  "student_phone_number",
];
// For officer part
const OFFICER_AUTH_KEYS = [
  "officer_token",
  "officer_officer_id",
  "officer_first_name",
  "officer_last_name",
  "officer_position",
  "officer_email",
  "officer_phone_number",
];

const TOKEN_KEYS = {
  admin: "admin_token",
  student: "student_token",
  officer: "officer_token",
};

export function clearAuthData(section = null) {
  if (section === "admin") {
    ADMIN_AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
    // If the active track matches, clear the section marker too
    if (localStorage.getItem("auth_section") === "admin") {
      localStorage.removeItem("auth_section");
    }
  } else if (section === "student") {
    STUDENT_AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
    // If the active track matches, clear the section marker too
    if (localStorage.getItem("auth_section") === "student") {
      localStorage.removeItem("auth_section");
    }
  } else if (section === "officer") {
    OFFICER_AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
    // If the active track matches, clear the section marker too
    if (localStorage.getItem("auth_section") === "officer") {
      localStorage.removeItem("auth_section");
    }
  } else {
    // Brutal cleanup: Wipe absolutely everything out to be completely safe
    ADMIN_AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
    STUDENT_AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
    OFFICER_AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
    COMMON_AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
    localStorage.removeItem("token"); // Clean up legacy key remnants
  }
}

/**
 * Decodes and checks if a given JWT string is structurally sound and unexpired.
 */
export function hasValidToken(token) {
  if (!token) return false;

  try {
    const parts = token.split(".");
    if (parts.length < 2) return false;

    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(
      decodeURIComponent(
        atob(payload)
          .split("")
          .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
          .join(""),
      ),
    );

    if (decoded.exp) {
      return Date.now() < decoded.exp * 1000;
    }

    return true;
  } catch (error) {
    console.warn("Invalid token format evaluation failed.", error);
    return false;
  }
}

/**
 * Evaluates whether a user has permission to access a targeted section.
 * Expects explicit string parameter: "public" or "private"
 */
export function isAuthenticated(section) {
  if (!section) return false;

  const token = getToken(section);
  if (!hasValidToken(token)) return false;

  // Ensure they possess the token assigned specifically to this sub-route segment
  return true;
}

export function setAuthSection(section) {
  localStorage.setItem("auth_section", section);
}

export function getAuthSection() {
  return localStorage.getItem("auth_section");
}

/**
 * Sets a token to its dedicated key assignment based on panel scope
 */
export function setToken(section, token) {
  if (!token || !TOKEN_KEYS[section]) return;
  localStorage.setItem(TOKEN_KEYS[section], token);
  setAuthSection(section);
}

/**
 * Gets a token strictly matching the requested panel scope
 */
export function getToken(section) {
  const key = TOKEN_KEYS[section];
  return key ? localStorage.getItem(key) : null;
}

/**
 * Clears out individual token data and sections
 */
export function removeToken(section) {
  if (!section || !TOKEN_KEYS[section]) return;
  
  localStorage.removeItem(TOKEN_KEYS[section]);
  if (localStorage.getItem("auth_section") === section) {
    localStorage.removeItem("auth_section");
  }
}