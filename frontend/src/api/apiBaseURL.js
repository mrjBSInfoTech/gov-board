const configuredApiUrl = import.meta.env.VITE_API_URL;
const currentHostApiUrl = `${window.location.protocol}//${window.location.hostname}:5000`;

export const API_BASE_URL = (
  configuredApiUrl || currentHostApiUrl
).replace(/\/+$/, "");
