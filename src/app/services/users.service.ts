import { Injectable, signal, effect } from '@angular/core';
import { User, CreateUserInput, UpdateUserInput } from '../types';

const KEY = 'usuarios-sistema';

const defaults: User[] = [
    { id: '1', nome: 'Administrador', email: 'admin@fabrica.com', cargo: 'Gerente', setor: 'TI', role: 'admin', ativo: true, criadoEm: new Date().toISOString(), ultimoAcesso: new Date().toISOString() },
    { id: '2', nome: 'Carlos Silva', email: 'supervisor@fabrica.com', cargo: 'Supervisor', setor: 'Produção', role: 'supervisor', ativo: true, criadoEm: new Date().toISOString(), ultimoAcesso: new Date().toISOString() },
    { id: '3', nome: 'João Operador', email: 'operador@fabrica.com', cargo: 'Operador', setor: 'Usinagem', role: 'operador', ativo: true, criadoEm: new Date().toISOString(), ultimoAcesso: new Date().toISOString() },
];

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

@Injectable({ providedIn: 'root' })
export class UsersService {
    private readonly _users = signal<User[]>(this.load());
    readonly users = this._users.asReadonly();

    constructor() {
        effect(() => {
            try { localStorage.setItem(KEY, JSON.stringify(this._users())); } catch { }
        });
    }

    private load(): User[] {
        try {
            const raw = localStorage.getItem(KEY);
            if (raw) return JSON.parse(raw);
        } catch { }
        return defaults;
    }

    async listar() { await delay(200); return this._users(); }

    async criar(input: CreateUserInput): Promise<User> {
        await delay(400);
        if (this._users().some((u) => u.email === input.email)) throw new Error('Já existe um usuário com este email');
        const novo: User = {
            id: Date.now().toString(),
            nome: input.nome, email: input.email, cargo: input.cargo, setor: input.setor,
            role: input.role, customPermissions: input.customPermissions,
            ativo: true, criadoEm: new Date().toISOString(),
        };
        this._users.update((arr) => [...arr, novo]);
        return novo;
    }

    async atualizar(id: string, input: UpdateUserInput): Promise<User> {
        await delay(400);
        let updated: User | undefined;
        this._users.update((arr) => arr.map((u) => {
            if (u.id !== id) return u;
            updated = { ...u, ...input };
            return updated;
        }));
        if (!updated) throw new Error('Usuário não encontrado');
        return updated;
    }

    async excluir(id: string) {
        await delay(300);
        this._users.update((arr) => arr.filter((u) => u.id !== id));
    }

    async toggleAtivo(id: string, ativo: boolean) { return this.atualizar(id, { ativo }); }
}
