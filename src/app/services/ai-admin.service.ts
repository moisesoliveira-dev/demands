import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

// ─── DTOs alinhados com /api/ai/admin/* (NestJS proxy → Agno) ────────────────

export interface AiConfig {
    default_model: string;
    temperature: number;
    system_prompt_extra: string;
    embedder_provider: string;
    embedder_model: string;
    kb_top_k: number;
    supabase_configured?: boolean;
}

export interface AiConfigPatch {
    default_model?: string;
    temperature?: number;
    system_prompt_extra?: string;
    embedder_provider?: string;
    embedder_model?: string;
    kb_top_k?: number;
}

export interface AiMetricsDay { day: string; runs: number; tokens: number; cost: number; }
export interface AiMetricsModel { model_spec: string; runs: number; tokens: number; cost: number; }
export interface AiMetricsUser { user_id: string; runs: number; tokens: number; cost: number; }

export interface AiMetricsSummary {
    since: string;
    days: number;
    totals: {
        runs: number;
        input_tokens: number;
        output_tokens: number;
        total_tokens: number;
        cost_usd: number;
        avg_latency_ms: number;
        success_rate: number;
    };
    per_day: AiMetricsDay[];
    per_model: AiMetricsModel[];
    per_user: AiMetricsUser[];
}

export interface KnowledgeDocument {
    id: string;
    filename: string;
    content_type: string | null;
    size_bytes: number;
    uploaded_by: string | null;
    setor: string | null;
    created_at: string;
    metadata: Record<string, unknown>;
}

export interface KnowledgeListResponse {
    configured: boolean;
    documents: KnowledgeDocument[];
}

// ─── Perfil & Memórias (Fase 2) ──────────────────────────────────────────────

export interface UserProfile {
    user_id: string;
    display_name: string | null;
    role_text: string | null;
    default_setor: string | null;
    notes: string | null;
    stats: {
        total_demandas?: number;
        setores?: Record<string, number>;
        prio_avg?: number;
        prio_n?: number;
    };
    updated_at: string;
}

export interface UserProfilePatch {
    display_name?: string | null;
    role_text?: string | null;
    default_setor?: string | null;
    notes?: string | null;
}

export interface MemoryItem {
    id: number;
    user_id: string;
    kind: string;
    summary: string;
    setor: string | null;
    prioridade: number | null;
    demanda_ref: string | null;
    created_at: string;
}

@Injectable({ providedIn: 'root' })
export class AiAdminService {
    private http = inject(HttpClient);
    private base = `${environment.aiUrl}/admin`;

    // Estado reativo (assinaturas para o componente)
    config = signal<AiConfig | null>(null);
    metrics = signal<AiMetricsSummary | null>(null);
    knowledge = signal<KnowledgeListResponse>({ configured: false, documents: [] });
    profile = signal<UserProfile | null>(null);
    memories = signal<MemoryItem[]>([]);
    loading = signal(false);

    async loadConfig(): Promise<AiConfig> {
        const cfg = await firstValueFrom(this.http.get<AiConfig>(`${this.base}/config`));
        this.config.set(cfg);
        return cfg;
    }

    async updateConfig(patch: AiConfigPatch): Promise<AiConfig> {
        const cfg = await firstValueFrom(this.http.put<AiConfig>(`${this.base}/config`, patch));
        this.config.set(cfg);
        return cfg;
    }

    async loadMetrics(days = 30): Promise<AiMetricsSummary> {
        const m = await firstValueFrom(
            this.http.get<AiMetricsSummary>(`${this.base}/metrics`, { params: { days } }),
        );
        this.metrics.set(m);
        return m;
    }

    async loadKnowledge(): Promise<KnowledgeListResponse> {
        const k = await firstValueFrom(this.http.get<KnowledgeListResponse>(`${this.base}/knowledge`));
        this.knowledge.set(k);
        return k;
    }

    async uploadKnowledge(file: File, setor?: string | null): Promise<KnowledgeDocument> {
        const form = new FormData();
        form.append('file', file, file.name);
        const s = (setor || '').trim();
        if (s) form.append('setor', s);
        const doc = await firstValueFrom(
            this.http.post<KnowledgeDocument>(`${this.base}/knowledge`, form),
        );
        await this.loadKnowledge();
        return doc;
    }

    async deleteKnowledge(id: string): Promise<void> {
        await firstValueFrom(this.http.delete<void>(`${this.base}/knowledge/${id}`));
        this.knowledge.update((k) => ({ ...k, documents: k.documents.filter((d) => d.id !== id) }));
    }

    // ─── Perfil & Memórias ───────────────────────────────────────────────────

    async loadProfile(): Promise<UserProfile> {
        const p = await firstValueFrom(this.http.get<UserProfile>(`${this.base}/profile`));
        this.profile.set(p);
        return p;
    }

    async updateProfile(patch: UserProfilePatch): Promise<UserProfile> {
        const p = await firstValueFrom(this.http.put<UserProfile>(`${this.base}/profile`, patch));
        this.profile.set(p);
        return p;
    }

    async loadMemories(limit = 50): Promise<MemoryItem[]> {
        const res = await firstValueFrom(
            this.http.get<{ items: MemoryItem[] }>(`${this.base}/memories`, { params: { limit } }),
        );
        this.memories.set(res.items || []);
        return res.items || [];
    }

    async deleteMemory(id: number): Promise<void> {
        await firstValueFrom(this.http.delete<void>(`${this.base}/memories/${id}`));
        this.memories.update((arr) => arr.filter((m) => m.id !== id));
    }

    async clearMemories(): Promise<number> {
        const res = await firstValueFrom(
            this.http.delete<{ removed: number }>(`${this.base}/memories`),
        );
        this.memories.set([]);
        return res.removed;
    }
}
