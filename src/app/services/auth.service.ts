import { Injectable, signal, computed, effect } from '@angular/core';
import { User } from '../types';

const STORAGE_KEY = 'auth-storage';

const MOCK_USERS: (User & { senha: string })[] = [
    { id: '1', nome: 'Administrador', email: 'admin@fabrica.com', senha: '123456', cargo: 'Gerente', setor: 'TI', role: 'admin', ativo: true, criadoEm: new Date().toISOString() },
    { id: '2', nome: 'Carlos Silva', email: 'supervisor@fabrica.com', senha: '123456', cargo: 'Supervisor', setor: 'Produção', role: 'supervisor', ativo: true, criadoEm: new Date().toISOString() },
    { id: '3', nome: 'João Operador', email: 'operador@fabrica.com', senha: '123456', cargo: 'Operador', setor: 'Usinagem', role: 'operador', ativo: true, criadoEm: new Date().toISOString() },
    { id: '4', nome: 'Maria Visualizadora', email: 'visualizador@fabrica.com', senha: '123456', cargo: 'Analista', setor: 'Qualidade', role: 'visualizador', ativo: true, criadoEm: new Date().toISOString() },
];

interface AuthState {
    user: User | null;
    token: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly _state = signal<AuthState>(this.load());

    readonly user = computed(() => this._state().user);
    readonly token = computed(() => this._state().token);
    readonly isAuthenticated = computed(() => !!this._state().token);

    constructor() {
        effect(() => {
            const s = this._state();
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
            } catch { }
        });
    }

    private load(): AuthState {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) return JSON.parse(raw);
        } catch { }
        return { user: null, token: null };
    }

    async loginMock(email: string, senha: string): Promise<{ user: User; token: string }> {
        await new Promise((r) => setTimeout(r, 800));
        const u = MOCK_USERS.find((x) => x.email === email && x.senha === senha);
        if (!u) throw new Error('Credenciais inválidas');
        const { senha: _, ...user } = u;
        const token = `mock-token-${user.id}-${Date.now()}`;
        this._state.set({ user, token });
        return { user, token };
    }

    logout() {
        this._state.set({ user: null, token: null });
    }
}
