export enum DemandStatus {
    PENDENTE = 'pendente',
    EM_ANDAMENTO = 'em_andamento',
    CONCLUIDO = 'concluido',
    BLOQUEADO = 'bloqueado',
}

export type Prioridade = 1 | 2 | 3 | 4 | 5;

export interface Demanda {
    id: string;
    titulo: string;
    descricao: string;
    prioridade: Prioridade;
    status: DemandStatus;
    setor: string;
    responsavel: string;
    criadoEm: string;
    atualizadoEm: string;
    ordem?: number;
    motivoBloqueio?: string;
}

export interface HistoricoAuditoria {
    id: string;
    demandaId: string;
    de: DemandStatus;
    para: DemandStatus;
    responsavel: string;
    motivo?: string;
    timestamp: string;
}

export interface Notificacao {
    id: string;
    demandaId: string;
    titulo: string;
    mensagem: string;
    prioridade: Prioridade;
    lida: boolean;
    timestamp: string;
}

export interface DemandFilters {
    status?: DemandStatus[];
    prioridade?: Prioridade[];
    setor?: string[];
    responsavel?: string[];
    dataInicio?: string;
    dataFim?: string;
    busca?: string;
}

export type CreateDemandInput = Omit<Demanda, 'id' | 'criadoEm' | 'atualizadoEm' | 'ordem'>;
export type UpdateDemandInput = Partial<Omit<Demanda, 'id' | 'criadoEm'>>;

export * from './permissions';
export * from './user';
