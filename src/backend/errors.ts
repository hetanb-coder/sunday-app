export type BackendErrorCode =
  | 'not_configured'
  | 'network_error'
  | 'not_authorized'
  | 'invalid_credentials'
  | 'invite_invalid'
  | 'invite_expired'
  | 'conflict'
  | 'unknown';

export class BackendError extends Error {
  constructor(
    public readonly code: BackendErrorCode,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'BackendError';
  }
}

export type BackendErrorDiagnostics = {
  code: string;
  message: string;
  details: string | null;
  hint: string | null;
};

const readErrorField = (error: unknown, field: string) => {
  if (!error || typeof error !== 'object' || !(field in error)) return null;
  const value = (error as Record<string, unknown>)[field];
  return typeof value === 'string' && value.length > 0 ? value : null;
};

export const toBackendError = (error: unknown): BackendError => {
  if (error instanceof BackendError) return error;
  const message = readErrorField(error, 'message')
    ?? (error instanceof Error ? error.message : String(error));
  const normalized = message.toLowerCase();
  const code: BackendErrorCode =
    normalized.includes('not configured')
      ? 'not_configured'
      : normalized.includes('invalid login') || normalized.includes('credentials')
        ? 'invalid_credentials'
        : normalized.includes('permission') || normalized.includes('row-level security')
          ? 'not_authorized'
          : normalized.includes('expired')
            ? 'invite_expired'
            : normalized.includes('invite') && normalized.includes('invalid')
              ? 'invite_invalid'
              : normalized.includes('network') || normalized.includes('fetch')
                ? 'network_error'
                : normalized.includes('duplicate') || normalized.includes('unique')
                  ? 'conflict'
                  : 'unknown';
  return new BackendError(code, 'We could not complete that request.', error);
};

export const getBackendErrorDiagnostics = (error: unknown): BackendErrorDiagnostics => {
  const backendError = toBackendError(error);
  const source = backendError.cause ?? error;
  return {
    code: readErrorField(source, 'code') ?? backendError.code,
    message: readErrorField(source, 'message') ?? backendError.message,
    details: readErrorField(source, 'details'),
    hint: readErrorField(source, 'hint'),
  };
};

export const logSupabaseError = (
  operation: string,
  rpcName: string,
  error: unknown
) => {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;
  const diagnostics = getBackendErrorDiagnostics(error);
  console.error('[Sunday Supabase]', {
    operation,
    rpc: rpcName,
    code: diagnostics.code,
    message: diagnostics.message,
    details: diagnostics.details,
    hint: diagnostics.hint,
  });
};
