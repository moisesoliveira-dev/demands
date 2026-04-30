import { Component, EventEmitter, Output, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiButton } from './button.component';
import { UiSelect } from './select.component';

@Component({
    selector: 'ui-pagination',
    imports: [CommonModule, UiButton, UiSelect],
    template: `
    <div class="flex items-center justify-between flex-wrap gap-3 px-2">
      <p class="text-sm text-muted-foreground">
        Mostrando {{ startItem() }}-{{ endItem() }} de {{ totalItems() }}
      </p>
      <div class="flex items-center gap-2">
        <span class="text-sm text-muted-foreground">Por página:</span>
        <ui-select
          [value]="String(itemsPerPage())"
          [options]="[{value:'10',label:'10'},{value:'20',label:'20'},{value:'50',label:'50'},{value:'100',label:'100'}]"
          class="w-20"
          (valueChange)="itemsPerPageChange.emit(+$event)"
        />
        <ui-button variant="outline" size="sm" [disabled]="currentPage() === 1" (click)="pageChange.emit(currentPage()-1)">
          Anterior
        </ui-button>
        <span class="text-sm font-medium">{{ currentPage() }} / {{ totalPages() }}</span>
        <ui-button variant="outline" size="sm" [disabled]="currentPage() >= totalPages()" (click)="pageChange.emit(currentPage()+1)">
          Próximo
        </ui-button>
      </div>
    </div>
  `,
})
export class UiPagination {
    currentPage = input(1);
    totalPages = input(1);
    totalItems = input(0);
    itemsPerPage = input(20);
    @Output() pageChange = new EventEmitter<number>();
    @Output() itemsPerPageChange = new EventEmitter<number>();

    String = String;

    startItem = computed(() => Math.min((this.currentPage() - 1) * this.itemsPerPage() + 1, this.totalItems()));
    endItem = computed(() => Math.min(this.currentPage() * this.itemsPerPage(), this.totalItems()));
}
