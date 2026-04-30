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

export type NotificacaoTipo =
    | 'demanda_criada'
    | 'demanda_atualizada'
    | 'demanda_bloqueada'
    | 'demanda_concluida'
    | 'demanda_atribuida'
    | 'sistema'
    | 'alerta';

export interface Notificacao {
    id: string;
    tipo: NotificacaoTipo;
    titulo: string;
    mensagem: string;
    lida: boolean;
    timestamp: string;
    /** ID da demanda relacionada (para navegação automática ao clicar) */
    demandaId?: string;
    /** Rota para navegar ao clicar (ex: /demandas/123) */
    acao?: string;
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
