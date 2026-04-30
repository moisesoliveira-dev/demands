import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, FileText } from 'lucide-angular';
import { DemandasService } from '../services/demandas.service';
import { DemandStatus } from '../types';
import { UiCard, UiCardContent, UiCardHeader, UiCardTitle } from '../components/ui/card.component';
import { UiButton } from '../components/ui/button.component';
import { UiProgress } from '../components/ui/form-elements.component';
import { exportarDemandasCSV } from '../lib/export';

@Component({
    selector: 'app-relatorios',
    standalone: true,
    imports: [CommonModule, LucideAngularModule, UiCard, UiCardContent, UiCardHeader, UiCardTitle, UiButton, UiProgress],
    template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <p class="text-slate-600 text-sm">Análise consolidada de demandas</p>
        <ui-button (click)="exportar()" size="sm">
          <lucide-angular [img]="FileText" size="16" class="mr-1" /> Exportar CSV
        </ui-button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ui-card><ui-card-content class="p-4">
          <p class="text-xs text-slate-500 uppercase">Total</p>
          <p class="text-3xl font-mono font-bold text-slate-900">{{ total() }}</p>
        </ui-card-content></ui-card>
        <ui-card><ui-card-content class="p-4">
          <p class="text-xs text-slate-500 uppercase">Em Andamento</p>
          <p class="text-3xl font-mono font-bold text-blue-700">{{ andamento() }}</p>
        </ui-card-content></ui-card>
        <ui-card><ui-card-content class="p-4">
          <p class="text-xs text-slate-500 uppercase">Concluídas</p>
          <p class="text-3xl font-mono font-bold text-green-700">{{ concluidas() }}</p>
        </ui-card-content></ui-card>
        <ui-card><ui-card-content class="p-4">
          <p class="text-xs text-slate-500 uppercase">Taxa Conclusão</p>
          <p class="text-3xl font-mono font-bold text-amber-600">{{ taxa() }}%</p>
        </ui-card-content></ui-card>
      </div>

      <ui-card>
        <ui-card-header><ui-card-title>Distribuição por Status</ui-card-title></ui-card-header>
        <ui-card-content class="space-y-4">
          @for (s of statusData(); track s.label) {
            <div>
              <div class="flex justify-between mb-1 text-sm">
                <span>{{ s.label }}</span>
                <span class="font-mono">{{ s.count }} ({{ s.pct.toFixed(0) }}%)</span>
              </div>
              <ui-progress [value]="s.pct" />
            </div>
          }
        </ui-card-content>
      </ui-card>
    </div>
  `,
})
export class RelatoriosPageComponent {
    readonly FileText = FileText;
    private demandasService = inject(DemandasService);

    total = computed(() => this.demandasService.demandas().length);
    andamento = computed(() => this.demandasService.demandas().filter((d) => d.status === DemandStatus.EM_ANDAMENTO).length);
    concluidas = computed(() => this.demandasService.demandas().filter((d) => d.status === DemandStatus.CONCLUIDO).length);
    taxa = computed(() => {
        const t = this.total(); return t ? Math.round((this.concluidas() / t) * 100) : 0;
    });

    statusData = computed(() => {
        const all = this.demandasService.demandas();
        const t = all.length || 1;
        const items: { status: DemandStatus; label: string }[] = [
            { status: DemandStatus.PENDENTE, label: 'Pendente' },
            { status: DemandStatus.EM_ANDAMENTO, label: 'Em Andamento' },
            { status: DemandStatus.BLOQUEADO, label: 'Bloqueado' },
            { status: DemandStatus.CONCLUIDO, label: 'Concluído' },
        ];
        return items.map((i) => {
            const count = all.filter((x) => x.status === i.status).length;
            return { label: i.label, count, pct: (count / t) * 100 };
        });
    });

    exportar() { exportarDemandasCSV(this.demandasService.demandas()); }
}
