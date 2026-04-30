import { AfterViewChecked, Component, ElementRef, EventEmitter, Output, ViewChild, effect, inject, input, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Bot, User as UserIcon, Send, Loader2, CheckCircle2, RefreshCw, Sparkles } from 'lucide-angular';
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

@Component({
    selector: 'triagem-chat',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule, UiButton],
    template: `
    <div class="flex flex-col h-full bg-white overflow-hidden">
      <!-- Header -->
      <div class="flex items-center gap-3 px-4 py-3 border-b bg-linear-to-r from-slate-50 to-white">
        <div class="w-9 h-9 rounded-full bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow">
          <lucide-angular [img]="Bot" size="18" />
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
            Agente de Triagem
            <lucide-angular [img]="Sparkles" size="14" class="text-amber-500" />
          </h2>
          <p class="text-xs text-slate-500 flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            {{ statusLabel() }}
          </p>
        </div>
        <ui-button variant="outline" size="sm" type="button" (click)="reset()" title="Reiniciar conversa">
          <lucide-angular [img]="RefreshCw" size="14" />
        </ui-button>
      </div>

      <!-- Messages -->
      <div #scrollArea class="flex-1 overflow-y-auto px-4 py-6 space-y-6 bg-slate-50/40">
        @for (msg of messages(); track msg.id) {
          <div class="flex gap-3" [class.flex-row-reverse]="msg.role === 'user'">
            <div [class]="avatarClass(msg.role)">
              <lucide-angular [img]="msg.role === 'agent' ? Bot : UserIcon" size="16" />
            </div>
            <div class="flex flex-col gap-2 max-w-[75%]" [class.items-end]="msg.role === 'user'">
              <div [class]="bubbleClass(msg.role)">
                <p class="text-sm whitespace-pre-wrap leading-relaxed">{{ msg.content }}</p>
                @if (msg.summary) {
                  <div class="mt-3 pt-3 border-t border-slate-200 space-y-1.5">
                    <div class="grid grid-cols-[80px_1fr] gap-1 text-xs">
                      <span class="text-slate-500 font-medium">Título:</span>
                      <span class="text-slate-900">{{ msg.summary.titulo }}</span>
                      <span class="text-slate-500 font-medium">Setor:</span>
                      <span class="text-slate-900">{{ msg.summary.setor }}</span>
                      <span class="text-slate-500 font-medium">Resp.:</span>
                      <span class="text-slate-900">{{ msg.summary.responsavel }}</span>
                      <span class="text-slate-500 font-medium">Prioridade:</span>
                      <span [class]="'inline-flex items-center w-fit px-2 py-0.5 rounded text-xs font-semibold border ' + prioridadeStyle(msg.summary.prioridade)">
                        {{ prioridadeLabel(msg.summary.prioridade) }}
                      </span>
                    </div>
                  </div>
                }
              </div>
              @if (msg.suggestions?.length && isLastAgent(msg)) {
                <div class="flex flex-wrap gap-1.5">
                  @for (s of msg.suggestions; track s) {
                    <button type="button"
                      class="text-xs px-2.5 py-1 rounded-full border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 transition-colors"
                      (click)="useSuggestion(s)">{{ s }}</button>
                  }
                </div>
              }
              <span class="text-[10px] text-slate-400 px-1">{{ formatTime(msg.timestamp) }}</span>
            </div>
          </div>
        }

        @if (typing()) {
          <div class="flex gap-3">
            <div [class]="avatarClass('agent')">
              <lucide-angular [img]="Bot" size="16" />
            </div>
            <div class="bg-white border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div class="flex gap-1">
                <span class="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style="animation-delay:0ms"></span>
                <span class="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style="animation-delay:150ms"></span>
                <span class="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style="animation-delay:300ms"></span>
              </div>
            </div>
          </div>
        }

        @if (step() === 'confirmacao' && !typing()) {
          <div class="flex justify-center gap-2 pt-2">
            <ui-button type="button" variant="outline" size="sm" (click)="sendUser('Editar')" [disabled]="saving()">Editar</ui-button>
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
      </div>

      <!-- Input -->
      <div class="border-t bg-white px-4 py-3">
        <form (ngSubmit)="onSubmit()" class="flex items-end gap-2">
          <div class="flex-1 relative">
            <textarea
              #inputEl
              [(ngModel)]="draftInput"
              name="message"
              rows="1"
              [disabled]="typing() || step() === 'criada'"
              [placeholder]="placeholder()"
              (keydown)="onKeydown($event)"
              (input)="autoGrow($event)"
              class="w-full resize-none rounded-2xl border border-slate-300 bg-white px-4 py-2.5 pr-12 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed max-h-40"
            ></textarea>
            <button type="submit"
              [disabled]="!draftInput.trim() || typing() || step() === 'criada'"
              class="absolute right-2 bottom-2 w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors shadow">
              <lucide-angular [img]="Send" size="14" />
            </button>
          </div>
        </form>
        <p class="text-[11px] text-slate-400 mt-1.5 px-1">
          O agente conduz a triagem em etapas. Pressione <kbd class="px-1 py-0.5 bg-slate-100 border rounded text-[10px]">Enter</kbd> para enviar, <kbd class="px-1 py-0.5 bg-slate-100 border rounded text-[10px]">Shift+Enter</kbd> para nova linha.
        </p>
      </div>
    </div>
  `,
})
export class TriagemChatComponent implements AfterViewChecked {
    @Output() created = new EventEmitter<Demanda>();
    @Output() cancel = new EventEmitter<void>();

    @ViewChild('scrollArea') scrollArea?: ElementRef<HTMLElement>;
    @ViewChild('inputEl') inputEl?: ElementRef<HTMLTextAreaElement>;

    readonly Bot = Bot; readonly UserIcon = UserIcon; readonly Send = Send;
    readonly Loader2 = Loader2; readonly CheckCircle2 = CheckCircle2;
    readonly RefreshCw = RefreshCw; readonly Sparkles = Sparkles;

    sessionId = input<string | null>(null);

    private demandasService = inject(DemandasService);
    private sessionService = inject(TriagemSessionService);

    messages = signal<ChatMessage[]>([]);
    step = signal<Step>('descricao');
    typing = signal(false);
    saving = signal(false);
    draft = signal<DraftDemanda>({});
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
            this.greet();
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
            case 'descricao': return 'Aguardando descrição da demanda';
            case 'setor': return 'Identificando setor';
            case 'responsavel': return 'Definindo responsável';
            case 'prioridade': return 'Avaliando prioridade';
            case 'confirmacao': return 'Aguardando confirmação';
            case 'criada': return 'Demanda criada';
        }
    }

    placeholder() {
        if (this.step() === 'criada') return 'Conversa encerrada. Reinicie para nova triagem.';
        if (this.typing()) return 'Agente está digitando...';
        return 'Descreva a demanda ou responda ao agente...';
    }

    avatarClass(role: 'agent' | 'user') {
        const base = 'shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white shadow-sm';
        return role === 'agent'
            ? `${base} bg-linear-to-br from-emerald-500 to-teal-600`
            : `${base} bg-linear-to-br from-slate-600 to-slate-800`;
    }

    bubbleClass(role: 'agent' | 'user') {
        const base = 'px-4 py-2.5 shadow-sm border';
        return role === 'agent'
            ? `${base} bg-white border-slate-200 rounded-2xl rounded-tl-sm`
            : `${base} bg-emerald-600 text-white border-emerald-600 rounded-2xl rounded-tr-sm`;
    }

    isLastAgent(msg: ChatMessage) {
        const list = this.messages();
        for (let i = list.length - 1; i >= 0; i--) {
            if (list[i].role === 'agent') return list[i].id === msg.id;
        }
        return false;
    }

    prioridadeLabel(p?: Prioridade) {
        return p ? PRIORIDADE_CONFIG[p].label : '—';
    }
    prioridadeStyle(p?: Prioridade) {
        if (!p) return 'bg-slate-100 text-slate-700 border-slate-300';
        const c = PRIORIDADE_CONFIG[p];
        return `${c.bg} ${c.color}`;
    }

    formatTime(d: Date) {
        return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    autoGrow(ev: Event) {
        const ta = ev.target as HTMLTextAreaElement;
        ta.style.height = 'auto';
        ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
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

    private greet() {
        this.agentSay(
            'Olá! Sou o agente de triagem de demandas industriais. Vou te ajudar a registrar uma nova demanda em poucos passos.\n\nPara começar, descreva o que precisa ser feito — pode ser uma frase simples ou um relato detalhado do problema.',
            { delay: 300 }
        );
    }

    reset() {
        const id = this.currentSessionId;
        if (id) {
            const current = this.sessionService.get(id);
            if (current) this.sessionService.upsert({ ...current, messages: [], step: 'descricao', draft: {}, titulo: 'Nova triagem', atualizadaEm: new Date().toISOString(), status: 'andamento' });
        }
        this.messages.set([]);
        this.step.set('descricao');
        this.draft.set({});
        this.draftInput = '';
        this.saving.set(false);
        this.greet();
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
            await this.agentSay('Preciso de um pouco mais de contexto para entender a demanda. Pode descrever com mais detalhes o problema ou a tarefa?');
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
            await this.agentSay('Não reconheci esse setor. Por favor escolha um dos disponíveis:', { suggestions: SETORES });
            return;
        }
        this.draft.update((d) => ({ ...d, setor: match }));
        await this.agentSay(`Perfeito, setor "${match}" registrado.`);
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
        await this.agentSay(`Ok, ${match} ficará responsável.`);
        await this.askNext();
    }

    private async handlePrioridade(text: string) {
        const p = this.detectPrioridade(text) ?? this.parsePrioridadeNumero(text);
        if (!p) {
            await this.agentSay('Não entendi a prioridade. Escolha uma:', {
                suggestions: ['Baixa', 'Normal', 'Alta', 'Urgente', 'Crítico'],
            });
            return;
        }
        this.draft.update((d) => ({ ...d, prioridade: p }));
        await this.agentSay(`Prioridade definida como ${PRIORIDADE_CONFIG[p].label}.`);
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
            await this.agentSay('Reescreva a descrição da demanda, por favor.');
            return;
        }
        if (['editar', 'mudar', 'alterar', 'não', 'nao'].some((w) => t.includes(w))) {
            await this.agentSay('O que deseja ajustar? Pode dizer "setor", "responsável", "prioridade" ou "descrição".');
            return;
        }
        await this.agentSay('Para confirmar, responda "sim" / "confirmar". Para alterar algo, diga qual campo (setor, responsável, prioridade ou descrição).');
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
        await this.agentSay('Concluí a triagem. Confira o resumo abaixo e confirme para criar a demanda:', {
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
            await this.agentSay(`Demanda #${nova.id.slice(0, 8)} criada com sucesso! Você será redirecionado para a lista.`);
            toast.success('Demanda criada!');
            this.created.emit(nova);
        } catch (e: any) {
            await this.agentSay(`Não consegui criar a demanda: ${e?.message ?? 'erro desconhecido'}. Tente novamente.`);
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
            Qualidade: ['qualidade', 'inspeção', 'inspecao', 'controle de qualidade', 'cq', 'defeito'],
            'Expedição': ['expedição', 'expedicao', 'envio', 'embarque', 'entrega', 'logística'],
        };
        for (const [setor, kws] of Object.entries(map)) {
            if (kws.some((kw) => t.includes(kw))) return setor;
        }
        return undefined;
    }

    private detectPrioridade(text: string): Prioridade | undefined {
        const t = text.toLowerCase();
        if (/\b(crítico|critico|emergência|emergencia|parada total|linha parada)\b/.test(t)) return 5;
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
