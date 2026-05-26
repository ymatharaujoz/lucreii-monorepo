const AUTH_ERROR_MESSAGES = {
  oauth_complete_failed: "Não foi possível concluir o login com Google. Tente de novo.",
  oauth_start_failed: "Não foi possível iniciar o login com Google. Tente de novo.",
} as const;

export function resolveAuthErrorMessage(
  authError: string | string[] | undefined,
): string | null {
  const errorCode = Array.isArray(authError) ? authError[0] : authError;

  if (!errorCode) {
    return null;
  }

  return AUTH_ERROR_MESSAGES[errorCode as keyof typeof AUTH_ERROR_MESSAGES] ?? null;
}
