import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

/* ─── Tipos ────────────────────────────────────────────────────────────── */

export type ConversaTipo = 'direto' | 'grupo' | 'demanda';
export type MensagemTipo = 'texto' | 'imagem' | 'video' | 'sistema';

export interface AnexoChat {
    id: string;
    tipo: 'imagem' | 'video';
    nomeOriginal: string;
    mimeType: string;
    bytes: number;
    sha256: string;
    largura?: number | null;
    altura?: number | null;
    duracaoMs?: number | null;
    url: string; // /api/conversas/anexos/:id
}

export interface MensagemChat {
    id: string;
    autorId: string;
    autorNome: string;
    tipo: MensagemTipo;
    conteudo: string;
    apagada: boolean;
    editada: boolean;
    criadoEm: string;
    analisada: boolean;
    analiseIA?: string | null;
    hashConteudo: string;
    anexos: AnexoChat[];
}

export interface ParticipanteChat {
    usuarioId: string;
    usuarioNome: string;
    papel: 'dono' | 'admin' | 'membro';
}

export interface ConversaListItem {
    id: string;
    tipo: ConversaTipo;
    titulo?: string | null;
    descricao?: string | null;
    avatarUrl?: string | null;
    demandaId?: string | null;
    criadorId: string;
    criadoEm: string;
    ultimaMensagemEm: string;
    arquivada: boolean;
    papel: 'dono' | 'admin' | 'membro';
    silenciado: boolean;
    naoLidas: number;
    participantes: ParticipanteChat[];
    ultimaMensagem: {
        id: string;
        autorNome: string;
        tipo: MensagemTipo;
        conteudo: string;
        criadoEm: string;
    } | null;
}

export interface UsuarioDisponivel {
    id: string;
    nome: string;
    email: string;
    setor: string;
    avatarUrl?: string | null;
}

/* ─── Service ──────────────────────────────────────────────────────────── */

@Injectable({ providedIn: 'root' })
export class ChatsService {
    private http = inject(HttpClient);
    private base = `${environment.apiUrl}/conversas`;

    private _conversas = signal<ConversaListItem[]>([]);
    private _mensagens = signal<MensagemChat[]>([]);
    private _conversaAtivaId = signal<string | null>(null);
    private _carregandoLista = signal(false);
    private _enviando = signal(false);
    private _progressoUpload = signal<number | null>(null);

    readonly conversas = this._conversas.asReadonly();
    readonly mensagens = this._mensagens.asReadonly();
    readonly conversaAtivaId = this._conversaAtivaId.asReadonly();
    readonly carregandoLista = this._carregandoLista.asReadonly();
    readonly enviando = this._enviando.asReadonly();
    readonly progressoUpload = this._progressoUpload.asReadonly();

    readonly conversaAtiva = computed(() =>
        this._conversas().find((c) => c.id === this._conversaAtivaId()) ?? null,
    );

    readonly totalNaoLidas = computed(() =>
        this._conversas().reduce((acc, c) => acc + (c.naoLidas ?? 0), 0),
    );

    private pollHandle: any = null;

    /* ── Lista de conversas ─────────────────────────────────────────────── */

    async carregar(): Promise<void> {
        this._carregandoLista.set(true);
        try {
            const list = await firstValueFrom(
                this.http.get<ConversaListItem[]>(this.base),
            );
            this._conversas.set(list);
        } finally {
            this._carregandoLista.set(false);
        }
    }

    /** Polling a cada 3s da lista (atualiza não-lidas + última mensagem). */
    iniciarPolling(intervaloMs = 3000) {
        this.pararPolling();
        this.pollHandle = setInterval(() => {
            // não-bloqueante
            this.carregar().catch(() => { });
            const id = this._conversaAtivaId();
            if (id) this.recarregarMensagens(id).catch(() => { });
        }, intervaloMs);
    }

    pararPolling() {
        if (this.pollHandle) {
            clearInterval(this.pollHandle);
            this.pollHandle = null;
        }
    }

    /* ── Mensagens ───────────────────────────────────────────────────────── */

    async selecionar(conversaId: string): Promise<void> {
        this._conversaAtivaId.set(conversaId);
        this._mensagens.set([]);
        await this.recarregarMensagens(conversaId);
        await this.marcarLida(conversaId).catch(() => { });
    }

    async recarregarMensagens(conversaId: string): Promise<void> {
        const list = await firstValueFrom(
            this.http.get<MensagemChat[]>(`${this.base}/${conversaId}/mensagens`),
        );
        // Só atualiza se ainda for a conversa ativa
        if (this._conversaAtivaId() === conversaId) {
            this._mensagens.set(list);
        }
    }

    async marcarLida(conversaId: string): Promise<void> {
        await firstValueFrom(
            this.http.post<{ ok: boolean }>(`${this.base}/${conversaId}/lida`, {}),
        );
        // Atualiza badge local
        this._conversas.update((arr) =>
            arr.map((c) => (c.id === conversaId ? { ...c, naoLidas: 0 } : c)),
        );
    }

    async enviarTexto(conversaId: string, conteudo: string): Promise<void> {
        this._enviando.set(true);
        try {
            const fd = new FormData();
            fd.append('conteudo', conteudo);
            await firstValueFrom(
                this.http.post<MensagemChat>(`${this.base}/${conversaId}/mensagens`, fd),
            );
            await this.recarregarMensagens(conversaId);
            await this.carregar();
        } finally {
            this._enviando.set(false);
        }
    }

    /** Envia mensagem com arquivos (imagem/vídeo). Retorna observable de progresso. */
    enviarComArquivos(
        conversaId: string,
        conteudo: string,
        arquivos: File[],
    ): Observable<HttpEvent<MensagemChat>> {
        const fd = new FormData();
        if (conteudo) fd.append('conteudo', conteudo);
        for (const f of arquivos) fd.append('arquivos', f, f.name);
        this._enviando.set(true);
        this._progressoUpload.set(0);
        const obs = this.http.post<MensagemChat>(
            `${this.base}/${conversaId}/mensagens`,
            fd,
            { reportProgress: true, observe: 'events' },
        );
        return new Observable((sub) => {
            const s = obs.subscribe({
                next: async (event) => {
                    if (event.type === HttpEventType.UploadProgress && event.total) {
                        this._progressoUpload.set(
                            Math.round((event.loaded / event.total) * 100),
                        );
                    }
                    if (event.type === HttpEventType.Response) {
                        await this.recarregarMensagens(conversaId);
                        await this.carregar();
                    }
                    sub.next(event);
                },
                error: (e) => {
                    this._enviando.set(false);
                    this._progressoUpload.set(null);
                    sub.error(e);
                },
                complete: () => {
                    this._enviando.set(false);
                    this._progressoUpload.set(null);
                    sub.complete();
                },
            });
            return () => s.unsubscribe();
        });
    }

    async apagarMensagem(mensagemId: string): Promise<void> {
        await firstValueFrom(
            this.http.delete<{ ok: boolean }>(`${this.base}/mensagens/${mensagemId}`),
        );
        const id = this._conversaAtivaId();
        if (id) await this.recarregarMensagens(id);
    }

    /* ── Criar / gerenciar conversas ─────────────────────────────────────── */

    async criarConversa(input: {
        tipo: 'direto' | 'grupo';
        titulo?: string;
        descricao?: string;
        participantes: string[];
    }): Promise<ConversaListItem> {
        const created = await firstValueFrom(
            this.http.post<any>(this.base, input),
        );
        await this.carregar();
        return this._conversas().find((c) => c.id === created.id) ?? created;
    }

    async adicionarParticipante(
        conversaId: string,
        usuarioId: string,
        papel: 'admin' | 'membro' = 'membro',
    ) {
        await firstValueFrom(
            this.http.post(`${this.base}/${conversaId}/participantes`, { usuarioId, papel }),
        );
        await this.carregar();
    }

    async removerParticipante(conversaId: string, usuarioId: string) {
        await firstValueFrom(
            this.http.delete(`${this.base}/${conversaId}/participantes/${usuarioId}`),
        );
        await this.carregar();
    }

    async listarUsuarios(): Promise<UsuarioDisponivel[]> {
        return firstValueFrom(
            this.http.get<UsuarioDisponivel[]>(`${this.base}/usuarios`),
        );
    }

    /* ── URL de download autenticado (HttpClient interceptor injeta JWT) ─ */

    urlAnexo(anexoId: string): string {
        return `${this.base}/anexos/${anexoId}`;
    }
}
