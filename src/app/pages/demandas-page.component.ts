import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule, KanbanSquare, Table, Filter, FileText, Printer, PlusCircle, X } from 'lucide-angular';
import { DemandasService } from '../services/demandas.service';
import { KanbanBoardComponent } from '../components/demandas/kanban-board.component';
import { DemandasTableComponent } from '../components/demandas/demandas-table.component';
import { DemandasFiltrosDialogComponent } from '../components/demandas/demandas-filtros-dialog.component';
import { UiButton } from '../components/ui/button.component';
import { UiBadge } from '../components/ui/badge.component';
import { exportarDemandasCSV } from '../lib/export';

@Component({
  selector: 'app-demandas-page',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, KanbanBoardComponent, DemandasTableComponent, DemandasFiltrosDialogComponent, UiButton, UiBadge],
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div class="flex items-center gap-3">
          <ui-button variant="outline" size="sm" (click)="filtrosOpen.set(true)">
            <lucide-angular [img]="Filter" size="16" class="mr-1" />
            Filtros
            @if (demandasService.hasFilters()) {
              <ui-badge variant="secondary" class="ml-2 bg-amber-500/10 text-amber-700">{{ filterCount() }}</ui-badge>
            }
          </ui-button>
          @if (demandasService.hasFilters()) {
            <ui-button variant="ghost" size="sm" (click)="demandasService.limparFiltros()" title="Limpar filtros">
              <lucide-angular [img]="X" size="14" class="mr-1" /> Limpar
            </ui-button>
          }
          <div class="flex rounded-md border border-border p-0.5 bg-card">
            <button (click)="setView('kanban')" [class]="tabClass('kanban')">
              <lucide-angular [img]="KanbanSquare" size="16" /> Kanban
            </button>
            <button (click)="setView('table')" [class]="tabClass('table')">
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

      @if (demandasService.loading()) {
        <div class="space-y-3">
          @for (_ of [1,2,3,4]; track $index) {
            <div class="h-20 rounded-lg border border-border bg-muted animate-pulse"></div>
          }
        </div>
      } @else if (view() === 'kanban') {
        <kanban-board [highlightId]="highlight()" />
      } @else {
        <demandas-table />
      }

      <demandas-filtros-dialog
        [open]="filtrosOpen()"
        (openChange)="filtrosOpen.set($event)" />
    </div>
  `,
})
export class DemandasPageComponent implements OnInit {
  readonly KanbanSquare = KanbanSquare; readonly Table = Table; readonly Filter = Filter;
  readonly FileText = FileText; readonly Printer = Printer; readonly PlusCircle = PlusCircle; readonly X = X;

  view = signal<'kanban' | 'table'>('kanban');
  highlight = signal<string | null>(null);
  filtrosOpen = signal(false);

  router = inject(Router);
  private route = inject(ActivatedRoute);
  demandasService = inject(DemandasService);

  ngOnInit(): void {
    this.demandasService.carregar();

    // Sincroniza estado a partir de query params (vindo de notificações).
    this.route.queryParamMap.subscribe((params) => {
      const v = params.get('view');
      if (v === 'kanban' || v === 'table') this.view.set(v);

      const h = params.get('highlight');
      this.highlight.set(h);
      if (h) {
        // Limpa o highlight após a animação para não disparar novamente em re-renders.
        setTimeout(() => {
          if (this.highlight() === h) this.highlight.set(null);
        }, 6500);
      }
    });
  }

  setView(v: 'kanban' | 'table') {
    this.view.set(v);
    // Reflete no URL para preservar estado em refresh / share.
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view: v },
      queryParamsHandling: 'merge',
    });
  }

  filterCount = computed(() => {
    const f = this.demandasService.filtros();
    return Object.values(f).reduce((acc: number, v) => acc + (Array.isArray(v) ? v.length : v ? 1 : 0), 0);
  });

  tabClass(v: string) {
    return `flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors ${this.view() === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`;
  }

  exportar() { exportarDemandasCSV(this.demandasService.demandasFiltradas()); }
  print() { window.print(); }
}
