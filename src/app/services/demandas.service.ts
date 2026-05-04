import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import {
    Demanda, CreateDemandInput, UpdateDemandInput, DemandStatus, DemandFilters, HistoricoAuditoria,
} from '../types';

@Injectable({ providedIn: 'root' })
export class DemandasService {
    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiUrl}/demandas`;

    private readonly _demandas = signal<Demanda[]>([]);
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
        if (f.dataInicio) {
            const from = new Date(f.dataInicio).getTime();
            if (!isNaN(from)) list = list.filter((d) => new Date(d.criadoEm).getTime() >= from);
        }
        if (f.dataFim) {
            // Inclui o dia inteiro de "fim" → soma 23:59:59.
            const to = new Date(f.dataFim).getTime() + 86_399_000;
            if (!isNaN(to)) list = list.filter((d) => new Date(d.criadoEm).getTime() <= to);
        }
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
        try {
            const f = this._filtros();
            let params = new HttpParams();
            if (f.status?.length) params = params.set('status', f.status.join(','));
            if (f.prioridade?.length) params = params.set('prioridade', f.prioridade.join(','));
            if (f.setor?.length) params = params.set('setor', f.setor.join(','));
            if (f.responsavel?.length) params = params.set('responsavel', f.responsavel.join(','));
            if (f.dataInicio) params = params.set('dataInicio', f.dataInicio);
            if (f.dataFim) params = params.set('dataFim', f.dataFim);
            if (f.busca) params = params.set('busca', f.busca);

            const list = await firstValueFrom(this.http.get<Demanda[]>(this.base, { params }));
            this._demandas.set(list);
            return list;
        } finally {
            this._loading.set(false);
        }
    }

    async criar(input: CreateDemandInput): Promise<Demanda> {
        const nova = await firstValueFrom(this.http.post<Demanda>(this.base, input));
        this._demandas.update((arr) => [...arr, nova]);
        return nova;
    }

    async atualizar(id: string, input: UpdateDemandInput): Promise<Demanda | undefined> {
        const updated = await firstValueFrom(this.http.patch<Demanda>(`${this.base}/${id}`, input));
        this._demandas.update((arr) => arr.map((d) => (d.id === id ? updated : d)));
        return updated;
    }

    async atualizarStatus(id: string, status: DemandStatus, motivo?: string): Promise<Demanda | undefined> {
        const updated = await firstValueFrom(
            this.http.patch<Demanda>(`${this.base}/${id}/status`, { status, motivo }),
        );
        this._demandas.update((arr) => arr.map((d) => (d.id === id ? updated : d)));
        return updated;
    }

    async reordenar(ids: string[]): Promise<void> {
        await firstValueFrom(this.http.put<{ ok: boolean }>(`${this.base}/reordenar`, { ids }));
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
        await firstValueFrom(this.http.delete<void>(`${this.base}/${id}`));
        this._demandas.update((arr) => arr.filter((d) => d.id !== id));
    }

    async fetchById(id: string): Promise<Demanda | undefined> {
        try {
            return await firstValueFrom(this.http.get<Demanda>(`${this.base}/${id}`));
        } catch {
            return undefined;
        }
    }

    async historico(id: string): Promise<HistoricoAuditoria[]> {
        return firstValueFrom(this.http.get<HistoricoAuditoria[]>(`${this.base}/${id}/historico`));
    }

    /** Lookup sincrono no cache local. Para fetch remoto use fetchById. */
    byId(id: string): Demanda | undefined {
        return this._demandas().find((d) => d.id === id);
    }

    setDemandas(arr: Demanda[]) { this._demandas.set(arr); }
}
