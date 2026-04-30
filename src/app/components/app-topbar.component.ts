import { Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule, Bell, Menu, User, Lock, LogOut } from 'lucide-angular';
import { UIService } from '../services/ui.service';
import { AuthService } from '../services/auth.service';
import { NotificacoesService } from '../services/notificacoes.service';
import { UiAvatar } from './ui/avatar.component';
import { UiBadge } from './ui/badge.component';
import { UiButton } from './ui/button.component';
import { UiBreadcrumb, BreadcrumbItem } from './ui/breadcrumb.component';
import { UiDropdown, UiDropdownItem, UiDropdownSeparator, UiDropdownLabel } from './ui/dropdown.component';
import { cn } from '../lib/utils';

@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [CommonModule, LucideAngularModule, UiAvatar, UiBadge, UiButton, UiBreadcrumb, UiDropdown, UiDropdownItem, UiDropdownSeparator, UiDropdownLabel],
    template: `
    <header [class]="headerClass()">
      <div class="flex h-full items-center justify-between px-4 gap-4">
        <div class="flex items-center gap-4 flex-1 min-w-0">
          <ui-button variant="ghost" size="icon" class="md:hidden" (click)="ui.setSidebarMobileOpen(!ui.sidebarMobileOpen())">
            <lucide-angular [img]="Menu" size="20" />
          </ui-button>

          <div class="flex-1 min-w-0">
            <h1 class="text-lg font-bold text-slate-900 truncate">{{ pageTitle() }}</h1>
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

          <ui-button variant="ghost" size="icon" class="relative">
            <lucide-angular [img]="Bell" size="20" />
            @if (notificacoes.contadorNaoLidas() > 0) {
              <ui-badge class="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs font-mono">
                {{ notificacoes.contadorNaoLidas() > 9 ? '9+' : notificacoes.contadorNaoLidas() }}
              </ui-badge>
            }
          </ui-button>

          @if (auth.user(); as user) {
            <ui-dropdown align="end" contentClass="w-56">
              <ui-button trigger variant="ghost" class="flex items-center gap-2 h-10 px-2">
                <ui-avatar [name]="user.nome" [src]="user.avatar" class="h-8 w-8 border-2 border-amber-500/20" fallbackClass="bg-slate-700 text-slate-200 text-xs font-medium" />
                <span class="hidden md:block text-sm font-medium text-slate-900 max-w-[120px] truncate">{{ user.nome }}</span>
              </ui-button>
              <div menu>
                <ui-dropdown-label>
                  <div class="flex flex-col space-y-1">
                    <p class="text-sm font-medium">{{ user.nome }}</p>
                    <p class="text-xs text-slate-500">{{ user.email }}</p>
                    <p class="text-xs text-amber-600 font-medium">{{ user.cargo }}</p>
                  </div>
                </ui-dropdown-label>
                <ui-dropdown-separator />
                <ui-dropdown-item><lucide-angular [img]="User" size="16" class="mr-2" />Meu perfil</ui-dropdown-item>
                <ui-dropdown-item><lucide-angular [img]="Lock" size="16" class="mr-2" />Alterar senha</ui-dropdown-item>
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
    readonly notificacoes = inject(NotificacoesService);
    private readonly router = inject(Router);

    readonly Menu = Menu; readonly Bell = Bell; readonly User = User; readonly Lock = Lock; readonly LogOut = LogOut;

    headerClass = computed(() =>
        cn('fixed top-0 right-0 h-14 bg-white border-b border-slate-200 z-30 transition-all duration-200 max-md:left-0',
            this.ui.sidebarCollapsed() ? 'left-16' : 'left-60')
    );

    logout() { this.auth.logout(); this.router.navigate(['/login']); }
}
