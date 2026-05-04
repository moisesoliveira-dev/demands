import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule, LayoutDashboard, ClipboardList, PlusCircle, BarChart3, Settings, LogOut, Menu, X, Users, Building2 } from 'lucide-angular';
import { UIService } from '../services/ui.service';
import { AuthService } from '../services/auth.service';
import { DemandasService } from '../services/demandas.service';
import { DemandStatus } from '../types';
import { UiAvatar } from './ui/avatar.component';
import { UiBadge } from './ui/badge.component';
import { UiButton } from './ui/button.component';
import { UiSeparator } from './ui/form-elements.component';
import { cn } from '../lib/utils';

interface NavItem { label: string; icon: any; path: string; badge?: () => number; highlight?: boolean; adminOnly?: boolean; }

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, LucideAngularModule, UiAvatar, UiBadge, UiButton, UiSeparator],
  template: `
    <aside [class]="asideClass()">
      <ng-container [ngTemplateOutlet]="content"></ng-container>
      <button (click)="ui.toggleSidebar()" class="absolute -right-3 top-6 h-6 w-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-amber-500 hover:border-amber-500/50 transition-colors">
        <lucide-angular [img]="collapsed() ? Menu : X" size="14" />
      </button>
    </aside>

    @if (ui.sidebarMobileOpen()) {
      <div class="fixed inset-0 bg-black/60 z-50 md:hidden" (click)="ui.setSidebarMobileOpen(false)">
        <aside class="fixed left-0 top-0 h-screen w-60 bg-slate-900 border-r border-slate-700" (click)="$event.stopPropagation()">
          <ng-container [ngTemplateOutlet]="content"></ng-container>
          <button (click)="ui.setSidebarMobileOpen(false)" class="absolute right-4 top-4 h-8 w-8 rounded-md bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white">
            <lucide-angular [img]="X" size="18" />
          </button>
        </aside>
      </div>
    }

    <ng-template #content>
      <div class="flex h-full flex-col">
        <div [class]="brandClass()">
          @if (!collapsed()) {
            <h1 class="font-mono text-lg font-bold text-amber-500">DEMANDS</h1>
          } @else {
            <div class="h-8 w-8 rounded bg-amber-500 flex items-center justify-center text-slate-900 font-mono font-bold text-sm">D</div>
          }
        </div>

        <nav class="flex-1 space-y-1 p-3 overflow-y-auto">
          @for (item of visibleItems(); track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive #rla="routerLinkActive"
              (click)="ui.setSidebarMobileOpen(false)"
              [class]="navItemClass(item, rla.isActive)"
            >
              @if (rla.isActive) {
                <div class="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r bg-amber-500"></div>
              }
              <lucide-angular [img]="item.icon" size="20" />
              @if (!collapsed()) {
                <span class="flex-1 text-left">{{ item.label }}</span>
                @if (item.badge && item.badge()! > 0) {
                  <ui-badge variant="secondary" class="bg-amber-500 text-slate-900 font-mono text-xs">
                    {{ item.badge!() }}
                  </ui-badge>
                }
              }
            </a>
          }
        </nav>

        @if (auth.user(); as user) {
          <ui-separator class="bg-slate-700" />
          <div [class]="userBoxClass()">
            <ui-button (click)="logout()" variant="ghost" [size]="collapsed() ? 'icon' : 'sm'" class="w-full text-slate-400 hover:text-red-400 hover:bg-red-950/20">
              <lucide-angular [img]="LogOut" size="18" />
              @if (!collapsed()) { <span class="ml-2">Sair</span> }
            </ui-button>
          </div>
        }
      </div>
    </ng-template>
  `,
})
export class AppSidebarComponent {
  readonly ui = inject(UIService);
  readonly auth = inject(AuthService);
  private readonly demandasService = inject(DemandasService);
  private readonly router = inject(Router);

  readonly Menu = Menu; readonly X = X; readonly LogOut = LogOut;

  collapsed = this.ui.sidebarCollapsed;

  pendingCount = computed(() => this.demandasService.demandas().filter((d) => d.status === DemandStatus.PENDENTE).length);

  navItems: NavItem[] = [
    { label: 'Nova Demanda', icon: PlusCircle, path: '/nova-demanda', highlight: true },
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Demandas', icon: ClipboardList, path: '/demandas', badge: () => this.pendingCount() },
    { label: 'Relatórios', icon: BarChart3, path: '/relatorios' },
    { label: 'Usuários', icon: Users, path: '/usuarios', adminOnly: true },
    { label: 'Setores', icon: Building2, path: '/setores', adminOnly: true },
    { label: 'Configurações', icon: Settings, path: '/configuracoes', adminOnly: true },
  ];

  visibleItems = computed(() => {
    const u = this.auth.user();
    return this.navItems.filter((i) => !i.adminOnly || u?.role === 'admin');
  });

  asideClass = computed(() =>
    cn('hidden md:flex fixed left-0 top-0 h-screen flex-col bg-slate-900 border-r border-slate-700 transition-all duration-200 ease-in-out z-40',
      this.collapsed() ? 'w-16' : 'w-60')
  );

  brandClass = computed(() =>
    cn('flex h-14 items-center border-b border-slate-700 px-4', this.collapsed() && 'justify-center px-2')
  );

  userBoxClass = computed(() => cn('p-3 space-y-2', this.collapsed() && 'flex flex-col items-center'));

  navItemClass(item: NavItem, isActive: boolean): string {
    return cn(
      'group relative flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer no-underline',
      isActive && 'bg-amber-500/10 text-amber-500',
      !isActive && item.highlight && 'text-amber-500 hover:bg-amber-500/5',
      !isActive && !item.highlight && 'text-slate-300 hover:bg-slate-800 hover:text-white',
      this.collapsed() && 'justify-center'
    );
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
