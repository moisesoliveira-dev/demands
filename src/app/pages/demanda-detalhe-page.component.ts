import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule, ArrowLeft, Pencil, Archive, Calendar, Clock, AlertCircle, ShieldAlert, MessageCircle, Bot, User } from 'lucide-angular';
import { DemandasService } from '../services/demandas.service';
import { TriagemSessionService, ChatSession } from '../services/triagem-session.service';
import { DemandStatus } from '../types';
import { UiCard, UiCardContent, UiCardHeader, UiCardTitle } from '../components/ui/card.component';
import { UiButton } from '../components/ui/button.component';
import { UiBadge } from '../components/ui/badge.component';
import { UiSeparator } from '../components/ui/form-elements.component';
import {
  UiDialog, UiDialogHeader, UiDialogTitle,
  UiDialogDescription, UiDialogFooter,
} from '../components/ui/dialog.component';
import { FormularioDemandaComponent } from '../components/demandas/formulario-demanda.component';
import { PRIORIDADE_CONFIG } from '../components/demandas/demand-card.component';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '../lib/toast';

@Component({
  selector: 'app-demanda-detalhe',
  standalone: true,
  imports: [
    CommonModule, LucideAngularModule,
    UiCard, UiCardContent, UiCardHeader, UiCardTitle,
    UiButton, UiBadge, UiSeparator,
    UiDialog, UiDialogHeader, UiDialogTitle, UiDialogDescription, UiDialogFooter,
    FormularioDemandaComponent,
  ],
  template: `
    @if (demanda(); as d) {
      <div class="space-y-4">
        <div class="flex items-center justify-between flex-wrap gap-3">
          <ui-button variant="outline" size="sm" (click)="router.navigate(['/demandas'])">
            <lucide-angular [img]="ArrowLeft" size="16" class="mr-1" /> Voltar
          </ui-button>
          @if (d.status !== DemandStatus.CONCLUIDO) {
            <div class="flex gap-2">
              <ui-button variant="outline" size="sm"
                class="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                (click)="router.navigate(['/conversas'], { queryParams: { demandaId: id() } })">
                <lucide-angular [img]="MessageCircle" size="16" class="mr-1" /> Abrir conversa
              </ui-button>
              <ui-button variant="outline" size="sm" (click)="editOpen.set(true)">
                <lucide-angular [img]="Pencil" size="16" class="mr-1" /> Editar
              </ui-button>
              <ui-button variant="outline" size="sm"
                class="text-amber-700 border-amber-300 hover:bg-amber-50"
                (click)="archiveOpen.set(true)">
                <lucide-angular [img]="Archive" size="16" class="mr-1" /> Arquivar
              </ui-button>
            </div>
          }
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div class="lg:col-span-2 space-y-4">
            <ui-card>
              <ui-card-header>
                <div class="flex items-start justify-between gap-3">
                  <div class="flex-1 min-w-0">
                    <ui-card-title class="text-2xl">{{ d.titulo }}</ui-card-title>
                    <p class="text-xs font-mono text-muted-foreground mt-1">{{ d.id }}</p>
                  </div>
                  <div class="flex flex-col gap-2 items-end">
                    <ui-badge variant="outline" [class]="prio().bg + ' ' + prio().color">{{ prio().label }}</ui-badge>
                    <ui-badge variant="outline">{{ statusLabel() }}</ui-badge>
                  </div>
                </div>
              </ui-card-header>
              <ui-card-content>
                <p class="text-foreground whitespace-pre-line">{{ d.descricao }}</p>
              </ui-card-content>
            </ui-card>

            @if (d.status === Bloqueado && d.motivoBloqueio) {
              <ui-card class="border-red-200 bg-red-50">
                <ui-card-header>
                  <div class="flex items-center gap-2 text-red-700">
                    <lucide-angular [img]="AlertCircle" size="18" />
                    <ui-card-title class="text-base">Motivo do Bloqueio</ui-card-title>
                  </div>
                </ui-card-header>
                <ui-card-content>
                  <p class="text-sm text-red-800">{{ d.motivoBloqueio }}</p>
                </ui-card-content>
              </ui-card>
            }

            <!-- Conversa de triagem (só demandas concluídas) -->
            @if (d.status === DemandStatus.CONCLUIDO) {
              <ui-card>
                <ui-card-header>
                  <div class="flex items-center gap-2 text-muted-foreground">
                    <lucide-angular [img]="MessageCircle" size="16" />
                    <ui-card-title class="text-base text-foreground">Conversa de Triagem</ui-card-title>
                  </div>
                </ui-card-header>
                <ui-card-content>
                  @if (loadingConversa()) {
                    <div class="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                      <span class="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full"></span>
                      Carregando conversa…
                    </div>
                  } @else if (conversa()) {
                    <div class="space-y-3 max-h-130 overflow-y-auto pr-1">
                      @for (msg of conversa()!.messages; track msg.id) {
                        <div [class]="msg.role === 'user'
                          ? 'flex justify-end'
                          : 'flex justify-start'">
                          <div [class]="msg.role === 'user'
                            ? 'flex items-end gap-2 max-w-[80%]'
                            : 'flex items-end gap-2 max-w-[80%] flex-row-reverse'">
                            <!-- Avatar -->
                            <div [class]="msg.role === 'user'
                              ? 'shrink-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center'
                              : 'shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center'">
                              <lucide-angular
                                [img]="msg.role === 'user' ? UserIcon : BotIcon"
                                size="14"
                                [class]="msg.role === 'user' ? 'text-primary-foreground' : 'text-muted-foreground'" />
                            </div>
                            <!-- Balão -->
                            <div [class]="msg.role === 'user'
                              ? 'rounded-2xl rounded-br-sm px-3.5 py-2.5 bg-primary text-primary-foreground text-sm shadow-sm'
                              : 'rounded-2xl rounded-bl-sm px-3.5 py-2.5 bg-muted text-foreground text-sm shadow-sm'">
                              <p class="whitespace-pre-line leading-relaxed">{{ msg.content }}</p>
                              <p [class]="msg.role === 'user'
                                ? 'text-[10px] mt-1 text-primary-foreground/60 text-right'
                                : 'text-[10px] mt-1 text-muted-foreground text-left'">
                                {{ formatTime(msg.timestamp) }}
                              </p>
                            </div>
                          </div>
                        </div>
                      }
                    </div>
                  } @else {
                    <p class="text-sm text-muted-foreground py-4 text-center">
                      Nenhuma conversa registrada para esta demanda.
                    </p>
                  }
                </ui-card-content>
              </ui-card>
            }
          </div>

          <!-- Sidebar de metadados -->
          <ui-card>
            <ui-card-content class="space-y-3 text-sm pt-4">
              <div>
                <p class="text-xs text-muted-foreground uppercase font-medium">Setor</p>
                <p class="text-foreground">{{ d.setor }}</p>
              </div>
              <ui-separator />
              <div>
                <p class="text-xs text-muted-foreground uppercase font-medium">Responsável</p>
                <p class="text-foreground">{{ d.responsavel }}</p>
              </div>
              <ui-separator />
              <div class="flex items-center gap-2">
                <lucide-angular [img]="Calendar" size="14" class="text-muted-foreground" />
                <div>
                  <p class="text-xs text-muted-foreground">Criado em</p>
                  <p class="text-foreground text-xs">{{ formatDate(d.criadoEm) }}</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <lucide-angular [img]="Clock" size="14" class="text-muted-foreground" />
                <div>
                  <p class="text-xs text-muted-foreground">Atualizado em</p>
                  <p class="text-foreground text-xs">{{ formatDate(d.atualizadoEm) }}</p>
                </div>
              </div>
            </ui-card-content>
          </ui-card>
        </div>
      </div>

      <!-- ── Edit dialog ── -->
      <ui-dialog [open]="editOpen()" (openChange)="editOpen.set($event)" contentClass="max-w-2xl">
        <ui-dialog-header>
          <ui-dialog-title>Editar demanda</ui-dialog-title>
          <ui-dialog-description>Altere os campos desejados e salve.</ui-dialog-description>
        </ui-dialog-header>
        <div class="pt-2">
          <formulario-demanda
            [demanda]="d"
            (updated)="onUpdated()"
            (cancel)="editOpen.set(false)"
          />
        </div>
      </ui-dialog>

      <!-- ── Archive confirm dialog ── -->
      <ui-dialog [open]="archiveOpen()" (openChange)="archiveOpen.set($event)" contentClass="max-w-md">
        <ui-dialog-header>
          <div class="flex items-start gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <lucide-angular [img]="ShieldAlert" size="20" class="text-amber-600" />
            </div>
            <div>
              <ui-dialog-title>Arquivar demanda</ui-dialog-title>
              <ui-dialog-description class="mt-1">
                A demanda <strong>{{ d.titulo }}</strong> será arquivada e removida do kanban.
                Esta ação pode ser revertida pelo administrador.
              </ui-dialog-description>
            </div>
          </div>
        </ui-dialog-header>
        <ui-dialog-footer class="mt-4">
          <ui-button variant="outline" [disabled]="archiving()" (click)="archiveOpen.set(false)">
            Cancelar
          </ui-button>
          <ui-button variant="destructive" [disabled]="archiving()" (click)="confirmarArquivar()">
            {{ archiving() ? 'Arquivando…' : 'Arquivar' }}
          </ui-button>
        </ui-dialog-footer>
      </ui-dialog>

    } @else {
      <p class="text-center text-muted-foreground py-12">Demanda não encontrada</p>
    }
  `,
})
export class DemandaDetalhePageComponent implements OnInit {
  id = input.required<string>();
  router = inject(Router);
  private demandasService = inject(DemandasService);
  private triagemService = inject(TriagemSessionService);

  readonly ArrowLeft = ArrowLeft; readonly Pencil = Pencil; readonly Archive = Archive;
  readonly Calendar = Calendar; readonly Clock = Clock;
  readonly AlertCircle = AlertCircle; readonly ShieldAlert = ShieldAlert;
  readonly MessageCircle = MessageCircle;
  readonly BotIcon = Bot; readonly UserIcon = User;
  readonly Bloqueado = DemandStatus.BLOQUEADO;
  readonly DemandStatus = DemandStatus;

  editOpen = signal(false);
  archiveOpen = signal(false);
  archiving = signal(false);
  conversa = signal<ChatSession | null>(null);
  loadingConversa = signal(false);

  demanda = computed(() => this.demandasService.byId(this.id()));
  prio = computed(() => PRIORIDADE_CONFIG[this.demanda()!.prioridade]);
  statusLabel = computed(() => {
    const map: Record<DemandStatus, string> = {
      [DemandStatus.PENDENTE]: 'Pendente',
      [DemandStatus.EM_ANDAMENTO]: 'Em Andamento',
      [DemandStatus.BLOQUEADO]: 'Bloqueado',
      [DemandStatus.CONCLUIDO]: 'Concluído',
    };
    return map[this.demanda()!.status];
  });

  ngOnInit() {
    const d = this.demanda();
    if (d?.status === DemandStatus.CONCLUIDO) {
      this.loadingConversa.set(true);
      this.triagemService.getByDemandaId(this.id()).then((session) => {
        this.conversa.set(session);
      }).finally(() => this.loadingConversa.set(false));
    }
  }

  formatDate(s: string) { return format(new Date(s), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR }); }
  formatTime(s: string) { return format(new Date(s), 'HH:mm', { locale: ptBR }); }

  onUpdated() {
    this.editOpen.set(false);
  }

  async confirmarArquivar() {
    this.archiving.set(true);
    try {
      await this.demandasService.arquivar(this.id());
      toast.success('Demanda arquivada', 'Ela foi removida do kanban.');
      this.router.navigate(['/demandas']);
    } catch (e: any) {
      toast.error('Erro ao arquivar', e?.message);
    } finally {
      this.archiving.set(false);
      this.archiveOpen.set(false);
    }
  }
}
