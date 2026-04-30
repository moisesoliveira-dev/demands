import { Injectable, signal, computed } from '@angular/core';
import { Demanda, CreateDemandInput, UpdateDemandInput, DemandStatus, DemandFilters } from '../types';
import { uid } from '../lib/utils';

const seedData: Demanda[] = [
    { id: 'dem_001', titulo: 'Manutenção preventiva linha 3', descricao: 'Realizar manutenção preventiva na linha de produção 3 incluindo lubrificação de equipamentos e verificação de sensores', prioridade: 4, status: DemandStatus.EM_ANDAMENTO, setor: 'Manutenção', responsavel: 'Carlos Souza', criadoEm: '2025-01-15T08:30:00.000Z', atualizadoEm: '2025-01-15T14:20:00.000Z', ordem: 0 },
    { id: 'dem_002', titulo: 'Inspeção de qualidade lote 4523', descricao: 'Verificar conformidade do lote 4523 conforme especificações técnicas e normas ISO 9001', prioridade: 5, status: DemandStatus.PENDENTE, setor: 'Qualidade', responsavel: 'Ana Costa', criadoEm: '2025-01-15T09:15:00.000Z', atualizadoEm: '2025-01-15T09:15:00.000Z', ordem: 1 },
    { id: 'dem_003', titulo: 'Ajuste de máquina de solda', descricao: 'Calibrar máquina de solda automática - apresentando inconsistências nos pontos de solda', prioridade: 3, status: DemandStatus.BLOQUEADO, setor: 'Soldagem', responsavel: 'Pedro Oliveira', criadoEm: '2025-01-14T16:45:00.000Z', atualizadoEm: '2025-01-15T10:30:00.000Z', ordem: 2, motivoBloqueio: 'Aguardando peça de reposição do fornecedor. Previsão de entrega: 3-5 dias úteis.' },
    { id: 'dem_004', titulo: 'Pintura cabines setor A', descricao: 'Aplicar nova camada de pintura nas peças do lote 4401 conforme especificação de cor RAL 5012', prioridade: 2, status: DemandStatus.EM_ANDAMENTO, setor: 'Pintura', responsavel: 'João Silva', criadoEm: '2025-01-14T11:00:00.000Z', atualizadoEm: '2025-01-15T08:00:00.000Z', ordem: 3 },
    { id: 'dem_005', titulo: 'Separação pedido cliente Acme Corp', descricao: 'Separar e embalar pedido 8845 para expedição até 17/01 - inclui 240 unidades modelo X45', prioridade: 4, status: DemandStatus.PENDENTE, setor: 'Expedição', responsavel: 'Maria Santos', criadoEm: '2025-01-15T07:20:00.000Z', atualizadoEm: '2025-01-15T07:20:00.000Z', ordem: 4 },
    { id: 'dem_006', titulo: 'Montagem conjunto hidráulico', descricao: 'Montar 50 conjuntos hidráulicos modelo HX-200 conforme desenho técnico DT-8842', prioridade: 3, status: DemandStatus.CONCLUIDO, setor: 'Montagem', responsavel: 'Pedro Oliveira', criadoEm: '2025-01-13T13:30:00.000Z', atualizadoEm: '2025-01-14T17:45:00.000Z', ordem: 5 },
    { id: 'dem_007', titulo: 'Reposição de ferramentas desgastadas', descricao: 'Substituir ferramentas de corte e brocas desgastadas nas máquinas CNC 1, 3 e 5', prioridade: 2, status: DemandStatus.CONCLUIDO, setor: 'Manutenção', responsavel: 'Carlos Souza', criadoEm: '2025-01-12T09:00:00.000Z', atualizadoEm: '2025-01-13T11:30:00.000Z', ordem: 6 },
    { id: 'dem_008', titulo: 'Treinamento nova prensa hidráulica', descricao: 'Realizar treinamento da equipe de montagem para operação da nova prensa hidráulica de 200 toneladas', prioridade: 1, status: DemandStatus.PENDENTE, setor: 'Montagem', responsavel: 'João Silva', criadoEm: '2025-01-15T10:00:00.000Z', atualizadoEm: '2025-01-15T10:00:00.000Z', ordem: 7 },
];

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

@Injectable({ providedIn: 'root' })
export class DemandasService {
    private readonly _demandas = signal<Demanda[]>([...seedData]);
    private readonly _loading = signal(false);
    private readonly _filtros = signal<DemandFilters>({});

    readonly demandas = this._demandas.asReadonly();
    readonly loading = this._loading.asReadonly();
    readonly filtros = this._filtros.asReadonly();

    readonly demandasFiltradas = computed(() => {
        const f = this._filtros();
        let list = this._demandas();
        if (f.status?.length) list = list.filter((d) => f.status!.includes(d.status));
        if (f.prioridade?.length) list = list.filter((d) => f.prioridade!.includes(d.prioridade));
        if (f.setor?.length) list = list.filter((d) => f.setor!.includes(d.setor));
        if (f.responsavel?.length) list = list.filter((d) => f.responsavel!.includes(d.responsavel));
        if (f.busca) {
            const q = f.busca.toLowerCase();
            list = list.filter((d) => d.titulo.toLowerCase().includes(q) || d.descricao.toLowerCase().includes(q));
        }
        return list;
    });

    readonly hasFilters = computed(() => {
        const f = this._filtros();
        return Object.values(f).some((v) => v && (Array.isArray(v) ? v.length > 0 : true));
    });

    setFiltros(f: DemandFilters) { this._filtros.set(f); }
    limparFiltros() { this._filtros.set({}); }

    async carregar(): Promise<Demanda[]> {
        this._loading.set(true);
        await delay(300);
        this._loading.set(false);
        return this._demandas();
    }

    async criar(input: CreateDemandInput): Promise<Demanda> {
        await delay(400);
        const nova: Demanda = {
            ...input,
            id: uid('dem'),
            criadoEm: new Date().toISOString(),
            atualizadoEm: new Date().toISOString(),
            ordem: this._demandas().length,
        };
        this._demandas.update((arr) => [...arr, nova]);
        return nova;
    }

    async atualizar(id: string, input: UpdateDemandInput): Promise<Demanda | undefined> {
        await delay(300);
        let updated: Demanda | undefined;
        this._demandas.update((arr) =>
            arr.map((d) => {
                if (d.id !== id) return d;
                updated = { ...d, ...input, atualizadoEm: new Date().toISOString() };
                return updated;
            })
        );
        return updated;
    }

    async atualizarStatus(id: string, status: DemandStatus, motivo?: string) {
        return this.atualizar(id, { status, ...(motivo ? { motivoBloqueio: motivo } : {}) });
    }

    async reordenar(ids: string[]): Promise<void> {
        await delay(150);
        this._demandas.update((arr) => {
            const map = new Map(arr.map((d) => [d.id, d]));
            ids.forEach((id, i) => {
                const d = map.get(id);
                if (d) map.set(id, { ...d, ordem: i });
            });
            return Array.from(map.values());
        });
    }

    async deletar(id: string): Promise<void> {
        await delay(300);
        this._demandas.update((arr) => arr.filter((d) => d.id !== id));
    }

    byId(id: string): Demanda | undefined {
        return this._demandas().find((d) => d.id === id);
    }

    setDemandas(arr: Demanda[]) { this._demandas.set(arr); }
}
