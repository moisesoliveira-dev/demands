import { Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule, Menu, User, Lock, LogOut, Sun, Moon } from 'lucide-angular';
import { UIService } from '../services/ui.service';
import { AuthService } from '../services/auth.service';
import { UiAvatar } from './ui/avatar.component';
import { UiBadge } from './ui/badge.component';
import { UiButton } from './ui/button.component';
import { UiBreadcrumb, BreadcrumbItem } from './ui/breadcrumb.component';
import { UiDropdown, UiDropdownItem, UiDropdownSeparator, UiDropdownLabel } from './ui/dropdown.component';
import { NotificacoesBellComponent } from './demandas/notificacoes-bell.component';
import { cn } from '../lib/utils';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, UiAvatar, UiBadge, UiButton, UiBreadcrumb, UiDropdown, UiDropdownItem, UiDropdownSeparator, UiDropdownLabel, NotificacoesBellComponent],
  template: `
    <header [class]="headerClass()">
      <div class="flex h-full items-center justify-between px-4 gap-4">
        <div class="flex items-center gap-4 flex-1 min-w-0">
          <ui-button variant="ghost" size="icon" class="md:hidden" (click)="ui.setSidebarMobileOpen(!ui.sidebarMobileOpen())">
            <lucide-angular [img]="Menu" size="20" />
          </ui-button>

          <div class="flex-1 min-w-0">
            <h1 class="text-lg font-bold text-foreground truncate">{{ pageTitle() }}</h1>
            @if (breadcrumbs() && breadcrumbs().length) {
              <ui-breadcrumb [items]="breadcrumbs()" />
            }
          </div>
        </div>

        <div class="flex items-center gap-2">
          @if (auth.user(); as user) {
            <ui-badge variant="secondary" class="hidden sm:flex bg-amber-500/10 text-amber-700 border-amber-500/20 text-xs font-medium px-2 py-1">
              {{ user.setor }}
            </ui-badge>
          }

          <ui-button variant="ghost" size="icon" (click)="ui.toggleTheme()" [title]="ui.theme() === 'dark' ? 'Mudar para claro' : 'Mudar para escuro'">
            <lucide-angular [img]="ui.theme() === 'dark' ? Sun : Moon" size="19" />
          </ui-button>

          <app-notificacoes-bell />

          @if (auth.user(); as user) {
            <ui-dropdown align="end" contentClass="w-56">
              <ui-button trigger variant="ghost" class="h-10 w-10 p-0">
                <ui-avatar [name]="user.nome" [src]="user.avatar" class="h-8 w-8 border-2 border-amber-500/20" fallbackClass="bg-muted text-muted-foreground text-xs font-medium" />
              </ui-button>
              <div menu>
                <ui-dropdown-label>
                  <div class="flex flex-col space-y-1">
                    <p class="text-sm font-medium">{{ user.nome }}</p>
                    <p class="text-xs text-muted-foreground">{{ user.email }}</p>
                    <p class="text-xs text-amber-600 font-medium">{{ user.cargo }}</p>
                  </div>
                </ui-dropdown-label>
                <ui-dropdown-separator />
                <ui-dropdown-item (select)="router.navigate(['/perfil'])"><lucide-angular [img]="User" size="16" class="mr-2" />Meu perfil</ui-dropdown-item>
                <ui-dropdown-item (select)="router.navigate(['/perfil'])"><lucide-angular [img]="Lock" size="16" class="mr-2" />Alterar senha</ui-dropdown-item>
                <ui-dropdown-separator />
                <ui-dropdown-item class="text-red-600 hover:bg-red-50" (select)="logout()">
                  <lucide-angular [img]="LogOut" size="16" class="mr-2" />Sair
                </ui-dropdown-item>
              </div>
            </ui-dropdown>
          }
        </div>
      </div>
    </header>
  `,
})
export class AppTopbarComponent {
  pageTitle = input('');
  breadcrumbs = input<BreadcrumbItem[]>([]);

  readonly ui = inject(UIService);
  readonly auth = inject(AuthService);
  readonly router = inject(Router);

  readonly Menu = Menu; readonly User = User; readonly Lock = Lock; readonly LogOut = LogOut;
  readonly Sun = Sun; readonly Moon = Moon;

  headerClass = computed(() =>
    cn('fixed top-0 right-0 h-14 bg-background border-b border-border z-30 transition-all duration-200 max-md:left-0',
      this.ui.sidebarCollapsed() ? 'left-16' : 'left-60')
  );

  logout() { this.auth.logout(); this.router.navigate(['/login']); }
}
