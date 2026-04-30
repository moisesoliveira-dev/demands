import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule, ArrowUp, ArrowDown, MoreHorizontal } from 'lucide-angular';
import { Demanda, DemandStatus } from '../../types';
import { DemandasService } from '../../services/demandas.service';
import { UiTable, UiThead, UiTbody, UiTr, UiTh, UiTd } from '../ui/table.component';
import { UiBadge } from '../ui/badge.component';
import { UiPagination } from '../ui/pagination.component';
import { UiCheckbox } from '../ui/checkbox.component';
import { PRIORIDADE_CONFIG } from './demand-card.component';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_LABEL: Record<DemandStatus, { label: string; class: string }> = {
    [DemandStatus.PENDENTE]: { label: 'Pendente', class: 'bg-amber-100 text-amber-800 border-amber-300' },
    [DemandStatus.EM_ANDAMENTO]: { label: 'Em Andamento', class: 'bg-blue-100 text-blue-800 border-blue-300' },
    [DemandStatus.BLOQUEADO]: { label: 'Bloqueado', class: 'bg-red-100 text-red-800 border-red-300' },
    [DemandStatus.CONCLUIDO]: { label: 'Concluído', class: 'bg-green-100 text-green-800 border-green-300' },
};

@Component({
    selector: 'demandas-table',
    standalone: true,
    imports: [CommonModule, LucideAngularModule, UiTable, UiThead, UiTbody, UiTr, UiTh, UiTd, UiBadge, UiPagination, UiCheckbox],
    template: `
    <div class="bg-white rounded-lg border border-slate-200">
      <ui-table>
        <ui-thead>
          <ui-tr>
            <ui-th class="w-10">
              <ui-checkbox [checked]="allSelected()" (checkedChange)="toggleAll($event)" />
            </ui-th>
            @for (col of cols; track col.key) {
              <ui-th>
                <button class="flex items-center gap-1 hover:text-slate-900" (click)="sort(col.key)">
                  {{ col.label }}
                  @if (sortKey() === col.key) {
                    <lucide-angular [img]="sortAsc() ? ArrowUp : ArrowDown" size="12" />
                  }
                </button>
              </ui-th>
            }
            <ui-th class="w-12"></ui-th>
          </ui-tr>
        </ui-thead>
        <ui-tbody>
          @for (d of pageItems(); track d.id) {
            <ui-tr class="cursor-pointer">
              <ui-td (click)="$event.stopPropagation()">
                <ui-checkbox [checked]="selected().has(d.id)" (checkedChange)="toggle(d.id)" />
              </ui-td>
              <ui-td (click)="open(d)" class="font-mono text-xs text-slate-500">{{ d.id }}</ui-td>
              <ui-td (click)="open(d)" class="font-medium">{{ d.titulo }}</ui-td>
              <ui-td (click)="open(d)">{{ d.setor }}</ui-td>
              <ui-td (click)="open(d)">{{ d.responsavel }}</ui-td>
              <ui-td (click)="open(d)">
                <ui-badge variant="outline" [class]="prio(d).bg + ' ' + prio(d).color">{{ prio(d).label }}</ui-badge>
              </ui-td>
              <ui-td (click)="open(d)">
                <ui-badge variant="outline" [class]="status(d).class">{{ status(d).label }}</ui-badge>
              </ui-td>
              <ui-td (click)="open(d)" class="text-xs text-slate-500">{{ formatDate(d.criadoEm) }}</ui-td>
              <ui-td>
                <button class="h-8 w-8 rounded-md hover:bg-slate-100 flex items-center justify-center" (click)="open(d)">
                  <lucide-angular [img]="MoreHorizontal" size="16" />
                </button>
              </ui-td>
            </ui-tr>
          }
          @if (pageItems().length === 0) {
            <ui-tr>
              <ui-td class="text-center text-slate-500 py-8 col-span-full">Nenhuma demanda encontrada</ui-td>
            </ui-tr>
          }
        </ui-tbody>
      </ui-table>
      <div class="p-4 border-t border-slate-200">
        <ui-pagination
          [currentPage]="page()"
          [totalPages]="totalPages()"
          [totalItems]="sorted().length"
          [itemsPerPage]="pageSize()"
          (pageChange)="page.set($event)"
          (itemsPerPageChange)="pageSize.set($event); page.set(1)"
        />
      </div>
    </div>
  `,
})
export class DemandasTableComponent {
    private demandasService = inject(DemandasService);
    private router = inject(Router);

    readonly ArrowUp = ArrowUp; readonly ArrowDown = ArrowDown; readonly MoreHorizontal = MoreHorizontal;

    cols = [
        { key: 'id', label: 'ID' },
        { key: 'titulo', label: 'Título' },
        { key: 'setor', label: 'Setor' },
        { key: 'responsavel', label: 'Responsável' },
        { key: 'prioridade', label: 'Prioridade' },
        { key: 'status', label: 'Status' },
        { key: 'criadoEm', label: 'Criado em' },
    ] as const;

    sortKey = signal<string>('criadoEm');
    sortAsc = signal(false);
    page = signal(1);
    pageSize = signal(20);
    selected = signal(new Set<string>());

    sorted = computed(() => {
        const list = [...this.demandasService.demandasFiltradas()];
        const k = this.sortKey() as keyof Demanda;
        list.sort((a, b) => {
            const av: any = a[k]; const bv: any = b[k];
            if (av === bv) return 0;
            return (av > bv ? 1 : -1) * (this.sortAsc() ? 1 : -1);
        });
        return list;
    });

    totalPages = computed(() => Math.max(1, Math.ceil(this.sorted().length / this.pageSize())));

    pageItems = computed(() => {
        const start = (this.page() - 1) * this.pageSize();
        return this.sorted().slice(start, start + this.pageSize());
    });

    allSelected = computed(() => this.pageItems().length > 0 && this.pageItems().every((d) => this.selected().has(d.id)));

    prio(d: Demanda) { return PRIORIDADE_CONFIG[d.prioridade]; }
    status(d: Demanda) { return STATUS_LABEL[d.status]; }
    formatDate(s: string) { return format(new Date(s), "dd/MM/yyyy HH:mm", { locale: ptBR }); }

    sort(k: string) {
        if (this.sortKey() === k) this.sortAsc.set(!this.sortAsc());
        else { this.sortKey.set(k); this.sortAsc.set(true); }
    }

    toggle(id: string) {
        const s = new Set(this.selected());
        s.has(id) ? s.delete(id) : s.add(id);
        this.selected.set(s);
    }

    toggleAll(v: boolean) {
        const s = new Set(this.selected());
        this.pageItems().forEach((d) => v ? s.add(d.id) : s.delete(d.id));
        this.selected.set(s);
    }

    open(d: Demanda) { this.router.navigate(['/demanda-detalhe', d.id]); }
}
