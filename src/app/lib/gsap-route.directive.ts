import { AfterViewInit, Directive, ElementRef, OnDestroy, OnInit, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { gsap } from 'gsap';

const reducedMotion = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Apply to the page wrapper (e.g. <main>) to animate every route change.
 */
@Directive({ selector: '[gsapRouteTransition]', standalone: true })
export class GsapRouteTransitionDirective implements AfterViewInit, OnInit, OnDestroy {
    private el = inject(ElementRef<HTMLElement>);
    private router = inject(Router);
    private sub?: Subscription;

    ngOnInit(): void {
        this.sub = this.router.events
            .pipe(filter((e) => e instanceof NavigationEnd))
            .subscribe(() => this.animate());
    }

    ngAfterViewInit(): void {
        this.animate();
    }

    private animate(): void {
        if (reducedMotion) return;
        gsap.fromTo(
            this.el.nativeElement,
            { opacity: 0, y: 8 },
            { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out', clearProps: 'transform' }
        );
    }

    ngOnDestroy(): void {
        this.sub?.unsubscribe();
        gsap.killTweensOf(this.el.nativeElement);
    }
}
