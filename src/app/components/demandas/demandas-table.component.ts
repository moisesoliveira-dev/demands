import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule, ArrowUp, ArrowDown, MoreHorizontal } from 'lucide-angular';
import { Demanda, DemandStatus } from '../../types';
import { DemandasService } from '../../services/demandas.service';
import { UiPagination } from '../ui/pagination.component';
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
  imports: [CommonModule, LucideAngularModule, UiPagination],
  template: `
    <div class="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="border-b bg-slate-50">
            <tr>
              <th class="w-10 px-3 py-3 text-left">
                <input type="checkbox" [checked]="allSelected()" (change)="toggleAll($any($event.target).checked)"
                  class="h-4 w-4 rounded border-slate-300 cursor-pointer" />
              </th>
              @for (col of cols; track col.key) {
                <th class="px-3 py-3 text-left font-medium text-slate-500 whitespace-nowrap">
                  <button class="flex items-center gap-1 hover:text-slate-900 transition-colors" (click)="sort(col.key)">
                    {{ col.label }}
                    @if (sortKey() === col.key) {
                      <lucide-angular [img]="sortAsc() ? ArrowUp : ArrowDown" size="12" />
                    }
                  </button>
                </th>
              }
              <th class="w-12 px-3 py-3"></th>
            </tr>
          </thead>
          <tbody>
            @for (d of pageItems(); track d.id) {
              <tr class="border-b last:border-0 hover:bg-slate-50 transition-colors cursor-pointer">
                <td class="px-3 py-3" (click)="$event.stopPropagation()">
                  <input type="checkbox" [checked]="selected().has(d.id)" (change)="toggle(d.id)"
                    class="h-4 w-4 rounded border-slate-300 cursor-pointer" />
                </td>
                <td class="px-3 py-3 font-mono text-xs text-slate-400 whitespace-nowrap" (click)="open(d)">
                  {{ d.id.slice(0, 8) }}
                </td>
                <td class="px-3 py-3 font-medium text-slate-900 max-w-64" (click)="open(d)">
                  <span class="block truncate">{{ d.titulo }}</span>
                </td>
                <td class="px-3 py-3 text-slate-600 whitespace-nowrap" (click)="open(d)">{{ d.setor }}</td>
                <td class="px-3 py-3 text-slate-600 whitespace-nowrap" (click)="open(d)">{{ d.responsavel }}</td>
                <td class="px-3 py-3 whitespace-nowrap" (click)="open(d)">
                  <span [class]="'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold border ' + prio(d).bg + ' ' + prio(d).color">
                    {{ prio(d).label }}
                  </span>
                </td>
                <td class="px-3 py-3 whitespace-nowrap" (click)="open(d)">
                  <span [class]="'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold border ' + status(d).class">
                    {{ status(d).label }}
                  </span>
                </td>
                <td class="px-3 py-3 text-xs text-slate-500 whitespace-nowrap" (click)="open(d)">{{ formatDate(d.criadoEm) }}</td>
                <td class="px-3 py-3">
                  <button class="h-8 w-8 rounded-md hover:bg-slate-100 flex items-center justify-center transition-colors" (click)="open(d)">
                    <lucide-angular [img]="MoreHorizontal" size="16" />
                  </button>
                </td>
              </tr>
            }
            @if (pageItems().length === 0) {
              <tr>
                <td colspan="9" class="text-center text-slate-500 py-12">Nenhuma demanda encontrada</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
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
