import { Demanda, DemandStatus } from '../types';

const statusLabels: Record<DemandStatus, string> = {
    [DemandStatus.PENDENTE]: 'Pendente',
    [DemandStatus.EM_ANDAMENTO]: 'Em Andamento',
    [DemandStatus.CONCLUIDO]: 'Concluído',
    [DemandStatus.BLOQUEADO]: 'Bloqueado',
};

const prioridadeLabels: Record<number, string> = {
    1: 'Baixa',
    2: 'Normal',
    3: 'Alta',
    4: 'Urgente',
    5: 'Crítico',
};

export function exportarDemandasCSV(demandas: Demanda[], filename = 'demandas') {
    const headers = ['ID', 'Título', 'Descrição', 'Status', 'Prioridade', 'Setor', 'Responsável', 'Criado em', 'Atualizado em'];
    const rows = demandas.map((d) => [
        d.id,
        `"${d.titulo.replace(/"/g, '""')}"`,
        `"${d.descricao.replace(/"/g, '""')}"`,
        statusLabels[d.status],
        prioridadeLabels[d.prioridade],
        d.setor,
        d.responsavel,
        new Date(d.criadoEm).toLocaleString('pt-BR'),
        new Date(d.atualizadoEm).toLocaleString('pt-BR'),
    ]);

    const csv = '\uFEFF' + [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}
