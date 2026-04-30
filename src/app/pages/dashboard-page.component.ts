import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, ClipboardList, TrendingUp, CheckCircle2, AlertTriangle, Flame } from 'lucide-angular';
import { DemandasService } from '../services/demandas.service';
import { AuthService } from '../services/auth.service';
import { DemandStatus, Prioridade } from '../types';
import { UiCard, UiCardContent, UiCardHeader, UiCardTitle, UiCardDescription } from '../components/ui/card.component';
import { UiBadge } from '../components/ui/badge.component';
import { MotionInViewDirective } from '../lib/motion.directives';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, UiCard, UiCardContent, UiCardHeader, UiCardTitle, UiCardDescription, UiBadge, MotionInViewDirective],
  template: `
    <div class="space-y-6">
      <!-- KPIs -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ui-card motionInView class="border-l-4 border-l-slate-500">
          <ui-card-content class="p-4 flex items-center justify-between">
            <div>
              <p class="text-xs text-slate-500 uppercase font-medium">Total</p>
              <p class="text-3xl font-bold font-mono text-slate-900">{{ total() }}</p>
            </div>
            <lucide-angular [img]="ClipboardList" size="32" class="text-slate-400" />
          </ui-card-content>
        </ui-card>
        <ui-card motionInView class="border-l-4 border-l-blue-500">
          <ui-card-content class="p-4 flex items-center justify-between">
            <div>
              <p class="text-xs text-slate-500 uppercase font-medium">Em Andamento</p>
              <p class="text-3xl font-bold font-mono text-blue-700">{{ andamento() }}</p>
            </div>
            <lucide-angular [img]="TrendingUp" size="32" class="text-blue-400" />
          </ui-card-content>
        </ui-card>
        <ui-card motionInView class="border-l-4 border-l-green-500">
          <ui-card-content class="p-4 flex items-center justify-between">
            <div>
              <p class="text-xs text-slate-500 uppercase font-medium">Concluídas</p>
              <p class="text-3xl font-bold font-mono text-green-700">{{ concluidas() }}</p>
            </div>
            <lucide-angular [img]="CheckCircle2" size="32" class="text-green-400" />
          </ui-card-content>
        </ui-card>
        <ui-card motionInView class="border-l-4 border-l-red-500">
          <ui-card-content class="p-4 flex items-center justify-between">
            <div>
              <p class="text-xs text-slate-500 uppercase font-medium">Críticas</p>
              <p class="text-3xl font-bold font-mono text-red-700">{{ criticas() }}</p>
            </div>
            <lucide-angular [img]="Flame" size="32" class="text-red-400" />
          </ui-card-content>
        </ui-card>
      </div>

      <!-- Charts -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ui-card motionInView>
          <ui-card-header>
            <ui-card-title>Distribuição por Status</ui-card-title>
          </ui-card-header>
          <ui-card-content class="space-y-3">
            @for (s of statusBars(); track s.label) {
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span class="text-slate-700">{{ s.label }}</span>
                  <span class="font-mono text-slate-600">{{ s.count }}</span>
                </div>
                <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div [class]="'h-full transition-all ' + s.color" [style.width.%]="s.pct"></div>
                </div>
              </div>
            }
          </ui-card-content>
        </ui-card>

        <ui-card motionInView>
          <ui-card-header>
            <ui-card-title>Demandas por Setor</ui-card-title>
          </ui-card-header>
          <ui-card-content class="space-y-3">
            @for (s of setorBars(); track s.label) {
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span class="text-slate-700">{{ s.label }}</span>
                  <span class="font-mono text-slate-600">{{ s.count }}</span>
                </div>
                <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div class="h-full bg-amber-500 transition-all" [style.width.%]="s.pct"></div>
                </div>
              </div>
            }
          </ui-card-content>
        </ui-card>
      </div>

      <!-- Lista crítica -->
      <ui-card motionInView>
        <ui-card-header>
          <ui-card-title>Demandas Críticas</ui-card-title>
          <ui-card-description>Prioridade urgente ou crítica</ui-card-description>
        </ui-card-header>
        <ui-card-content>
          <div class="space-y-2">
            @for (d of criticasList(); track d.id) {
              <div class="flex items-center justify-between p-3 rounded-md border border-slate-200 hover:bg-slate-50">
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-slate-900 truncate">{{ d.titulo }}</p>
                  <p class="text-xs text-slate-500">{{ d.setor }} · {{ d.responsavel }}</p>
                </div>
                <ui-badge variant="destructive">P{{ d.prioridade }}</ui-badge>
              </div>
            }
            @if (criticasList().length === 0) {
              <p class="text-sm text-slate-500 text-center py-4">Nenhuma demanda crítica</p>
            }
          </div>
        </ui-card-content>
      </ui-card>
    </div>
  `,
})
export class DashboardPageComponent {
  private demandasService = inject(DemandasService);
  private auth = inject(AuthService);

  readonly ClipboardList = ClipboardList; readonly TrendingUp = TrendingUp;
  readonly CheckCircle2 = CheckCircle2; readonly AlertTriangle = AlertTriangle; readonly Flame = Flame;

  total = computed(() => this.demandasService.demandas().length);
  andamento = computed(() => this.demandasService.demandas().filter((d) => d.status === DemandStatus.EM_ANDAMENTO).length);
  concluidas = computed(() => this.demandasService.demandas().filter((d) => d.status === DemandStatus.CONCLUIDO).length);
  criticas = computed(() => this.demandasService.demandas().filter((d) => d.prioridade >= 4).length);

  statusBars = computed(() => {
    const all = this.demandasService.demandas();
    const t = all.length || 1;
    const data = [
      { status: DemandStatus.PENDENTE, label: 'Pendente', color: 'bg-amber-500' },
      { status: DemandStatus.EM_ANDAMENTO, label: 'Em Andamento', color: 'bg-blue-500' },
      { status: DemandStatus.BLOQUEADO, label: 'Bloqueado', color: 'bg-red-500' },
      { status: DemandStatus.CONCLUIDO, label: 'Concluído', color: 'bg-green-500' },
    ];
    return data.map((d) => {
      const count = all.filter((x) => x.status === d.status).length;
      return { label: d.label, color: d.color, count, pct: (count / t) * 100 };
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

  criticasList = computed(() =>
    this.demandasService.demandas()
      .filter((d) => d.prioridade >= 4 && d.status !== DemandStatus.CONCLUIDO)
      .sort((a, b) => b.prioridade - a.prioridade)
      .slice(0, 8)
  );
}
