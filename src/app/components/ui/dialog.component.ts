import { Component, EventEmitter, Output, input, signal, computed, ElementRef, ViewChild, TemplateRef, ViewContainerRef, AfterViewInit, OnDestroy } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { cn } from '../../lib/utils';

@Component({
    selector: 'ui-dialog',
    imports: [CommonModule],
    template: `
    @if (open()) {
      <div class="fixed inset-0 z-50 bg-black/60 animate-fade-in" (click)="onBackdrop()"></div>
      <div class="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-slate-200 bg-background p-6 shadow-lg duration-200 sm:rounded-lg animate-scale-in"
           [class]="contentClass()"
           (click)="$event.stopPropagation()">
        <ng-content />
        <button (click)="close()" class="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
    }
  `,
})
export class UiDialog {
    open = input(false);
    contentClass = input('max-w-lg');
    @Output() openChange = new EventEmitter<boolean>();

    close() { this.openChange.emit(false); }
    onBackdrop() { this.close(); }
}

@Component({
    selector: 'ui-dialog-header',
    template: `<div class="flex flex-col space-y-1.5 text-center sm:text-left"><ng-content /></div>`,
})
export class UiDialogHeader { }

@Component({
    selector: 'ui-dialog-title',
    template: `<h2 class="text-lg font-semibold leading-none tracking-tight"><ng-content /></h2>`,
})
export class UiDialogTitle { }

@Component({
    selector: 'ui-dialog-description',
    template: `<p class="text-sm text-muted-foreground"><ng-content /></p>`,
})
export class UiDialogDescription { }

@Component({
    selector: 'ui-dialog-footer',
    template: `<div class="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2"><ng-content /></div>`,
})
export class UiDialogFooter { }
