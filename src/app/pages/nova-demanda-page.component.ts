import { Component, ViewChild, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Plus, MessageSquare, CheckCircle2, Trash2, PanelLeft, Sparkles, PanelRight, Pencil, Check, AlertTriangle, Loader2 } from 'lucide-angular';
import { isToday, isYesterday } from 'date-fns';
import { TriagemChatComponent } from '../components/demandas/triagem-chat.component';
import { TriagemSessionService, ChatSession, DraftDemanda } from '../services/triagem-session.service';
import { SetoresService } from '../services/setores.service';
import { PRIORIDADE_CONFIG } from '../components/demandas/demand-card.component';
import { Prioridade } from '../types';
import { UiDialog, UiDialogHeader, UiDialogTitle, UiDialogDescription, UiDialogFooter } from '../components/ui/dialog.component';
import { UiButton } from '../components/ui/button.component';

interface SessionGroup {
  label: string;
  sessions: ChatSession[];
}

@Component({
  selector: 'app-nova-demanda',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TriagemChatComponent, UiDialog, UiDialogHeader, UiDialogTitle, UiDialogDescription, UiDialogFooter, UiButton],
  template: `
    <div class="-m-6 flex bg-slate-950" style="height: calc(100vh - 56px)">

      <!-- ── Left sidebar (session history) ──────────────────────────────── -->
      <div [class]="'flex flex-col shrink-0 bg-slate-950 transition-all duration-200 overflow-hidden ' + (sidebarOpen() ? 'w-64' : 'w-0')">
        <div class="px-4 pt-5 pb-3 flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center">
            <lucide-angular [img]="Sparkles" size="14" class="text-white" />
          </div>
          <span class="text-sm font-semibold text-white">Triagem IA</span>
        </div>
        <div class="px-3 pb-3">
          <button type="button" (click)="newSession()"
            class="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
            <lucide-angular [img]="Plus" size="15" /> Nova triagem
          </button>
        </div>
        <div class="flex-1 overflow-y-auto px-2 pb-4">
          @if (sessionService.loading()) {
            @for (_ of [1,2,3,4,5]; track $index) {
              <div class="h-8 mb-1 rounded-lg bg-white/10 animate-pulse"></div>
            }
          } @else {
            @for (group of sessionGroups(); track group.label) {
              <div class="mb-4">
                <p class="text-[10px] font-semibold text-white/30 uppercase tracking-wider px-2 mb-1">{{ group.label }}</p>
                @for (session of group.sessions; track session.id) {
                  <div [class]="'group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer mb-0.5 transition-colors ' + sessionItemClass(session.id)"
                    (click)="selectSession(session.id)">
                    <lucide-angular [img]="session.status === 'criada' ? CheckCircle2 : MessageSquare" size="14" class="shrink-0 opacity-60" />
                    <span class="flex-1 text-xs truncate">{{ session.titulo }}</span>
                    <button type="button" (click)="askDeleteSession($event, session)"
                      class="shrink-0 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-red-400 transition-all">
                      <lucide-angular [img]="Trash2" size="13" />
                    </button>
                  </div>
                }
              </div>
            }
            @if (!sessionService.sessions().length) {
              <p class="text-xs text-white/30 text-center px-4 py-6">Nenhuma triagem iniciada.</p>
            }
          }
        </div>
      </div>

      <!-- ── Main area (chat) ─────────────────────────────────────────────── -->
      <div class="flex-1 min-w-0 flex flex-col bg-white overflow-hidden">
        <!-- Topbar -->
        <div class="flex items-center gap-3 px-4 h-14 border-b bg-white shrink-0">
          <button type="button" (click)="sidebarOpen.set(!sidebarOpen())"
            class="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
            <lucide-angular [img]="PanelLeft" size="18" />
          </button>
          @if (activeSession(); as session) {
            <div class="flex-1 min-w-0 flex items-center gap-2">
              <span class="text-sm font-medium text-slate-800 truncate">{{ session.titulo }}</span>
              @if (session.status === 'criada') {
                <span class="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <lucide-angular [img]="CheckCircle2" size="11" /> Criada
                </span>
              } @else {
                <span class="shrink-0 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  Em andamento
                </span>
              }
            </div>
          } @else {
            <span class="flex-1 text-sm text-slate-400">Nova triagem</span>
          }
          <!-- Toggle preview panel -->
          <button type="button" (click)="previewOpen.set(!previewOpen())"
            [class]="'p-1.5 rounded-lg transition-colors ' + (previewOpen() ? 'text-emerald-600 bg-emerald-50' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100')"
            title="Painel de prévia">
            <lucide-angular [img]="PanelRight" size="18" />
          </button>
        </div>
        <!-- Chat -->
        <div class="flex-1 min-h-0">
          <triagem-chat #chat [sessionId]="activeId()" (created)="onCreated()" />
        </div>
      </div>

      <!-- ── Right panel (live preview) ──────────────────────────────────── -->
      <div [class]="'flex flex-col shrink-0 bg-slate-50 border-l border-slate-200 transition-all duration-200 overflow-hidden ' + (previewOpen() ? 'w-80' : 'w-0')">
        <div class="flex-1 overflow-y-auto">
          <div class="p-4 space-y-4">

            <!-- Header -->
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center">
                <lucide-angular [img]="Sparkles" size="13" class="text-emerald-600" />
              </div>
              <p class="text-xs font-semibold text-slate-700 uppercase tracking-wide">Prévia da Demanda</p>
            </div>

            <!-- Progress steps -->
            @if (hasDraft()) {
              <div class="flex items-center gap-1">
                @for (step of STEPS; track step.key) {
                  <div class="flex-1 flex flex-col items-center gap-1">
                    <div [class]="'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ' + stepClass(step.key)">
                      @if (isStepDone(step.key)) {
                        <lucide-angular [img]="Check" size="10" />
                      } @else {
                        {{ step.num }}
                      }
                    </div>
                    <span class="text-[9px] text-slate-400 text-center leading-tight">{{ step.label }}</span>
                  </div>
                  @if (!$last) {
                    <div class="w-3 h-px bg-slate-300 mb-4 shrink-0"></div>
                  }
                }
              </div>
            }

            <!-- Empty state -->
            @if (!hasDraft()) {
              <div class="flex flex-col items-center justify-center text-center py-12 gap-3">
                <div class="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                  <lucide-angular [img]="Sparkles" size="18" class="text-slate-400" />
                </div>
                <p class="text-xs text-slate-400 leading-relaxed max-w-[180px]">
                  A prévia aparecerá conforme a triagem avança.
                </p>
              </div>
            }

            <!-- Fields card -->
            @if (hasDraft()) {
              <div class="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 shadow-sm overflow-hidden">

                <!-- Título -->
                <div class="px-3 py-3">
                  <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Título</p>
                  @if (editingField() === 'titulo') {
                    <div class="flex gap-1">
                      <input type="text" [(ngModel)]="editValue" (keydown.enter)="saveField('titulo')" (keydown.escape)="cancelEdit()"
                        class="flex-1 text-xs border border-emerald-400 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-400 bg-white" autofocus />
                      <button type="button" (click)="saveField('titulo')" class="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors">
                        <lucide-angular [img]="Check" size="13" />
                      </button>
                    </div>
                  } @else {
                    <div class="flex items-start justify-between gap-1 group/field">
                      <p class="text-sm font-semibold text-slate-900 leading-snug flex-1">
                        {{ draft().titulo || '—' }}
                      </p>
                      <button type="button" (click)="startEdit('titulo', draft().titulo || '')"
                        class="shrink-0 p-0.5 opacity-0 group-hover/field:opacity-100 text-slate-400 hover:text-slate-700 transition-all rounded">
                        <lucide-angular [img]="Pencil" size="12" />
                      </button>
                    </div>
                  }
                </div>

                <!-- Descrição -->
                <div class="px-3 py-3">
                  <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Descrição</p>
                  @if (editingField() === 'descricao') {
                    <div class="space-y-1">
                      <textarea [(ngModel)]="editValue" rows="3" (keydown.escape)="cancelEdit()"
                        class="w-full text-xs border border-emerald-400 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-400 bg-white resize-none"></textarea>
                      <div class="flex justify-end gap-1">
                        <button type="button" (click)="cancelEdit()" class="text-[11px] text-slate-400 hover:text-slate-600 px-2 py-0.5 rounded transition-colors">Cancelar</button>
                        <button type="button" (click)="saveField('descricao')" class="text-[11px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded transition-colors">Salvar</button>
                      </div>
                    </div>
                  } @else {
                    <div class="flex items-start justify-between gap-1 group/field">
                      <p class="text-xs text-slate-600 leading-relaxed line-clamp-4 flex-1">
                        {{ draft().descricao || '—' }}
                      </p>
                      <button type="button" (click)="startEdit('descricao', draft().descricao || '')"
                        class="shrink-0 p-0.5 opacity-0 group-hover/field:opacity-100 text-slate-400 hover:text-slate-700 transition-all rounded">
                        <lucide-angular [img]="Pencil" size="12" />
                      </button>
                    </div>
                  }
                </div>

                <!-- Setor -->
                <div class="px-3 py-3">
                  <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Setor</p>
                  @if (editingField() === 'setor') {
                    <div class="flex gap-1">
                      <select [(ngModel)]="editValue"
                        class="flex-1 text-xs border border-emerald-400 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-400 bg-white">
                        <option value="">Selecione…</option>
                        @for (s of setores(); track s) {
                          <option [value]="s">{{ s }}</option>
                        }
                      </select>
                      <button type="button" (click)="saveField('setor')" class="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors">
                        <lucide-angular [img]="Check" size="13" />
                      </button>
                    </div>
                  } @else {
                    <div class="flex items-center justify-between group/field">
                      <p [class]="'text-sm flex-1 ' + (draft().setor ? 'text-slate-900 font-medium' : 'text-slate-400 italic')">
                        {{ draft().setor || 'Aguardando…' }}
                      </p>
                      <button type="button" (click)="startEdit('setor', draft().setor || '')"
                        class="p-0.5 opacity-0 group-hover/field:opacity-100 text-slate-400 hover:text-slate-700 transition-all rounded">
                        <lucide-angular [img]="Pencil" size="12" />
                      </button>
                    </div>
                  }
                </div>

                <!-- Responsável -->
                <div class="px-3 py-3">
                  <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Responsável</p>
                  @if (editingField() === 'responsavel') {
                    <div class="flex gap-1">
                      <select [(ngModel)]="editValue"
                        class="flex-1 text-xs border border-emerald-400 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-400 bg-white">
                        <option value="">Selecione…</option>
                        @for (r of responsaveis(); track r) {
                          <option [value]="r">{{ r }}</option>
                        }
                      </select>
                      <button type="button" (click)="saveField('responsavel')" class="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors">
                        <lucide-angular [img]="Check" size="13" />
                      </button>
                    </div>
                  } @else {
                    <div class="flex items-center justify-between group/field">
                      <p [class]="'text-sm flex-1 ' + (draft().responsavel ? 'text-slate-900 font-medium' : 'text-slate-400 italic')">
                        {{ draft().responsavel || 'Aguardando…' }}
                      </p>
                      <button type="button" (click)="startEdit('responsavel', draft().responsavel || '')"
                        class="p-0.5 opacity-0 group-hover/field:opacity-100 text-slate-400 hover:text-slate-700 transition-all rounded">
                        <lucide-angular [img]="Pencil" size="12" />
                      </button>
                    </div>
                  }
                </div>

                <!-- Prioridade -->
                <div class="px-3 py-3">
                  <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Prioridade</p>
                  @if (editingField() === 'prioridade') {
                    <div class="space-y-1.5">
                      <div class="grid grid-cols-5 gap-1">
                        @for (p of prioridades; track p.value) {
                          <button type="button" (click)="saveFieldPrio(p.value)"
                            [class]="'text-[10px] font-semibold py-1 rounded border text-center transition-colors ' + (p.value === selectedPrio ? p.cfg.bg + ' ' + p.cfg.color : 'border-slate-200 text-slate-500 hover:bg-slate-50')"
                            (mouseenter)="selectedPrio = p.value">
                            {{ p.cfg.label }}
                          </button>
                        }
                      </div>
                      <button type="button" (click)="cancelEdit()" class="text-[11px] text-slate-400 hover:text-slate-600 transition-colors">Cancelar</button>
                    </div>
                  } @else {
                    <div class="flex items-center justify-between group/field">
                      @if (draft().prioridade) {
                        <span [class]="'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ' + prioStyle(draft().prioridade)">
                          {{ prioLabel(draft().prioridade) }}
                        </span>
                      } @else {
                        <span class="text-sm text-slate-400 italic">Aguardando…</span>
                      }
                      <button type="button" (click)="startEditPrio(draft().prioridade)"
                        class="p-0.5 opacity-0 group-hover/field:opacity-100 text-slate-400 hover:text-slate-700 transition-all rounded">
                        <lucide-angular [img]="Pencil" size="12" />
                      </button>
                    </div>
                  }
                </div>

              </div>
            }
          </div>
        </div>
      </div>

    </div>

    <ui-dialog [open]="deleteDialogOpen()" (openChange)="onDeleteDialogChange($event)" contentClass="max-w-md">
      <ui-dialog-header>
        <div class="flex items-start gap-3">
          <div class="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
            <lucide-angular [img]="AlertTriangle" size="18" class="text-red-600" />
          </div>
          <div>
            <ui-dialog-title>Apagar bate-papo</ui-dialog-title>
            <ui-dialog-description class="mt-1">
              Tem certeza que deseja apagar "{{ deleteTargetTitle() }}"? Esta ação não pode ser desfeita.
            </ui-dialog-description>
          </div>
        </div>
      </ui-dialog-header>
      <ui-dialog-footer class="mt-4">
        <ui-button type="button" variant="outline" [disabled]="deletingSession()" (click)="cancelDeleteSession()">
          Cancelar
        </ui-button>
        <ui-button type="button" variant="destructive" [disabled]="deletingSession()" (click)="confirmDeleteSession()">
          @if (deletingSession()) {
            <lucide-angular [img]="Loader2" size="14" class="animate-spin" />
          }
          Apagar
        </ui-button>
      </ui-dialog-footer>
    </ui-dialog>

    <!-- Cancel-generation confirm dialog -->
    <ui-dialog [open]="cancelConfirmOpen()" (openChange)="onCancelConfirmChange($event)" contentClass="max-w-md">
      <ui-dialog-header>
        <div class="flex items-start gap-3">
          <div class="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
            <lucide-angular [img]="AlertTriangle" size="18" class="text-amber-600" />
          </div>
          <div>
            <ui-dialog-title>IA em processamento</ui-dialog-title>
            <ui-dialog-description class="mt-1">
              O agente ainda está gerando uma resposta. Trocar de sessão irá cancelar o processamento e remover a mensagem em andamento.
            </ui-dialog-description>
          </div>
        </div>
      </ui-dialog-header>
      <ui-dialog-footer class="mt-4">
        <ui-button type="button" variant="outline" (click)="dismissCancelConfirm()">
          Aguardar IA
        </ui-button>
        <ui-button type="button" variant="destructive" (click)="confirmCancelAndSwitch()">
          Cancelar e trocar
        </ui-button>
      </ui-dialog-footer>
    </ui-dialog>
  `,
})
export class NovaDemandaPageComponent {
  @ViewChild('chat') chatRef?: TriagemChatComponent;

  router = inject(Router);
  sessionService = inject(TriagemSessionService);
  private setoresService = inject(SetoresService);

  readonly Plus = Plus; readonly MessageSquare = MessageSquare;
  readonly CheckCircle2 = CheckCircle2; readonly Trash2 = Trash2;
  readonly PanelLeft = PanelLeft; readonly PanelRight = PanelRight;
  readonly Sparkles = Sparkles; readonly Pencil = Pencil; readonly Check = Check;
  readonly AlertTriangle = AlertTriangle; readonly Loader2 = Loader2;

  sidebarOpen = signal(true);
  previewOpen = signal(true);
  activeId = signal<string | null>(null);
  editingField = signal<string | null>(null);
  deleteDialogOpen = signal(false);
  deleteTargetId = signal<string | null>(null);
  deleteTargetTitle = signal('');
  deletingSession = signal(false);
  cancelConfirmOpen = signal(false);
  private _pendingSwitchFn: (() => Promise<void>) | null = null;
  editValue = '';
  selectedPrio: Prioridade | null = null;

  readonly STEPS = [
    { key: 'titulo', num: '1', label: 'Título' },
    { key: 'setor', num: '2', label: 'Setor' },
    { key: 'responsavel', num: '3', label: 'Resp.' },
    { key: 'prioridade', num: '4', label: 'Prio.' },
    { key: 'confirmacao', num: '5', label: 'Confirmar' },
  ];

  readonly prioridades = ([1, 2, 3, 4, 5] as Prioridade[]).map(v => ({
    value: v,
    cfg: PRIORIDADE_CONFIG[v],
  }));

  activeSession = computed(() =>
    this.sessionService.sessions().find(s => s.id === this.activeId()) ?? null
  );

  draft = computed<DraftDemanda>(() => this.activeSession()?.draft ?? {});

  hasDraft = computed(() => {
    const d = this.draft();
    return !!(d.titulo || d.descricao || d.setor || d.responsavel || d.prioridade);
  });

  setores = computed(() =>
    this.setoresService.setores().filter(s => s.ativo).map(s => s.nome)
  );

  responsaveis = computed(() => {
    const selectedSetor = (this.draft().setor || '').toLowerCase();
    const setores = this.setoresService.setores().filter(s => s.ativo);
    const base = selectedSetor
      ? setores.filter(s => s.nome.toLowerCase() === selectedSetor)
      : setores;
    const nomes = base.map(s => s.responsavel).filter(Boolean);
    const fallback = setores.map(s => s.responsavel).filter(Boolean);
    return [...new Set(nomes.length ? nomes : fallback)];
  });

  sessionGroups = computed<SessionGroup[]>(() => {
    const sessions = this.sessionService.sessions();
    const today: ChatSession[] = [];
    const yesterday: ChatSession[] = [];
    const older: ChatSession[] = [];
    for (const s of sessions) {
      const d = new Date(s.atualizadaEm);
      if (isToday(d)) today.push(s);
      else if (isYesterday(d)) yesterday.push(s);
      else older.push(s);
    }
    const groups: SessionGroup[] = [];
    if (today.length) groups.push({ label: 'Hoje', sessions: today });
    if (yesterday.length) groups.push({ label: 'Ontem', sessions: yesterday });
    if (older.length) groups.push({ label: 'Anteriores', sessions: older });
    return groups;
  });

  constructor() {
    if (this.setoresService.setores().length === 0) this.setoresService.listar();
    void this._init();
  }

  private async _init() {
    try {
      await this.sessionService.loadAll();
    } catch {
      // segue para criar nova mesmo em falha
    }
    const sessions = this.sessionService.sessions();
    if (sessions.length > 0) {
      this.activeId.set(sessions[0].id);
    } else {
      try {
        const s = await this.sessionService.createNew();
        this.activeId.set(s.id);
      } catch {
        // sem sessão ativa — chat ficará vazio
      }
    }
  }

  sessionItemClass(id: string) {
    return this.activeId() === id
      ? 'bg-white/15 text-white'
      : 'hover:bg-white/10 text-white/70';
  }

  isStepDone(key: string): boolean {
    const d = this.draft();
    switch (key) {
      case 'titulo': return !!d.titulo;
      case 'setor': return !!d.setor;
      case 'responsavel': return !!d.responsavel;
      case 'prioridade': return !!d.prioridade;
      case 'confirmacao': return this.activeSession()?.status === 'criada';
      default: return false;
    }
  }

  stepClass(key: string): string {
    return this.isStepDone(key)
      ? 'bg-emerald-500 text-white'
      : 'bg-slate-200 text-slate-500';
  }

  startEdit(field: string, current: string) {
    this.editingField.set(field);
    this.editValue = current;
  }

  startEditPrio(current?: Prioridade) {
    this.editingField.set('prioridade');
    this.selectedPrio = current ?? null;
  }

  cancelEdit() {
    this.editingField.set(null);
    this.editValue = '';
    this.selectedPrio = null;
  }

  saveField(field: string) {
    const value = this.editValue;
    const session = this.activeSession();
    if (!session) return;
    this.sessionService.patchLocalDraft(session.id, { [field]: value || undefined } as DraftDemanda);
    this.cancelEdit();
  }

  saveFieldPrio(v: Prioridade) {
    const session = this.activeSession();
    if (!session) return;
    this.sessionService.patchLocalDraft(session.id, { prioridade: v });
    this.cancelEdit();
  }

  prioLabel(p?: Prioridade): string {
    if (!p) return '—';
    return PRIORIDADE_CONFIG[p]?.label ?? '—';
  }

  prioStyle(p?: Prioridade): string {
    if (!p) return 'border-slate-200 text-slate-500';
    const c = PRIORIDADE_CONFIG[p];
    return c ? `${c.bg} ${c.color}` : 'border-slate-200 text-slate-500';
  }

  async newSession() {
    if (this.chatRef?.typing() || this.chatRef?.autoDrafting()) {
      this._pendingSwitchFn = async () => {
        try {
          const s = await this.sessionService.createNew();
          this.activeId.set(s.id);
        } catch { /* silently ignored */ }
      };
      this.cancelConfirmOpen.set(true);
      return;
    }
    try {
      const s = await this.sessionService.createNew();
      this.activeId.set(s.id);
    } catch (e: any) {
      // toast já é emitido em outros pontos; aqui silenciamos
    }
  }

  selectSession(id: string) {
    if (id === this.activeId()) return;
    this.cancelEdit();
    if (this.chatRef?.typing() || this.chatRef?.autoDrafting()) {
      this._pendingSwitchFn = async () => this.activeId.set(id);
      this.cancelConfirmOpen.set(true);
      return;
    }
    this.activeId.set(id);
  }

  onCancelConfirmChange(open: boolean) {
    if (!open) this.dismissCancelConfirm();
  }

  dismissCancelConfirm() {
    this._pendingSwitchFn = null;
    this.cancelConfirmOpen.set(false);
  }

  async confirmCancelAndSwitch() {
    const fn = this._pendingSwitchFn;
    this._pendingSwitchFn = null;
    this.cancelConfirmOpen.set(false);
    // Cancel the in-flight request and rollback server state.
    await this.chatRef?.cancelAndRollback();
    // Perform the queued navigation.
    if (fn) await fn();
  }

  askDeleteSession(event: MouseEvent, session: ChatSession) {
    event.stopPropagation();
    this.deleteTargetId.set(session.id);
    this.deleteTargetTitle.set(session.titulo || 'Nova triagem');
    this.deleteDialogOpen.set(true);
  }

  onDeleteDialogChange(open: boolean) {
    this.deleteDialogOpen.set(open);
    if (!open && !this.deletingSession()) this.clearDeleteTarget();
  }

  cancelDeleteSession() {
    if (this.deletingSession()) return;
    this.deleteDialogOpen.set(false);
    this.clearDeleteTarget();
  }

  async confirmDeleteSession() {
    const id = this.deleteTargetId();
    if (!id || this.deletingSession()) return;
    this.deletingSession.set(true);
    try {
      await this.sessionService.remove(id);
    } catch {
      return;
    } finally {
      this.deletingSession.set(false);
      this.deleteDialogOpen.set(false);
      this.clearDeleteTarget();
    }
    if (this.activeId() === id) {
      const remaining = this.sessionService.sessions();
      if (remaining.length > 0) {
        this.activeId.set(remaining[0].id);
      } else {
        try {
          const s = await this.sessionService.createNew();
          this.activeId.set(s.id);
        } catch { /* ignora */ }
      }
    }
  }

  private clearDeleteTarget() {
    this.deleteTargetId.set(null);
    this.deleteTargetTitle.set('');
  }

  onCreated() {
    setTimeout(() => this.router.navigate(['/demandas']), 2000);
  }
}
