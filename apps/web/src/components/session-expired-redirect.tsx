"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export const SESSION_EXPIRED_PATH = "/auth/session-expired";

/**
 * Clears the web session (via the route handler) and sends the user straight
 * to the sign-in page instead of showing a "session expired" screen.
 */
export function SessionExpiredRedirect() {
  useEffect(() => {
    window.location.replace(SESSION_EXPIRED_PATH);
  }, []);

  return (
    <div
      className="flex min-h-[400px] items-center justify-center"
      role="status"
      aria-label="Redirecionando para o login"
    >
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
