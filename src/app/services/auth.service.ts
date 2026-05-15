import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { User } from '../types';

const STORAGE_KEY = environment.authStorageKey;

interface AuthState {
    user: User | null;
    token: string | null;
    permissions: string[];
}

interface LoginResponse {
    token: string;
    user: User;
    permissions: string[];
    menus?: unknown[];
}

export type LoginResult =
    | { kind: 'authenticated'; user: User; token: string }
    /** Mantido por compatibilidade - 2FA nao habilitado no backend corporativo. */
    | { kind: 'challenge'; challengeToken: string; canal?: string; destino?: string };

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiUrl}/auth`;

    private readonly _state = signal<AuthState>(this.load());

    readonly user = computed(() => this._state().user);
    readonly token = computed(() => this._state().token);
    readonly permissions = computed(() => this._state().permissions);
    readonly isAuthenticated = computed(() => !!this._state().token);

    constructor() {
        effect(() => {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(this._state()));
            } catch { }
        });
    }

    private load(): AuthState {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw) as Partial<AuthState>;
                // Descarta tokens mock de sessoes de desenvolvimento anteriores.
                if (typeof parsed.token === 'string' && parsed.token.startsWith('mock-token-')) {
                    localStorage.removeItem(STORAGE_KEY);
                    return { user: null, token: null, permissions: [] };
                }
                return {
                    user: parsed.user ?? null,
                    token: parsed.token ?? null,
                    permissions: parsed.permissions ?? [],
                };
            }
        } catch { }
        return { user: null, token: null, permissions: [] };
    }

    /** Mantido por compatibilidade de chamada. */
    async loginMock(usua_login: string, usua_senha: string): Promise<LoginResult> {
        return this.login(usua_login, usua_senha);
    }

    /**
     * Login corporativo: envia usua_login + usua_senha para o backend,
     * que valida contra o banco dbacesso (somente leitura). Sem 2FA.
     */
    async login(usua_login: string, usua_senha: string): Promise<LoginResult> {
        const useFallback = !environment.production && environment.allowAuthMockFallback;
        const res = await firstValueFrom(
            this.http
                .post<LoginResponse>(`${this.base}/login`, { usua_login, usua_senha })
                .pipe(catchError((err) => {
                    const isNetworkError = !err?.status;
                    if (useFallback && isNetworkError) return of(this._mockLoginFallback(usua_login));
                    throw err;
                })),
        );

        this._state.set({ user: res.user, token: res.token, permissions: res.permissions ?? [] });
        return { kind: 'authenticated', user: res.user, token: res.token };
    }

    /**
     * Stub para compatibilidade com o fluxo de 2FA existente na UI.
     * O backend corporativo nao suporta 2FA - este metodo nunca sera chamado
     * com sucesso, mas evita erros de compilacao.
     */
    async verificar2FA(_challengeToken: string, _codigo: string): Promise<{ user: User; token: string }> {
        throw new Error('2FA nao habilitado neste sistema.');
    }

    /** Stub - 2FA nao habilitado. */
    async reenviar2FA(_challengeToken: string): Promise<void> { }

    async refreshMe(): Promise<void> {
        if (!this._state().token) return;
        try {
            const res = await firstValueFrom(
                this.http.get<{ user: User; permissions: string[] }>(`${this.base}/me`),
            );
            this._state.update((s) => ({ ...s, user: res.user, permissions: res.permissions }));
        } catch {
            // 401 already handled by interceptor
        }
    }

    /** Atualizacao de perfil nao suportada - dados gerenciados pelo dbacesso. */
    async atualizarMeuPerfil(input: Partial<Pick<User, 'nome' | 'email' | 'avatar' | 'cargo'>>): Promise<User> {
        // Backend retorna 501; retorna os dados locais sem errar na UI.
        const merged = { ...(this._state().user as User), ...input } as User;
        return merged;
    }

    /** Troca de senha nao suportada - senha gerenciada no dbacesso. */
    async alterarSenha(_senhaAtual: string, _novaSenha: string): Promise<void> { }

    logout() {
        this._state.set({ user: null, token: null, permissions: [] });
        firstValueFrom(this.http.post(`${this.base}/logout`, {})).catch(() => undefined);
    }

    // -- Fallback de desenvolvimento (sem backend) -------------------------

    private _mockLoginFallback(usua_login: string): LoginResponse {
        if (!environment.allowAuthMockFallback || environment.production) {
            throw new Error('Credenciais invalidas');
        }
        const isAdmin = usua_login.toLowerCase().includes('admin');
        const user: User = {
            id: 'u-' + usua_login,
            nome: usua_login,
            email: usua_login + '@local.dev',
            usua_login,
            role: (isAdmin ? 'admin' : 'operador') as User['role'],
            ativo: true,
        };
        return { token: 'mock-token-' + Date.now(), user, permissions: isAdmin ? ['*'] : ['demanda:read'] };
    }
}