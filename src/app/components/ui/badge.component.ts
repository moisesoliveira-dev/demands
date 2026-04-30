import { Component, computed, input } from '@angular/core';
import { cn } from '../../lib/utils';

export type BadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive';

const variants: Record<BadgeVariant, string> = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/80',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    outline: 'text-foreground border border-input',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/80',
};

@Component({
    selector: 'ui-badge',
    template: `<span [class]="classes()" [style]="style()"><ng-content /></span>`,
})
export class UiBadge {
    variant = input<BadgeVariant>('default');
    class = input('');
    style = input<string>('');

    classes = computed(() =>
        cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold transition-colors', variants[this.variant()], this.class())
    );
}
