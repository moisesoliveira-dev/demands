import { Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule, Factory, User, Clock, AlertCircle } from 'lucide-angular';
import { Demanda, DemandStatus, Prioridade } from '../../types';
import { UiCard } from '../ui/card.component';
import { UiBadge } from '../ui/badge.component';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const PRIORIDADE_CONFIG: Record<Prioridade, { label: string; color: string; bg: string; }> = {
  1: { label: 'Baixa', color: 'text-muted-foreground', bg: 'bg-muted border-border' },
  2: { label: 'Normal', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-300' },
  3: { label: 'Alta', color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-300' },
  4: { label: 'Urgente', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-300' },
  5: { label: 'Crítico', color: 'text-red-700', bg: 'bg-red-50 border-red-300' },
};

@Component({
  selector: 'demand-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, UiCard, UiBadge],
  host: { class: 'block' },
  template: `
    <ui-card class="cursor-pointer hover:shadow-md transition-shadow p-3 space-y-2 bg-card" (click)="open()">
      <div class="flex items-start justify-between gap-2">
        <h4 class="text-sm font-semibold text-foreground line-clamp-2 flex-1">{{ demanda().titulo }}</h4>
        <ui-badge variant="outline" [class]="'shrink-0 text-xs ' + prioridade().bg + ' ' + prioridade().color">
          {{ prioridade().label }}
        </ui-badge>
      </div>
      <p class="text-xs text-muted-foreground line-clamp-2">{{ demanda().descricao }}</p>
      <div class="flex items-center gap-3 text-xs text-muted-foreground pt-1 border-t border-border flex-wrap">
        <span class="flex items-center gap-1"><lucide-angular [img]="Factory" size="12" />{{ demanda().setor }}</span>
        <span class="flex items-center gap-1"><lucide-angular [img]="User" size="12" />{{ demanda().responsavel }}</span>
        <span class="flex items-center gap-1 ml-auto"><lucide-angular [img]="Clock" size="12" />{{ tempo() }}</span>
      </div>
      @if (demanda().status === Bloqueado) {
        <div class="flex items-center gap-1.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded p-1.5">
          <lucide-angular [img]="AlertCircle" size="14" class="animate-pulse" />
          <span class="line-clamp-1">{{ demanda().motivoBloqueio || 'Bloqueado' }}</span>
        </div>
      }
    </ui-card>
  `,
})
export class DemandCardComponent {
  demanda = input.required<Demanda>();
  private router = inject(Router);

  readonly Factory = Factory; readonly User = User; readonly Clock = Clock; readonly AlertCircle = AlertCircle;
  readonly Bloqueado = DemandStatus.BLOQUEADO;

  prioridade = computed(() => PRIORIDADE_CONFIG[this.demanda().prioridade]);
  tempo = computed(() => formatDistanceToNow(new Date(this.demanda().criadoEm), { addSuffix: true, locale: ptBR }));

  open() { this.router.navigate(['/demanda-detalhe', this.demanda().id]); }
}
