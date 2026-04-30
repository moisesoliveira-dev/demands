import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { cn } from '../../lib/utils';

export interface BreadcrumbItem { label: string; path?: string }

@Component({
    selector: 'ui-breadcrumb',
    imports: [CommonModule, RouterLink],
    template: `
    <nav class="mt-0.5">
      <ol class="flex items-center gap-1.5 text-xs text-slate-600">
        @for (item of items(); track $index; let last = $last) {
          @if (item.path && !last) {
            <li><a [routerLink]="item.path" class="hover:text-amber-600 cursor-pointer">{{ item.label }}</a></li>
          } @else {
            <li [class.text-slate-900]="last" [class.font-medium]="last">{{ item.label }}</li>
          }
          @if (!last) {
            <li>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-slate-400"><polyline points="9 18 15 12 9 6"/></svg>
            </li>
          }
        }
      </ol>
    </nav>
  `,
})
export class UiBreadcrumb {
    items = input<BreadcrumbItem[]>([]);
}
