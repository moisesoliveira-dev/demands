import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { Demanda } from '../types';

export interface ConversaMessage {
    id: string;
    demandaId: string;
    autorId: string;
    autorNome: string;
    /** 'solicitante' | 'responsavel' | 'admin' | 'participante' | 'sistema' | 'ia' */
    autorRole: string;
    conteudo: string;
    criadoEm: string;
}

/**
 * Serviço da aba "Conversa" de uma demanda.
 *
 * Responsabilidades:
 * - GET /api/demandas/:id/conversa para hidratar
 * - SSE GET /api/demandas/:id/conversa/stream?access_token=xxx para tempo-real
 * - POST /api/demandas/:id/conversa para enviar mensagem
 * - POST /api/demandas/:id/conversa/reestruturar para acionar a IA
 *
 * Stateless: cada `open(demandaId)` cria uma nova conexão SSE e retorna
 * um Subject. O componente é dono do ciclo de vida (chama `close()`).
 */
@Injectable({ providedIn: 'root' })
export class DemandaConversaService {
    private http = inject(HttpClient);
    private auth = inject(AuthService);
    private base = environment.apiUrl;

    async list(demandaId: string): Promise<ConversaMessage[]> {
        return firstValueFrom(
            this.http.get<ConversaMessage[]>(`${this.base}/demandas/${demandaId}/conversa`),
        );
    }

    async send(demandaId: string, conteudo: string): Promise<ConversaMessage> {
        return firstValueFrom(
            this.http.post<ConversaMessage>(
                `${this.base}/demandas/${demandaId}/conversa`,
                { conteudo },
            ),
        );
    }

    async reestruturar(demandaId: string): Promise<Demanda> {
        return firstValueFrom(
            this.http.post<Demanda>(
                `${this.base}/demandas/${demandaId}/conversa/reestruturar`,
                {},
            ),
        );
    }

    /** Abre conexão SSE. O caller é dono do ciclo de vida (close()). */
    open(demandaId: string): { messages$: Subject<ConversaMessage>; close: () => void } {
        const subject = new Subject<ConversaMessage>();
        const token = this.auth.token() ?? '';
        const url = `${this.base}/demandas/${demandaId}/conversa/stream?access_token=${encodeURIComponent(token)}`;
        const es = new EventSource(url);

        es.onmessage = (ev: MessageEvent) => {
            try {
                subject.next(JSON.parse(ev.data));
            } catch {
                /* ignora payloads malformados */
            }
        };
        es.onerror = () => {
            // Mantém conexão (EventSource reconecta sozinho); só sinaliza no console.
            // eslint-disable-next-line no-console
            console.warn('[conversa-sse] erro/desconexão temporária');
        };

        return {
            messages$: subject,
            close: () => {
                es.close();
                subject.complete();
            },
        };
    }
}
