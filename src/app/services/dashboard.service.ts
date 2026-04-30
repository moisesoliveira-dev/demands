import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DashboardResumo {
    total: number;
    pendentes: number;
    andamento: number;
    concluidas: number;
    bloqueadas: number;
    criticas: number;
    taxaConclusao: number;
    byStatus: Record<string, number>;
    byPrioridade: Record<string, number>;
    bySetor: Record<string, number>;
    byResponsavel: Record<string, number>;
}

export interface SerieTemporalPoint {
    data: string;
    criadas: number;
    concluidas: number;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiUrl}/dashboard`;

    resumo(): Promise<DashboardResumo> {
        return firstValueFrom(this.http.get<DashboardResumo>(this.base));
    }

    serie(diasJanela = 14): Promise<SerieTemporalPoint[]> {
        const params = new HttpParams().set('dias', String(diasJanela));
        return firstValueFrom(this.http.get<SerieTemporalPoint[]>(`${this.base}/serie`, { params }));
    }
}
