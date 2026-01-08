export type FeatureFlags = {
  /** When true, UI will use in-memory mock notes if backend is unreachable (or explicitly enabled). */
  mockData?: boolean;
};

/**
 * Parse a simple key=value,comma-separated env string into a feature flags object.
 * Example: "mockData=true,foo=bar"
 */
function parseFeatureFlags(raw: string | undefined): FeatureFlags {
  if (!raw) return {};
  const out: Record<string, unknown> = {};
  for (const part of raw.split(',')) {
    const [k, v] = part.split('=').map((s) => s.trim());
    if (!k) continue;
    if (v === undefined || v === '') {
      out[k] = true;
      continue;
    }
    const low = v.toLowerCase();
    if (low === 'true') out[k] = true;
    else if (low === 'false') out[k] = false;
    else out[k] = v;
  }
  return out as FeatureFlags;
}

/**
 * Best-effort runtime env accessor that works in:
 * - browser builds (process may be polyfilled)
 * - SSR node runtime (process.env available)
 */
function readProcessEnv(key: string): string | undefined {
  try {
    const maybeProcess: unknown = (globalThis as unknown as { process?: unknown })
      .process;

    if (!maybeProcess || typeof maybeProcess !== 'object') return undefined;

    const maybeEnv: unknown = (maybeProcess as { env?: unknown }).env;
    if (!maybeEnv || typeof maybeEnv !== 'object') return undefined;

    const v: unknown = (maybeEnv as Record<string, unknown>)[key];
    return typeof v === 'string' ? v : undefined;
  } catch {
    return undefined;
  }
}

// PUBLIC_INTERFACE
export function getApiBaseUrl(): string {
  /**
   * Prefer NG_APP_API_BASE; fall back to NG_APP_BACKEND_URL.
   * If neither exists, default to same-origin (empty base) so relative /notes works.
   */
  const fromApiBase = readProcessEnv('NG_APP_API_BASE');
  const fromBackendUrl = readProcessEnv('NG_APP_BACKEND_URL');
  const base = (fromApiBase || fromBackendUrl || '').trim();

  // Normalize: remove trailing slash so we can safely append "/notes"
  return base.endsWith('/') ? base.slice(0, -1) : base;
}

// PUBLIC_INTERFACE
export function getFeatureFlags(): FeatureFlags {
  return parseFeatureFlags(readProcessEnv('NG_APP_FEATURE_FLAGS'));
}
