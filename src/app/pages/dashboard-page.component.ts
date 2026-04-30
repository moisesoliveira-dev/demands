import {
  Component, computed, inject, effect, ViewChild, ElementRef,
  AfterViewInit, OnDestroy, signal, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  LucideAngularModule, ClipboardList, TrendingUp, CheckCircle2,
  AlertTriangle, Flame, Activity, BarChart2, PieChart, Users,
} from 'lucide-angular';
import {
  Chart, DoughnutController, BarController, LineController,
  CategoryScale, LinearScale, ArcElement, BarElement, PointElement,
  LineElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { DemandasService } from '../services/demandas.service';
import { AuthService } from '../services/auth.service';
import { DemandStatus, Prioridade } from '../types';
import { UiCard, UiCardContent, UiCardHeader, UiCardTitle, UiCardDescription } from '../components/ui/card.component';
import { UiBadge } from '../components/ui/badge.component';
import { MotionInViewDirective } from '../lib/motion.directives';

Chart.register(
  DoughnutController, BarController, LineController,
  CategoryScale, LinearScale, ArcElement, BarElement, PointElement,
  LineElement, Tooltip, Legend, Filler,
);

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, LucideAngularModule, UiCard, UiCardContent, UiCardHeader, UiCardTitle, UiCardDescription, UiBadge, MotionInViewDirective],
  template: `
    <div class="space-y-6">

      <!-- KPIs -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ui-card motionInView class="border-t-4 border-t-border overflow-hidden relative">
          <ui-card-content class="p-5">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Total</p>
                <p class="text-4xl font-bold font-mono text-foreground">{{ total() }}</p>
              </div>
              <div class="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <lucide-angular [img]="ClipboardList" size="20" class="text-muted-foreground" />
              </div>
            </div>
            <p class="mt-3 text-xs text-muted-foreground">Todas as demandas ativas</p>
          </ui-card-content>
        </ui-card>

        <ui-card motionInView class="border-t-4 border-t-blue-500 overflow-hidden">
          <ui-card-content class="p-5">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Em Andamento</p>
                <p class="text-4xl font-bold font-mono text-blue-600">{{ andamento() }}</p>
              </div>
              <div class="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <lucide-angular [img]="TrendingUp" size="20" class="text-blue-600" />
              </div>
            </div>
            <div class="mt-3">
              <div class="h-1.5 bg-muted rounded-full overflow-hidden">
                <div class="h-full bg-blue-500 rounded-full transition-all duration-700"
                     [style.width.%]="total() ? andamento() / total() * 100 : 0"></div>
              </div>
              <p class="mt-1 text-xs text-muted-foreground">{{ total() ? (andamento() / total() * 100 | number:'1.0-0') : 0 }}% do total</p>
            </div>
          </ui-card-content>
        </ui-card>

        <ui-card motionInView class="border-t-4 border-t-green-500 overflow-hidden">
          <ui-card-content class="p-5">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Concluídas</p>
                <p class="text-4xl font-bold font-mono text-green-600">{{ concluidas() }}</p>
              </div>
              <div class="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <lucide-angular [img]="CheckCircle2" size="20" class="text-green-600" />
              </div>
            </div>
            <div class="mt-3">
              <div class="h-1.5 bg-muted rounded-full overflow-hidden">
                <div class="h-full bg-green-500 rounded-full transition-all duration-700"
                     [style.width.%]="total() ? concluidas() / total() * 100 : 0"></div>
              </div>
              <p class="mt-1 text-xs text-muted-foreground">{{ total() ? (concluidas() / total() * 100 | number:'1.0-0') : 0 }}% do total</p>
            </div>
          </ui-card-content>
        </ui-card>

        <ui-card motionInView class="border-t-4 border-t-red-500 overflow-hidden">
          <ui-card-content class="p-5">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Críticas</p>
                <p class="text-4xl font-bold font-mono text-red-600">{{ criticas() }}</p>
              </div>
              <div class="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <lucide-angular [img]="Flame" size="20" class="text-red-600" />
              </div>
            </div>
            <p class="mt-3 text-xs text-muted-foreground">Prioridade urgente ou crítica</p>
          </ui-card-content>
        </ui-card>
      </div>

      <!-- Charts row 1 -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

        <!-- Donut: Status -->
        <ui-card motionInView>
          <ui-card-header class="pb-2">
            <div class="flex items-center gap-2">
              <lucide-angular [img]="PieChart" size="16" class="text-muted-foreground" />
              <ui-card-title>Status</ui-card-title>
            </div>
            <ui-card-description>Distribuição atual</ui-card-description>
          </ui-card-header>
          <ui-card-content class="flex flex-col items-center gap-4">
            <div class="relative w-44 h-44">
              <canvas #donutCanvas></canvas>
              <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span class="text-3xl font-bold font-mono text-foreground">{{ total() }}</span>
                <span class="text-xs text-muted-foreground">demandas</span>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-x-6 gap-y-1.5 w-full text-xs">
              @for (s of statusBars(); track s.label) {
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full flex-shrink-0" [style.background]="s.hex"></span>
                  <span class="text-muted-foreground truncate">{{ s.label }}</span>
                  <span class="ml-auto font-mono font-semibold text-foreground">{{ s.count }}</span>
                </div>
              }
            </div>
          </ui-card-content>
        </ui-card>

        <!-- Bar: Demandas por Setor -->
        <ui-card motionInView class="lg:col-span-2">
          <ui-card-header class="pb-2">
            <div class="flex items-center gap-2">
              <lucide-angular [img]="BarChart2" size="16" class="text-muted-foreground" />
              <ui-card-title>Por Setor</ui-card-title>
            </div>
            <ui-card-description>Volume de demandas por setor</ui-card-description>
          </ui-card-header>
          <ui-card-content>
            <div class="h-52">
              <canvas #barCanvas></canvas>
            </div>
          </ui-card-content>
        </ui-card>
      </div>

      <!-- Charts row 2 -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

        <!-- Line: Tendência (demandas por prioridade) -->
        <ui-card motionInView class="lg:col-span-2">
          <ui-card-header class="pb-2">
            <div class="flex items-center gap-2">
              <lucide-angular [img]="Activity" size="16" class="text-muted-foreground" />
              <ui-card-title>Distribuição por Prioridade</ui-card-title>
            </div>
            <ui-card-description>Contagem acumulada por nível</ui-card-description>
          </ui-card-header>
          <ui-card-content>
            <div class="h-52">
              <canvas #lineCanvas></canvas>
            </div>
          </ui-card-content>
        </ui-card>

        <!-- Responsáveis top -->
        <ui-card motionInView>
          <ui-card-header class="pb-2">
            <div class="flex items-center gap-2">
              <lucide-angular [img]="Users" size="16" class="text-muted-foreground" />
              <ui-card-title>Top Responsáveis</ui-card-title>
            </div>
            <ui-card-description>Por volume de demandas</ui-card-description>
          </ui-card-header>
          <ui-card-content class="space-y-3">
            @for (r of topResponsaveis(); track r.nome; let i = $index) {
              <div class="flex items-center gap-3">
                <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                     [style.background]="rankColors[i % rankColors.length]">
                  {{ r.nome[0] }}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-foreground truncate">{{ r.nome }}</p>
                  <div class="mt-0.5 h-1 bg-muted rounded-full overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-700"
                         [style.width.%]="r.pct"
                         [style.background]="rankColors[i % rankColors.length]"></div>
                  </div>
                </div>
                <span class="text-sm font-mono font-bold text-foreground">{{ r.count }}</span>
              </div>
            }
          </ui-card-content>
        </ui-card>
      </div>

      <!-- Lista crítica -->
      <ui-card motionInView>
        <ui-card-header>
          <div class="flex items-center gap-2">
            <lucide-angular [img]="Flame" size="16" class="text-red-500" />
            <ui-card-title>Demandas Críticas</ui-card-title>
          </div>
          <ui-card-description>Prioridade urgente ou crítica — em aberto</ui-card-description>
        </ui-card-header>
        <ui-card-content>
          <div class="space-y-2">
            @for (d of criticasList(); track d.id) {
              <div class="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent transition-colors">
                <div class="flex items-center gap-3 flex-1 min-w-0">
                  <div class="w-1.5 h-8 rounded-full flex-shrink-0"
                       [class]="d.prioridade === 5 ? 'bg-red-500' : 'bg-amber-500'"></div>
                  <div class="min-w-0">
                    <p class="font-medium text-foreground truncate">{{ d.titulo }}</p>
                    <p class="text-xs text-muted-foreground">{{ d.setor }} · {{ d.responsavel }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0 ml-2">
                  <span class="hidden sm:inline text-xs text-muted-foreground">{{ d.status }}</span>
                  <ui-badge [variant]="d.prioridade === 5 ? 'destructive' : 'secondary'">P{{ d.prioridade }}</ui-badge>
                </div>
              </div>
            }
            @if (criticasList().length === 0) {
              <div class="text-center py-8">
                <lucide-angular [img]="CheckCircle2" size="32" class="text-green-500 mx-auto mb-2" />
                <p class="text-sm text-muted-foreground">Nenhuma demanda crítica em aberto</p>
              </div>
            }
          </div>
        </ui-card-content>
      </ui-card>
    </div>
  `,
})
export class DashboardPageComponent implements AfterViewInit, OnDestroy {
  private demandasService = inject(DemandasService);
  private auth = inject(AuthService);

  @ViewChild('donutCanvas') donutCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barCanvas') barCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('lineCanvas') lineCanvas!: ElementRef<HTMLCanvasElement>;

  private donutChart?: Chart;
  private barChart?: Chart;
  private lineChart?: Chart;

  readonly ClipboardList = ClipboardList; readonly TrendingUp = TrendingUp;
  readonly CheckCircle2 = CheckCircle2; readonly AlertTriangle = AlertTriangle;
  readonly Flame = Flame; readonly Activity = Activity;
  readonly BarChart2 = BarChart2; readonly PieChart = PieChart; readonly Users = Users;

  readonly rankColors = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6'];

  // ─── computed signals ────────────────────────────────────────────────────
  total = computed(() => this.demandasService.demandas().length);
  andamento = computed(() => this.demandasService.demandas().filter((d) => d.status === DemandStatus.EM_ANDAMENTO).length);
  concluidas = computed(() => this.demandasService.demandas().filter((d) => d.status === DemandStatus.CONCLUIDO).length);
  criticas = computed(() => this.demandasService.demandas().filter((d) => d.prioridade >= 4).length);

  statusBars = computed(() => {
    const all = this.demandasService.demandas();
    const data = [
      { status: DemandStatus.PENDENTE, label: 'Pendente', hex: '#f59e0b', color: 'bg-amber-500' },
      { status: DemandStatus.EM_ANDAMENTO, label: 'Em Andamento', hex: '#3b82f6', color: 'bg-blue-500' },
      { status: DemandStatus.BLOQUEADO, label: 'Bloqueado', hex: '#ef4444', color: 'bg-red-500' },
      { status: DemandStatus.CONCLUIDO, label: 'Concluído', hex: '#10b981', color: 'bg-green-500' },
    ];
    return data.map((d) => {
      const count = all.filter((x) => x.status === d.status).length;
      return { ...d, count, pct: all.length ? (count / all.length) * 100 : 0 };
    });
  });

  setorBars = computed(() => {
    const all = this.demandasService.demandas();
    const map = new Map<string, number>();
    all.forEach((d) => map.set(d.setor, (map.get(d.setor) || 0) + 1));
    const max = Math.max(...Array.from(map.values()), 1);
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count, pct: (count / max) * 100 }));
  });

  topResponsaveis = computed(() => {
    const all = this.demandasService.demandas();
    const map = new Map<string, number>();
    all.forEach((d) => map.set(d.responsavel, (map.get(d.responsavel) || 0) + 1));
    const max = Math.max(...Array.from(map.values()), 1);
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([nome, count]) => ({ nome, count, pct: (count / max) * 100 }));
  });

  prioridadeBars = computed(() => {
    const all = this.demandasService.demandas();
    return [1, 2, 3, 4, 5].map((p) => all.filter((d) => d.prioridade === p).length);
  });

  criticasList = computed(() =>
    this.demandasService.demandas()
      .filter((d) => d.prioridade >= 4 && d.status !== DemandStatus.CONCLUIDO)
      .sort((a, b) => b.prioridade - a.prioridade)
      .slice(0, 8)
  );

  // ─── chart lifecycle ─────────────────────────────────────────────────────
  ngAfterViewInit() {
    this.buildDonut();
    this.buildBar();
    this.buildLine();

    // reactively update when data changes
    effect(() => {
      const status = this.statusBars();
      this.donutChart?.data?.datasets[0] && Object.assign(this.donutChart.data.datasets[0], {
        data: status.map((s) => s.count),
      });
      this.donutChart?.update('active');

      const setor = this.setorBars();
      if (this.barChart?.data) {
        this.barChart.data.labels = setor.map((s) => s.label);
        this.barChart.data.datasets[0].data = setor.map((s) => s.count);
        this.barChart.update('active');
      }

      const prio = this.prioridadeBars();
      if (this.lineChart?.data?.datasets[0]) {
        this.lineChart.data.datasets[0].data = prio;
        this.lineChart.update('active');
      }
    });
  }

  ngOnDestroy() {
    this.donutChart?.destroy();
    this.barChart?.destroy();
    this.lineChart?.destroy();
  }

  private isDark() {
    return document.documentElement.classList.contains('dark');
  }

  private get textColor() { return this.isDark() ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'; }
  private get gridColor() { return this.isDark() ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'; }

  private buildDonut() {
    const status = this.statusBars();
    this.donutChart = new Chart(this.donutCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels: status.map((s) => s.label),
        datasets: [{
          data: status.map((s) => s.count),
          backgroundColor: status.map((s) => s.hex),
          borderWidth: 2,
          borderColor: 'transparent',
          hoverOffset: 8,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${ctx.parsed}`,
            },
          },
        },
      },
    });
  }

  private buildBar() {
    const setor = this.setorBars();
    const colors = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];
    this.barChart = new Chart(this.barCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: setor.map((s) => s.label),
        datasets: [{
          label: 'Demandas',
          data: setor.map((s) => s.count),
          backgroundColor: setor.map((_, i) => colors[i % colors.length] + 'cc'),
          borderColor: setor.map((_, i) => colors[i % colors.length]),
          borderWidth: 1.5,
          borderRadius: 6,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { color: this.gridColor },
            ticks: { color: this.textColor, font: { size: 11 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: this.gridColor },
            ticks: { color: this.textColor, stepSize: 1, font: { size: 11 } },
          },
        },
      },
    });
  }

  private buildLine() {
    const prio = this.prioridadeBars();
    this.lineChart = new Chart(this.lineCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: ['P1 — Baixa', 'P2 — Normal', 'P3 — Média', 'P4 — Urgente', 'P5 — Crítica'],
        datasets: [{
          label: 'Demandas',
          data: prio,
          backgroundColor: [
            '#10b981cc', '#3b82f6cc', '#f59e0bcc', '#f97316cc', '#ef4444cc',
          ],
          borderColor: ['#10b981', '#3b82f6', '#f59e0b', '#f97316', '#ef4444'],
          borderWidth: 1.5,
          borderRadius: 6,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { color: this.gridColor },
            ticks: { color: this.textColor, font: { size: 11 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: this.gridColor },
            ticks: { color: this.textColor, stepSize: 1, font: { size: 11 } },
          },
        },
      },
    });
  }
}
