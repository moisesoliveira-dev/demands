import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule, KanbanSquare, Table, Filter, FileText, Printer, PlusCircle } from 'lucide-angular';
import { DemandasService } from '../services/demandas.service';
import { KanbanBoardComponent } from '../components/demandas/kanban-board.component';
import { DemandasTableComponent } from '../components/demandas/demandas-table.component';
import { UiButton } from '../components/ui/button.component';
import { UiBadge } from '../components/ui/badge.component';
import { exportarDemandasCSV } from '../lib/export';

@Component({
  selector: 'app-demandas-page',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, KanbanBoardComponent, DemandasTableComponent, UiButton, UiBadge],
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div class="flex items-center gap-3">
          <ui-button variant="outline" size="sm">
            <lucide-angular [img]="Filter" size="16" class="mr-1" />
            Filtros
            @if (demandasService.hasFilters()) {
              <ui-badge variant="secondary" class="ml-2 bg-amber-500/10 text-amber-700">{{ filterCount() }}</ui-badge>
            }
          </ui-button>
          <div class="flex rounded-md border border-slate-200 p-0.5 bg-white">
            <button (click)="view.set('kanban')" [class]="tabClass('kanban')">
              <lucide-angular [img]="KanbanSquare" size="16" /> Kanban
            </button>
            <button (click)="view.set('table')" [class]="tabClass('table')">
              <lucide-angular [img]="Table" size="16" /> Tabela
            </button>
          </div>
        </div>
        <div class="flex gap-2">
          <ui-button variant="outline" size="sm" (click)="exportar()">
            <lucide-angular [img]="FileText" size="16" class="mr-1" /> Exportar CSV
          </ui-button>
          <ui-button variant="outline" size="sm" (click)="print()">
            <lucide-angular [img]="Printer" size="16" class="mr-1" /> Imprimir
          </ui-button>
          <ui-button size="sm" (click)="router.navigate(['/nova-demanda'])">
            <lucide-angular [img]="PlusCircle" size="16" class="mr-1" /> Nova
          </ui-button>
        </div>
      </div>

      @if (view() === 'kanban') {
        <kanban-board />
      } @else {
        <demandas-table />
      }
    </div>
  `,
})
export class DemandasPageComponent implements OnInit {
  readonly KanbanSquare = KanbanSquare; readonly Table = Table; readonly Filter = Filter;
  readonly FileText = FileText; readonly Printer = Printer; readonly PlusCircle = PlusCircle;

  view = signal<'kanban' | 'table'>('kanban');
  router = inject(Router);
  demandasService = inject(DemandasService);

  ngOnInit(): void {
    this.demandasService.carregar();
  }

  filterCount = computed(() => {
    const f = this.demandasService.filtros();
    return Object.values(f).reduce((acc, v) => acc + (Array.isArray(v) ? v.length : v ? 1 : 0), 0);
  });

  tabClass(v: string) {
    return `flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors ${this.view() === v ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`;
  }

  exportar() { exportarDemandasCSV(this.demandasService.demandasFiltradas()); }
  print() { window.print(); }
}
