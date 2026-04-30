import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { User, CreateUserInput, UpdateUserInput } from '../types';

@Injectable({ providedIn: 'root' })
export class UsersService {
    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiUrl}/users`;

    private readonly _users = signal<User[]>([]);
    readonly users = this._users.asReadonly();

    async listar(): Promise<User[]> {
        const list = await firstValueFrom(this.http.get<User[]>(this.base));
        this._users.set(list);
        return list;
    }

    async criar(input: CreateUserInput): Promise<User> {
        const novo = await firstValueFrom(this.http.post<User>(this.base, input));
        this._users.update((arr) => [...arr, novo]);
        return novo;
    }

    async atualizar(id: string, input: UpdateUserInput): Promise<User> {
        const updated = await firstValueFrom(this.http.patch<User>(`${this.base}/${id}`, input));
        this._users.update((arr) => arr.map((u) => (u.id === id ? updated : u)));
        return updated;
    }

    async excluir(id: string): Promise<void> {
        await firstValueFrom(this.http.delete<void>(`${this.base}/${id}`));
        this._users.update((arr) => arr.filter((u) => u.id !== id));
    }

    async toggleAtivo(id: string, ativo: boolean): Promise<User> {
        const updated = await firstValueFrom(
            this.http.patch<User>(`${this.base}/${id}/ativo`, { ativo }),
        );
        this._users.update((arr) => arr.map((u) => (u.id === id ? updated : u)));
        return updated;
    }
}
