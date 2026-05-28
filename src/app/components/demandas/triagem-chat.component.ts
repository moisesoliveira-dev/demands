import { AfterViewChecked, ChangeDetectorRef, Component, DestroyRef, ElementRef, EventEmitter, Output, ViewChild, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Bot, User as UserIcon, ArrowUp, Loader2, CheckCircle2, Copy, Check, Pencil, Square, ArrowDown } from 'lucide-angular';
import { UiButton } from '../ui/button.component';
import { UiAvatar } from '../ui/avatar.component';
import { AuthService } from '../../services/auth.service';
import { Demanda, Prioridade } from '../../types';
import { toast } from '../../lib/toast';
import { PRIORIDADE_CONFIG } from './demand-card.component';
import { TriagemSessionService, Step, DraftDemanda, StoredMessage } from '../../services/triagem-session.service';
import { DemandasService } from '../../services/demandas.service';

interface ChatMessage {
  id: string;
  role: 'agent' | 'user';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  summary?: Partial<Demanda>;
}

const STARTER_SUGGESTIONS: { label: string; prompt: string }[] = [];

@Component({
  selector: 'triagem-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, UiButton, UiAvatar],
  template: `
    <div class="flex flex-col h-full bg-card">

      <!-- ── Messages / Empty state ── -->
      <div #scrollArea (scroll)="onScroll()" class="flex-1 overflow-y-auto relative scroll-smooth">

        @if (loadingSession()) {
          <!-- Loading skeleton -->
          <div class="max-w-3xl mx-auto px-6 pt-8 pb-4 space-y-8">
            @for (_ of [1,2,3]; track $index) {
              <div class="flex gap-4">
                <div class="w-7 h-7 rounded-full bg-muted animate-pulse shrink-0 mt-0.5"></div>
                <div class="flex-1 space-y-2 pt-1">
                  <div class="h-4 bg-muted animate-pulse rounded-md w-3/4"></div>
                  <div class="h-4 bg-muted animate-pulse rounded-md w-1/2"></div>
                </div>
              </div>
            }
          </div>
        } @else if (messages().length === 0 && !typing()) {
          <!-- Empty state -->
          <div class="flex flex-col items-center justify-center min-h-full px-6 py-16 gap-10">
            <div class="text-center space-y-3">
              <div class="w-14 h-14 rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white mx-auto shadow-lg">
                <lucide-angular [img]="Bot" size="28" />
              </div>
              <h2 class="text-2xl font-semibold text-foreground">Como posso ajudar?</h2>
              <p class="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
                Descreva sua demanda industrial e vou conduzir a triagem automaticamente.
              </p>
            </div>
            @if (starterSuggestions().length) {
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl">
              @for (s of starterSuggestions(); track s.label) {
                <button type="button" (click)="useSuggestion(s.prompt)"
                  class="text-left p-4 border border-border rounded-xl hover:bg-muted/40 hover:border-input hover:shadow-sm transition-all">
                  <p class="text-sm font-semibold text-foreground">{{ s.label }}</p>
                  <p class="text-xs text-muted-foreground mt-0.5 line-clamp-2">{{ s.prompt }}</p>
                </button>
              }
            </div>
            }
          </div>

        } @else {
          <!-- Messages -->
          <div class="max-w-3xl mx-auto px-6 pt-8 pb-4 space-y-8">

            @for (msg of messages(); track msg.id) {

              @if (msg.role === 'agent') {
                <!-- Agent bubble -->
                <div class="group flex gap-4">
                  <div class="w-7 h-7 rounded-full bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-sm">
                    <lucide-angular [img]="Bot" size="14" />
                  </div>
                  <div class="flex-1 min-w-0 space-y-3">
                    <p class="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{{ msg.content }}</p>

                    @if (msg.summary) {
                      <div class="border border-border rounded-xl px-4 py-3 bg-muted/40">
                        <div class="grid grid-cols-[96px_1fr] gap-y-2 text-xs">
                          <span class="text-muted-foreground font-medium">Título</span>
                          <span class="text-foreground font-semibold">{{ msg.summary.titulo }}</span>
                          <span class="text-muted-foreground font-medium">Setor</span>
                          <span class="text-foreground">{{ msg.summary.setor }}</span>
                          <span class="text-muted-foreground font-medium">Responsável</span>
                          <span class="text-foreground">{{ msg.summary.responsavel }}</span>
                          <span class="text-muted-foreground font-medium">Prioridade</span>
                          <span [class]="'inline-flex items-center w-fit px-2 py-0.5 rounded-full text-xs font-semibold border ' + prioridadeStyle(msg.summary.prioridade)">
                            {{ prioridadeLabel(msg.summary.prioridade) }}
                          </span>
                        </div>
                      </div>
                    }

                    @if (msg.suggestions?.length && isLastAgent(msg)) {
                      <div class="flex flex-wrap gap-1.5">
                        @for (s of msg.suggestions; track s) {
                          <button type="button" (click)="useSuggestion(s)"
                            class="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted/40 hover:border-input text-foreground transition-colors">
                            {{ s }}
                          </button>
                        }
                      </div>
                    }

                    <!-- Hover actions -->
                    <div class="flex items-center gap-0.5 h-6 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button type="button" (click)="copyMsg(msg.id, msg.content)"
                        [title]="copiedId() === msg.id ? 'Copiado!' : 'Copiar mensagem'"
                        class="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-muted-foreground transition-colors">
                        <lucide-angular [img]="copiedId() === msg.id ? Check : Copy" size="14" />
                      </button>
                    </div>
                  </div>
                </div>

              } @else {
                <!-- User bubble -->
                <div class="group flex justify-end gap-3">
                  <div class="space-y-1.5 max-w-[78%]">
                    <div class="bg-muted rounded-2xl px-4 py-2.5">
                      <p class="text-sm text-foreground leading-relaxed">{{ msg.content }}</p>
                    </div>
                    <!-- Hover actions -->
                    <div class="flex justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button type="button" (click)="copyMsg(msg.id, msg.content)"
                        [title]="copiedId() === msg.id ? 'Copiado!' : 'Copiar'"
                        class="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-muted-foreground transition-colors">
                        <lucide-angular [img]="copiedId() === msg.id ? Check : Copy" size="14" />
                      </button>
                      <button type="button" (click)="editMsg(msg.content)"
                        title="Usar como entrada"
                        class="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-muted-foreground transition-colors">
                        <lucide-angular [img]="Pencil" size="14" />
                      </button>
                    </div>
                  </div>
                  <ui-avatar [name]="auth.user()?.nome ?? ''" [src]="auth.user()?.avatar"
                    class="h-7 w-7 shrink-0 mt-0.5"
                    fallbackClass="bg-muted text-muted-foreground text-xs font-medium" />
                </div>
              }
            }

            <!-- Typing indicator -->
            @if (typing()) {
              <div class="flex gap-4">
                <div class="w-7 h-7 rounded-full bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-sm">
                  <lucide-angular [img]="Bot" size="14" />
                </div>
                <div class="flex items-center gap-1 py-1.5">
                  <span class="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style="animation-delay:0ms"></span>
                  <span class="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style="animation-delay:150ms"></span>
                  <span class="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style="animation-delay:300ms"></span>
                </div>
              </div>
            }

            <!-- Confirmation buttons -->
            @if (readyToCreate() && step() !== 'criada' && !typing()) {
              <div class="flex gap-3 pl-11">
                <ui-button type="button" variant="outline" size="sm" (click)="sendUser('Quero ajustar algum campo antes de criar.')" [disabled]="saving()">
                  Ajustar dados
                </ui-button>
                <ui-button type="button" size="sm" (click)="confirmar()" [disabled]="saving()">
                  @if (saving()) {
                    <lucide-angular [img]="Loader2" size="14" class="animate-spin mr-1.5" />
                    Criando...
                  } @else {
                    <lucide-angular [img]="CheckCircle2" size="14" class="mr-1.5" />
                    Confirmar e criar
                  }
                </ui-button>
              </div>
            }



            <div class="h-2"></div>
          </div>
        }
      </div>

      <!-- ── Input area ── -->
      <div class="shrink-0 px-6 pb-5 pt-3 bg-card relative">
        <!-- Floating scroll-to-bottom button (ChatGPT-style) -->
        @if (showScrollButton()) {
          <button type="button" (click)="scrollToBottom(true)"
            class="absolute -top-6 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-card border border-border shadow-md flex items-center justify-center text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors z-10"
            title="Ir para o final">
            <lucide-angular [img]="ArrowDown" size="16" />
          </button>
        }
        <div class="max-w-3xl mx-auto">
          <div class="relative bg-muted rounded-2xl border border-transparent focus-within:border-input focus-within:bg-card focus-within:shadow-md transition-all">
            <textarea
              #inputEl
              [(ngModel)]="draftInput"
              name="message"
              rows="1"
              [disabled]="step() === 'criada'"
              [placeholder]="placeholder()"
              (keydown)="onKeydown($event)"
              (input)="autoGrow($event)"
              class="w-full bg-transparent resize-none px-4 pt-3.5 pb-12 text-sm focus:outline-none disabled:cursor-not-allowed leading-relaxed max-h-48 overflow-y-auto"
            ></textarea>
            <div class="absolute bottom-3 right-3">
              @if (typing()) {
                <button type="button" (click)="stop()"
                  title="Parar geração"
                  class="w-8 h-8 rounded-full flex items-center justify-center transition-colors bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                  <lucide-angular [img]="Square" size="12" class="fill-white" />
                </button>
              } @else {
                <button type="button" (click)="onSubmit()"
                  [disabled]="!draftInput.trim() || step() === 'criada'"
                  class="w-8 h-8 rounded-full flex items-center justify-center transition-colors bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed text-primary-foreground shadow-sm">
                  <lucide-angular [img]="ArrowUp" size="16" />
                </button>
              }
            </div>
          </div>
          <p class="text-center text-[11px] text-muted-foreground mt-2">
            <kbd class="px-1 py-0.5 text-[10px] bg-card border border-border rounded shadow-sm">Enter</kbd> para enviar &nbsp;·&nbsp;
            <kbd class="px-1 py-0.5 text-[10px] bg-card border border-border rounded shadow-sm">Shift+Enter</kbd> para nova linha
          </p>
        </div>
      </div>
    </div>
  `,
})
export class TriagemChatComponent implements AfterViewChecked {
  @Output() created = new EventEmitter<Demanda>();
  @Output() cancel = new EventEmitter<void>();
  @Output() sessionCreated = new EventEmitter<string>();

  @ViewChild('scrollArea') scrollArea?: ElementRef<HTMLElement>;
  @ViewChild('inputEl') inputEl?: ElementRef<HTMLTextAreaElement>;

  readonly Bot = Bot; readonly UserIcon = UserIcon; readonly ArrowUp = ArrowUp;
  readonly Loader2 = Loader2; readonly CheckCircle2 = CheckCircle2;
  readonly Copy = Copy; readonly Check = Check; readonly Pencil = Pencil;
  readonly Square = Square; readonly ArrowDown = ArrowDown;

  sessionId = input<string | null>(null);
  starterSuggestions = signal<{ label: string; prompt: string }[]>([]);

  readonly auth = inject(AuthService);
  private sessionService = inject(TriagemSessionService);
  private demandasService = inject(DemandasService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  messages = signal<ChatMessage[]>([]);
  step = signal<Step>('descricao');
  typing = signal(false);
  saving = signal(false);
  readyToCreate = signal(false);
  loadingSession = signal(false);
  copiedId = signal<string | null>(null);
  draftInput = '';

  /** Auto-scroll only when user is already near bottom (ChatGPT-style). */
  private nearBottom = signal(true);
  showScrollButton = computed(() => !this.nearBottom() && this.messages().length > 0);

  /** Snapshot do draft retornado pelo agente (somente leitura aqui — a edição
   *  manual ocorre no painel de prévia da página pai). */
  private agentDraft = signal<DraftDemanda>({});

  private shouldScroll = false;
  private currentSessionId: string | null = null;

  constructor() {
    effect(() => {
      const id = this.sessionId();
      untracked(() => this._loadSession(id));
    });

    this.demandasService.loadRecorrentes().then((list) => {
      this.starterSuggestions.set(list.map((r) => ({ label: r.titulo, prompt: r.descricao })));
    });

    // When the user returns to this browser tab after the AI has already responded,
    // requestAnimationFrame (which Angular uses to batch renders) was suspended while
    // the tab was in the background. Force a check so signals that fired during that
    // window are reflected in the DOM immediately.
    const onVisible = () => {
      if (!document.hidden) this.cdr.detectChanges();
    };
    document.addEventListener('visibilitychange', onVisible);
    this.destroyRef.onDestroy(() => document.removeEventListener('visibilitychange', onVisible));
  }

  ngAfterViewChecked() {
    if (this.shouldScroll && this.scrollArea) {
      const el = this.scrollArea.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.shouldScroll = false;
      this.nearBottom.set(true);
    }
  }

  /** User scrolled — track whether they're near the bottom. */
  onScroll(): void {
    const el = this.scrollArea?.nativeElement;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    this.nearBottom.set(distance < 80);
  }

  scrollToBottom(force = false): void {
    const el = this.scrollArea?.nativeElement;
    if (!el) return;
    if (force || this.nearBottom()) {
      el.scrollTop = el.scrollHeight;
      this.nearBottom.set(true);
    }
  }

  /** Stop the in-flight AI request (ChatGPT-style stop button). */
  async stop(): Promise<void> {
    if (!this.typing()) return;
    const sid = this.currentSessionId;
    this.sessionService.cancelCurrentRequest();
    this.typing.set(false);
    if (sid) void this.sessionService.rollbackLastMessage(sid);
  }

  private async _loadSession(id: string | null): Promise<void> {
    // Guard: if sendUser() is running (typing=true) and already set currentSessionId
    // to this same id (via sessionCreated.emit), the effect fired from the parent
    // setting activeId. We must NOT wipe the optimistic messages already on screen.
    if (id && id === this.currentSessionId && this.typing()) {
      return;
    }

    this.currentSessionId = id;
    this.typing.set(false);
    this.saving.set(false);
    this.readyToCreate.set(false);
    this.draftInput = '';
    if (!id) {
      this.messages.set([]);
      this.step.set('descricao');
      this.agentDraft.set({});
      this.loadingSession.set(false);
      return;
    }
    // Mostra estado vazio enquanto busca
    this.messages.set([]);
    this.loadingSession.set(true);
    try {
      const session = await this.sessionService.get(id);
      // Pode ter havido troca de sessão durante o fetch
      if (this.currentSessionId !== id) return;
      this.messages.set(session.messages.map(this._toChatMessage));
      this.step.set(session.step);
      this.agentDraft.set(session.draft);
      this.readyToCreate.set(session.step === 'confirmacao');
      this.shouldScroll = true;
    } catch (e: any) {
      toast.error('Falha ao carregar conversa', e?.message);
    } finally {
      if (this.currentSessionId === id) this.loadingSession.set(false);
    }
  }

  private _toChatMessage = (m: StoredMessage): ChatMessage => ({
    id: m.id,
    role: m.role,
    content: m.content,
    timestamp: new Date(m.timestamp),
    suggestions: m.suggestions,
    summary: m.summary,
  });

  placeholder() {
    if (this.step() === 'criada') return 'Triagem concluída. Inicie uma nova ou selecione outra sessão.';
    if (this.typing()) return 'Aguardando resposta… (você pode preparar a próxima mensagem)';
    return 'Descreva sua demanda ou responda ao agente...';
  }

  prioridadeLabel(p?: Prioridade) {
    return p ? PRIORIDADE_CONFIG[p].label : '—';
  }

  prioridadeStyle(p?: Prioridade) {
    if (!p) return 'bg-muted text-foreground border-input';
    const c = PRIORIDADE_CONFIG[p];
    return `${c.bg} ${c.color}`;
  }

  isLastAgent(msg: ChatMessage) {
    const list = this.messages();
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].role === 'agent') return list[i].id === msg.id;
    }
    return false;
  }

  async copyMsg(id: string, content: string) {
    try {
      await navigator.clipboard.writeText(content);
      this.copiedId.set(id);
      setTimeout(() => this.copiedId.set(null), 1500);
    } catch { /* clipboard not available */ }
  }

  editMsg(content: string) {
    this.draftInput = content;
    setTimeout(() => {
      const el = this.inputEl?.nativeElement;
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 192) + 'px';
      el.focus();
    }, 0);
  }

  autoGrow(ev: Event) {
    const ta = ev.target as HTMLTextAreaElement;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 192) + 'px';
  }

  onKeydown(ev: KeyboardEvent) {
    if (ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault();
      this.onSubmit();
    }
  }

  useSuggestion(s: string) {
    this.draftInput = s;
    this.onSubmit();
  }

  onSubmit() {
    const text = this.draftInput.trim();
    if (!text || this.typing() || this.step() === 'criada') return;
    this.draftInput = '';
    if (this.inputEl) this.inputEl.nativeElement.style.height = 'auto';
    void this.sendUser(text);
  }

  /** Envia a mensagem ao backend e processa a resposta do agente. */
  async sendUser(text: string): Promise<void> {
    // 1) Renderiza imediatamente a mensagem do usuário (otimista) — antes mesmo de criar a sessão.
    this._appendMessage({ role: 'user', content: text });
    this.typing.set(true);
    this.scrollToBottom(true);

    let sid = this.currentSessionId;

    // Criação lazy: a sessão só é criada no primeiro envio de mensagem.
    if (!sid) {
      try {
        const newSession = await this.sessionService.createNew();
        this.currentSessionId = newSession.id;
        sid = newSession.id;
        this.sessionCreated.emit(sid);
      } catch (e: any) {
        this.typing.set(false);
        this._appendMessage({
          role: 'agent',
          content: `Não consegui iniciar a sessão: ${e?.message ?? 'erro de comunicação'}.`,
        });
        toast.error('Falha ao criar sessão', e?.message);
        return;
      }
    }

    // 1) Renderiza imediatamente a mensagem do usuário (otimista)
    // (já foi feito acima, antes do createNew)

    this.shouldScroll = true;

    try {
      const reply = await this.sessionService.sendMessage(sid, text);

      // Sessão pode ter trocado durante a request
      if (this.currentSessionId !== sid) return;

      this.step.set(reply.step);
      this.agentDraft.set(reply.draft);
      this.readyToCreate.set(reply.ready_to_create || reply.step === 'confirmacao');

      const summary =
        reply.step === 'confirmacao' && reply.draft.titulo
          ? {
            titulo: reply.draft.titulo,
            setor: reply.draft.setor,
            responsavel: reply.draft.responsavel,
            prioridade: reply.draft.prioridade,
          }
          : undefined;

      this._appendMessage({
        role: 'agent',
        content: reply.reply,
        suggestions: reply.suggestions?.length ? reply.suggestions : undefined,
        summary,
      });
    } catch (e: any) {
      // Intentionally cancelled via cancelCurrentRequest() — takeUntil fired before
      // a value arrived, so firstValueFrom throws EmptyError.  Do nothing.
      if (e?.name === 'EmptyError') return;

      const sessionStillActive =
        this.currentSessionId === sid &&
        this.sessionService.sessions().some((s) => s.id === sid);

      // Requisição antiga: sessão foi trocada ou apagada enquanto a IA respondia.
      if (!sessionStillActive || e?.status === 404 || e?.status === 409) return;

      this._appendMessage({
        role: 'agent',
        content: `Não consegui processar agora: ${e?.message ?? 'erro de comunicação'}.`,
      });
      toast.error('Falha na triagem', e?.message);
    } finally {
      this.typing.set(false);
    }
  }

  /** Confirma e cria a demanda. Aplica eventuais edições manuais do painel de prévia. */
  async confirmar(): Promise<void> {
    const sid = this.currentSessionId;
    if (!sid || this.saving()) return;

    // Lê o draft atual do cache (pode ter sido editado manualmente no painel)
    const cached = this.sessionService.sessions().find(s => s.id === sid);
    const overrides: DraftDemanda = cached?.draft ?? this.agentDraft();

    this.saving.set(true);
    try {
      const nova = await this.sessionService.confirmar(sid, overrides);
      this.step.set('criada');
      this.readyToCreate.set(false);
      this._appendMessage({
        role: 'agent',
        content: 'Demanda criada com sucesso! Você será redirecionado em instantes.',
      });
      toast.success('Demanda criada!');
      this.created.emit(nova);
    } catch (e: any) {
      this._appendMessage({
        role: 'agent',
        content: `Não consegui criar a demanda: ${e?.message ?? 'erro desconhecido'}.`,
      });
      toast.error('Erro ao criar demanda', e?.message);
    } finally {
      this.saving.set(false);
    }
  }

  /** Limpa a UI local (a sessão server-side permanece). */
  reset() {
    this.messages.set([]);
    this.step.set('descricao');
    this.agentDraft.set({});
    this.draftInput = '';
    this.saving.set(false);
    this.readyToCreate.set(false);
  }


  private _appendMessage(partial: Omit<ChatMessage, 'id' | 'timestamp'>) {
    this.messages.update((m) => [
      ...m,
      { ...partial, id: crypto.randomUUID(), timestamp: new Date() },
    ]);
    // Auto-scroll só se o usuário já estiver perto do fim (ChatGPT-style)
    if (this.nearBottom()) this.shouldScroll = true;
  }

  /**
   * Called by the page component when the user confirms switching sessions
   * while the AI is generating.  Aborts the in-flight HTTP request and
   * asks the server to roll back any messages it may have already persisted.
   */
  async cancelAndRollback(): Promise<void> {
    // Guard: nothing to cancel if not currently generating.
    const wasTyping = this.typing();
    if (!wasTyping) return;

    const sid = this.currentSessionId;

    // 1) Cancel the in-flight XHR immediately (throws EmptyError in sendUser).
    this.sessionService.cancelCurrentRequest();
    this.typing.set(false);

    // 2) Roll back server state.
    if (wasTyping && sid) {
      void this.sessionService.rollbackLastMessage(sid);
    }
  }
}
