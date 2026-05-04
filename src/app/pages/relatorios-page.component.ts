import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  LucideAngularModule,
  Sparkles, Download, ChevronRight, X, Filter,
  AlertTriangle, CheckCircle2, Clock, ShieldAlert,
} from 'lucide-angular';
import { DemandasService } from '../services/demandas.service';
import { DemandStatus, Prioridade } from '../types';
import { PRIORIDADE_CONFIG } from '../components/demandas/demand-card.component';
import { UiCard, UiCardContent, UiCardHeader, UiCardTitle } from '../components/ui/card.component';
import { UiButton } from '../components/ui/button.component';
import { exportarDemandasCSV } from '../lib/export';

const STATUS_LABEL: Record<string, string> = {
  [DemandStatus.PENDENTE]:     'Pendente',
  [DemandStatus.EM_ANDAMENTO]: 'Em Andamento',
  [DemandStatus.BLOQUEADO]:    'Bloqueado',
  [DemandStatus.CONCLUIDO]:    'Concluído',
};

const STATUS_BADGE: Record<string, string> = {
  [DemandStatus.PENDENTE]:     'bg-slate-100 text-slate-700 border-slate-200',
  [DemandStatus.EM_ANDAMENTO]: 'bg-blue-50 text-blue-700 border-blue-200',
  [DemandStatus.BLOQUEADO]:    'bg-red-50 text-red-700 border-red-200',
  [DemandStatus.CONCLUIDO]:    'bg-emerald-50 text-emerald-700 border-emerald-200',
};

@Component({
  selector: 'app-relatorios',
  standalone: true,
  imports: [
    CommonModule, RouterModule, LucideAngularModule,
    UiCard, UiCardContent, UiCardHeader, UiCardTitle,
    UiButton,
  ],
  template: `
<div class="space-y-6">

  <!-- ── Cabeçalho ────────────────────────────────────────────────────────── -->
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 class="text-2xl font-bold text-foreground">Relatório de Demandas</h1>
      <p class="text-sm text-muted-foreground mt-0.5">Gerado em {{ today }}</p>
    </div>
    <ui-button size="sm" variant="outline" (click)="exportar()">
      <lucide-angular [img]="Download" size="15" class="mr-1.5" /> Exportar CSV
    </ui-button>
  </div>

  <!-- ── Análise IA ────────────────────────────────────────────────────────── -->
  <ui-card class="border-l-4 border-l-primary">
    <ui-card-header class="pb-3">
      <ui-card-title class="flex items-center gap-2 text-base">
        <lucide-angular [img]="Sparkles" size="16" class="text-primary" />
        Análise por IA
        <span class="ml-auto text-[11px] font-normal px-2 py-0.5 rounded-full bg-primary/10 text-primary">
          Gerado automaticamente
        </span>
      </ui-card-title>
    </ui-card-header>
    <ui-card-content class="space-y-3">
      <ul class="space-y-2">
        @for (insight of insights(); track insight) {
          <li class="flex items-start gap-2 text-sm text-foreground leading-relaxed">
            <span class="text-primary shrink-0 mt-0.5">›</span>
            <span [innerHTML]="insight"></span>
          </li>
        }
      </ul>

      @if (recomendacao()) {
        <div class="mt-1 flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-3">
          <lucide-angular [img]="AlertTriangle" size="15" class="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p class="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-0.5">Recomendação</p>
            <p class="text-sm text-amber-900">{{ recomendacao() }}</p>
          </div>
        </div>
      }
    </ui-card-content>
  </ui-card>

  <!-- ── Filtros ───────────────────────────────────────────────────────────── -->
  <div class="flex flex-wrap items-center gap-2">
    <lucide-angular [img]="Filter" size="14" class="text-muted-foreground shrink-0" />

    <select class="h-8 rounded-md border border-border bg-background text-foreground text-sm px-2"
      [value]="filterStatus()" (change)="filterStatus.set($any($event.target).value)">
      <option value="">Todos os status</option>
      <option value="PENDENTE">Pendente</option>
      <option value="EM_ANDAMENTO">Em Andamento</option>
      <option value="BLOQUEADO">Bloqueado</option>
      <option value="CONCLUIDO">Concluído</option>
    </select>

    <select class="h-8 rounded-md border border-border bg-background text-foreground text-sm px-2"
      [value]="filterSetor()" (change)="filterSetor.set($any($event.target).value)">
      <option value="">Todos os setores</option>
      @for (s of setores(); track s) {
        <option [value]="s">{{ s }}</option>
      }
    </select>

    <select class="h-8 rounded-md border border-border bg-background text-foreground text-sm px-2"
      [value]="filterPrio()" (change)="filterPrio.set($any($event.target).value)">
      <option value="">Todas as prioridades</option>
      <option value="5">Crítico</option>
      <option value="4">Urgente</option>
      <option value="3">Alta</option>
      <option value="2">Normal</option>
      <option value="1">Baixa</option>
    </select>

    @if (hasFilters()) {
      <button class="h-8 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground
                     border border-border rounded-md px-2 transition-colors"
        (click)="clearFilters()">
        <lucide-angular [img]="X" size="12" /> Limpar
      </button>
    }

    <span class="ml-auto text-xs text-muted-foreground">
      {{ filtered().length }} resultado(s)
    </span>
  </div>

  <!-- ── Tabela ────────────────────────────────────────────────────────────── -->
  <ui-card class="overflow-hidden p-0">
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border bg-muted/50">
            <th class="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">Título</th>
            <th class="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">Status</th>
            <th class="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">Prioridade</th>
            <th class="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">Setor</th>
            <th class="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">Responsável</th>
            <th class="w-8 px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          @if (filtered().length === 0) {
            <tr>
              <td colspan="6" class="text-center text-muted-foreground py-16 text-sm">
                Nenhuma demanda encontrada.
              </td>
            </tr>
          }
          @for (d of filtered(); track d.id; let odd = $odd) {
            <tr class="border-b border-border/50 last:border-0 transition-colors group hover:bg-muted/40"
              [class.bg-muted/20]="odd">
              <td class="px-4 py-3 font-medium text-foreground">
                <span class="line-clamp-1 max-w-72">{{ d.titulo }}</span>
              </td>
              <td class="px-4 py-3">
                <span [class]="'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ' + statusBadge(d.status)">
                  {{ statusLabel(d.status) }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span [class]="'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ' + prioBadge(d.prioridade)">
                  {{ prioLabel(d.prioridade) }}
                </span>
              </td>
              <td class="px-4 py-3 text-muted-foreground whitespace-nowrap">{{ d.setor }}</td>
              <td class="px-4 py-3 text-muted-foreground whitespace-nowrap">{{ d.responsavel }}</td>
              <td class="px-4 py-3">
                <a [routerLink]="['/demanda-detalhe', d.id]"
                  class="flex items-center justify-center text-muted-foreground hover:text-foreground
                         opacity-0 group-hover:opacity-100 transition-opacity">
                  <lucide-angular [img]="ChevronRight" size="16" />
                </a>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  </ui-card>

</div>
  `,
})
export class RelatoriosPageComponent {
  readonly Sparkles = Sparkles;
  readonly Download = Download;
  readonly ChevronRight = ChevronRight;
  readonly X = X;
  readonly Filter = Filter;
  readonly AlertTriangle = AlertTriangle;

  private demandasService = inject(DemandasService);
  private all = computed(() => this.demandasService.demandas());

  readonly today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  // ── Filtros ──────────────────────────────────────────────────────────────
  filterStatus = signal('');
  filterSetor  = signal('');
  filterPrio   = signal('');

  hasFilters = computed(() => !!this.filterStatus() || !!this.filterSetor() || !!this.filterPrio());
  setores    = computed(() => [...new Set(this.all().map(d => d.setor))].sort());

  filtered = computed(() => {
    let list = this.all();
    const s = this.filterStatus();
    const sec = this.filterSetor();
    const p = this.filterPrio();
    if (s)   list = list.filter(d => d.status === s);
    if (sec) list = list.filter(d => d.setor === sec);
    if (p)   list = list.filter(d => d.prioridade === +p as Prioridade);
    return list;
  });

  clearFilters() {
    this.filterStatus.set('');
    this.filterSetor.set('');
    this.filterPrio.set('');
  }

  // ── Análise IA ──────────────────────────────────────────────────────────
  insights = computed<string[]>(() => {
    const all = this.all();
    const total = all.length;
    if (total === 0) return ['Nenhuma demanda cadastrada ainda.'];

    const concluidas = all.filter(d => d.status === DemandStatus.CONCLUIDO).length;
    const bloqueadas = all.filter(d => d.status === DemandStatus.BLOQUEADO).length;
    const andamento  = all.filter(d => d.status === DemandStatus.EM_ANDAMENTO).length;
    const pendentes  = all.filter(d => d.status === DemandStatus.PENDENTE).length;
    const taxa       = Math.round((concluidas / total) * 100);

    // Setor com mais demandas ativas (não concluídas)
    const setorMap = new Map<string, number>();
    for (const d of all.filter(d => d.status !== DemandStatus.CONCLUIDO))
      setorMap.set(d.setor, (setorMap.get(d.setor) ?? 0) + 1);
    const [topSetor, topSetorCount] = [...setorMap.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['—', 0];

    // Responsável com mais em aberto
    const respMap = new Map<string, number>();
    for (const d of all.filter(d => d.status !== DemandStatus.CONCLUIDO))
      respMap.set(d.responsavel, (respMap.get(d.responsavel) ?? 0) + 1);
    const [topResp, topRespCount] = [...respMap.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['—', 0];

    const criticas = all.filter(d => d.prioridade === 5 && d.status !== DemandStatus.CONCLUIDO).length;
    const taxaLabel = taxa >= 70 ? 'acima da meta' : taxa >= 40 ? 'abaixo da meta' : 'muito abaixo da meta';

    const list: string[] = [];
    list.push(`A taxa de conclusão atual é <strong>${taxa}%</strong> (${concluidas} de ${total} demandas concluídas) — <em>${taxaLabel} de 70%</em>.`);
    list.push(`Existem <strong>${andamento}</strong> demanda(s) em andamento, <strong>${pendentes}</strong> pendente(s) e <strong>${bloqueadas}</strong> bloqueada(s).`);
    if (criticas > 0)
      list.push(`<strong>${criticas}</strong> demanda(s) com prioridade <strong>Crítica</strong> ainda estão em aberto e requerem atenção imediata.`);
    if (topSetorCount > 0)
      list.push(`O setor <strong>"${topSetor}"</strong> concentra o maior volume de demandas ativas (${topSetorCount}).`);
    if (topRespCount > 0)
      list.push(`<strong>${topResp}</strong> é o responsável com maior carga de demandas em aberto (${topRespCount}).`);
    return list;
  });

  recomendacao = computed<string | null>(() => {
    const all = this.all();
    const bloqueadas = all.filter(d => d.status === DemandStatus.BLOQUEADO).length;
    const criticas   = all.filter(d => d.prioridade === 5 && d.status !== DemandStatus.CONCLUIDO).length;
    if (bloqueadas >= 3)
      return `Há ${bloqueadas} demandas bloqueadas. Recomenda-se realizar uma reunião de desbloqueio para identificar os impedimentos e definir responsáveis pela resolução.`;
    if (criticas >= 2)
      return `Existem ${criticas} demandas críticas em aberto. Priorize a alocação de recursos para garantir a entrega dentro do prazo.`;
    return null;
  });

  // ── Helpers de template ─────────────────────────────────────────────────
  statusLabel(s: string) { return STATUS_LABEL[s] ?? s; }
  statusBadge(s: string) { return STATUS_BADGE[s] ?? ''; }
  prioLabel(p: Prioridade) { return PRIORIDADE_CONFIG[p]?.label ?? String(p); }
  prioBadge(p: Prioridade) {
    const cfg = PRIORIDADE_CONFIG[p];
    return cfg ? `${cfg.bg} ${cfg.color}` : '';
  }

  exportar() { exportarDemandasCSV(this.all()); }
}
