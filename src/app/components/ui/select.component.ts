import { Component, computed, input, EventEmitter, Output, ElementRef, ViewChild, signal, ViewContainerRef, TemplateRef, AfterViewInit, OnDestroy } from '@angular/core';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import { cn } from '../../lib/utils';

export interface SelectOption { value: string; label: string; }

@Component({
  selector: 'ui-select',
  imports: [CommonModule],
  template: `
    <button
      #trigger
      type="button"
      (click)="toggle()"
      [disabled]="disabled()"
      [class]="classes()"
    >
      <span [class.text-muted-foreground]="!value()">
        {{ displayLabel() || placeholder() }}
      </span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="opacity-50">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </button>
    <ng-template #menu>
      <div class="z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-scale-in" [style.width.px]="triggerWidth()">
        @for (opt of options(); track opt.value) {
          <div
            class="relative flex cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
            (click)="select(opt)"
          >
            {{ opt.label }}
          </div>
        }
      </div>
    </ng-template>
  `,
})
export class UiSelect implements AfterViewInit, OnDestroy {
  options = input<SelectOption[]>([]);
  value = input<string>('');
  placeholder = input('Selecionar...');
  disabled = input(false);
  class = input('');
  @Output() valueChange = new EventEmitter<string>();

  @ViewChild('trigger') trigger!: ElementRef;
  @ViewChild('menu') menu!: TemplateRef<any>;

  open = signal(false);
  triggerWidth = signal(0);
  private overlayRef?: OverlayRef;

  classes = computed(() =>
    cn('flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50', this.class())
  );

  displayLabel = computed(() => this.options().find((o) => o.value === this.value())?.label ?? '');

  constructor(private overlay: Overlay, private vcr: ViewContainerRef) { }
  ngAfterViewInit() { }

  toggle() {
    if (this.open()) this.close();
    else this.openMenu();
  }

  openMenu() {
    this.triggerWidth.set(this.trigger.nativeElement.offsetWidth);
    const positionStrategy = this.overlay.position().flexibleConnectedTo(this.trigger.nativeElement).withPositions([
      { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
      { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
    ]);
    this.overlayRef = this.overlay.create({
      positionStrategy,
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
    });
    this.overlayRef.attach(new TemplatePortal(this.menu, this.vcr));
    this.overlayRef.backdropClick().subscribe(() => this.close());
    this.open.set(true);
  }

  close() {
    this.overlayRef?.dispose();
    this.overlayRef = undefined;
    this.open.set(false);
  }

  select(opt: SelectOption) {
    this.valueChange.emit(opt.value);
    this.close();
  }

  ngOnDestroy() { this.close(); }
}
