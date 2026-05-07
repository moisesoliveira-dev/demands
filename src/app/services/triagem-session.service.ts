import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject, firstValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Demanda, Prioridade } from '../types';

export type Step = 'descricao' | 'setor' | 'responsavel' | 'prioridade' | 'confirmacao' | 'criada';

export interface DraftDemanda {
    titulo?: string;
    descricao?: string;
    setor?: string;
    responsavel?: string;
    prioridade?: Prioridade;
}

export interface StoredMessage {
    id: string;
    role: 'agent' | 'user';
    content: string;
    timestamp: string;
    suggestions?: string[];
    summary?: Partial<Demanda>;
}

export interface ChatSession {
    id: string;
    titulo: string;
    messages: StoredMessage[];
    step: Step;
    draft: DraftDemanda;
    criadaEm: string;
    atualizadaEm: string;
    status: 'andamento' | 'criada';
}

export interface MessageReply {
    session_id: string;
    reply: string;
    step: Step;
    draft: DraftDemanda;
    suggestions: string[];
    ready_to_create: boolean;
}

// ─── Auto-draft pipeline (Fase 4) ────────────────────────────────────────────

export interface PipelineDraft {
    titulo?: string;
    descricao?: string;
    setor?: string;
    responsavel?: string;
    prioridade?: Prioridade;
}

export interface PipelineStepTelemetry {
    name: string;
    latency_ms: number;
    input_tokens: number;
    output_tokens: number;
    error: string | null;
}

export interface PipelineResult {
    draft: PipelineDraft;
    references: string[];
    issues: string[];
    ok: boolean;
    telemetry: PipelineStepTelemetry[];
}

// ─── Server DTOs ─────────────────────────────────────────────────────────────

interface ServerSession {
    id: string;
    user_id: string;
    titulo: string;
    status: 'andamento' | 'criada';
    step: Step;
    draft: DraftDemanda;
    criada_em: string;
    atualizada_em: string;
    messages?: ServerMessage[];
}

interface ServerMessage {
    id: string;
    session_id: string;
    role: 'agent' | 'user';
    content: string;
    suggestions: string[];
    draft: DraftDemanda | null;
    created_at: string;
}

function mapMessage(m: ServerMessage): StoredMessage {
    return {
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.created_at,
        suggestions: m.suggestions?.length ? m.suggestions : undefined,
        summary: m.draft && (m.draft.titulo || m.draft.setor)
            ? { titulo: m.draft.titulo, setor: m.draft.setor, responsavel: m.draft.responsavel, prioridade: m.draft.prioridade }
            : undefined,
    };
}

function mapSession(s: ServerSession): ChatSession {
    return {
        id: s.id,
        titulo: s.titulo,
        status: s.status,
        step: s.step,
        draft: s.draft ?? {},
        criadaEm: s.criada_em,
        atualizadaEm: s.atualizada_em,
        messages: (s.messages ?? []).map(mapMessage),
    };
}

@Injectable({ providedIn: 'root' })
export class TriagemSessionService {
    private http = inject(HttpClient);
    private readonly base = `${environment.aiUrl}/triagem/sessions`;

    /** Fires when the user explicitly cancels an in-flight AI request. */
    private readonly _cancel$ = new Subject<void>();

    /** Cache local das sessões — preenchido por `loadAll()`. */
    sessions = signal<ChatSession[]>([]);
    loaded = signal(false);
    loading = signal(true);

    /** Abort the current in-flight sendMessage / autoDraft request. */
    cancelCurrentRequest(): void {
        this._cancel$.next();
    }

    async loadAll(): Promise<ChatSession[]> {
        this.loading.set(true);
        try {
            const list = await firstValueFrom(this.http.get<ServerSession[]>(this.base));
            const mapped = list.map(mapSession);
            this.sessions.set(mapped);
            this.loaded.set(true);
            return mapped;
        } finally {
            this.loading.set(false);
        }
    }

    /** Sessão completa (com mensagens). Atualiza o cache. */
    async get(id: string): Promise<ChatSession> {
        const raw = await firstValueFrom(this.http.get<ServerSession>(`${this.base}/${id}`));
        const mapped = mapSession(raw);
        this._replaceLocal(mapped);
        return mapped;
    }

    async createNew(titulo?: string): Promise<ChatSession> {
        const raw = await firstValueFrom(
            this.http.post<ServerSession>(this.base, { titulo: titulo ?? null }),
        );
        const mapped = mapSession(raw);
        this.sessions.update((list) => [mapped, ...list]);
        return mapped;
    }

    async remove(id: string): Promise<void> {
        try {
            await firstValueFrom(this.http.delete<void>(`${this.base}/${id}`));
        } catch (e: any) {
            // 404 = sessão já não existe no backend → trata como sucesso
            if (e?.status !== 404) throw e;
        }
        this.sessions.update((list) => list.filter((s) => s.id !== id));
    }

    /** Envia uma mensagem do usuário e retorna a resposta do agente. */
    async sendMessage(sessionId: string, message: string): Promise<MessageReply> {
        const reply = await firstValueFrom(
            this.http.post<MessageReply>(`${this.base}/${sessionId}/message`, { message })
                .pipe(takeUntil(this._cancel$))
        );
        // Atualiza o cache local com o novo step/draft/título sugerido.
        this.sessions.update((list) =>
            list.map((s) =>
                s.id === sessionId
                    ? {
                        ...s,
                        step: reply.step,
                        draft: reply.draft,
                        atualizadaEm: new Date().toISOString(),
                        titulo: reply.draft.titulo
                            ? reply.draft.titulo.slice(0, 80)
                            : (s.titulo === 'Nova triagem' ? message.slice(0, 60) : s.titulo),
                    }
                    : s,
            ),
        );
        return reply;
    }

    /** Pipeline one-shot: gera um rascunho completo a partir de texto livre.
     *  Não cria sessão nem demanda — apenas retorna o draft + telemetria. */
    async autoDraft(description: string): Promise<PipelineResult> {
        return await firstValueFrom(
            this.http.post<PipelineResult>(
                `${environment.aiUrl}/triagem/auto-draft`,
                { description },
            ).pipe(takeUntil(this._cancel$))
        );
    }

    /**
     * Rollback: deletes the last user message (and any subsequent messages)
     * from the server-side session.  Called after `cancelCurrentRequest()` so
     * any state the server managed to persist before the XHR was aborted is
     * also cleaned up.  Fire-and-forget — errors are silently swallowed.
     */
    async rollbackLastMessage(sessionId: string): Promise<void> {
        try {
            await firstValueFrom(
                this.http.delete<void>(`${this.base}/${sessionId}/last-message`)
            );
            // Refresh the local cache entry so the sidebar title / step reflect
            // the rolled-back state.
            await this.get(sessionId);
        } catch { /* best-effort — proceed regardless */ }
    }

    /** Confirma a triagem e cria a demanda no backend. */
    async confirmar(sessionId: string, draftOverrides?: DraftDemanda): Promise<Demanda> {
        const body = draftOverrides ?? {};
        const res = await firstValueFrom(
            this.http.post<{ session_id: string; demanda: Demanda }>(
                `${this.base}/${sessionId}/criar`,
                body,
            ),
        );
        this.sessions.update((list) =>
            list.map((s) =>
                s.id === sessionId
                    ? { ...s, status: 'criada', step: 'criada', atualizadaEm: new Date().toISOString() }
                    : s,
            ),
        );
        return res.demanda;
    }

    /** Atualiza apenas o cache local (campos editáveis no painel de prévia).
     *  As alterações são enviadas ao servidor quando o usuário confirma a criação,
     *  via `draftOverrides` no `confirmar()`. */
    patchLocalDraft(sessionId: string, partial: DraftDemanda): void {
        this.sessions.update((list) =>
            list.map((s) =>
                s.id === sessionId
                    ? {
                        ...s,
                        draft: { ...s.draft, ...partial },
                        titulo: partial.titulo ? partial.titulo.slice(0, 80) : s.titulo,
                        atualizadaEm: new Date().toISOString(),
                    }
                    : s,
            ),
        );
    }

    private _replaceLocal(session: ChatSession): void {
        this.sessions.update((list) => {
            const idx = list.findIndex((s) => s.id === session.id);
            if (idx < 0) return [session, ...list];
            const copy = list.slice();
            copy[idx] = session;
            return copy;
        });
    }
}
