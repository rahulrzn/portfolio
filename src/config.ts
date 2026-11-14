// The Pages frontend and Functions API share an origin, including through Vite's local proxy.
export const apiConfig = Object.freeze({
  baseUrl: (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, ''),
});
