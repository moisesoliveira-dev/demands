import { Component, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs/operators';
import { UIService } from '../services/ui.service';
import { IdleService } from '../services/idle.service';
import { AppSidebarComponent } from './app-sidebar.component';
import { AppTopbarComponent } from './app-topbar.component';
import { GsapRouteTransitionDirective } from '../lib/gsap-route.directive';
import { cn } from '../lib/utils';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, AppSidebarComponent, AppTopbarComponent, GsapRouteTransitionDirective],
  template: `
    <div class="min-h-screen bg-background transition-colors duration-200">
      <app-sidebar />
      <app-topbar [pageTitle]="title()" [breadcrumbs]="breadcrumbs()" />
      <main [class]="mainClass()">
        <div class="p-6" gsapRouteTransition>
          <router-outlet />
        </div>
      </main>
    </div>
  `,
})
export class AppShellComponent implements OnInit {
  private readonly ui = inject(UIService);
  private readonly router = inject(Router);
  private readonly idle = inject(IdleService);

  ngOnInit() {
    this.idle.start();
  }

  private routeData = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      startWith(null),
      map(() => {
        let r = this.router.routerState.snapshot.root;
        while (r.firstChild) r = r.firstChild;
        return r.data;
      })
    ),
    { initialValue: {} as Record<string, any> }
  );

  title = computed(() => this.routeData()?.['pageTitle'] || '');
  breadcrumbs = computed(() => this.routeData()?.['breadcrumbs'] || []);

  mainClass = computed(() =>
    cn('pt-14 transition-all duration-200', this.ui.sidebarCollapsed() ? 'md:pl-16' : 'md:pl-60')
  );
}
