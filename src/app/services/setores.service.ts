import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Setor {
    id: string;
    nome: string;
    descricao: string;
    responsavel: string;
    ativo: boolean;
    criadoEm: string;
}

export type CreateSetorInput = Omit<Setor, 'id' | 'criadoEm'>;
export type UpdateSetorInput = Partial<Omit<Setor, 'id' | 'criadoEm'>>;

@Injectable({ providedIn: 'root' })
export class SetoresService {
    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiUrl}/setores`;

    private readonly _setores = signal<Setor[]>([]);
    readonly setores = this._setores.asReadonly();

    async listar(): Promise<Setor[]> {
        const list = await firstValueFrom(this.http.get<Setor[]>(this.base));
        this._setores.set(list);
        return list;
    }

    async criar(input: CreateSetorInput): Promise<Setor> {
        const novo = await firstValueFrom(this.http.post<Setor>(this.base, input));
        this._setores.update((arr) => [...arr, novo]);
        return novo;
    }

    async atualizar(id: string, input: UpdateSetorInput): Promise<Setor> {
        const updated = await firstValueFrom(this.http.patch<Setor>(`${this.base}/${id}`, input));
        this._setores.update((arr) => arr.map((s) => (s.id === id ? updated : s)));
        return updated;
    }

    async excluir(id: string): Promise<void> {
        await firstValueFrom(this.http.delete<void>(`${this.base}/${id}`));
        this._setores.update((arr) => arr.filter((s) => s.id !== id));
    }
}
