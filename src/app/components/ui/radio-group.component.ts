import { Component, EventEmitter, Output, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { cn } from '../../lib/utils';

export interface RadioOption { value: string; label: string; description?: string; }

@Component({
    selector: 'ui-radio-group',
    imports: [CommonModule],
    template: `<ng-content />`,
    host: { 'class': 'grid gap-2', '[attr.role]': '"radiogroup"' },
})
export class UiRadioGroup { }

@Component({
    selector: 'ui-radio-item',
    imports: [CommonModule],
    template: `
    <button
      type="button"
      role="radio"
      [attr.aria-checked]="selected()"
      (click)="onClick()"
      [class]="classes()"
    >
      @if (selected()) {
        <span class="block h-2 w-2 rounded-full bg-primary"></span>
      }
    </button>
  `,
})
export class UiRadioItem {
    value = input.required<string>();
    selected = input(false);
    @Output() select = new EventEmitter<string>();

    classes = computed(() =>
        cn('aspect-square h-4 w-4 rounded-full border border-primary text-primary shadow flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-ring')
    );

    onClick() { this.select.emit(this.value()); }
}
