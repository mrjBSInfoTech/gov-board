import { clearAuthData } from "../../../utils/auth";

export function handleAdminAuthFailure(api) {
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (
        error.response?.status === 403 &&
        error.response.data?.message === "Invalid or expired token."
      ) {
        clearAuthData("admin");
        window.location.assign("/admin/login");
      }

      return Promise.reject(error);
    },
  );
}
