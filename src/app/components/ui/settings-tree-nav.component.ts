import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

export interface SettingsTreeItem {
    id: string;
    label: string;
    icon?: any;
    badge?: string | number;
}

export interface SettingsTreeGroup {
    label?: string;
    items: SettingsTreeItem[];
}

@Component({
    selector: 'app-settings-tree-nav',
    standalone: true,
    imports: [CommonModule, LucideAngularModule],
    template: `
        <nav class="w-full select-none">
            @for (group of groups; track $index) {
                <div class="mb-4">
                    @if (group.label) {
                        <p class="px-3 mb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                            {{ group.label }}
                        </p>
                    }
                    @for (item of group.items; track item.id) {
                        <button type="button" (click)="activeChange.emit(item.id)" [class]="itemCls(item.id)">
                            @if (item.icon) {
                                <lucide-angular [img]="item.icon" size="15" class="shrink-0" />
                            }
                            <span class="truncate">{{ item.label }}</span>
                            @if (item.badge !== undefined) {
                                <span class="ml-auto text-xs tabular-nums">{{ item.badge }}</span>
                            }
                        </button>
                    }
                </div>
            }
        </nav>
    `,
})
export class SettingsTreeNavComponent {
    @Input() groups: SettingsTreeGroup[] = [];
    @Input() active = '';
    @Output() activeChange = new EventEmitter<string>();

    itemCls(id: string): string {
        const base = 'w-full flex items-center gap-2 py-1.5 pr-3 rounded-md text-sm transition-colors cursor-pointer';
        if (this.active === id) {
            return `${base} pl-2 border-l-2 border-primary bg-primary/10 text-primary font-medium`;
        }
        return `${base} pl-3 text-slate-600 hover:bg-slate-100 hover:text-slate-900`;
    }
}
