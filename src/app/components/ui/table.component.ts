import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { cn } from '../../lib/utils';

@Component({
    selector: 'ui-table',
    imports: [CommonModule],
    template: `<div class="relative w-full overflow-auto"><table [class]="classes()"><ng-content /></table></div>`,
})
export class UiTable {
    class = input('');
    classes = computed(() => cn('w-full caption-bottom text-sm', this.class()));
}

@Component({
    selector: 'ui-thead',
    template: `<thead class="[&_tr]:border-b"><ng-content /></thead>`,
})
export class UiThead { }

@Component({
    selector: 'ui-tbody',
    template: `<tbody class="[&_tr:last-child]:border-0"><ng-content /></tbody>`,
})
export class UiTbody { }

@Component({
    selector: 'ui-tr',
    template: `<tr [class]="classes()"><ng-content /></tr>`,
})
export class UiTr {
    class = input('');
    classes = computed(() => cn('border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted', this.class()));
}

@Component({
    selector: 'ui-th',
    template: `<th [class]="classes()"><ng-content /></th>`,
})
export class UiTh {
    class = input('');
    classes = computed(() => cn('h-10 px-3 text-left align-middle font-medium text-muted-foreground', this.class()));
}

@Component({
    selector: 'ui-td',
    template: `<td [class]="classes()"><ng-content /></td>`,
})
export class UiTd {
    class = input('');
    classes = computed(() => cn('p-3 align-middle', this.class()));
}
