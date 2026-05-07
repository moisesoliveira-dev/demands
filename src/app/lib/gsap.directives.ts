import { AfterViewInit, Directive, ElementRef, OnDestroy, inject, input } from '@angular/core';
import { gsap } from 'gsap';

const reducedMotion = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Fade + slide-up entrance animation.
 * Usage: <div gsapFadeIn></div>
 *        <div gsapFadeIn [gsapDelay]="0.1"></div>
 */
@Directive({ selector: '[gsapFadeIn]', standalone: true })
export class GsapFadeInDirective implements AfterViewInit, OnDestroy {
    private el = inject(ElementRef<HTMLElement>);
    gsapDelay = input(0);
    gsapDuration = input(0.4);
    gsapY = input(12);
    private tween?: gsap.core.Tween;

    ngAfterViewInit(): void {
        if (reducedMotion) return;
        const node = this.el.nativeElement;
        this.tween = gsap.fromTo(
            node,
            { opacity: 0, y: this.gsapY() },
            {
                opacity: 1,
                y: 0,
                duration: this.gsapDuration(),
                delay: this.gsapDelay(),
                ease: 'power2.out',
                clearProps: 'transform',
            }
        );
    }

    ngOnDestroy(): void {
        this.tween?.kill();
    }
}

/**
 * Stagger entrance for direct children of the host element.
 * Usage: <div gsapStagger>...children...</div>
 */
@Directive({ selector: '[gsapStagger]', standalone: true })
export class GsapStaggerDirective implements AfterViewInit, OnDestroy {
    private el = inject(ElementRef<HTMLElement>);
    gsapStagger = input(0.05);
    gsapDuration = input(0.35);
    gsapY = input(10);
    private tween?: gsap.core.Tween;

    ngAfterViewInit(): void {
        if (reducedMotion) return;
        const children = Array.from(this.el.nativeElement.children) as HTMLElement[];
        if (!children.length) return;
        this.tween = gsap.fromTo(
            children,
            { opacity: 0, y: this.gsapY() },
            {
                opacity: 1,
                y: 0,
                duration: this.gsapDuration(),
                stagger: this.gsapStagger(),
                ease: 'power2.out',
                clearProps: 'transform',
            }
        );
    }

    ngOnDestroy(): void {
        this.tween?.kill();
    }
}

/**
 * Scale-in entrance for modals/dialogs.
 * Usage: <div gsapScaleIn></div>
 */
@Directive({ selector: '[gsapScaleIn]', standalone: true })
export class GsapScaleInDirective implements AfterViewInit, OnDestroy {
    private el = inject(ElementRef<HTMLElement>);
    gsapDuration = input(0.25);
    private tween?: gsap.core.Tween;

    ngAfterViewInit(): void {
        if (reducedMotion) return;
        this.tween = gsap.fromTo(
            this.el.nativeElement,
            { opacity: 0, scale: 0.94 },
            {
                opacity: 1,
                scale: 1,
                duration: this.gsapDuration(),
                ease: 'back.out(1.4)',
                clearProps: 'transform',
            }
        );
    }

    ngOnDestroy(): void {
        this.tween?.kill();
    }
}

/**
 * Convenience: re-export an array for spread imports.
 */
export const GSAP_DIRECTIVES = [
    GsapFadeInDirective,
    GsapStaggerDirective,
    GsapScaleInDirective,
] as const;
