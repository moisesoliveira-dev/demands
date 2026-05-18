import { Component, computed, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { cn } from '../../lib/utils';

@Component({
    selector: 'ui-input',
    imports: [FormsModule],
    template: `<input [class]="classes()" />`,
})
export class UiInput {
    class = input('');
    classes = computed(() =>
        cn('flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50', this.class())
    );
}

@Component({
    selector: 'ui-textarea',
    template: `<textarea [class]="classes()"></textarea>`,
})
export class UiTextarea {
    class = input('');
    classes = computed(() =>
        cn('flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50', this.class())
    );
}

@Component({
    selector: 'ui-label',
    template: `<label [class]="classes()" [attr.for]="for()"><ng-content /></label>`,
})
export class UiLabel {
    class = input('');
    for = input<string>('');
    classes = computed(() => cn('text-sm font-medium leading-none', this.class()));
}

@Component({
    selector: 'ui-separator',
    template: `<div [class]="classes()"></div>`,
})
export class UiSeparator {
    class = input('');
    orientation = input<'horizontal' | 'vertical'>('horizontal');
    classes = computed(() =>
        cn('shrink-0 bg-border', this.orientation() === 'horizontal' ? 'h-px w-full' : 'w-px h-full', this.class())
    );
}

@Component({
    selector: 'ui-skeleton',
    template: `<div [class]="classes()"></div>`,
})
export class UiSkeleton {
    class = input('');
    classes = computed(() => cn('animate-pulse rounded-md bg-muted', this.class()));
}
