import { Component, computed, inject, input, viewChild, effect, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDrag, CdkDragDrop, CdkDragPlaceholder, CdkDropList, CdkDropListGroup, moveItemInArray } from '@angular/cdk/drag-drop';
import { Demanda, DemandStatus } from '../../types';
import { DemandasService } from '../../services/demandas.service';
import { DemandCardComponent } from './demand-card.component';
import { BlockReasonDialogComponent } from './block-reason-dialog.component';
import { GsapFadeInDirective } from '../../lib/gsap.directives';
import { MotionPopDirective } from '../../lib/motion.directives';
import { toast } from '../../lib/toast';

interface ColumnConfig { status: DemandStatus; label: string; color: string; bg: string; }

const COLUMNS: ColumnConfig[] = [
  { status: DemandStatus.PENDENTE, label: 'Pendente', color: 'border-amber-500', bg: 'bg-amber-500/10' },
  { status: DemandStatus.EM_ANDAMENTO, label: 'Em Andamento', color: 'border-blue-500', bg: 'bg-blue-500/10' },
  { status: DemandStatus.BLOQUEADO, label: 'Bloqueado', color: 'border-red-500', bg: 'bg-red-500/10' },
  { status: DemandStatus.CONCLUIDO, label: 'Concluído', color: 'border-green-500', bg: 'bg-green-500/10' },
];

@Component({
  selector: 'kanban-board',
  standalone: true,
  imports: [CommonModule, CdkDropList, CdkDropListGroup, CdkDrag, CdkDragPlaceholder, DemandCardComponent, BlockReasonDialogComponent, GsapFadeInDirective, MotionPopDirective],
  template: `
    <div cdkDropListGroup class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      @for (col of columnData(); track col.status; let colIdx = $index) {
        <div class="flex flex-col bg-background rounded-lg border border-border overflow-hidden" gsapFadeIn [gsapDelay]="colIdx * 0.05">
          <div [class]="'px-4 py-3 border-t-4 flex items-center justify-between ' + col.color + ' ' + col.bg">
            <h3 class="font-semibold text-sm text-foreground">{{ col.label }}</h3>
            <span motionPop [motionPopKey]="col.items.length" class="text-xs font-mono text-muted-foreground bg-card px-2 py-0.5 rounded">{{ col.items.length }}</span>
          </div>
          <div
            cdkDropList
            [id]="col.status"
            [cdkDropListData]="col.items"
            (cdkDropListDropped)="drop($event)"
            class="flex-1 p-2 space-y-2 min-h-50 max-h-[calc(100vh-280px)] overflow-y-auto"
          >
            @for (d of col.items; track d.id) {
              <div cdkDrag gsapFadeIn [attr.data-demand-id]="d.id">
                <demand-card [demanda]="d" [highlight]="highlightId() === d.id" />
                <div *cdkDragPlaceholder class="rounded-lg border-2 border-dashed border-border bg-muted/40 h-24"></div>
              </div>
            }
            @if (col.items.length === 0) {
              <div class="text-center text-xs text-muted-foreground/60 py-8">Nenhuma demanda</div>
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
  /** ID da demanda a ser destacada (vindo de notificação). Aciona scroll automático. */
  highlightId = input<string | null>(null);

  private demandasService = inject(DemandasService);
  private host: ElementRef<HTMLElement> = inject(ElementRef);
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

  constructor() {
    // Quando o highlightId muda e os dados estão prontos, rola até o item.
    effect(() => {
      const id = this.highlightId();
      if (!id) return;
      // Aguarda render
      const data = this.columnData();
      if (!data.some((c) => c.items.some((d) => d.id === id))) return;
      queueMicrotask(() => this.scrollToHighlighted(id));
    });
  }

  private scrollToHighlighted(id: string) {
    const el = this.host.nativeElement.querySelector<HTMLElement>(`[data-demand-id="${id}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

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
