import { Component, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule, ArrowLeft, Pencil, Archive, Calendar, Clock, AlertCircle } from 'lucide-angular';
import { DemandasService } from '../services/demandas.service';
import { DemandStatus } from '../types';
import { UiCard, UiCardContent, UiCardHeader, UiCardTitle } from '../components/ui/card.component';
import { UiButton } from '../components/ui/button.component';
import { UiBadge } from '../components/ui/badge.component';
import { UiSeparator } from '../components/ui/form-elements.component';
import { PRIORIDADE_CONFIG } from '../components/demandas/demand-card.component';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

@Component({
    selector: 'app-demanda-detalhe',
    standalone: true,
    imports: [CommonModule, LucideAngularModule, UiCard, UiCardContent, UiCardHeader, UiCardTitle, UiButton, UiBadge, UiSeparator],
    template: `
    @if (demanda(); as d) {
      <div class="space-y-4">
        <div class="flex items-center justify-between flex-wrap gap-3">
          <ui-button variant="outline" size="sm" (click)="router.navigate(['/demandas'])">
            <lucide-angular [img]="ArrowLeft" size="16" class="mr-1" /> Voltar
          </ui-button>
          <div class="flex gap-2">
            <ui-button variant="outline" size="sm">
              <lucide-angular [img]="Pencil" size="16" class="mr-1" /> Editar
            </ui-button>
            <ui-button variant="outline" size="sm">
              <lucide-angular [img]="Archive" size="16" class="mr-1" /> Arquivar
            </ui-button>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div class="lg:col-span-2 space-y-4">
            <ui-card>
              <ui-card-header>
                <div class="flex items-start justify-between gap-3">
                  <div class="flex-1 min-w-0">
                    <ui-card-title class="text-2xl">{{ d.titulo }}</ui-card-title>
                    <p class="text-xs font-mono text-slate-500 mt-1">{{ d.id }}</p>
                  </div>
                  <div class="flex flex-col gap-2 items-end">
                    <ui-badge variant="outline" [class]="prio().bg + ' ' + prio().color">{{ prio().label }}</ui-badge>
                    <ui-badge variant="outline">{{ statusLabel() }}</ui-badge>
                  </div>
                </div>
              </ui-card-header>
              <ui-card-content>
                <p class="text-slate-700 whitespace-pre-line">{{ d.descricao }}</p>
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
          </div>

          <ui-card>
            <ui-card-header>
              <ui-card-title class="text-base">Metadados</ui-card-title>
            </ui-card-header>
            <ui-card-content class="space-y-3 text-sm">
              <div>
                <p class="text-xs text-slate-500 uppercase font-medium">Setor</p>
                <p class="text-slate-900">{{ d.setor }}</p>
              </div>
              <ui-separator />
              <div>
                <p class="text-xs text-slate-500 uppercase font-medium">Responsável</p>
                <p class="text-slate-900">{{ d.responsavel }}</p>
              </div>
              <ui-separator />
              <div class="flex items-center gap-2">
                <lucide-angular [img]="Calendar" size="14" class="text-slate-400" />
                <div>
                  <p class="text-xs text-slate-500">Criado em</p>
                  <p class="text-slate-900 text-xs">{{ formatDate(d.criadoEm) }}</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <lucide-angular [img]="Clock" size="14" class="text-slate-400" />
                <div>
                  <p class="text-xs text-slate-500">Atualizado em</p>
                  <p class="text-slate-900 text-xs">{{ formatDate(d.atualizadoEm) }}</p>
                </div>
              </div>
            </ui-card-content>
          </ui-card>
        </div>
      </div>
    } @else {
      <p class="text-center text-slate-500 py-12">Demanda não encontrada</p>
    }
  `,
})
export class DemandaDetalhePageComponent {
    id = input.required<string>();
    router = inject(Router);
    private demandasService = inject(DemandasService);

    readonly ArrowLeft = ArrowLeft; readonly Pencil = Pencil; readonly Archive = Archive;
    readonly Calendar = Calendar; readonly Clock = Clock; readonly AlertCircle = AlertCircle;
    readonly Bloqueado = DemandStatus.BLOQUEADO;

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

    formatDate(s: string) { return format(new Date(s), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR }); }
}
