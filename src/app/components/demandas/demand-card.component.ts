import { Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule, Factory, User, Clock, AlertCircle, MessageCircle } from 'lucide-angular';
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
  host: { class: 'block group/card', '[class.demand-highlight]': 'highlight()' },
  styles: [`
    .detail-panel {
      display: grid;
      grid-template-rows: 0fr;
      opacity: 0;
      transition: grid-template-rows 220ms ease, opacity 200ms ease;
    }
    :host:hover .detail-panel,
    :host:focus-within .detail-panel {
      grid-template-rows: 1fr;
      opacity: 1;
    }
    .detail-inner { overflow: hidden; }

    :host(.demand-highlight) {
      animation: demand-flash 1s ease-in-out 4;
      border-radius: 0.5rem;
    }
    @keyframes demand-flash {
      0%, 100% { box-shadow: none; }
      50% { box-shadow: 0 0 0 3px rgba(245,158,11,0.7), 0 0 14px rgba(245,158,11,0.35); }
    }
  `],
  template: `
    <ui-card class="cursor-pointer transition-shadow p-3 bg-card hover:shadow-md" (click)="open()">
      <!-- Linha sempre visível: título + badge prioridade -->
      <div class="flex items-center justify-between gap-2">
        <h4 class="text-sm font-semibold text-foreground truncate flex-1">{{ demanda().titulo }}</h4>
        <button
          type="button"
          class="shrink-0 p-1 rounded text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
          title="Abrir conversa"
          (click)="openConversa($event)"
        >
          <lucide-angular [img]="MessageCircle" size="14" />
        </button>
        <ui-badge variant="outline" [class]="'shrink-0 text-xs ' + prioridade().bg + ' ' + prioridade().color">
          {{ prioridade().label }}
        </ui-badge>
      </div>

      <!-- Painel de detalhes — expande no hover -->
      <div class="detail-panel">
        <div class="detail-inner space-y-2 pt-2">
          @if (demanda().descricao) {
            <p class="text-xs text-muted-foreground line-clamp-3">{{ demanda().descricao }}</p>
          }
          <div class="flex items-center gap-3 text-xs text-muted-foreground border-t border-border pt-1.5 flex-wrap">
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
        </div>
      </div>
    </ui-card>
  `,
})
export class DemandCardComponent {
  demanda = input.required<Demanda>();
  /** Quando true, aplica animação de destaque (vindo de notificação). */
  highlight = input<boolean>(false);
  private router = inject(Router);

  readonly Factory = Factory; readonly User = User; readonly Clock = Clock; readonly AlertCircle = AlertCircle;
  readonly MessageCircle = MessageCircle;
  readonly Bloqueado = DemandStatus.BLOQUEADO;

  prioridade = computed(() => PRIORIDADE_CONFIG[this.demanda().prioridade]);
  tempo = computed(() => formatDistanceToNow(new Date(this.demanda().criadoEm), { addSuffix: true, locale: ptBR }));

  open() { this.router.navigate(['/demanda-detalhe', this.demanda().id]); }

  openConversa(ev: Event) {
    ev.stopPropagation();
    this.router.navigate(['/conversas'], { queryParams: { demandaId: this.demanda().id } });
  }
}
