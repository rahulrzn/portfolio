// Future integration boundary only; the local repository makes no API calls.
export const apiConfig = Object.freeze({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
});
