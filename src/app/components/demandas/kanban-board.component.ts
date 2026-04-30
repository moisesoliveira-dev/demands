import { Component, computed, inject, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDrag, CdkDragDrop, CdkDragPlaceholder, CdkDropList, CdkDropListGroup, transferArrayItem, moveItemInArray } from '@angular/cdk/drag-drop';
import { Demanda, DemandStatus } from '../../types';
import { DemandasService } from '../../services/demandas.service';
import { DemandCardComponent } from './demand-card.component';
import { BlockReasonDialogComponent } from './block-reason-dialog.component';
import { GsapFadeInDirective } from '../../lib/gsap.directives';
import { MotionPopDirective } from '../../lib/motion.directives';
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
  imports: [CommonModule, CdkDropList, CdkDropListGroup, CdkDrag, CdkDragPlaceholder, DemandCardComponent, BlockReasonDialogComponent, GsapFadeInDirective, MotionPopDirective],
  template: `
    <div cdkDropListGroup class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      @for (col of columnData(); track col.status; let colIdx = $index) {
        <div class="flex flex-col bg-white rounded-lg border border-slate-200 overflow-hidden" gsapFadeIn [gsapDelay]="colIdx * 0.05">
          <div [class]="'px-4 py-3 border-t-4 flex items-center justify-between ' + col.color + ' ' + col.bg">
            <h3 class="font-semibold text-sm text-slate-900">{{ col.label }}</h3>
            <span motionPop [motionPopKey]="col.items.length" class="text-xs font-mono text-slate-600 bg-white px-2 py-0.5 rounded">{{ col.items.length }}</span>
          </div>
          <div
            cdkDropList
            [id]="col.status"
            [cdkDropListData]="col.items"
            (cdkDropListDropped)="drop($event)"
            class="flex-1 p-2 space-y-2 min-h-50 max-h-[calc(100vh-280px)] overflow-y-auto"
          >
            @for (d of col.items; track d.id) {
              <div cdkDrag gsapFadeIn>
                <demand-card [demanda]="d" />
                <div *cdkDragPlaceholder class="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 h-24"></div>
              </div>
            }
            @if (col.items.length === 0) {
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

  columnData = computed(() =>
    COLUMNS.map(col => ({
      ...col,
      items: this.demandasService.demandasFiltradas()
        .filter(d => d.status === col.status)
        .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
    }))
  );

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
