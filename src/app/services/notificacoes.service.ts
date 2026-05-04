import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { Notificacao, NotificacaoTipo } from '../types';

@Injectable({ providedIn: 'root' })
export class NotificacoesService {
    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiUrl}/notificacoes`;

    private readonly _items = signal<Notificacao[]>([]);
    readonly items = this._items.asReadonly();
    readonly contadorNaoLidas = computed(() => this._items().filter((n) => !n.lida).length);

    constructor() {
        // Sem seed mock: o estado inicial é vazio.
        // Use carregar() para buscar do backend.
    }

    // ── Métodos HTTP (backend real) ───────────────────────────────────────────

    /** Carrega notificações do backend. Em dev, silencia erros de rede. */
    async carregar(): Promise<Notificacao[]> {
        try {
            const list = await firstValueFrom(
                this.http.get<Notificacao[]>(this.base).pipe(catchError(() => of(null)))
            );
            if (list) this._items.set(list);
            return this._items();
        } catch {
            return this._items();
        }
    }

    /** Cria notificação via backend. */
    async adicionar(n: Omit<Notificacao, 'id' | 'lida' | 'timestamp'>): Promise<Notificacao> {
        const created = await firstValueFrom(this.http.post<Notificacao>(this.base, n));
        this._items.update((arr) => [created, ...arr].slice(0, 50));
        return created;
    }

    async marcarLida(id: string): Promise<void> {
        try {
            await firstValueFrom(
                this.http.patch<void>(`${this.base}/${id}/lida`, {}).pipe(catchError(() => of(null)))
            );
        } catch { /* sem backend — apenas atualiza local */ }
        this._items.update((arr) => arr.map((n) => (n.id === id ? { ...n, lida: true } : n)));
    }

    async marcarTodasLidas(): Promise<void> {
        try {
            await firstValueFrom(
                this.http.patch<void>(`${this.base}/todas/lidas`, {}).pipe(catchError(() => of(null)))
            );
        } catch { /* sem backend */ }
        this._items.update((arr) => arr.map((n) => ({ ...n, lida: true })));
    }

    async limpar(): Promise<void> {
        try {
            await firstValueFrom(
                this.http.delete<void>(this.base).pipe(catchError(() => of(null)))
            );
        } catch { /* sem backend */ }
        this._items.set([]);
    }

    async removerPorId(id: string): Promise<void> {
        try {
            await firstValueFrom(
                this.http.delete<void>(`${this.base}/${id}`).pipe(catchError(() => of(null)))
            );
        } catch { /* sem backend */ }
        this._items.update(arr => arr.filter(n => n.id !== id));
    }

    // ── Método local (sem backend, uso interno / frontend-driven) ─────────────

    /** Adiciona uma notificação localmente sem chamar o backend.
     *  Use em eventos internos do frontend enquanto o backend não existe. */
    adicionarLocal(n: Omit<Notificacao, 'id' | 'lida' | 'timestamp'>): Notificacao {
        const nova: Notificacao = {
            ...n,
            id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            lida: false,
            timestamp: new Date().toISOString(),
        };
        this._items.update((arr) => [nova, ...arr].slice(0, 50));
        return nova;
    }

    // ── Preparação para WebSocket / SSE (backend real-time) ───────────────────

    private _wsConnection: WebSocket | null = null;

    /** Conecta ao canal de notificações em tempo real via WebSocket.
     *  Respeita `environment.realtimeEnabled` e `environment.wsUrl`. */
    conectarRealtime(token: string): void {
        if (!environment.realtimeEnabled) return;
        if (this._wsConnection) return;
        const baseWs = environment.wsUrl?.trim()
            ? environment.wsUrl
            : environment.apiUrl.replace(/^http/, 'ws') + '/notificacoes/ws';
        const wsUrl = `${baseWs}${baseWs.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
        try {
            const ws = new WebSocket(wsUrl);
            ws.onmessage = (event) => {
                try {
                    const notif: Notificacao = JSON.parse(event.data);
                    this._items.update((arr) => [notif, ...arr].slice(0, 50));
                } catch { /* ignora mensagens malformadas */ }
            };
            ws.onerror = () => ws.close();
            this._wsConnection = ws;
        } catch { /* sem suporte a WS ou URL inválida */ }
    }

    /** Desconecta do canal em tempo real. */
    desconectarRealtime(): void {
        this._wsConnection?.close();
        this._wsConnection = null;
    }

    // ── Mock de desenvolvimento ───────────────────────────────────────────────
    // Removido: o estado inicial é vazio. Use carregar() para popular do backend.
}
