import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { User } from '../types';

const STORAGE_KEY = 'auth-storage';

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
    async loginMock(email: string, senha: string): Promise<{ user: User; token: string }> {
        return this.login(email, senha);
    }

    async login(email: string, senha: string): Promise<{ user: User; token: string }> {
        const res = await firstValueFrom(
            this.http.post<LoginResponse>(`${this.base}/login`, { email, senha }),
        );
        this._state.set({ user: res.user, token: res.token, permissions: res.permissions });
        return { user: res.user, token: res.token };
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

    logout() {
        this._state.set({ user: null, token: null, permissions: [] });
        // best-effort fire-and-forget
        firstValueFrom(this.http.post(`${this.base}/logout`, {})).catch(() => undefined);
    }
}
