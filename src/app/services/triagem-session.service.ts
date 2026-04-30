import { Injectable, signal } from '@angular/core';
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

@Injectable({ providedIn: 'root' })
export class TriagemSessionService {
    private readonly KEY = 'triagem_sessions';
    private readonly MAX = 30;

    sessions = signal<ChatSession[]>(this._load());

    upsert(session: ChatSession): void {
        this.sessions.update((list) => {
            const idx = list.findIndex((s) => s.id === session.id);
            const updated =
                idx >= 0
                    ? list.map((s, i) => (i === idx ? session : s))
                    : [session, ...list].slice(0, this.MAX);
            this._save(updated);
            return updated;
        });
    }

    remove(id: string): void {
        this.sessions.update((list) => {
            const updated = list.filter((s) => s.id !== id);
            this._save(updated);
            return updated;
        });
    }

    get(id: string): ChatSession | undefined {
        return this.sessions().find((s) => s.id === id);
    }

    createNew(): ChatSession {
        const session: ChatSession = {
            id: crypto.randomUUID(),
            titulo: 'Nova triagem',
            messages: [],
            step: 'descricao',
            draft: {},
            criadaEm: new Date().toISOString(),
            atualizadaEm: new Date().toISOString(),
            status: 'andamento',
        };
        this.upsert(session);
        return session;
    }

    private _load(): ChatSession[] {
        try {
            const raw = localStorage.getItem(this.KEY);
            return raw ? (JSON.parse(raw) as ChatSession[]) : [];
        } catch {
            return [];
        }
    }

    private _save(sessions: ChatSession[]): void {
        try {
            localStorage.setItem(this.KEY, JSON.stringify(sessions));
        } catch {
            // Storage quota exceeded — ignore
        }
    }
}
