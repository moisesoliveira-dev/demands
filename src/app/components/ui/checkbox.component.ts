import { Component, EventEmitter, Output, input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { cn } from '../../lib/utils';

@Component({
    selector: 'ui-checkbox',
    imports: [CommonModule],
    template: `
    <button
      type="button"
      role="checkbox"
      [attr.aria-checked]="checked()"
      [disabled]="disabled()"
      (click)="toggle()"
      [class]="classes()"
    >
      @if (checked()) {
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      }
    </button>
  `,
})
export class UiCheckbox {
    checked = input(false);
    disabled = input(false);
    class = input('');
    @Output() checkedChange = new EventEmitter<boolean>();

    classes = computed(() =>
        cn(
            'peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            this.checked() && 'bg-primary text-primary-foreground',
            this.class()
        )
    );

    toggle() {
        if (this.disabled()) return;
        this.checkedChange.emit(!this.checked());
    }
}

@Component({
    selector: 'ui-switch',
    template: `
    <button
      type="button"
      role="switch"
      [attr.aria-checked]="checked()"
      [disabled]="disabled()"
      (click)="toggle()"
      [class]="classes()"
    >
      <span [class]="thumbClasses()"></span>
    </button>
  `,
})
export class UiSwitch {
    checked = input(false);
    disabled = input(false);
    @Output() checkedChange = new EventEmitter<boolean>();

    classes = computed(() =>
        cn(
            'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            this.checked() ? 'bg-primary' : 'bg-input'
        )
    );

    thumbClasses = computed(() =>
        cn(
            'pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform',
            this.checked() ? 'translate-x-4' : 'translate-x-0'
        )
    );

    toggle() {
        if (this.disabled()) return;
        this.checkedChange.emit(!this.checked());
    }
}
