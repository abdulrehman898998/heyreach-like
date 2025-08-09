export function authHeaders(): Record<string, string> {
  // For now, return empty headers since we're using session-based auth
  // The cookies are automatically included in requests
  return {};
}