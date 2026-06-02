import { createAuthClient } from "better-auth/react";

function resolveAuthBaseURL() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return (
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000"
  );
}

export const authClient = createAuthClient({
  baseURL: resolveAuthBaseURL(),
});