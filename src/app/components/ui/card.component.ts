import { Component, computed, input } from '@angular/core';
import { cn } from '../../lib/utils';

@Component({
    selector: 'ui-card',
    template: `<div [class]="classes()"><ng-content /></div>`,
    host: { class: 'block' },
})
export class UiCard {
    class = input('');
    classes = computed(() => cn('rounded-lg border border-border bg-card text-card-foreground shadow-sm', this.class()));
}

@Component({
    selector: 'ui-card-header',
    template: `<div [class]="classes()"><ng-content /></div>`,
})
export class UiCardHeader {
    class = input('');
    classes = computed(() => cn('flex flex-col space-y-1.5 p-6', this.class()));
}

@Component({
    selector: 'ui-card-title',
    template: `<h3 [class]="classes()"><ng-content /></h3>`,
})
export class UiCardTitle {
    class = input('');
    classes = computed(() => cn('font-semibold leading-none tracking-tight', this.class()));
}

@Component({
    selector: 'ui-card-description',
    template: `<p [class]="classes()"><ng-content /></p>`,
})
export class UiCardDescription {
    class = input('');
    classes = computed(() => cn('text-sm text-muted-foreground', this.class()));
}

@Component({
    selector: 'ui-card-content',
    template: `<div [class]="classes()"><ng-content /></div>`,
})
export class UiCardContent {
    class = input('');
    classes = computed(() => cn('p-6 pt-0', this.class()));
}

@Component({
    selector: 'ui-card-footer',
    template: `<div [class]="classes()"><ng-content /></div>`,
})
export class UiCardFooter {
    class = input('');
    classes = computed(() => cn('flex items-center p-6 pt-0', this.class()));
}
