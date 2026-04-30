import { Injectable, signal, computed, effect } from '@angular/core';
import { Notificacao } from '../types';

const KEY = 'notificacoes-storage';

@Injectable({ providedIn: 'root' })
export class NotificacoesService {
    private readonly _items = signal<Notificacao[]>(this.load());

    readonly items = this._items.asReadonly();
    readonly contadorNaoLidas = computed(() => this._items().filter((n) => !n.lida).length);

    constructor() {
        effect(() => {
            try { localStorage.setItem(KEY, JSON.stringify(this._items())); } catch { }
        });
    }

    private load(): Notificacao[] {
        try {
            const raw = localStorage.getItem(KEY);
            if (raw) return JSON.parse(raw);
        } catch { }
        return [];
    }

    adicionar(n: Omit<Notificacao, 'id' | 'lida' | 'timestamp'>) {
        const nova: Notificacao = { ...n, id: `not_${Date.now()}`, lida: false, timestamp: new Date().toISOString() };
        this._items.update((arr) => [nova, ...arr].slice(0, 50));
    }

    marcarLida(id: string) {
        this._items.update((arr) => arr.map((n) => (n.id === id ? { ...n, lida: true } : n)));
    }

    marcarTodasLidas() {
        this._items.update((arr) => arr.map((n) => ({ ...n, lida: true })));
    }

    limpar() { this._items.set([]); }
}
