import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

/** Resposta do AgentOS para chamadas de chat/perguntas livres. */
export interface IaTextResponse {
    content: string;
    session_id?: string | null;
}

/** Resposta do workflow de relatório por período. */
export interface IaRelatorioResponse {
    periodo: { inicio: string; fim: string };
    kpis: Record<string, unknown>;
    gargalos: {
        total_bloqueadas: number;
        total_criticas: number;
        bloqueadas: unknown[];
        criticas: unknown[];
    };
    relatorio_md: string;
}

/**
 * Cliente para o serviço de IA (`demands-ai`, baseado em Agno/AgentOS).
 *
 * Todos os endpoints exigem o mesmo JWT do backend NestJS — o
 * `authInterceptor` já injeta o `Authorization: Bearer ...` automaticamente,
 * desde que `environment.aiUrl` compartilhe a mesma origem ou esteja na
 * lista de hosts permitidos.
 */
@Injectable({ providedIn: 'root' })
export class IaService {
    private readonly http = inject(HttpClient);
    private readonly base = environment.aiUrl;

    /** Sinal reativo: última resposta recebida (útil para componentes). */
    readonly ultimoConteudo = signal<string>('');
    readonly carregando = signal(false);

    /** Habilitação geral do recurso (controlado por feature flag). */
    get habilitado(): boolean {
        return !!environment.aiEnabled && !!this.base;
    }

    /** Healthcheck do AgentOS. Útil para mostrar status no rodapé. */
    async health(): Promise<{ status: string; service: string }> {
        return firstValueFrom(this.http.get<{ status: string; service: string }>(`${this.base.replace(/\/api$/, '')}/health`));
    }

    /** Pergunta livre ao agente de relatórios (FinanceAgent). */
    async perguntar(message: string, sessionId?: string): Promise<IaTextResponse> {
        if (!this.habilitado) throw new Error('IA desabilitada (environment.aiEnabled=false)');
        this.carregando.set(true);
        try {
            const r = await firstValueFrom(
                this.http.post<IaTextResponse>(`${this.base}/relatorios/perguntar`, {
                    message,
                    session_id: sessionId ?? null,
                    stream: false,
                }),
            );
            this.ultimoConteudo.set(r.content);
            return r;
        } finally {
            this.carregando.set(false);
        }
    }

    /** Workflow determinístico que gera relatório completo de período. */
    async gerarRelatorioPeriodo(dataInicio: string, dataFim: string): Promise<IaRelatorioResponse> {
        if (!this.habilitado) throw new Error('IA desabilitada (environment.aiEnabled=false)');
        this.carregando.set(true);
        try {
            return await firstValueFrom(
                this.http.post<IaRelatorioResponse>(`${this.base}/relatorios/periodo`, {
                    data_inicio: dataInicio,
                    data_fim: dataFim,
                }),
            );
        } finally {
            this.carregando.set(false);
        }
    }

    /** Triagem assistida — envia descrição livre, recebe sugestão estruturada. */
    async sugerirTriagem(descricao: string, sessionId?: string): Promise<IaTextResponse> {
        if (!this.habilitado) throw new Error('IA desabilitada (environment.aiEnabled=false)');
        this.carregando.set(true);
        try {
            return await firstValueFrom(
                this.http.post<IaTextResponse>(`${this.base}/triagem/sugestao`, {
                    descricao,
                    session_id: sessionId ?? null,
                }),
            );
        } finally {
            this.carregando.set(false);
        }
    }

    /** Roda qualquer agente registrado por id (`research`, `finance`, `coding`, `triagem`). */
    async runAgent(agentId: string, message: string, sessionId?: string): Promise<IaTextResponse> {
        if (!this.habilitado) throw new Error('IA desabilitada');
        return firstValueFrom(
            this.http.post<IaTextResponse>(`${this.base}/agents/${agentId}/run`, {
                message,
                session_id: sessionId ?? null,
            }),
        );
    }

    /** Roda qualquer team registrado (`research_team`, `support_team`). */
    async runTeam(teamId: string, message: string, sessionId?: string): Promise<IaTextResponse> {
        if (!this.habilitado) throw new Error('IA desabilitada');
        return firstValueFrom(
            this.http.post<IaTextResponse>(`${this.base}/teams/${teamId}/run`, {
                message,
                session_id: sessionId ?? null,
            }),
        );
    }
}
