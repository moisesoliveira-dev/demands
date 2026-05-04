import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  Sparkles, Download, Plus, ChevronDown, ChevronUp,
  AlertTriangle, Trash2, FilePlus, History, Send, Bot, Loader2,
} from 'lucide-angular';
import { DemandasService } from '../services/demandas.service';
import { IaService } from '../services/ia.service';
import { DemandStatus } from '../types';
import { UiCard, UiCardContent } from '../components/ui/card.component';
import { UiButton } from '../components/ui/button.component';
import { exportarDemandasCSV } from '../lib/export';
import { toast } from '../lib/toast';
import { environment } from '../../environments/environment';

const STORAGE_KEY = 'demands_relatorios_historico';

interface RelatorioGerado {
  id: string;
  dataISO: string;
  totalDemandas: number;
  concluidas: number;
  bloqueadas: number;
  andamento: number;
  pendentes: number;
  taxa: number;
  insights: string[];
  recomendacao: string | null;
}

@Component({
  selector: 'app-relatorios',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, UiCard, UiCardContent, UiButton],
  template: `
<div class="space-y-6">

  <!-- ── Cabeçalho ─────────────────────────────────────────────────────────── -->
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 class="text-2xl font-bold text-foreground">Relatórios</h1>
      <p class="text-sm text-muted-foreground mt-0.5">Histórico de análises geradas por IA</p>
    </div>
    <div class="flex gap-2">
      <ui-button variant="outline" size="sm" (click)="exportarCSV()">
        <lucide-angular [img]="Download" size="15" class="mr-1.5" /> Exportar CSV
      </ui-button>
      @if (iaHabilitada) {
        <ui-button variant="outline" size="sm" [disabled]="ia.carregando()" (click)="gerarComIA()">
          @if (ia.carregando()) {
            <lucide-angular [img]="Loader2" size="15" class="mr-1.5 animate-spin" />
          } @else {
            <lucide-angular [img]="Bot" size="15" class="mr-1.5" />
          }
          Gerar com IA
        </ui-button>
      }
      <ui-button size="sm" (click)="gerar()">
        <lucide-angular [img]="Plus" size="15" class="mr-1.5" /> Gerar Relatório
      </ui-button>
    </div>
  </div>

  <!-- ── Pergunte à IA ──────────────────────────────────────────────── -->
  @if (iaHabilitada) {
    <ui-card>
      <div class="px-5 py-4 space-y-3">
        <div class="flex items-center gap-2">
          <lucide-angular [img]="Sparkles" size="15" class="text-primary" />
          <span class="text-sm font-semibold text-foreground">Pergunte à IA</span>
          <span class="text-xs text-muted-foreground">— faça perguntas livres sobre suas demandas.</span>
        </div>
        <div class="flex gap-2">
          <input
            type="text"
            class="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Ex.: Quais setores têm mais demandas bloqueadas?"
            [(ngModel)]="perguntaIA"
            (keydown.enter)="perguntar()"
            [disabled]="ia.carregando()" />
          <ui-button size="sm" [disabled]="ia.carregando() || !perguntaIA().trim()" (click)="perguntar()">
            @if (ia.carregando()) {
              <lucide-angular [img]="Loader2" size="15" class="animate-spin" />
            } @else {
              <lucide-angular [img]="Send" size="15" />
            }
          </ui-button>
        </div>
        @if (respostaIA()) {
          <div class="rounded-lg border border-border bg-muted/30 p-3 text-sm whitespace-pre-wrap text-foreground">
            {{ respostaIA() }}
          </div>
        }
      </div>
    </ui-card>
  }

  <!-- ── Empty state ────────────────────────────────────────────────────────── -->
  @if (historico().length === 0) {
    <div class="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border
                bg-muted/30 py-20 text-center">
      <div class="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <lucide-angular [img]="FilePlus" size="26" class="text-primary" />
      </div>
      <div>
        <p class="font-semibold text-foreground">Nenhum relatório gerado ainda</p>
        <p class="text-sm text-muted-foreground mt-1">
          Clique em "Gerar Relatório" para criar uma análise automática com IA
          com base nos dados atuais.
        </p>
      </div>
      <ui-button (click)="gerar()">
        <lucide-angular [img]="Sparkles" size="15" class="mr-1.5" /> Gerar primeiro relatório
      </ui-button>
    </div>
  }

  <!-- ── Histórico ──────────────────────────────────────────────────────────── -->
  @for (r of historico(); track r.id) {
    <ui-card>
      <!-- Linha resumo (sempre visível) -->
      <button class="w-full text-left flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors rounded-t-xl"
        [class.rounded-b-xl]="expandedId() !== r.id"
        (click)="toggle(r.id)">

        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <lucide-angular [img]="History" size="18" class="text-primary" />
        </div>

        <div class="flex-1 min-w-0">
          <p class="font-semibold text-foreground text-sm">Relatório · {{ formatDate(r.dataISO) }}</p>
          <div class="flex flex-wrap gap-2 mt-1">
            <span class="text-xs text-muted-foreground">{{ r.totalDemandas }} demanda(s)</span>
            <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold
                         bg-emerald-50 text-emerald-700 border border-emerald-200">
              {{ r.taxa }}% concluído
            </span>
            @if (r.andamento > 0) {
              <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold
                           bg-blue-50 text-blue-700 border border-blue-200">
                {{ r.andamento }} em andamento
              </span>
            }
            @if (r.bloqueadas > 0) {
              <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold
                           bg-red-50 text-red-700 border border-red-200">
                {{ r.bloqueadas }} bloqueada(s)
              </span>
            }
          </div>
        </div>

        <div class="flex items-center gap-1 shrink-0">
          <button
            class="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-red-600
                   hover:bg-red-50 transition-colors"
            (click)="excluir($event, r.id)"
            title="Excluir relatório">
            <lucide-angular [img]="Trash2" size="15" />
          </button>
          <span class="flex h-8 w-8 items-center justify-center text-muted-foreground">
            <lucide-angular [img]="expandedId() === r.id ? ChevronUp : ChevronDown" size="16" />
          </span>
        </div>
      </button>

      <!-- Conteúdo expandido -->
      @if (expandedId() === r.id) {
        <div class="px-5 pb-5 pt-4 border-t border-border space-y-4">

          <!-- Insights IA -->
          <div class="flex items-center gap-2 mb-2">
            <lucide-angular [img]="Sparkles" size="14" class="text-primary" />
            <span class="text-xs font-semibold uppercase tracking-wide text-primary">Análise por IA</span>
          </div>

          <ul class="space-y-2">
            @for (insight of r.insights; track insight) {
              <li class="flex items-start gap-2 text-sm text-foreground leading-relaxed">
                <span class="text-primary shrink-0 mt-0.5">›</span>
                <span [innerHTML]="insight"></span>
              </li>
            }
          </ul>

          @if (r.recomendacao) {
            <div class="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-3">
              <lucide-angular [img]="AlertTriangle" size="15" class="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p class="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-0.5">Recomendação</p>
                <p class="text-sm text-amber-900">{{ r.recomendacao }}</p>
              </div>
            </div>
          }
        </div>
      }
    </ui-card>
  }

</div>
  `,
})
export class RelatoriosPageComponent implements OnInit {
  readonly Sparkles = Sparkles; readonly Download = Download; readonly Plus = Plus;
  readonly ChevronDown = ChevronDown; readonly ChevronUp = ChevronUp;
  readonly AlertTriangle = AlertTriangle; readonly Trash2 = Trash2;
  readonly FilePlus = FilePlus; readonly History = History;
  readonly Send = Send; readonly Bot = Bot; readonly Loader2 = Loader2;

  private demandasService = inject(DemandasService);
  readonly ia = inject(IaService);
  private all = computed(() => this.demandasService.demandas());

  readonly iaHabilitada = environment.aiEnabled === true;
  readonly perguntaIA = signal('');
  readonly respostaIA = signal('');
  private readonly sessionId = `relatorios-${Date.now()}`;

  historico = signal<RelatorioGerado[]>([]);
  expandedId = signal<string | null>(null);

  ngOnInit() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) this.historico.set(JSON.parse(saved));
    } catch { /* noop */ }
  }

  private save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.historico()));
  }

  gerar() {
    const all = this.all();
    const total = all.length;
    const concluidas = all.filter(d => d.status === DemandStatus.CONCLUIDO).length;
    const bloqueadas = all.filter(d => d.status === DemandStatus.BLOQUEADO).length;
    const andamento = all.filter(d => d.status === DemandStatus.EM_ANDAMENTO).length;
    const pendentes = all.filter(d => d.status === DemandStatus.PENDENTE).length;
    const taxa = total ? Math.round((concluidas / total) * 100) : 0;
    const criticas = all.filter(d => d.prioridade === 5 && d.status !== DemandStatus.CONCLUIDO).length;

    const relatorio: RelatorioGerado = {
      id: Date.now().toString(),
      dataISO: new Date().toISOString(),
      totalDemandas: total,
      concluidas,
      bloqueadas,
      andamento,
      pendentes,
      taxa,
      insights: this.buildInsights(all, total, concluidas, bloqueadas, andamento, pendentes, taxa),
      recomendacao: this.buildRecomendacao(bloqueadas, criticas),
    };

    this.historico.update(h => [relatorio, ...h]);
    this.expandedId.set(relatorio.id);
    this.save();
    toast.success('Relatório gerado', 'A análise foi adicionada ao histórico.');
  }

  excluir(event: Event, id: string) {
    event.stopPropagation();
    this.historico.update(h => h.filter(r => r.id !== id));
    if (this.expandedId() === id) this.expandedId.set(null);
    this.save();
  }

  toggle(id: string) {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  formatDate(iso: string) {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  exportarCSV() {
    exportarDemandasCSV(this.all());
  }

  /** Pergunta livre ao FinanceAgent. */
  async perguntar() {
    const q = this.perguntaIA().trim();
    if (!q) return;
    try {
      const r = await this.ia.perguntar(q, this.sessionId);
      this.respostaIA.set(r.content);
      this.perguntaIA.set('');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Falha ao consultar a IA.';
      toast.error('IA indisponível', msg);
    }
  }

  /** Aciona o workflow `content_pipeline` para os últimos 30 dias. */
  async gerarComIA() {
    const fim = new Date();
    const inicio = new Date();
    inicio.setDate(inicio.getDate() - 30);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    try {
      const r = await this.ia.gerarRelatorioPeriodo(fmt(inicio), fmt(fim));
      const all = this.all();
      const total = all.length;
      const concluidas = all.filter(d => d.status === DemandStatus.CONCLUIDO).length;
      const bloqueadas = all.filter(d => d.status === DemandStatus.BLOQUEADO).length;
      const andamento = all.filter(d => d.status === DemandStatus.EM_ANDAMENTO).length;
      const pendentes = all.filter(d => d.status === DemandStatus.PENDENTE).length;
      const taxa = total ? Math.round((concluidas / total) * 100) : 0;
      // Quebra o markdown da IA em insights (linhas não vazias).
      const insights = (r.relatorio_md ?? '')
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#'))
        .slice(0, 12);
      const relatorio: RelatorioGerado = {
        id: Date.now().toString(),
        dataISO: new Date().toISOString(),
        totalDemandas: total,
        concluidas, bloqueadas, andamento, pendentes, taxa,
        insights: insights.length ? insights : ['Relatório gerado pela IA (sem itens enumerados).'],
        recomendacao: r.gargalos?.total_bloqueadas
          ? `IA identificou ${r.gargalos.total_bloqueadas} demanda(s) bloqueada(s) e ${r.gargalos.total_criticas} crítica(s) no período.`
          : null,
      };
      this.historico.update(h => [relatorio, ...h]);
      this.expandedId.set(relatorio.id);
      this.save();
      toast.success('Relatório IA gerado', 'Análise dos últimos 30 dias adicionada ao histórico.');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Falha ao gerar relatório com IA.';
      toast.error('IA indisponível', msg);
    }
  }

  private buildInsights(
    all: ReturnType<typeof this.demandasService.demandas>,
    total: number, concluidas: number, bloqueadas: number,
    andamento: number, pendentes: number, taxa: number,
  ): string[] {
    if (total === 0) return ['Nenhuma demanda cadastrada no momento da geração.'];

    const taxaLabel = taxa >= 70 ? 'acima da meta' : taxa >= 40 ? 'abaixo da meta' : 'muito abaixo da meta';

    const setorMap = new Map<string, number>();
    for (const d of all.filter(d => d.status !== DemandStatus.CONCLUIDO))
      setorMap.set(d.setor, (setorMap.get(d.setor) ?? 0) + 1);
    const [topSetor, topSetorCount] = [...setorMap.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['—', 0];

    const respMap = new Map<string, number>();
    for (const d of all.filter(d => d.status !== DemandStatus.CONCLUIDO))
      respMap.set(d.responsavel, (respMap.get(d.responsavel) ?? 0) + 1);
    const [topResp, topRespCount] = [...respMap.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['—', 0];

    const criticas = all.filter(d => d.prioridade === 5 && d.status !== DemandStatus.CONCLUIDO).length;

    const list: string[] = [];
    list.push(`A taxa de conclusão no momento da geração era <strong>${taxa}%</strong> (${concluidas} de ${total} demandas) — <em>${taxaLabel} de 70%</em>.`);
    list.push(`<strong>${andamento}</strong> demanda(s) estavam em andamento, <strong>${pendentes}</strong> pendente(s) e <strong>${bloqueadas}</strong> bloqueada(s).`);
    if (criticas > 0)
      list.push(`<strong>${criticas}</strong> demanda(s) com prioridade <strong>Crítica</strong> estavam em aberto.`);
    if (topSetorCount > 0)
      list.push(`O setor <strong>"${topSetor}"</strong> concentrava o maior volume de demandas ativas (${topSetorCount}).`);
    if (topRespCount > 0)
      list.push(`<strong>${topResp}</strong> era o responsável com maior carga de demandas em aberto (${topRespCount}).`);
    return list;
  }

  private buildRecomendacao(bloqueadas: number, criticas: number): string | null {
    if (bloqueadas >= 3)
      return `Havia ${bloqueadas} demandas bloqueadas. Recomendava-se realizar uma reunião de desbloqueio para identificar os impedimentos.`;
    if (criticas >= 2)
      return `Existiam ${criticas} demandas críticas em aberto. Era necessário priorizar a alocação de recursos.`;
    return null;
  }
}
