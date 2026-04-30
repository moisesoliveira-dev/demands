import { AfterViewInit, Directive, ElementRef, OnDestroy, effect, inject, input } from '@angular/core';
import { animate, inView } from 'motion';

const reducedMotion = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Animate the element when it enters the viewport (scroll-triggered).
 * Uses Motion's `inView` observer.
 * Usage: <div motionInView></div>
 */
@Directive({ selector: '[motionInView]', standalone: true })
export class MotionInViewDirective implements AfterViewInit, OnDestroy {
    private el = inject(ElementRef<HTMLElement>);
    motionAmount = input<number>(0.2);
    motionY = input<number>(24);
    motionOnce = input<boolean>(true);
    private stop?: () => void;

    ngAfterViewInit(): void {
        if (reducedMotion) return;
        const node = this.el.nativeElement;
        node.style.opacity = '0';
        node.style.transform = `translateY(${this.motionY()}px)`;
        this.stop = inView(
            node,
            () => {
                animate(
                    node,
                    { opacity: [0, 1], transform: ['translateY(' + this.motionY() + 'px)', 'translateY(0px)'] },
                    { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
                );
                if (!this.motionOnce()) {
                    return () => {
                        animate(node, { opacity: 0, transform: 'translateY(' + this.motionY() + 'px)' }, { duration: 0.3 });
                    };
                }
                return undefined;
            },
            { amount: this.motionAmount() }
        );
    }

    ngOnDestroy(): void {
        this.stop?.();
    }
}

/**
 * Spring-based press/tap micro-interaction.
 * Usage: <button motionPress>Click me</button>
 */
@Directive({ selector: '[motionPress]', standalone: true })
export class MotionPressDirective implements AfterViewInit, OnDestroy {
    private el = inject(ElementRef<HTMLElement>);
    motionScale = input<number>(0.94);
    private downListener?: (e: Event) => void;
    private upListener?: (e: Event) => void;
    private leaveListener?: (e: Event) => void;

    ngAfterViewInit(): void {
        if (reducedMotion) return;
        const node = this.el.nativeElement;
        this.downListener = () => {
            animate(node, { scale: this.motionScale() }, { type: 'spring', stiffness: 400, damping: 25 });
        };
        this.upListener = () => {
            animate(node, { scale: 1 }, { type: 'spring', stiffness: 350, damping: 18 });
        };
        this.leaveListener = () => {
            animate(node, { scale: 1 }, { type: 'spring', stiffness: 350, damping: 22 });
        };
        node.addEventListener('pointerdown', this.downListener);
        node.addEventListener('pointerup', this.upListener);
        node.addEventListener('pointerleave', this.leaveListener);
    }

    ngOnDestroy(): void {
        const node = this.el.nativeElement;
        if (this.downListener) node.removeEventListener('pointerdown', this.downListener);
        if (this.upListener) node.removeEventListener('pointerup', this.upListener);
        if (this.leaveListener) node.removeEventListener('pointerleave', this.leaveListener);
    }
}

/**
 * Bouncy spring entrance for newly added elements (e.g. badges, counters).
 * Re-triggers when [motionPopKey] changes.
 * Usage: <span motionPop [motionPopKey]="count">{{ count }}</span>
 */
@Directive({ selector: '[motionPop]', standalone: true })
export class MotionPopDirective implements AfterViewInit, OnDestroy {
    private el = inject(ElementRef<HTMLElement>);
    motionPopKey = input<unknown>(undefined);
    private controls?: { stop: () => void };
    private mounted = false;

    constructor() {
        effect(() => {
            // Track changes
            this.motionPopKey();
            if (this.mounted) this.play();
        });
    }

    ngAfterViewInit(): void {
        this.mounted = true;
        this.play();
    }

    private play(): void {
        if (reducedMotion) return;
        this.controls?.stop();
        this.controls = animate(
            this.el.nativeElement,
            { scale: [0.7, 1.15, 1] },
            { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }
        );
    }

    ngOnDestroy(): void {
        this.controls?.stop();
    }
}

export const MOTION_DIRECTIVES = [
    MotionInViewDirective,
    MotionPressDirective,
    MotionPopDirective,
] as const;
