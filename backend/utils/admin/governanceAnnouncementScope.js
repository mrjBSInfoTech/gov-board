export const getGovernanceAnnouncementDeleteScope = (user) =>
  user.is_super_admin
    ? { sql: "", params: [] }
    : {
        sql: " AND visibility_scope = 'college' AND LOWER(college) = LOWER(?)",
        params: [user.college],
      };
