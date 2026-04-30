import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, PlusCircle, Pencil, Trash2 } from 'lucide-angular';
import { UsersService } from '../services/users.service';
import { UiCard, UiCardContent, UiCardHeader, UiCardTitle } from '../components/ui/card.component';
import { UiButton } from '../components/ui/button.component';
import { UiBadge } from '../components/ui/badge.component';
import { UiAvatar } from '../components/ui/avatar.component';

@Component({
    selector: 'app-usuarios',
    standalone: true,
    imports: [CommonModule, LucideAngularModule, UiCard, UiCardContent, UiCardHeader, UiCardTitle, UiButton, UiBadge, UiAvatar],
    template: `
    <div class="space-y-4">
      <div class="flex justify-between items-center">
        <p class="text-slate-600 text-sm">{{ users().length }} usuário(s) cadastrado(s)</p>
        <ui-button size="sm"><lucide-angular [img]="PlusCircle" size="16" class="mr-1" /> Novo Usuário</ui-button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        @for (u of users(); track u.id) {
          <ui-card>
            <ui-card-header>
              <div class="flex items-center gap-3">
                <ui-avatar [name]="u.nome" [src]="u.avatar" class="h-12 w-12" fallbackClass="bg-amber-500 text-slate-900 font-semibold" />
                <div class="flex-1 min-w-0">
                  <ui-card-title class="text-base truncate">{{ u.nome }}</ui-card-title>
                  <p class="text-xs text-slate-500 truncate">{{ u.email }}</p>
                </div>
              </div>
            </ui-card-header>
            <ui-card-content class="space-y-3">
              <div class="flex flex-wrap gap-2">
                <ui-badge variant="outline">{{ u.cargo }}</ui-badge>
                <ui-badge variant="secondary">{{ u.role }}</ui-badge>
                <ui-badge [variant]="u.ativo ? 'default' : 'outline'">{{ u.ativo ? 'Ativo' : 'Inativo' }}</ui-badge>
              </div>
              <p class="text-xs text-slate-500">Setor: {{ u.setor }}</p>
              <div class="flex gap-2">
                <ui-button variant="outline" size="sm" class="flex-1">
                  <lucide-angular [img]="Pencil" size="14" class="mr-1" /> Editar
                </ui-button>
                <ui-button variant="outline" size="sm" (click)="remover(u.id)">
                  <lucide-angular [img]="Trash2" size="14" />
                </ui-button>
              </div>
            </ui-card-content>
          </ui-card>
        }
      </div>
    </div>
  `,
})
export class UsuariosPageComponent {
    readonly PlusCircle = PlusCircle; readonly Pencil = Pencil; readonly Trash2 = Trash2;
    usersService = inject(UsersService);
    users = computed(() => this.usersService.users());

    remover(id: string) { this.usersService.excluir(id); }
}
