/**
 * Configurações de ambiente do frontend (produção).
 * Mesma forma do `environment.ts` — substituído via fileReplacements.
 */
export const environment = {
    production: true,

    apiUrl: '/api',
    aiUrl: '/api/ai',
    aiEnabled: true,
    apiTimeoutMs: 30_000,
    apiRetries: 2,

    realtimeEnabled: false,
    wsUrl: '' as string,

    authStorageKey: 'auth-storage',
    twoFactorEnabled: false,
    allowAuthMockFallback: false,
};

export type AppEnvironment = typeof environment;
