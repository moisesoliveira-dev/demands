import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CompanySettings {
    company_name: string;
    company_logo_url: string;
    company_context: string;
}

export interface DbInfo {
    host: string;
    port: string;
    database: string;
    user: string;
    ssl: boolean;
}

export interface AppSettingsResponse {
    company: CompanySettings;
    db: DbInfo;
}

@Injectable({ providedIn: 'root' })
export class AppSettingsService {
    private http = inject(HttpClient);
    private base = `${environment.apiUrl}/admin/settings`;

    settings = signal<AppSettingsResponse | null>(null);
    loading = signal(false);
    saving = signal(false);

    async load(): Promise<AppSettingsResponse> {
        this.loading.set(true);
        try {
            const data = await firstValueFrom(this.http.get<AppSettingsResponse>(this.base));
            this.settings.set(data);
            return data;
        } finally {
            this.loading.set(false);
        }
    }

    async updateCompany(patch: Partial<CompanySettings>): Promise<CompanySettings> {
        this.saving.set(true);
        try {
            const result = await firstValueFrom(
                this.http.put<CompanySettings>(`${this.base}/company`, patch),
            );
            this.settings.update((s) => s ? { ...s, company: result } : s);
            return result;
        } finally {
            this.saving.set(false);
        }
    }
}
