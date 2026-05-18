import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Search, MessageCircle, ArrowLeft, ExternalLink } from 'lucide-angular';
import { Router } from '@angular/router';

import { DemandasService } from '../../services/demandas.service';
import { Prioridade, DemandStatus } from '../../types';
import { DemandaConversaComponent } from './demanda-conversa.component';
import { UiButton } from '../ui/button.component';
import { UiBadge } from '../ui/badge.component';
import { cn } from '../../lib/utils';

const PRIO_LABEL: Record<number, string> = {
  1: 'Muito Baixa', 2: 'Baixa', 3: 'Média', 4: 'Alta', 5: 'Crítica',
};

const PRIO_COLOR: Record<number, string> = {
  1: 'bg-muted text-muted-foreground',
  2: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  3: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  4: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  5: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const STATUS_LABEL: Record<string, string> = {
  [DemandStatus.PENDENTE]: 'Pendente',
  [DemandStatus.EM_ANDAMENTO]: 'Em andamento',
  [DemandStatus.BLOQUEADO]: 'Bloqueado',
  [DemandStatus.CONCLUIDO]: 'Concluído',
};

/**
 * View "Conversas" — layout estilo WhatsApp.
 *
 * Estrutura:
 * - Sidebar esquerda: busca + lista de todas as demandas como itens de chat
 * - Painel direito: conversa da demanda selecionada (DemandaConversaComponent)
 *   ou placeholder "selecione uma conversa".
 *
 * No mobile alterna entre lista e chat (similar ao WhatsApp Web).
 */
@Component({
  selector: 'demandas-chats-view',
  standalone: true,
  imports: [
    CommonModule, FormsModule, LucideAngularModule, DatePipe,
    DemandaConversaComponent, UiButton, UiBadge,
  ],
  template: `
    <div class="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-0 border border-border rounded-lg overflow-hidden bg-card"
         style="height: calc(100vh - 180px); min-height: 500px;">

      <!-- ── Sidebar de chats (lista de demandas) ── -->
      <aside
        [class]="cn('flex flex-col border-r border-border bg-muted/30', selected() ? 'hidden md:flex' : 'flex')"
      >
        <!-- Header -->
        <div class="px-4 py-3 border-b border-border bg-card">
          <h2 class="font-semibold text-foreground flex items-center gap-2">
            <lucide-angular [img]="MessageCircle" size="18" class="text-emerald-600" />
            Conversas
          </h2>
          <p class="text-xs text-muted-foreground mt-0.5">{{ filtered().length }} demandas e chamados</p>
        </div>

        <!-- Busca -->
        <div class="px-3 py-2 border-b border-border bg-card">
          <div class="relative">
            <lucide-angular [img]="Search" size="14"
              class="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              [(ngModel)]="busca"
              placeholder="Pesquisar conversas…"
              class="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-border bg-muted/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <!-- Lista -->
        <div class="flex-1 overflow-y-auto">
          @if (filtered().length === 0) {
            <p class="text-center text-sm text-muted-foreground py-8 px-4">
              Nenhuma conversa encontrada.
            </p>
          }
          @for (d of filtered(); track d.id) {
            <button
              type="button"
              (click)="selecionar(d.id)"
              [class]="cn(
                'w-full flex items-start gap-3 px-3 py-3 border-b border-border text-left transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20',
                selected() === d.id ? 'bg-emerald-50 dark:bg-emerald-950/30' : ''
              )"
            >
              <!-- Avatar com inicial -->
              <div [class]="cn(
                'h-10 w-10 shrink-0 rounded-full flex items-center justify-center font-semibold text-white text-sm',
                avatarColor(d.id)
              )">
                {{ inicial(d.titulo) }}
              </div>

              <!-- Conteúdo -->
              <div class="flex-1 min-w-0">
                <div class="flex items-baseline justify-between gap-2">
                  <p class="font-medium text-foreground text-sm truncate">{{ d.titulo }}</p>
                  <span class="text-[11px] text-muted-foreground shrink-0">
                    {{ d.atualizadoEm | date:'dd/MM' }}
                  </span>
                </div>
                <p class="text-xs text-muted-foreground truncate mt-0.5">
                  {{ d.responsavel }} · {{ d.setor }}
                </p>
                <div class="flex items-center gap-1.5 mt-1.5">
                  <span [class]="cn('text-[10px] px-1.5 py-0.5 rounded font-medium', prioColor(d.prioridade))">
                    {{ prioLabel(d.prioridade) }}
                  </span>
                  <span class="text-[10px] px-1.5 py-0.5 rounded font-medium bg-muted text-muted-foreground">
                    {{ statusLabel(d.status) }}
                  </span>
                </div>
              </div>
            </button>
          }
        </div>
      </aside>

      <!-- ── Painel direito: conversa ativa ── -->
      <section
        [class]="cn('flex flex-col bg-muted/10 dark:bg-muted/5', selected() ? 'flex' : 'hidden md:flex')"
      >
        @if (selectedDemanda(); as d) {
          <!-- Header do chat -->
          <header class="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-card">
            <button
              type="button"
              class="md:hidden p-1 -ml-1 text-muted-foreground hover:text-foreground"
              (click)="selected.set(null)"
              aria-label="Voltar"
            >
              <lucide-angular [img]="ArrowLeft" size="20" />
            </button>
            <div [class]="cn(
              'h-9 w-9 rounded-full flex items-center justify-center font-semibold text-white text-sm',
              avatarColor(d.id)
            )">
              {{ inicial(d.titulo) }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-medium text-foreground truncate">{{ d.titulo }}</p>
              <p class="text-xs text-muted-foreground truncate">
                {{ d.setor }} · {{ d.responsavel }}
              </p>
            </div>
            <ui-badge variant="outline" [class]="prioColor(d.prioridade)">
              {{ prioLabel(d.prioridade) }}
            </ui-badge>
            <ui-button
              variant="ghost"
              size="sm"
              (click)="abrirDetalhe(d.id)"
              title="Abrir detalhes da demanda"
            >
              <lucide-angular [img]="ExternalLink" size="16" />
            </ui-button>
          </header>

          <!-- Conversa -->
          <div class="flex-1 overflow-hidden p-3">
            <demanda-conversa [demandaId]="d.id" />
          </div>
        } @else {
          <div class="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
            <div class="h-20 w-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
              <lucide-angular [img]="MessageCircle" size="40" class="text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 class="text-lg font-medium text-foreground">Selecione uma conversa</h3>
            <p class="text-sm mt-1 max-w-xs">
              Escolha uma demanda na lista ao lado para ver e participar da conversa em tempo real.
            </p>
          </div>
        }
      </section>
    </div>
  `,
})
export class DemandasChatsViewComponent {
  private demandasService = inject(DemandasService);
  private router = inject(Router);

  readonly Search = Search;
  readonly MessageCircle = MessageCircle;
  readonly ArrowLeft = ArrowLeft;
  readonly ExternalLink = ExternalLink;

  busca = '';
  selected = signal<string | null>(null);

  readonly cn = cn;

  /** Lista de demandas ordenada por última atualização (mais recente primeiro). */
  private readonly ordenadas = computed(() => {
    const arr = [...this.demandasService.demandas()];
    arr.sort((a, b) => new Date(b.atualizadoEm).getTime() - new Date(a.atualizadoEm).getTime());
    return arr;
  });

  readonly filtered = computed(() => {
    const q = this.busca.trim().toLowerCase();
    if (!q) return this.ordenadas();
    return this.ordenadas().filter(d =>
      d.titulo.toLowerCase().includes(q)
      || (d.responsavel ?? '').toLowerCase().includes(q)
      || (d.setor ?? '').toLowerCase().includes(q)
      || (d.descricao ?? '').toLowerCase().includes(q),
    );
  });

  readonly selectedDemanda = computed(() => {
    const id = this.selected();
    if (!id) return null;
    return this.demandasService.byId(id) ?? null;
  });

  selecionar(id: string) {
    this.selected.set(id);
  }

  abrirDetalhe(id: string) {
    this.router.navigate(['/demanda-detalhe', id]);
  }

  inicial(titulo: string): string {
    return (titulo?.trim()?.charAt(0) ?? '?').toUpperCase();
  }

  /** Cor de avatar determinística baseada no id. */
  avatarColor(id: string): string {
    const palette = [
      'bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500',
      'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-rose-500',
    ];
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return palette[h % palette.length];
  }

  prioLabel(p: Prioridade | number) { return PRIO_LABEL[p as number] ?? String(p); }
  prioColor(p: Prioridade | number) { return PRIO_COLOR[p as number] ?? 'bg-muted text-muted-foreground'; }
  statusLabel(s: string) { return STATUS_LABEL[s] ?? s; }
}
