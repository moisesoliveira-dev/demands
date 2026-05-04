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
}

/** Resposta intermediária quando o backend exige 2FA. */
interface LoginChallengeResponse {
    requer2FA: true;
    /** Token temporário usado na verificação do código. Expira em poucos minutos. */
    challengeToken: string;
    /** Canal escolhido (email/sms/totp) — apenas informativo para a UI. */
    canal?: 'email' | 'sms' | 'totp';
    /** Mascarado, ex: "j***@empresa.com" — apenas informativo. */
    destino?: string;
}

export type LoginResult =
    | { kind: 'authenticated'; user: User; token: string }
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
                // Descarta tokens mock de sessões de desenvolvimento anteriores.
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

    /** Login real contra a API. Mantém o nome `loginMock` por compatibilidade. */
    async loginMock(email: string, senha: string): Promise<LoginResult> {
        return this.login(email, senha);
    }

    /** Etapa 1: envia credenciais. Backend pode responder com sessão completa
     *  (`{ kind: 'authenticated' }`) ou com desafio 2FA (`{ kind: 'challenge' }`). */
    async login(email: string, senha: string): Promise<LoginResult> {
        const useFallback = !environment.production && environment.allowAuthMockFallback;
        const res = await firstValueFrom(
            this.http
                .post<LoginResponse | LoginChallengeResponse>(`${this.base}/login`, { email, senha })
                .pipe(catchError((err) => {
                    // Só usa mock quando o backend está inacessível (erro de rede, status 0).
                    // Erros HTTP reais (401, 400, 500) são propagados para a UI.
                    const isNetworkError = !err?.status;
                    if (useFallback && isNetworkError) return of(this._mockLoginFallback(email, senha));
                    throw err;
                })),
        );

        if (res && (res as LoginChallengeResponse).requer2FA) {
            const challenge = res as LoginChallengeResponse;
            return {
                kind: 'challenge',
                challengeToken: challenge.challengeToken,
                canal: challenge.canal,
                destino: challenge.destino,
            };
        }
        const ok = res as LoginResponse;
        this._state.set({ user: ok.user, token: ok.token, permissions: ok.permissions });
        return { kind: 'authenticated', user: ok.user, token: ok.token };
    }

    /** Etapa 2: confirma o código de 6 dígitos enviado ao usuário. */
    async verificar2FA(challengeToken: string, codigo: string): Promise<{ user: User; token: string }> {
        const useFallback = !environment.production && environment.allowAuthMockFallback;
        const res = await firstValueFrom(
            this.http
                .post<LoginResponse>(`${this.base}/2fa/verificar`, { challengeToken, codigo })
                .pipe(catchError((err) => {
                    const isNetworkError = !err?.status;
                    if (useFallback && isNetworkError) return of(this._mock2FAFallback(challengeToken, codigo));
                    throw err;
                })),
        );
        if (!res) throw new Error('Código inválido ou expirado');
        this._state.set({ user: res.user, token: res.token, permissions: res.permissions });
        return { user: res.user, token: res.token };
    }

    /** Solicita reenvio do código 2FA. */
    async reenviar2FA(challengeToken: string): Promise<void> {
        await firstValueFrom(
            this.http
                .post<{ ok: true }>(`${this.base}/2fa/reenviar`, { challengeToken })
                .pipe(catchError(() => of({ ok: true as const }))),
        );
    }

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

    /** Atualiza dados do próprio usuário (perfil). */
    async atualizarMeuPerfil(input: Partial<Pick<User, 'nome' | 'email' | 'avatar' | 'cargo'>>): Promise<User> {
        const res = await firstValueFrom(
            this.http
                .patch<User>(`${this.base}/me`, input)
                .pipe(catchError(() => of(null))),
        );
        const merged = res ?? ({ ...(this._state().user as User), ...input } as User);
        this._state.update((s) => ({ ...s, user: merged }));
        return merged;
    }

    /** Altera a senha do próprio usuário. */
    async alterarSenha(senhaAtual: string, novaSenha: string): Promise<void> {
        await firstValueFrom(
            this.http
                .post<{ ok: true }>(`${this.base}/me/senha`, { senhaAtual, novaSenha })
                .pipe(catchError(() => of({ ok: true as const }))),
        );
    }

    logout() {
        this._state.set({ user: null, token: null, permissions: [] });
        // best-effort fire-and-forget
        firstValueFrom(this.http.post(`${this.base}/logout`, {})).catch(() => undefined);
    }

    // ── Fallbacks de desenvolvimento (sem backend) ────────────────────────────

    private _mockLoginFallback(email: string, senha: string): LoginChallengeResponse | LoginResponse {
        if (!environment.allowAuthMockFallback || environment.production) {
            throw new Error('Credenciais inválidas');
        }
        if (senha.length < 4) throw new Error('Senha muito curta');
        // Em dev, sempre exigimos 2FA para validar o fluxo (se habilitado)
        if (environment.twoFactorEnabled) {
            return {
                requer2FA: true,
                challengeToken: `challenge-${Date.now()}-${email}`,
                canal: 'email',
                destino: this._maskEmail(email),
            };
        }
        return this._mock2FAFallback(`challenge-${Date.now()}-${email}`, '123456')!;
    }

    private _mock2FAFallback(challengeToken: string, codigo: string): LoginResponse | null {
        if (!environment.allowAuthMockFallback || environment.production) return null;
        if (environment.twoFactorEnabled && codigo !== '123456') return null;
        const email = challengeToken.split('-').slice(2).join('-') || 'admin@fabrica.com';
        const isAdmin = email.startsWith('admin');
        const user: User = {
            id: 'u-' + email,
            nome: this._nameFromEmail(email),
            email,
            cargo: isAdmin ? 'Administrador' : 'Usuário',
            setor: 'Operações',
            role: (isAdmin ? 'admin' : 'operador') as User['role'],
            ativo: true,
            criadoEm: new Date().toISOString(),
            ultimoAcesso: new Date().toISOString(),
        };
        return { token: 'mock-token-' + Date.now(), user, permissions: isAdmin ? ['*'] : ['demanda:read', 'demanda:write'] };
    }

    private _maskEmail(email: string): string {
        const [u, d] = email.split('@');
        if (!u || !d) return email;
        return `${u[0]}${'*'.repeat(Math.max(1, u.length - 2))}${u.slice(-1)}@${d}`;
    }

    private _nameFromEmail(email: string): string {
        const u = email.split('@')[0] ?? 'Usuário';
        return u.charAt(0).toUpperCase() + u.slice(1).replace(/[._-]/g, ' ');
    }
}
