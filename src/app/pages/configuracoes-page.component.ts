import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiCard, UiCardContent, UiCardHeader, UiCardTitle, UiCardDescription } from '../components/ui/card.component';
import { UiSwitch } from '../components/ui/checkbox.component';

@Component({
    selector: 'app-configuracoes',
    standalone: true,
    imports: [CommonModule, UiCard, UiCardContent, UiCardHeader, UiCardTitle, UiCardDescription, UiSwitch],
    template: `
    <div class="space-y-4 max-w-3xl">
      <ui-card>
        <ui-card-header>
          <ui-card-title>Notificações</ui-card-title>
          <ui-card-description>Configure como deseja receber alertas</ui-card-description>
        </ui-card-header>
        <ui-card-content class="space-y-4">
          <div class="flex items-center justify-between">
            <div><p class="text-sm font-medium">Email</p><p class="text-xs text-slate-500">Receber notificações por email</p></div>
            <ui-switch [checked]="notifEmail()" (checkedChange)="notifEmail.set($event)" />
          </div>
          <div class="flex items-center justify-between">
            <div><p class="text-sm font-medium">Push</p><p class="text-xs text-slate-500">Notificações no navegador</p></div>
            <ui-switch [checked]="notifPush()" (checkedChange)="notifPush.set($event)" />
          </div>
          <div class="flex items-center justify-between">
            <div><p class="text-sm font-medium">Apenas críticas</p><p class="text-xs text-slate-500">Somente prioridade urgente/crítica</p></div>
            <ui-switch [checked]="apenasCriticas()" (checkedChange)="apenasCriticas.set($event)" />
          </div>
        </ui-card-content>
      </ui-card>

      <ui-card>
        <ui-card-header>
          <ui-card-title>Sistema</ui-card-title>
          <ui-card-description>Preferências gerais</ui-card-description>
        </ui-card-header>
        <ui-card-content class="space-y-4">
          <div class="flex items-center justify-between">
            <div><p class="text-sm font-medium">Modo offline</p><p class="text-xs text-slate-500">Trabalhar sem conexão</p></div>
            <ui-switch [checked]="offline()" (checkedChange)="offline.set($event)" />
          </div>
        </ui-card-content>
      </ui-card>
    </div>
  `,
})
export class ConfiguracoesPageComponent {
    notifEmail = signal(true);
    notifPush = signal(true);
    apenasCriticas = signal(false);
    offline = signal(false);
}
