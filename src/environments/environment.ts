/**
 * Configurações de ambiente do frontend (development).
 *
 * Para alterar a URL do backend ou habilitar/desabilitar features,
 * edite as chaves abaixo. Tudo aqui é estaticamente substituído no build.
 *
 * Em produção, este arquivo é substituído por `environment.production.ts`
 * via `fileReplacements` no angular.json.
 */
export const environment = {
    production: false,

    // ── HTTP / API ──────────────────────────────────────────────────────────
    /** URL base da API REST. Inclua o prefixo /api se houver. */
    apiUrl: 'http://localhost:3000/api',
    /** URL base do proxy de IA — roteado via NestJS (que encaminha ao Agno). */
    aiUrl: 'http://localhost:3000/api/ai',
    /** Habilita features de IA (chat de relatórios, triagem assistida). */
    aiEnabled: true,
    /** Timeout (ms) padrão de requisições HTTP. 0 = sem timeout. */
    apiTimeoutMs: 30_000,
    /** Quantidade de retries automáticos em falhas de rede (5xx / network). */
    apiRetries: 1,

    // ── Realtime (WebSocket) ────────────────────────────────────────────────
    /** Liga o cliente WebSocket de notificações em tempo real. */
    realtimeEnabled: false,
    /** URL absoluta do WS. Se vazio, é derivada de `apiUrl`. */
    wsUrl: '' as string,

    // ── Autenticação ────────────────────────────────────────────────────────
    /** Chave usada no localStorage para persistir sessão. */
    authStorageKey: 'auth-storage',
    /** Habilita o fluxo de 2FA (front exige código após login). */
    twoFactorEnabled: false,
    /** Permite o "fallback mock" do AuthService quando backend está fora (apenas dev).
     *  Mantenha false para garantir sistema virgem — login exige backend real. */
    allowAuthMockFallback: false,

    // ── UI ──────────────────────────────────────────────────────────────────
    appName: 'Demandas',
    appVersion: '0.1.0',
    /** Tema padrão se nenhum estiver salvo. */
    defaultTheme: 'light' as 'light' | 'dark' | 'system',
    /** Liga animações pesadas (GSAP, Motion). */
    animationsEnabled: true,

    // ── Feature flags ───────────────────────────────────────────────────────
    features: {
        triagemChat: true,
        relatoriosCsv: true,
        kanbanDragDrop: true,
        notificacoesPush: false,
    },

    // ── Observabilidade (opcional) ──────────────────────────────────────────
    /** URL do endpoint de logs/erros. Vazio = desabilitado. */
    telemetryUrl: '' as string,
    /** Liga logs detalhados no console. */
    debug: true,
};

export type AppEnvironment = typeof environment;
