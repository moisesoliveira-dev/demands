import { Component, EventEmitter, Output, input, signal, ElementRef, ViewChild, AfterViewInit, OnDestroy, computed } from '@angular/core';
import { Overlay, OverlayRef, OverlayPositionBuilder, ConnectedPosition } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { ViewContainerRef, TemplateRef } from '@angular/core';
import { cn } from '../../lib/utils';
import { CommonModule } from '@angular/common';

export interface DropdownItem {
    label: string;
    icon?: any;
    onClick?: () => void;
    separator?: boolean;
    className?: string;
}

@Component({
    selector: 'ui-dropdown',
    imports: [CommonModule],
    template: `
    <div #trigger (click)="toggle()" class="inline-block">
      <ng-content select="[trigger]" />
    </div>
    <ng-template #content>
      <div [class]="contentClasses()" (click)="$event.stopPropagation()">
        <ng-content select="[menu]" />
      </div>
    </ng-template>
  `,
})
export class UiDropdown implements AfterViewInit, OnDestroy {
    align = input<'start' | 'center' | 'end'>('end');
    contentClass = input('');

    @ViewChild('trigger') trigger!: ElementRef;
    @ViewChild('content') content!: TemplateRef<any>;

    private overlayRef?: OverlayRef;
    open = signal(false);

    contentClasses = computed(() =>
        cn('z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-scale-in', this.contentClass())
    );

    constructor(private overlay: Overlay, private vcr: ViewContainerRef) { }

    ngAfterViewInit() { }

    toggle() {
        if (this.open()) this.close();
        else this.openMenu();
    }

    openMenu() {
        const positions: ConnectedPosition[] = [
            { originX: this.align() === 'end' ? 'end' : 'start', originY: 'bottom', overlayX: this.align() === 'end' ? 'end' : 'start', overlayY: 'top', offsetY: 4 },
            { originX: this.align() === 'end' ? 'end' : 'start', originY: 'top', overlayX: this.align() === 'end' ? 'end' : 'start', overlayY: 'bottom', offsetY: -4 },
        ];
        const positionStrategy = this.overlay
            .position()
            .flexibleConnectedTo(this.trigger.nativeElement)
            .withPositions(positions);

        this.overlayRef = this.overlay.create({
            positionStrategy,
            hasBackdrop: true,
            backdropClass: 'cdk-overlay-transparent-backdrop',
            scrollStrategy: this.overlay.scrollStrategies.reposition(),
        });

        const portal = new TemplatePortal(this.content, this.vcr);
        this.overlayRef.attach(portal);
        this.overlayRef.backdropClick().subscribe(() => this.close());
        this.open.set(true);
    }

    close() {
        this.overlayRef?.dispose();
        this.overlayRef = undefined;
        this.open.set(false);
    }

    ngOnDestroy() { this.close(); }
}

@Component({
    selector: 'ui-dropdown-item',
    template: `<div [class]="classes()" (click)="handleClick()"><ng-content /></div>`,
})
export class UiDropdownItem {
    class = input('');
    @Output() select = new EventEmitter<void>();

    classes = computed(() =>
        cn('relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground', this.class())
    );

    handleClick() { this.select.emit(); }
}

@Component({
    selector: 'ui-dropdown-separator',
    template: `<div class="-mx-1 my-1 h-px bg-border"></div>`,
})
export class UiDropdownSeparator { }

@Component({
    selector: 'ui-dropdown-label',
    template: `<div class="px-2 py-1.5 text-sm font-semibold"><ng-content /></div>`,
})
export class UiDropdownLabel { }
