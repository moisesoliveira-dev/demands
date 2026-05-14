import { AfterViewChecked, ChangeDetectorRef, Component, DestroyRef, ElementRef, EventEmitter, Output, ViewChild, effect, inject, input, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Bot, User as UserIcon, ArrowUp, Loader2, CheckCircle2, Copy, Check, Pencil, Sparkles, Zap } from 'lucide-angular';
import { UiButton } from '../ui/button.component';
import { Demanda, DemandStatus, Prioridade } from '../../types';
import { toast } from '../../lib/toast';
import { PRIORIDADE_CONFIG } from './demand-card.component';
import { TriagemSessionService, Step, DraftDemanda, StoredMessage, PipelineResult } from '../../services/triagem-session.service';
import { DemandasService } from '../../services/demandas.service';

interface ChatMessage {
  id: string;
  role: 'agent' | 'user';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  summary?: Partial<Demanda>;
}

const STARTER_SUGGESTIONS = [
  { label: 'Manutenção corretiva urgente', prompt: 'A linha 3 parou. O torno CNC apresentou falha elétrica e precisa de manutenção corretiva urgente.' },
  { label: 'Problema de qualidade', prompt: 'Identificamos peças fora do gabarito na usinagem. Preciso abrir chamado de controle de qualidade.' },
  { label: 'Manutenção preventiva', prompt: 'Agendar manutenção preventiva nos equipamentos da cabine de pintura antes do próximo ciclo de produção.' },
  { label: 'Inspeção de expedição', prompt: 'Preciso de inspeção no setor de expedição antes do embarque previsto para essa semana.' },
];

@Component({
  selector: 'triagem-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, UiButton],
  template: `
    <div class="flex flex-col h-full bg-white">

      <!-- ── Messages / Empty state ── -->
      <div #scrollArea class="flex-1 overflow-y-auto">

        @if (loadingSession()) {
          <!-- Loading skeleton -->
          <div class="max-w-3xl mx-auto px-6 pt-8 pb-4 space-y-8">
            @for (_ of [1,2,3]; track $index) {
              <div class="flex gap-4">
                <div class="w-7 h-7 rounded-full bg-slate-200 animate-pulse shrink-0 mt-0.5"></div>
                <div class="flex-1 space-y-2 pt-1">
                  <div class="h-4 bg-slate-200 animate-pulse rounded-md w-3/4"></div>
                  <div class="h-4 bg-slate-200 animate-pulse rounded-md w-1/2"></div>
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
              <h2 class="text-2xl font-semibold text-slate-900">Como posso ajudar?</h2>
              <p class="text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
                Descreva sua demanda industrial e vou conduzir a triagem automaticamente.
              </p>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl">
              @for (s of starterSuggestions; track s.label) {
                <button type="button" (click)="useSuggestion(s.prompt)"
                  class="text-left p-4 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm transition-all">
                  <p class="text-sm font-semibold text-slate-800">{{ s.label }}</p>
                  <p class="text-xs text-slate-400 mt-0.5 line-clamp-2">{{ s.prompt }}</p>
                </button>
              }
            </div>
            <!-- Auto-draft (Fase 4): one-shot pipeline -->
            <div class="w-full max-w-2xl border-t border-slate-100 pt-6">
              <div class="flex items-start gap-3 p-4 rounded-xl border border-emerald-200 bg-emerald-50/40">
                <lucide-angular [img]="Zap" size="18" class="text-emerald-600 mt-0.5 shrink-0" />
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-slate-800">Gerar rascunho automaticamente</p>
                  <p class="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Pipeline Intake → Enrichment → Draft → Validator. Digite uma descrição longa abaixo e clique para receber um rascunho completo em uma só etapa.
                  </p>
                  <button type="button" (click)="generateAutoDraft()"
                    [disabled]="!draftInput.trim() || autoDrafting()"
                    class="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors">
                    @if (autoDrafting()) {
                      <lucide-angular [img]="Loader2" size="13" class="animate-spin" />
                      Gerando...
                    } @else {
                      <lucide-angular [img]="Sparkles" size="13" />
                      Gerar a partir do texto abaixo
                    }
                  </button>
                  @if (!draftInput.trim()) {
                    <p class="text-[11px] text-slate-400 mt-1.5">Digite uma descrição no campo de mensagem para habilitar.</p>
                  }
                </div>
              </div>
            </div>
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
                    <p class="text-sm text-slate-900 leading-relaxed whitespace-pre-wrap">{{ msg.content }}</p>

                    @if (msg.summary) {
                      <div class="border border-slate-200 rounded-xl px-4 py-3 bg-slate-50">
                        <div class="grid grid-cols-[96px_1fr] gap-y-2 text-xs">
                          <span class="text-slate-500 font-medium">Título</span>
                          <span class="text-slate-900 font-semibold">{{ msg.summary.titulo }}</span>
                          <span class="text-slate-500 font-medium">Setor</span>
                          <span class="text-slate-900">{{ msg.summary.setor }}</span>
                          <span class="text-slate-500 font-medium">Responsável</span>
                          <span class="text-slate-900">{{ msg.summary.responsavel }}</span>
                          <span class="text-slate-500 font-medium">Prioridade</span>
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
                            class="text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 transition-colors">
                            {{ s }}
                          </button>
                        }
                      </div>
                    }

                    <!-- Hover actions -->
                    <div class="flex items-center gap-0.5 h-6 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button type="button" (click)="copyMsg(msg.id, msg.content)"
                        [title]="copiedId() === msg.id ? 'Copiado!' : 'Copiar mensagem'"
                        class="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                        <lucide-angular [img]="copiedId() === msg.id ? Check : Copy" size="14" />
                      </button>
                    </div>
                  </div>
                </div>

              } @else {
                <!-- User bubble -->
                <div class="group flex justify-end gap-3">
                  <div class="space-y-1.5 max-w-[78%]">
                    <div class="bg-slate-100 rounded-2xl px-4 py-2.5">
                      <p class="text-sm text-slate-900 leading-relaxed">{{ msg.content }}</p>
                    </div>
                    <!-- Hover actions -->
                    <div class="flex justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button type="button" (click)="copyMsg(msg.id, msg.content)"
                        [title]="copiedId() === msg.id ? 'Copiado!' : 'Copiar'"
                        class="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                        <lucide-angular [img]="copiedId() === msg.id ? Check : Copy" size="14" />
                      </button>
                      <button type="button" (click)="editMsg(msg.content)"
                        title="Usar como entrada"
                        class="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                        <lucide-angular [img]="Pencil" size="14" />
                      </button>
                    </div>
                  </div>
                  <div class="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 shrink-0 mt-0.5">
                    <lucide-angular [img]="UserIcon" size="14" />
                  </div>
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

            <!-- Auto-draft result (Fase 4) -->
            @if (autoDraftResult(); as result) {
              <div class="pl-11 space-y-3">
                @if (result.issues.length) {
                  <div class="border border-amber-200 bg-amber-50 rounded-lg px-3 py-2 text-xs text-amber-800">
                    <p class="font-semibold mb-1">Avisos do validador:</p>
                    <ul class="list-disc pl-4 space-y-0.5">
                      @for (i of result.issues; track i) { <li>{{ i }}</li> }
                    </ul>
                  </div>
                }
                @if (result.references.length) {
                  <div class="text-[11px] text-slate-500">
                    <span class="font-semibold">Referências da KB:</span> {{ result.references.join(', ') }}
                  </div>
                }
                <div class="flex flex-wrap gap-1.5">
                  @for (t of result.telemetry; track t.name) {
                    <span [class]="'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border ' + (t.error ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-slate-50 text-slate-600')">
                      {{ t.name }} · {{ t.latency_ms }}ms · {{ t.input_tokens + t.output_tokens }}tk
                    </span>
                  }
                </div>
                <div class="flex gap-3">
                  <ui-button type="button" variant="outline" size="sm" (click)="discardAutoDraft()" [disabled]="saving()">
                    Descartar
                  </ui-button>
                  <ui-button type="button" size="sm" (click)="createFromAutoDraft()" [disabled]="saving() || !canCreateAutoDraft()">
                    @if (saving()) {
                      <lucide-angular [img]="Loader2" size="14" class="animate-spin mr-1.5" />
                      Criando...
                    } @else {
                      <lucide-angular [img]="CheckCircle2" size="14" class="mr-1.5" />
                      Criar demanda
                    }
                  </ui-button>
                </div>
              </div>
            }

            <div class="h-2"></div>
          </div>
        }
      </div>

      <!-- ── Input area ── -->
      <div class="shrink-0 px-6 pb-5 pt-3 bg-white">
        <div class="max-w-3xl mx-auto">
          <div class="relative bg-slate-100 rounded-2xl border border-transparent focus-within:border-slate-300 focus-within:bg-white focus-within:shadow-md transition-all">
            <textarea
              #inputEl
              [(ngModel)]="draftInput"
              name="message"
              rows="1"
              [disabled]="typing() || step() === 'criada'"
              [placeholder]="placeholder()"
              (keydown)="onKeydown($event)"
              (input)="autoGrow($event)"
              class="w-full bg-transparent resize-none px-4 pt-3.5 pb-12 text-sm focus:outline-none disabled:cursor-not-allowed leading-relaxed max-h-48"
            ></textarea>
            <div class="absolute bottom-3 right-3">
              <button type="button" (click)="onSubmit()"
                [disabled]="!draftInput.trim() || typing() || step() === 'criada'"
                class="w-8 h-8 rounded-full flex items-center justify-center transition-colors bg-slate-900 hover:bg-slate-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white shadow-sm">
                <lucide-angular [img]="ArrowUp" size="16" />
              </button>
            </div>
          </div>
          <p class="text-center text-[11px] text-slate-400 mt-2">
            <kbd class="px-1 py-0.5 text-[10px] bg-white border border-slate-200 rounded shadow-sm">Enter</kbd> para enviar &nbsp;·&nbsp;
            <kbd class="px-1 py-0.5 text-[10px] bg-white border border-slate-200 rounded shadow-sm">Shift+Enter</kbd> para nova linha
          </p>
        </div>
      </div>
    </div>
  `,
})
export class TriagemChatComponent implements AfterViewChecked {
  @Output() created = new EventEmitter<Demanda>();
  @Output() cancel = new EventEmitter<void>();

  @ViewChild('scrollArea') scrollArea?: ElementRef<HTMLElement>;
  @ViewChild('inputEl') inputEl?: ElementRef<HTMLTextAreaElement>;

  readonly Bot = Bot; readonly UserIcon = UserIcon; readonly ArrowUp = ArrowUp;
  readonly Loader2 = Loader2; readonly CheckCircle2 = CheckCircle2;
  readonly Copy = Copy; readonly Check = Check; readonly Pencil = Pencil;
  readonly Sparkles = Sparkles; readonly Zap = Zap;

  sessionId = input<string | null>(null);
  readonly starterSuggestions = STARTER_SUGGESTIONS;

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

  // Auto-draft (Fase 4 — pipeline one-shot)
  autoDrafting = signal(false);
  autoDraftResult = signal<PipelineResult | null>(null);

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
      this.scrollArea.nativeElement.scrollTop = this.scrollArea.nativeElement.scrollHeight;
      this.shouldScroll = false;
    }
  }

  private async _loadSession(id: string | null): Promise<void> {
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
    if (this.typing()) return '';
    return 'Descreva sua demanda ou responda ao agente...';
  }

  prioridadeLabel(p?: Prioridade) {
    return p ? PRIORIDADE_CONFIG[p].label : '—';
  }

  prioridadeStyle(p?: Prioridade) {
    if (!p) return 'bg-slate-100 text-slate-700 border-slate-300';
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
    this.sendUser(text);
    this.draftInput = '';
    if (this.inputEl) this.inputEl.nativeElement.style.height = 'auto';
  }

  /** Envia a mensagem ao backend e processa a resposta do agente. */
  async sendUser(text: string): Promise<void> {
    const sid = this.currentSessionId;
    if (!sid) return;

    // 1) Renderiza imediatamente a mensagem do usuário (otimista)
    this._appendMessage({ role: 'user', content: text });

    this.typing.set(true);
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
    this.autoDrafting.set(false);
    this.autoDraftResult.set(null);
  }

  // ─── Auto-draft pipeline (Fase 4) ────────────────────────────────────────

  /** Roda o pipeline one-shot a partir do texto digitado. Não cria sessão nem demanda. */
  async generateAutoDraft(): Promise<void> {
    const text = this.draftInput.trim();
    if (!text || this.autoDrafting()) return;
    this.autoDrafting.set(true);
    this.autoDraftResult.set(null);
    // Mostra a entrada como mensagem do usuário (para contexto visual).
    this._appendMessage({ role: 'user', content: text });
    this.draftInput = '';
    if (this.inputEl) this.inputEl.nativeElement.style.height = 'auto';
    this.shouldScroll = true;
    try {
      const result = await this.sessionService.autoDraft(text);
      this.autoDraftResult.set(result);
      const d = result.draft;
      this._appendMessage({
        role: 'agent',
        content: result.ok
          ? 'Rascunho gerado pelo pipeline. Revise os dados abaixo e clique em “Criar demanda” para confirmar.'
          : 'Rascunho gerado com avisos do validador. Verifique antes de confirmar.',
        summary: (d.titulo || d.setor) ? {
          titulo: d.titulo,
          setor: d.setor,
          responsavel: d.responsavel,
          prioridade: d.prioridade,
        } : undefined,
      });
    } catch (e: any) {
      if (e?.name === 'EmptyError') return; // user cancelled
      this._appendMessage({
        role: 'agent',
        content: `Falha ao gerar rascunho: ${e?.message ?? 'erro desconhecido'}.`,
      });
      toast.error('Falha no auto-draft', e?.message);
    } finally {
      this.autoDrafting.set(false);
    }
  }

  canCreateAutoDraft(): boolean {
    const r = this.autoDraftResult();
    if (!r) return false;
    const d = r.draft;
    return !!(d.titulo && d.descricao && d.setor && d.responsavel && d.prioridade);
  }

  discardAutoDraft(): void {
    this.autoDraftResult.set(null);
  }

  /** Cria a demanda diretamente a partir do auto-draft (sem sessão de triagem). */
  async createFromAutoDraft(): Promise<void> {
    const r = this.autoDraftResult();
    if (!r || this.saving()) return;
    if (!this.canCreateAutoDraft()) {
      toast.error('Rascunho incompleto', 'Faltam campos obrigatórios.');
      return;
    }
    const d = r.draft;
    this.saving.set(true);
    try {
      const nova = await this.demandasService.criar({
        titulo: d.titulo!,
        descricao: d.descricao!,
        setor: d.setor!,
        responsavel: d.responsavel!,
        prioridade: d.prioridade!,
        status: DemandStatus.PENDENTE,
      });
      this.autoDraftResult.set(null);
      this._appendMessage({
        role: 'agent',
        content: 'Demanda criada com sucesso a partir do rascunho automatizado.',
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

  private _appendMessage(partial: Omit<ChatMessage, 'id' | 'timestamp'>) {
    this.messages.update((m) => [
      ...m,
      { ...partial, id: crypto.randomUUID(), timestamp: new Date() },
    ]);
    this.shouldScroll = true;
  }

  /**
   * Called by the page component when the user confirms switching sessions
   * while the AI is generating.  Aborts the in-flight HTTP request and
   * asks the server to roll back any messages it may have already persisted.
   */
  async cancelAndRollback(): Promise<void> {
    // Guard: nothing to cancel if not currently generating.
    const wasTyping = this.typing();
    const wasAutoDrafting = this.autoDrafting();
    if (!wasTyping && !wasAutoDrafting) return;

    const sid = this.currentSessionId;

    // 1) Cancel the in-flight XHR immediately (throws EmptyError in sendUser/generateAutoDraft).
    this.sessionService.cancelCurrentRequest();
    this.typing.set(false);
    this.autoDrafting.set(false);

    // 2) Roll back server state (only for regular chat messages, not auto-draft).
    //    auto-draft does not persist anything to the DB, so no rollback needed.
    if (wasTyping && sid) {
      void this.sessionService.rollbackLastMessage(sid);
    }
  }
}
