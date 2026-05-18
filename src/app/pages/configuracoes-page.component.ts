import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Bell, Building2, Database, Server } from 'lucide-angular';

import { UiCard, UiCardContent, UiCardHeader, UiCardTitle, UiCardDescription } from '../components/ui/card.component';
import { UiSwitch } from '../components/ui/checkbox.component';
import { UiButton } from '../components/ui/button.component';
import { UiLabel } from '../components/ui/form-elements.component';
import { AppSettingsService } from '../services/app-settings.service';
import { toast } from '../lib/toast';
import { SettingsTreeNavComponent, SettingsTreeGroup } from '../components/ui/settings-tree-nav.component';

@Component({
  selector: 'app-configuracoes',
  standalone: true,
  imports: [
    CommonModule, FormsModule, LucideAngularModule,
    UiCard, UiCardContent, UiCardHeader, UiCardTitle, UiCardDescription,
    UiSwitch, UiButton, UiLabel,
    SettingsTreeNavComponent,
  ],
  template: `
    <div class="flex gap-6 max-w-5xl min-h-[520px]">

      <!-- Tree nav -->
      <aside class="w-44 shrink-0 border-r border-border pr-2 pt-1">
        <app-settings-tree-nav
          [groups]="treeGroups"
          [active]="active()"
          (activeChange)="active.set($event)" />
      </aside>

      <!-- Content panel -->
      <div class="flex-1 min-w-0">

        @if (active() === 'notificacoes') {
          <ui-card>
            <ui-card-header>
              <ui-card-title class="flex items-center gap-2">
                <lucide-angular [img]="Bell" size="18" /> Notificações
              </ui-card-title>
              <ui-card-description>Configure como deseja receber alertas do sistema.</ui-card-description>
            </ui-card-header>
            <ui-card-content class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium">Email</p>
                  <p class="text-xs text-muted-foreground">Receber notificações por email</p>
                </div>
                <ui-switch [checked]="notifEmail()" (checkedChange)="notifEmail.set($event)" />
              </div>
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium">Push</p>
                  <p class="text-xs text-muted-foreground">Notificações no navegador</p>
                </div>
                <ui-switch [checked]="notifPush()" (checkedChange)="notifPush.set($event)" />
              </div>
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium">Apenas críticas</p>
                  <p class="text-xs text-muted-foreground">Somente prioridade urgente/crítica</p>
                </div>
                <ui-switch [checked]="apenasCriticas()" (checkedChange)="apenasCriticas.set($event)" />
              </div>
            </ui-card-content>
          </ui-card>
        }

        @if (active() === 'empresa') {
          <ui-card>
            <ui-card-header>
              <ui-card-title class="flex items-center gap-2">
                <lucide-angular [img]="Building2" size="18" /> Dados da Empresa
              </ui-card-title>
              <ui-card-description>Nome, logo e contexto geral usado pelos agentes de IA.</ui-card-description>
            </ui-card-header>
            <ui-card-content class="space-y-4">
              @if (svc.loading()) {
                <div class="space-y-3">
                  @for (_ of [1,2,3]; track $index) {
                    <div class="h-9 bg-muted animate-pulse rounded"></div>
                  }
                </div>
              } @else {
                <div class="space-y-2">
                  <ui-label for="cname">Nome da empresa</ui-label>
                  <input id="cname" type="text" [class]="inputCls" [(ngModel)]="companyForm.company_name"
                    placeholder="Ex.: Indústria Alfa Ltda." />
                </div>
                <div class="space-y-2">
                  <ui-label for="clogo">URL do logotipo</ui-label>
                  <input id="clogo" type="url" [class]="inputCls" [(ngModel)]="companyForm.company_logo_url"
                    placeholder="https://sua-empresa.com/logo.png" />
                </div>
                <div class="space-y-2">
                  <ui-label for="cctx">Contexto para a IA</ui-label>
                  <textarea id="cctx" rows="4" [class]="textareaCls" [(ngModel)]="companyForm.company_context"
                    placeholder="Ex.: Somos uma fábrica de peças automotivas. Nossos processos críticos incluem..."></textarea>
                  <p class="text-xs text-muted-foreground">Descrição livre usada pelos agentes para personalizar respostas.</p>
                </div>
                <div class="flex justify-end">
                  <ui-button (click)="saveCompany()" [disabled]="svc.saving()">
                    {{ svc.saving() ? 'Salvando...' : 'Salvar empresa' }}
                  </ui-button>
                </div>
              }
            </ui-card-content>
          </ui-card>
        }

        @if (active() === 'banco') {
          <ui-card>
            <ui-card-header>
              <ui-card-title class="flex items-center gap-2">
                <lucide-angular [img]="Database" size="18" /> Banco de Dados
              </ui-card-title>
              <ui-card-description>Conexão ativa. Para alterar, edite o <code>.env</code> e reinicie os containers.</ui-card-description>
            </ui-card-header>
            <ui-card-content>
              @if (svc.loading()) {
                <div class="grid sm:grid-cols-2 gap-3">
                  @for (_ of [1,2,3,4]; track $index) {
                    <div class="h-12 bg-muted animate-pulse rounded"></div>
                  }
                </div>
              } @else if (svc.settings()?.db; as db) {
                <div class="grid sm:grid-cols-2 gap-3 text-sm">
                  <div class="rounded-md border border-border bg-muted/40 px-3 py-2">
                    <p class="text-xs text-muted-foreground mb-0.5">Host</p>
                    <p class="font-mono font-medium">{{ db.host }}</p>
                  </div>
                  <div class="rounded-md border border-border bg-muted/40 px-3 py-2">
                    <p class="text-xs text-muted-foreground mb-0.5">Porta</p>
                    <p class="font-mono font-medium">{{ db.port }}</p>
                  </div>
                  <div class="rounded-md border border-border bg-muted/40 px-3 py-2">
                    <p class="text-xs text-muted-foreground mb-0.5">Database</p>
                    <p class="font-mono font-medium">{{ db.database }}</p>
                  </div>
                  <div class="rounded-md border border-border bg-muted/40 px-3 py-2">
                    <p class="text-xs text-muted-foreground mb-0.5">Usuário</p>
                    <p class="font-mono font-medium">{{ db.user }}</p>
                  </div>
                  <div class="rounded-md border border-border bg-muted/40 px-3 py-2 sm:col-span-2 flex items-center gap-2">
                    <p class="text-xs text-muted-foreground">SSL</p>
                    @if (db.ssl) {
                      <span class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800">Ativo</span>
                    } @else {
                      <span class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold bg-muted text-muted-foreground">Desativado</span>
                    }
                  </div>
                </div>
              }
            </ui-card-content>
          </ui-card>
        }

      </div>
    </div>
  `,
})
export class ConfiguracoesPageComponent implements OnInit {
  readonly Bell = Bell;
  readonly Building2 = Building2;
  readonly Database = Database;
  readonly Server = Server;

  readonly inputCls = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';
  readonly textareaCls = 'flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

  svc = inject(AppSettingsService);

  active = signal<string>('notificacoes');

  readonly treeGroups: SettingsTreeGroup[] = [
    {
      label: 'Sistema',
      items: [
        { id: 'notificacoes', label: 'Notificações', icon: Bell },
        { id: 'empresa', label: 'Dados da Empresa', icon: Building2 },
        { id: 'banco', label: 'Banco de Dados', icon: Database },
      ],
    },
  ];

  notifEmail = signal(true);
  notifPush = signal(true);
  apenasCriticas = signal(false);

  companyForm = { company_name: '', company_logo_url: '', company_context: '' };

  async ngOnInit() {
    try {
      const data = await this.svc.load();
      this.companyForm = { ...data.company };
    } catch (e: any) {
      toast.error('Falha ao carregar configurações', e?.message || '');
    }
  }

  async saveCompany() {
    try {
      await this.svc.updateCompany({ ...this.companyForm });
      toast.success('Dados da empresa salvos');
    } catch (e: any) {
      toast.error('Falha ao salvar', e?.message || '');
    }
  }
}
