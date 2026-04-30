import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Notificacao } from '../types';

@Injectable({ providedIn: 'root' })
export class NotificacoesService {
    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiUrl}/notificacoes`;

    private readonly _items = signal<Notificacao[]>([]);
    readonly items = this._items.asReadonly();
    readonly contadorNaoLidas = computed(() => this._items().filter((n) => !n.lida).length);

    async carregar(): Promise<Notificacao[]> {
        const list = await firstValueFrom(this.http.get<Notificacao[]>(this.base));
        this._items.set(list);
        return list;
    }

    async adicionar(n: Omit<Notificacao, 'id' | 'lida' | 'timestamp'>): Promise<Notificacao> {
        const created = await firstValueFrom(this.http.post<Notificacao>(this.base, n));
        this._items.update((arr) => [created, ...arr].slice(0, 50));
        return created;
    }

    async marcarLida(id: string): Promise<void> {
        await firstValueFrom(this.http.patch<Notificacao>(`${this.base}/${id}/lida`, {}));
        this._items.update((arr) => arr.map((n) => (n.id === id ? { ...n, lida: true } : n)));
    }

    async marcarTodasLidas(): Promise<void> {
        await firstValueFrom(this.http.patch<{ atualizadas: number }>(`${this.base}/todas/lidas`, {}));
        this._items.update((arr) => arr.map((n) => ({ ...n, lida: true })));
    }

    async limpar(): Promise<void> {
        await firstValueFrom(this.http.delete<void>(this.base));
        this._items.set([]);
    }
}
