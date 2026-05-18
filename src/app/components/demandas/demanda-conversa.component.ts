import {
  AfterViewChecked, Component, DestroyRef, ElementRef, OnInit,
  ViewChild, computed, inject, input, signal,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Send, Sparkles, RefreshCw } from 'lucide-angular';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { UiButton } from '../ui/button.component';
import { UiDialog, UiDialogHeader, UiDialogTitle, UiDialogDescription, UiDialogFooter } from '../ui/dialog.component';
import { DemandaConversaService, ConversaMessage } from '../../services/demanda-conversa.service';
import { DemandasService } from '../../services/demandas.service';
import { AuthService } from '../../services/auth.service';
import { toast } from '../../lib/toast';

/** Cor do nome do remetente na bolha alheia */
const ROLE_COLOR: Record<string, string> = {
  solicitante: 'text-blue-600 dark:text-blue-400',
  responsavel: 'text-emerald-600 dark:text-emerald-400',
  admin: 'text-purple-600 dark:text-purple-400',
  participante: 'text-muted-foreground dark:text-muted-foreground',
  sistema: 'text-muted-foreground dark:text-muted-foreground',
  ia: 'text-amber-600 dark:text-amber-400',
};

const ROLE_LABEL: Record<string, string> = {
  solicitante: 'Solicitante', responsavel: 'Responsável', admin: 'Admin',
  participante: 'Participante', sistema: 'Sistema', ia: '🤖 IA',
};

const AVATAR_PALETTE = [
  'bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500',
  'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-rose-500',
];

/**
 * Chat em tempo real de uma demanda — layout estilo WhatsApp.
 * - Bolhas à direita = mensagens do utilizador atual (verde)
 * - Bolhas à esquerda = mensagens dos outros (card neutro)
 * - Mensagens de sistema/IA = pílula centralizada
 */
@Component({
  selector: 'demanda-conversa',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, UiButton, DatePipe,
    UiDialog, UiDialogHeader, UiDialogTitle, UiDialogDescription, UiDialogFooter],
  styles: [`
    .bubble-own   { border-radius: 18px 18px 4px 18px; }
    .bubble-other { border-radius: 18px 18px 18px 4px; }
  `],
  template: `
    <div class="flex flex-col h-full min-h-80 gap-0">

      <!-- Toolbar de IA -->
      @if (canReestruturar()) {
        <div class="flex justify-end pb-2 shrink-0">
          <ui-button size="sm" variant="outline" [disabled]="reestruturando()" (click)="confirmOpen.set(true)">
            @if (reestruturando()) {
              <lucide-angular [img]="RefreshCw" size="14" class="mr-1 animate-spin" /> Reestruturando…
            } @else {
              <lucide-angular [img]="Sparkles" size="14" class="mr-1 text-amber-500" /> Reestruturar com IA
            }
          </ui-button>
        </div>
      }

      <!-- Diálogo de confirmação de reestruturação -->
      <ui-dialog [open]="confirmOpen()" (openChange)="confirmOpen.set($event)">
        <ui-dialog-header>
          <ui-dialog-title>Reestruturar com IA</ui-dialog-title>
          <ui-dialog-description>
            A IA vai reescrever o <strong>título</strong> e a <strong>descrição</strong> desta demanda
            com base nas mensagens da conversa. A operação não pode ser desfeita.
          </ui-dialog-description>
        </ui-dialog-header>
        <ui-dialog-footer>
          <ui-button variant="outline" (click)="confirmOpen.set(false)">Cancelar</ui-button>
          <ui-button variant="default" class="bg-amber-500 hover:bg-amber-600 text-white"
            (click)="confirmarReestruturar()">
            <lucide-angular [img]="Sparkles" size="14" class="mr-1" /> Sim, reestruturar
          </ui-button>
        </ui-dialog-footer>
      </ui-dialog>

      <!-- Área de mensagens -->
      <div #scroller
        class="flex-1 overflow-y-auto px-3 py-2 space-y-1"
        style="background: var(--chat-bg, transparent);"
      >
        @if (messages().length === 0) {
          <div class="flex flex-col items-center justify-center h-full text-center py-12">
            <p class="text-sm text-muted-foreground">Sem mensagens ainda.</p>
            <p class="text-xs text-muted-foreground/60 mt-1">Comece a conversa abaixo.</p>
          </div>
        }

        @for (m of messages(); track m.id; let i = $index) {
          <!-- Sistema / IA → pílula centralizada -->
          @if (m.autorRole === 'sistema' || m.autorRole === 'ia') {
            <div class="flex justify-center my-2">
              <div class="inline-flex items-center gap-1.5 bg-muted/80 border border-border text-muted-foreground text-[11px] px-3 py-1 rounded-full max-w-[80%]">
                <span class="font-medium">{{ roleLabel(m.autorRole) }}</span>
                <span class="text-muted-foreground/60">·</span>
                <span class="whitespace-pre-line">{{ m.conteudo }}</span>
                <span class="text-muted-foreground/50 ml-1 shrink-0">{{ m.criadoEm | date:'HH:mm' }}</span>
              </div>
            </div>

          <!-- Própria → direita -->
          } @else if (isOwn(m)) {
            <div class="flex justify-end"
              [class.mt-3]="i === 0 || !isOwn(messages()[i - 1])">
              <div class="bubble-own bg-emerald-600 dark:bg-emerald-700 text-white max-w-[75%] px-3 py-2 shadow-sm">
                <p class="text-sm whitespace-pre-line leading-relaxed">{{ m.conteudo }}</p>
                <p class="text-[10px] text-emerald-200 dark:text-emerald-300 text-right mt-0.5 select-none">
                  {{ m.criadoEm | date:'HH:mm' }}
                </p>
              </div>
            </div>

          <!-- Outra pessoa → esquerda -->
          } @else {
            <div class="flex items-end gap-2"
              [class.mt-3]="i === 0 || isOwn(messages()[i - 1]) || messages()[i - 1].autorId !== m.autorId">

              <!-- Avatar -->
              <div [class]="avatarClass(m.autorId) + ' h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-white text-[11px] font-bold mb-0.5'">
                {{ inicial(m.autorNome) }}
              </div>

              <!-- Bolha -->
              <div class="bubble-other bg-card border border-border text-foreground max-w-[75%] px-3 py-2 shadow-sm">
                <!-- Nome só se mudar de remetente -->
                @if (i === 0 || isOwn(messages()[i - 1]) || messages()[i - 1].autorId !== m.autorId) {
                  <p [class]="'text-[11px] font-semibold mb-1 ' + roleColor(m.autorRole)">
                    {{ m.autorNome }} · {{ roleLabel(m.autorRole) }}
                  </p>
                }
                <p class="text-sm whitespace-pre-line leading-relaxed">{{ m.conteudo }}</p>
                <p class="text-[10px] text-muted-foreground text-right mt-0.5 select-none">
                  {{ m.criadoEm | date:'HH:mm' }}
                </p>
              </div>
            </div>
          }
        }
      </div>

      <!-- Composer -->
      <form (submit)="$event.preventDefault(); enviar()"
        class="flex gap-2 pt-2 border-t border-border shrink-0">
        <textarea
          [(ngModel)]="rascunho"
          name="msg"
          rows="2"
          placeholder="Escreva uma mensagem… (Enter envia, Shift+Enter = nova linha)"
          class="flex-1 resize-none rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-600"
          (keydown.enter)="onEnter($event)"
          [disabled]="enviando()"
        ></textarea>
        <ui-button type="submit" [disabled]="!rascunho.trim() || enviando()"
          class="self-end rounded-full px-3! py-3!">
          <lucide-angular [img]="Send" size="18" />
        </ui-button>
      </form>
    </div>
  `,
})
export class DemandaConversaComponent implements OnInit, AfterViewChecked {
  demandaId = input.required<string>();

  @ViewChild('scroller') scrollerRef!: ElementRef<HTMLElement>;

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
  confirmOpen = signal(false);

  private shouldScroll = false;

  canReestruturar = computed(() => {
    const u = this.auth.user();
    const d = this.demandas.byId(this.demandaId());
    if (!u || !d) return false;
    if (u.role === 'admin' || u.role === 'supervisor') return true;
    if (d.criadorId && (d.criadorId === u.id || d.criadorId === u.usua_login)) return true;
    return false;
  });

  isOwn(m: ConversaMessage): boolean {
    const u = this.auth.user();
    if (!u) return false;
    return m.autorId === u.id || m.autorId === u.usua_login;
  }

  roleColor(role: string): string { return ROLE_COLOR[role] ?? ROLE_COLOR['participante']; }
  roleLabel(role: string): string { return ROLE_LABEL[role] ?? role; }

  inicial(nome: string): string { return (nome?.trim()?.charAt(0) ?? '?').toUpperCase(); }

  avatarClass(id: string): string {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
  }

  private scrollToBottom() {
    try {
      const el = this.scrollerRef?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch { /* noop */ }
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  async ngOnInit() {
    try {
      const list = await this.conversa.list(this.demandaId());
      this.messages.set(list);
      this.shouldScroll = true;
    } catch (e: any) {
      toast.error('Erro ao carregar conversa', e?.message);
    }

    const conn = this.conversa.open(this.demandaId());
    conn.messages$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(msg => {
      if (this.messages().some(m => m.id === msg.id)) return;
      this.messages.update(arr => [...arr, msg]);
      this.shouldScroll = true;
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
      this.shouldScroll = true;
    } catch (e: any) {
      toast.error('Erro ao enviar', e?.message);
    } finally {
      this.enviando.set(false);
    }
  }

  confirmarReestruturar() {
    this.confirmOpen.set(false);
    this.reestruturar();
  }

  async reestruturar() {
    if (this.reestruturando()) return;
    this.confirmOpen.set(false);
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
