import { AfterViewChecked, Component, ElementRef, EventEmitter, Output, ViewChild, effect, inject, input, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Bot, User as UserIcon, ArrowUp, Loader2, CheckCircle2, Copy, Check, Pencil } from 'lucide-angular';
import { UiButton } from '../ui/button.component';
import { Demanda, DemandStatus, Prioridade } from '../../types';
import { DemandasService } from '../../services/demandas.service';
import { toast } from '../../lib/toast';
import { PRIORIDADE_CONFIG } from './demand-card.component';
import { TriagemSessionService, Step, DraftDemanda } from '../../services/triagem-session.service';

const SETORES = ['Usinagem', 'Montagem', 'Pintura', 'Manutenção', 'Qualidade', 'Expedição'];
const RESPONSAVEIS = ['João Silva', 'Maria Santos', 'Pedro Oliveira', 'Ana Costa', 'Carlos Souza', 'Beatriz Lima', 'Rafael Mendes', 'Camila Rocha', 'Lucas Pereira', 'Juliana Alves'];

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

        @if (messages().length === 0 && !typing()) {
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
            @if (step() === 'confirmacao' && !typing()) {
              <div class="flex gap-3 pl-11">
                <ui-button type="button" variant="outline" size="sm" (click)="sendUser('Editar')" [disabled]="saving()">
                  Editar dados
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

    sessionId = input<string | null>(null);
    readonly starterSuggestions = STARTER_SUGGESTIONS;

    private demandasService = inject(DemandasService);
    private sessionService = inject(TriagemSessionService);

    messages = signal<ChatMessage[]>([]);
    step = signal<Step>('descricao');
    typing = signal(false);
    saving = signal(false);
    draft = signal<DraftDemanda>({});
    copiedId = signal<string | null>(null);
    draftInput = '';

    private shouldScroll = false;
    private currentSessionId: string | null = null;

    constructor() {
        effect(() => {
            const id = this.sessionId();
            untracked(() => this._loadSession(id));
        });
    }

    ngAfterViewChecked() {
        if (this.shouldScroll && this.scrollArea) {
            this.scrollArea.nativeElement.scrollTop = this.scrollArea.nativeElement.scrollHeight;
            this.shouldScroll = false;
        }
    }

    private _loadSession(id: string | null): void {
        this.currentSessionId = id;
        this.typing.set(false);
        this.saving.set(false);
        this.draftInput = '';
        if (!id) {
            this.messages.set([]);
            this.step.set('descricao');
            this.draft.set({});
            return;
        }
        const stored = this.sessionService.get(id);
        if (stored && stored.messages.length > 0) {
            this.messages.set(stored.messages.map((m) => ({ ...m, timestamp: new Date(m.timestamp) })));
            this.step.set(stored.step);
            this.draft.set(stored.draft);
        } else {
            this.messages.set([]);
            this.step.set('descricao');
            this.draft.set({});
        }
    }

    private persist(): void {
        const id = this.currentSessionId;
        if (!id) return;
        const current = this.sessionService.get(id);
        if (!current) return;
        const d = this.draft();
        this.sessionService.upsert({
            ...current,
            titulo: d.titulo ?? current.titulo,
            messages: this.messages().map((m) => ({ ...m, timestamp: m.timestamp.toISOString() })),
            step: this.step(),
            draft: d,
            atualizadaEm: new Date().toISOString(),
            status: this.step() === 'criada' ? 'criada' : 'andamento',
        });
    }

    statusLabel() {
        switch (this.step()) {
            case 'descricao': return 'Aguardando descrição';
            case 'setor': return 'Identificando setor';
            case 'responsavel': return 'Definindo responsável';
            case 'prioridade': return 'Avaliando prioridade';
            case 'confirmacao': return 'Aguardando confirmação';
            case 'criada': return 'Demanda criada';
        }
    }

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

    sendUser(text: string) {
        this.pushMessage({ role: 'user', content: text });
        this.processUser(text);
    }

    private pushMessage(partial: Omit<ChatMessage, 'id' | 'timestamp'>) {
        this.messages.update((m) => [...m, { ...partial, id: crypto.randomUUID(), timestamp: new Date() }]);
        this.shouldScroll = true;
        this.persist();
    }

    private async agentSay(content: string, opts?: { suggestions?: string[]; summary?: Partial<Demanda>; delay?: number }) {
        const atSession = this.currentSessionId;
        this.typing.set(true);
        this.shouldScroll = true;
        await this.sleep(opts?.delay ?? 700);
        if (this.currentSessionId !== atSession) return;
        this.typing.set(false);
        this.pushMessage({ role: 'agent', content, suggestions: opts?.suggestions, summary: opts?.summary });
    }

    private sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

    reset() {
        const id = this.currentSessionId;
        if (id) {
            const current = this.sessionService.get(id);
            if (current) {
                this.sessionService.upsert({
                    ...current,
                    messages: [], step: 'descricao', draft: {},
                    titulo: 'Nova triagem', atualizadaEm: new Date().toISOString(), status: 'andamento',
                });
            }
        }
        this.messages.set([]);
        this.step.set('descricao');
        this.draft.set({});
        this.draftInput = '';
        this.saving.set(false);
    }

    private async processUser(text: string) {
        switch (this.step()) {
            case 'descricao': return this.handleDescricao(text);
            case 'setor': return this.handleSetor(text);
            case 'responsavel': return this.handleResponsavel(text);
            case 'prioridade': return this.handlePrioridade(text);
            case 'confirmacao': return this.handleConfirmacao(text);
        }
    }

    private async handleDescricao(text: string) {
        if (text.length < 10) {
            await this.agentSay('Preciso de mais contexto. Pode descrever com mais detalhes o problema ou a tarefa?');
            return;
        }
        const titulo = this.gerarTitulo(text);
        const setorDetectado = this.detectSetor(text);
        const prioridadeDetectada = this.detectPrioridade(text);
        this.draft.update((d) => ({ ...d, descricao: text, titulo, setor: setorDetectado, prioridade: prioridadeDetectada }));
        let resumo = `Entendi. Identifiquei o seguinte:\n\n• Título sugerido: "${titulo}"`;
        if (setorDetectado) resumo += `\n• Setor: ${setorDetectado}`;
        if (prioridadeDetectada) resumo += `\n• Prioridade aparente: ${PRIORIDADE_CONFIG[prioridadeDetectada].label}`;
        await this.agentSay(resumo);
        await this.askNext();
    }

    private async handleSetor(text: string) {
        const match = SETORES.find((s) => s.toLowerCase() === text.toLowerCase().trim())
            ?? SETORES.find((s) => text.toLowerCase().includes(s.toLowerCase()));
        if (!match) {
            await this.agentSay('Não reconheci esse setor. Escolha um dos disponíveis:', { suggestions: SETORES });
            return;
        }
        this.draft.update((d) => ({ ...d, setor: match }));
        await this.agentSay(`Setor "${match}" registrado.`);
        await this.askNext();
    }

    private async handleResponsavel(text: string) {
        const match = RESPONSAVEIS.find((r) => r.toLowerCase() === text.toLowerCase().trim())
            ?? RESPONSAVEIS.find((r) => text.toLowerCase().includes(r.toLowerCase().split(' ')[0]));
        if (!match) {
            await this.agentSay('Não localizei esse responsável. Selecione um da lista:', { suggestions: RESPONSAVEIS.slice(0, 6) });
            return;
        }
        this.draft.update((d) => ({ ...d, responsavel: match }));
        await this.agentSay(`${match} ficará responsável.`);
        await this.askNext();
    }

    private async handlePrioridade(text: string) {
        const p = this.detectPrioridade(text) ?? this.parsePrioridadeNumero(text);
        if (!p) {
            await this.agentSay('Não entendi a prioridade. Escolha uma:', { suggestions: ['Baixa', 'Normal', 'Alta', 'Urgente', 'Crítico'] });
            return;
        }
        this.draft.update((d) => ({ ...d, prioridade: p }));
        await this.agentSay(`Prioridade ${PRIORIDADE_CONFIG[p].label} definida.`);
        await this.askNext();
    }

    private async handleConfirmacao(text: string) {
        const t = text.toLowerCase().trim();
        if (['confirmar', 'confirmo', 'sim', 'ok', 'criar', 'pode criar'].some((w) => t.includes(w))) {
            await this.confirmar();
            return;
        }
        if (t.includes('setor')) { this.step.set('setor'); await this.agentSay('Qual setor correto?', { suggestions: SETORES }); return; }
        if (t.includes('respons')) { this.step.set('responsavel'); await this.agentSay('Quem deve ficar responsável?', { suggestions: RESPONSAVEIS.slice(0, 6) }); return; }
        if (t.includes('priorid')) { this.step.set('prioridade'); await this.agentSay('Qual a nova prioridade?', { suggestions: ['Baixa', 'Normal', 'Alta', 'Urgente', 'Crítico'] }); return; }
        if (t.includes('descri') || t.includes('título') || t.includes('titulo')) {
            this.step.set('descricao');
            this.draft.update((d) => ({ ...d, descricao: undefined, titulo: undefined }));
            await this.agentSay('Reescreva a descrição da demanda.');
            return;
        }
        if (['editar', 'mudar', 'alterar', 'não', 'nao'].some((w) => t.includes(w))) {
            await this.agentSay('O que deseja ajustar? Pode dizer "setor", "responsável", "prioridade" ou "descrição".');
            return;
        }
        await this.agentSay('Para confirmar, responda "sim". Para ajustar, diga qual campo (setor, responsável, prioridade ou descrição).');
    }

    private async askNext() {
        const d = this.draft();
        if (!d.setor) {
            this.step.set('setor');
            await this.agentSay('Em qual setor essa demanda deve ser executada?', { suggestions: SETORES });
            return;
        }
        if (!d.responsavel) {
            this.step.set('responsavel');
            await this.agentSay(`Quem do setor de ${d.setor} ficará responsável?`, { suggestions: RESPONSAVEIS.slice(0, 6) });
            return;
        }
        if (!d.prioridade) {
            this.step.set('prioridade');
            await this.agentSay('Qual a prioridade desta demanda?', { suggestions: ['Baixa', 'Normal', 'Alta', 'Urgente', 'Crítico'] });
            return;
        }
        this.step.set('confirmacao');
        await this.agentSay('Triagem concluída. Confira o resumo e confirme para criar a demanda:', {
            summary: { titulo: d.titulo, setor: d.setor, responsavel: d.responsavel, prioridade: d.prioridade },
        });
    }

    async confirmar() {
        if (this.saving()) return;
        const d = this.draft();
        if (!d.titulo || !d.descricao || !d.setor || !d.responsavel || !d.prioridade) {
            await this.agentSay('Ainda faltam informações para criar a demanda.');
            return;
        }
        this.saving.set(true);
        try {
            const nova = await this.demandasService.criar({
                titulo: d.titulo,
                descricao: d.descricao,
                setor: d.setor,
                responsavel: d.responsavel,
                prioridade: d.prioridade,
                status: DemandStatus.PENDENTE,
            });
            this.step.set('criada');
            await this.agentSay(`Demanda criada com sucesso!\n\nVocê será redirecionado em instantes.`);
            toast.success('Demanda criada!');
            this.created.emit(nova);
        } catch (e: any) {
            await this.agentSay(`Não consegui criar a demanda: ${e?.message ?? 'erro desconhecido'}.`);
            toast.error('Erro ao criar demanda', e?.message);
        } finally {
            this.saving.set(false);
        }
    }

    // ---- Heurísticas de extração ----
    private gerarTitulo(text: string): string {
        const limpo = text.replace(/\s+/g, ' ').trim();
        const primeira = limpo.split(/[.!?\n]/)[0] ?? limpo;
        const titulo = primeira.length > 70 ? primeira.slice(0, 67) + '...' : primeira;
        return titulo.charAt(0).toUpperCase() + titulo.slice(1);
    }

    private detectSetor(text: string): string | undefined {
        const t = text.toLowerCase();
        const map: Record<string, string[]> = {
            Usinagem: ['usinagem', 'torno', 'fresa', 'cnc', 'usinar'],
            Montagem: ['montagem', 'montar', 'linha de montagem', 'assembly'],
            Pintura: ['pintura', 'pintar', 'cabine de pintura', 'tinta'],
            'Manutenção': ['manutenção', 'manutencao', 'preventiva', 'corretiva', 'reparo', 'consertar', 'quebrou', 'parou'],
            Qualidade: ['qualidade', 'inspeção', 'inspecao', 'controle de qualidade', 'cq', 'defeito', 'gabarito'],
            'Expedição': ['expedição', 'expedicao', 'envio', 'embarque', 'entrega', 'logística'],
        };
        for (const [setor, kws] of Object.entries(map)) {
            if (kws.some((kw) => t.includes(kw))) return setor;
        }
        return undefined;
    }

    private detectPrioridade(text: string): Prioridade | undefined {
        const t = text.toLowerCase();
        if (/\b(crítico|critico|emergência|emergencia|parada total|linha parada|parou)\b/.test(t)) return 5;
        if (/\b(urgente|urgência|urgencia|imediato|asap)\b/.test(t)) return 4;
        if (/\b(alta|importante|prioritário|prioritario)\b/.test(t)) return 3;
        if (/\b(normal|média|media|padrão|padrao)\b/.test(t)) return 2;
        if (/\b(baixa|quando possível|quando possivel|sem pressa)\b/.test(t)) return 1;
        return undefined;
    }

    private parsePrioridadeNumero(text: string): Prioridade | undefined {
        const m = text.match(/\b([1-5])\b/);
        if (m) return Number(m[1]) as Prioridade;
        return undefined;
    }
}
