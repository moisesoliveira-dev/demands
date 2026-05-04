/**
 * Configurações de ambiente do frontend (produção).
 * Mesma forma do `environment.ts` — substituído via fileReplacements.
 */
export const environment = {
    production: true,

    apiUrl: '/api',
    apiTimeoutMs: 30_000,
    apiRetries: 2,

    realtimeEnabled: false,
    wsUrl: '' as string,

    authStorageKey: 'auth-storage',
    twoFactorEnabled: false,
    allowAuthMockFallback: false,

    appName: 'Demandas',
    appVersion: '0.1.0',
    defaultTheme: 'light' as 'light' | 'dark' | 'system',
    animationsEnabled: true,

    features: {
        triagemChat: true,
        relatoriosCsv: true,
        kanbanDragDrop: true,
        notificacoesPush: false,
    },

    telemetryUrl: '' as string,
    debug: false,
};

export type AppEnvironment = typeof environment;
