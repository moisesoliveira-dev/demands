import { Component, computed, inject, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup, transferArrayItem, moveItemInArray } from '@angular/cdk/drag-drop';
import { Demanda, DemandStatus } from '../../types';
import { DemandasService } from '../../services/demandas.service';
import { DemandCardComponent } from './demand-card.component';
import { BlockReasonDialogComponent } from './block-reason-dialog.component';
import { toast } from '../../lib/toast';

interface ColumnConfig { status: DemandStatus; label: string; color: string; bg: string; }

const COLUMNS: ColumnConfig[] = [
    { status: DemandStatus.PENDENTE, label: 'Pendente', color: 'border-amber-500', bg: 'bg-amber-50' },
    { status: DemandStatus.EM_ANDAMENTO, label: 'Em Andamento', color: 'border-blue-500', bg: 'bg-blue-50' },
    { status: DemandStatus.BLOQUEADO, label: 'Bloqueado', color: 'border-red-500', bg: 'bg-red-50' },
    { status: DemandStatus.CONCLUIDO, label: 'Concluído', color: 'border-green-500', bg: 'bg-green-50' },
];

@Component({
    selector: 'kanban-board',
    standalone: true,
    imports: [CommonModule, CdkDropList, CdkDropListGroup, CdkDrag, DemandCardComponent, BlockReasonDialogComponent],
    template: `
    <div cdkDropListGroup class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      @for (col of columns; track col.status) {
        <div class="flex flex-col bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div class="px-4 py-3 border-t-4 {{col.color}} {{col.bg}} flex items-center justify-between">
            <h3 class="font-semibold text-sm text-slate-900">{{ col.label }}</h3>
            <span class="text-xs font-mono text-slate-600 bg-white px-2 py-0.5 rounded">{{ countBy(col.status) }}</span>
          </div>
          <div
            cdkDropList
            [id]="col.status"
            [cdkDropListData]="filterBy(col.status)"
            (cdkDropListDropped)="drop($event)"
            class="flex-1 p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-280px)] overflow-y-auto"
          >
            @for (d of filterBy(col.status); track d.id) {
              <div cdkDrag>
                <demand-card [demanda]="d" />
              </div>
            }
            @if (filterBy(col.status).length === 0) {
              <div class="text-center text-xs text-slate-400 py-8">Nenhuma demanda</div>
            }
          </div>
        </div>
      }
    </div>
    <block-reason-dialog #blockDialog (confirmed)="onBlockConfirmed($event)" />
  `,
})
export class KanbanBoardComponent {
    columns = COLUMNS;
    private demandasService = inject(DemandasService);
    blockDialog = viewChild<BlockReasonDialogComponent>('blockDialog');

    private pendingMove?: { id: string; status: DemandStatus };

    filterBy(s: DemandStatus): Demanda[] {
        return this.demandasService.demandasFiltradas()
            .filter((d) => d.status === s)
            .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
    }

    countBy(s: DemandStatus): number { return this.filterBy(s).length; }

    drop(e: CdkDragDrop<Demanda[]>) {
        const item = e.previousContainer.data[e.previousIndex];
        if (e.previousContainer === e.container) {
            moveItemInArray(e.container.data, e.previousIndex, e.currentIndex);
            this.demandasService.reordenar(e.container.data.map((d) => d.id));
            return;
        }
        const targetStatus = e.container.id as DemandStatus;
        if (targetStatus === DemandStatus.BLOQUEADO && item.status !== DemandStatus.BLOQUEADO) {
            this.pendingMove = { id: item.id, status: targetStatus };
            this.blockDialog()?.show();
            return;
        }
        this.demandasService.atualizarStatus(item.id, targetStatus);
        toast.success('Status atualizado');
    }

    onBlockConfirmed(motivo: string) {
        if (!this.pendingMove) return;
        this.demandasService.atualizarStatus(this.pendingMove.id, this.pendingMove.status, motivo);
        this.pendingMove = undefined;
        toast.success('Demanda bloqueada');
    }
}
