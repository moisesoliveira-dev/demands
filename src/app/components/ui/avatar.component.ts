import { Component, computed, input } from '@angular/core';
import { cn, getInitials } from '../../lib/utils';

@Component({
    selector: 'ui-avatar',
    template: `
    @if (src()) {
      <img [src]="src()" alt="" class="aspect-square h-full w-full" />
    } @else {
      <div [class]="fallbackClasses()">
        {{ initials() }}
      </div>
    }
  `,
    host: { '[class]': 'wrapperClasses()' },
})
export class UiAvatar {
    name = input('');
    src = input<string | undefined>();
    size = input(40);
    class = input('');
    fallbackClass = input('');

    wrapperClasses = computed(() =>
        cn('relative flex shrink-0 overflow-hidden rounded-full', this.class())
    );

    fallbackClasses = computed(() =>
        cn('flex h-full w-full items-center justify-center bg-slate-700 text-slate-200 text-xs font-medium', this.fallbackClass())
    );

    initials = computed(() => getInitials(this.name()));
}
