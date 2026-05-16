import {
    Component, DestroyRef, OnInit, computed, inject, input, signal,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Send, Sparkles, RefreshCw } from 'lucide-angular';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { UiButton } from '../ui/button.component';
import { UiCard, UiCardContent } from '../ui/card.component';
import { DemandaConversaService, ConversaMessage } from '../../services/demanda-conversa.service';
import { DemandasService } from '../../services/demandas.service';
import { AuthService } from '../../services/auth.service';
import { toast } from '../../lib/toast';

const ROLE_STYLES: Record<string, { bg: string; label: string }> = {
    solicitante: { bg: 'bg-blue-50 border-blue-200', label: 'Solicitante' },
    responsavel: { bg: 'bg-emerald-50 border-emerald-200', label: 'Responsável' },
    admin: { bg: 'bg-purple-50 border-purple-200', label: 'Admin' },
    participante: { bg: 'bg-slate-50 border-slate-200', label: 'Participante' },
    sistema: { bg: 'bg-slate-100 border-slate-300 italic', label: 'Sistema' },
    ia: { bg: 'bg-amber-50 border-amber-200', label: '🤖 IA' },
};

/**
 * Aba de conversa em tempo real de uma demanda.
 *
 * - Lista mensagens persistidas (REST GET).
 * - Recebe novas mensagens via SSE.
 * - Permite enviar (REST POST).
 * - Botão "Reestruturar com IA" visível para o criador da demanda ou admin.
 */
@Component({
    selector: 'demanda-conversa',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule, UiButton, UiCard, UiCardContent, DatePipe],
    template: `
    <div class="flex flex-col gap-3 h-full min-h-80">
      <!-- Header com botão de IA -->
      <div class="flex items-center justify-between gap-2">
        <div class="text-sm text-slate-600">
          {{ messages().length }} mensagem(ns)
        </div>
        @if (canReestruturar()) {
          <ui-button
            size="sm"
            variant="outline"
            [disabled]="reestruturando()"
            (click)="reestruturar()"
          >
            @if (reestruturando()) {
              <lucide-angular [img]="RefreshCw" size="14" class="mr-1 animate-spin" />
              Reestruturando…
            } @else {
              <lucide-angular [img]="Sparkles" size="14" class="mr-1 text-amber-500" />
              Reestruturar com IA
            }
          </ui-button>
        }
      </div>

      <!-- Lista de mensagens -->
      <ui-card class="flex-1 overflow-hidden">
        <ui-card-content class="h-full overflow-y-auto p-3 space-y-2" #scroller>
          @if (messages().length === 0) {
            <p class="text-center text-sm text-slate-500 py-8">
              Sem mensagens ainda. Comece a conversa abaixo.
            </p>
          }
          @for (m of messages(); track m.id) {
            <div [class]="'rounded-md border px-3 py-2 ' + roleStyle(m.autorRole).bg">
              <div class="flex items-baseline justify-between gap-2 text-xs text-slate-500 mb-1">
                <span class="font-medium text-slate-700">
                  {{ m.autorNome }} <span class="text-slate-400">· {{ roleStyle(m.autorRole).label }}</span>
                </span>
                <span>{{ m.criadoEm | date:'dd/MM HH:mm' }}</span>
              </div>
              <p class="text-sm text-slate-800 whitespace-pre-line">{{ m.conteudo }}</p>
            </div>
          }
        </ui-card-content>
      </ui-card>

      <!-- Composer -->
      <form (submit)="$event.preventDefault(); enviar()" class="flex gap-2">
        <textarea
          [(ngModel)]="rascunho"
          name="msg"
          rows="2"
          placeholder="Escreva uma mensagem… (Enter envia, Shift+Enter quebra linha)"
          class="flex-1 resize-none rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          (keydown.enter)="onEnter($event)"
          [disabled]="enviando()"
        ></textarea>
        <ui-button type="submit" [disabled]="!rascunho.trim() || enviando()">
          <lucide-angular [img]="Send" size="16" />
        </ui-button>
      </form>
    </div>
  `,
})
export class DemandaConversaComponent implements OnInit {
    demandaId = input.required<string>();

    private conversa = inject(DemandaConversaService);
    private demandas = inject(DemandasService);
    private auth = inject(AuthService);
    private destroyRef = inject(DestroyRef);

    readonly Send = Send;
    readonly Sparkles = Sparkles;
    readonly RefreshCw = RefreshCw;

    messages = signal<ConversaMessage[]>([]);
    rascunho = '';
    enviando = signal(false);
    reestruturando = signal(false);

    canReestruturar = computed(() => {
        const u = this.auth.user();
        const d = this.demandas.byId(this.demandaId());
        if (!u || !d) return false;
        if (u.role === 'admin' || u.role === 'supervisor') return true;
        if (d.criadorId && (d.criadorId === u.id || d.criadorId === u.usua_login)) return true;
        return false;
    });

    roleStyle(role: string) {
        return ROLE_STYLES[role] ?? ROLE_STYLES['participante'];
    }

    async ngOnInit() {
        try {
            const list = await this.conversa.list(this.demandaId());
            this.messages.set(list);
        } catch (e: any) {
            toast.error('Erro ao carregar conversa', e?.message);
        }

        // Abre SSE.
        const conn = this.conversa.open(this.demandaId());
        conn.messages$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(msg => {
            // Evita duplicar mensagens próprias (já vieram do POST).
            if (this.messages().some(m => m.id === msg.id)) return;
            this.messages.update(arr => [...arr, msg]);
        });
        this.destroyRef.onDestroy(() => conn.close());
    }

    onEnter(ev: Event) {
        const ke = ev as KeyboardEvent;
        if (ke.shiftKey) return;
        ev.preventDefault();
        this.enviar();
    }

    async enviar() {
        const text = this.rascunho.trim();
        if (!text || this.enviando()) return;
        this.enviando.set(true);
        try {
            const msg = await this.conversa.send(this.demandaId(), text);
            this.messages.update(arr => [...arr, msg]);
            this.rascunho = '';
        } catch (e: any) {
            toast.error('Erro ao enviar', e?.message);
        } finally {
            this.enviando.set(false);
        }
    }

    async reestruturar() {
        if (this.reestruturando()) return;
        const ok = window.confirm(
            'A IA vai reescrever o título e a descrição da demanda usando esta conversa. Continuar?',
        );
        if (!ok) return;
        this.reestruturando.set(true);
        try {
            await this.conversa.reestruturar(this.demandaId());
            const fresh = await this.demandas.fetchById(this.demandaId());
            if (fresh) {
                const all = this.demandas.demandas();
                this.demandas.setDemandas(all.map(d => d.id === fresh.id ? fresh : d));
            }
            toast.success('Demanda reestruturada', 'O título e a descrição foram atualizados.');
        } catch (e: any) {
            toast.error('Erro ao reestruturar', e?.message);
        } finally {
            this.reestruturando.set(false);
        }
    }
}
