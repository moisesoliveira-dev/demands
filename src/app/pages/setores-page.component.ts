import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule, Building2, PlusCircle, Pencil, Trash2,
  Search, X, ShieldAlert, ToggleLeft, ToggleRight,
} from 'lucide-angular';
import { UiCard, UiCardContent, UiCardHeader } from '../components/ui/card.component';
import { UiButton } from '../components/ui/button.component';
import {
  UiDialog, UiDialogHeader, UiDialogTitle,
  UiDialogDescription, UiDialogFooter,
} from '../components/ui/dialog.component';
import { UiLabel } from '../components/ui/form-elements.component';
import { toast } from '../lib/toast';
import { MotionInViewDirective } from '../lib/motion.directives';
import { SetoresService, Setor } from '../services/setores.service';
import { UsersService } from '../services/users.service';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SetorForm { nome: string; descricao: string; responsavel: string; ativo: boolean; }
type SetorErrors = Partial<Record<'nome' | 'responsavel', string>>;

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 9;
const INPUT_CLS = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50';

const emptyForm = (): SetorForm => ({ nome: '', descricao: '', responsavel: '', ativo: true });

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-setores',
  standalone: true,
  imports: [
    CommonModule, FormsModule, LucideAngularModule,
    UiCard, UiCardContent, UiCardHeader,
    UiButton,
    UiDialog, UiDialogHeader, UiDialogTitle, UiDialogDescription, UiDialogFooter,
    UiLabel,
    MotionInViewDirective,
  ],
  template: `
<div class="space-y-5">

  <!-- ── Header ── -->
  <div class="flex flex-wrap items-center gap-3 justify-between">
    <div class="flex flex-wrap items-center gap-2 flex-1 min-w-0">

      <!-- Search -->
      <div class="relative w-full sm:w-72">
        <lucide-angular [img]="Search" size="15"
          class="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input type="text" [value]="searchQ()" (input)="searchQ.set($any($event.target).value); page.set(1)"
          placeholder="Buscar por nome, descrição ou responsável…"
          class="h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-8 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        @if (searchQ().length) {
          <button type="button" (click)="searchQ.set(''); page.set(1)"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
            <lucide-angular [img]="X" size="13" />
          </button>
        }
      </div>

      <!-- Status filter -->
      <select [value]="filterStatus()" (change)="filterStatus.set($any($event.target).value); page.set(1)"
        class="h-9 rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer">
        <option value="">Qualquer status</option>
        <option value="ativo">Ativos</option>
        <option value="inativo">Inativos</option>
      </select>
    </div>

    <ui-button (click)="openCreate()">
      <lucide-angular [img]="PlusCircle" size="16" /> Novo Setor
    </ui-button>
  </div>

  <!-- ── Stats ── -->
  <div class="flex items-center gap-4 text-sm">
    <span class="text-muted-foreground">
      <strong class="text-foreground">{{ filteredTotal() }}</strong> setor(es) encontrado(s)
    </span>
    <span class="text-green-600 font-medium">{{ activeCount() }} ativo(s)</span>
    <span class="text-muted-foreground">{{ inactiveCount() }} inativo(s)</span>
  </div>

  <!-- ── Empty state ── -->
  @if (loading()) {
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      @for (_ of [1,2,3,4,5,6]; track $index) {
        <div class="rounded-lg border border-border bg-card p-5 space-y-3">
          <div class="flex items-start gap-3">
            <div class="w-9 h-9 rounded-lg bg-muted animate-pulse shrink-0"></div>
            <div class="flex-1 space-y-2">
              <div class="h-4 bg-muted animate-pulse rounded w-2/3"></div>
              <div class="h-3 bg-muted animate-pulse rounded w-1/3"></div>
            </div>
          </div>
          <div class="space-y-2">
            <div class="h-3 bg-muted animate-pulse rounded"></div>
            <div class="h-3 bg-muted animate-pulse rounded w-2/3"></div>
          </div>
          <div class="h-3 bg-muted animate-pulse rounded w-1/4"></div>
        </div>
      }
    </div>
  } @else if (filteredTotal() === 0) {
    <div class="flex flex-col items-center justify-center py-20 text-muted-foreground">
      <lucide-angular [img]="Building2" size="48" class="mb-3 opacity-30" />
      <p class="text-sm font-medium">Nenhum setor encontrado</p>
      @if (searchQ().length || filterStatus()) {
        <button type="button" (click)="clearFilters()"
          class="mt-3 text-xs text-primary underline-offset-2 hover:underline">
          Limpar filtros
        </button>
      }
    </div>
  } @else {

    <!-- ── Card grid ── -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      @for (s of pagedSetores(); track s.id) {
        <div motionInView [class.opacity-60]="!s.ativo" class="transition-opacity">
          <ui-card class="h-full">
            <ui-card-header class="pb-3">
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                  <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 border border-amber-100">
                    <lucide-angular [img]="Building2" size="18" class="text-amber-600" />
                  </div>
                  <div class="min-w-0">
                    <p class="font-semibold text-foreground leading-tight truncate">{{ s.nome }}</p>
                    <p class="text-xs text-muted-foreground mt-0.5">
                      Criado em {{ s.criadoEm | date:'dd/MM/yyyy' }}
                    </p>
                  </div>
                </div>
                <span [class]="s.ativo
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-muted/40 text-muted-foreground border-border'"
                  class="shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold">
                  {{ s.ativo ? 'Ativo' : 'Inativo' }}
                </span>
              </div>
            </ui-card-header>

            <ui-card-content class="pt-0 pb-3 space-y-3">
              @if (s.descricao) {
                <p class="text-sm text-muted-foreground line-clamp-2">{{ s.descricao }}</p>
              }
              <div class="text-xs">
                <p class="text-muted-foreground uppercase tracking-wide text-[10px] font-semibold mb-0.5">Responsável</p>
                <p class="text-foreground">{{ s.responsavel || '—' }}</p>
              </div>

              <div class="flex items-center justify-end gap-0.5 pt-1 border-t border-border">
                <ui-button variant="ghost" size="sm" (click)="openEdit(s)" title="Editar setor">
                  <lucide-angular [img]="Pencil" size="14" />
                </ui-button>
                <ui-button variant="ghost" size="sm" (click)="askToggleAtivo(s)"
                  [title]="s.ativo ? 'Desativar setor' : 'Reativar setor'"
                  [class]="s.ativo ? 'text-amber-600 hover:text-amber-700' : 'text-green-600 hover:text-green-700'">
                  <lucide-angular [img]="s.ativo ? ToggleRight : ToggleLeft" size="16" />
                </ui-button>
                <ui-button variant="ghost" size="sm" (click)="askDelete(s)"
                  title="Excluir setor" class="text-red-500 hover:text-red-700">
                  <lucide-angular [img]="Trash2" size="14" />
                </ui-button>
              </div>
            </ui-card-content>
          </ui-card>
        </div>
      }
    </div>

    <!-- ── Pagination ── -->
    @if (totalPages() > 1) {
      <div class="flex items-center justify-between border-t border-border pt-4">
        <p class="text-sm text-muted-foreground">
          Exibindo <strong>{{ pageStart() }}–{{ pageEnd() }}</strong> de {{ filteredTotal() }}
        </p>
        <div class="flex items-center gap-2">
          <ui-button variant="outline" size="sm"
            [disabled]="page() === 1" (click)="page.set(page() - 1)">
            ‹ Anterior
          </ui-button>
          <span class="min-w-22 text-center text-sm font-medium text-foreground">
            Página {{ page() }} de {{ totalPages() }}
          </span>
          <ui-button variant="outline" size="sm"
            [disabled]="page() >= totalPages()" (click)="page.set(page() + 1)">
            Próximo ›
          </ui-button>
        </div>
      </div>
    }
  }

  <!-- ── Form Dialog ── -->
  <ui-dialog [open]="formDialogOpen()" (openChange)="formDialogOpen.set($event)" contentClass="max-w-md">
    <ui-dialog-header>
      <ui-dialog-title>{{ editTarget() ? 'Editar Setor' : 'Novo Setor' }}</ui-dialog-title>
      <ui-dialog-description>
        {{ editTarget() ? 'Altere os dados do setor.' : 'Preencha os dados para criar um novo setor.' }}
      </ui-dialog-description>
    </ui-dialog-header>

    <form (ngSubmit)="submitForm()" class="mt-4 space-y-4">

      <!-- Nome -->
      <div class="space-y-1.5">
        <ui-label for="s-nome">Nome do setor *</ui-label>
        <input id="s-nome" name="nome" type="text" [(ngModel)]="form.nome"
          placeholder="Ex: Usinagem" [class]="INPUT_CLS" />
        @if (formErrors.nome) {
          <p class="text-xs text-red-600">{{ formErrors.nome }}</p>
        }
      </div>

      <!-- Descricao -->
      <div class="space-y-1.5">
        <ui-label for="s-desc">Descrição</ui-label>
        <textarea id="s-desc" name="descricao" rows="2" [(ngModel)]="form.descricao"
          placeholder="Breve descrição das atividades do setor"
          class="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 resize-none"></textarea>
      </div>

      <!-- Responsavel -->
      <div class="space-y-1.5">
        <ui-label for="s-resp">Responsável *</ui-label>
        @if (loadingUsers()) {
          <p class="text-xs text-muted-foreground">Carregando usuários…</p>
        } @else if (activeUsers().length === 0) {
          <p class="text-xs text-amber-600">Nenhum usuário ativo encontrado. Cadastre um usuário antes de criar um setor.</p>
        } @else {
          <select id="s-resp" name="responsavel" [(ngModel)]="form.responsavel"
            [class]="INPUT_CLS + ' cursor-pointer'">
            <option value="" disabled>Selecione um responsável…</option>
            @for (u of activeUsers(); track u.id) {
              <option [value]="u.nome">{{ u.nome }}</option>
            }
          </select>
        }
        @if (formErrors.responsavel) {
          <p class="text-xs text-red-600">{{ formErrors.responsavel }}</p>
        }
      </div>

      <!-- Ativo (edit only) -->
      @if (editTarget()) {
        <div class="flex items-center gap-2">
          <input id="s-ativo" name="ativo" type="checkbox" [(ngModel)]="form.ativo"
            class="h-4 w-4 rounded border-input accent-primary cursor-pointer" />
          <label for="s-ativo" class="text-sm font-medium text-foreground cursor-pointer select-none">
            Setor ativo
          </label>
        </div>
      }

      <ui-dialog-footer class="pt-2">
        <ui-button type="button" variant="outline" [disabled]="saving()" (click)="formDialogOpen.set(false)">
          Cancelar
        </ui-button>
        <ui-button type="submit" [disabled]="saving()">
          {{ saving() ? 'Salvando…' : (editTarget() ? 'Salvar alterações' : 'Criar setor') }}
        </ui-button>
      </ui-dialog-footer>
    </form>
  </ui-dialog>

  <!-- ── Confirm Dialog ── -->
  <ui-dialog [open]="confirmOpen()" (openChange)="onConfirmClose($event)" contentClass="max-w-md">
    <ui-dialog-header>
      <div class="flex items-start gap-3">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          [class]="confirmDanger() ? 'bg-red-100' : 'bg-amber-100'">
          <lucide-angular [img]="ShieldAlert" size="20"
            [class]="confirmDanger() ? 'text-red-600' : 'text-amber-600'" />
        </div>
        <div>
          <ui-dialog-title>{{ confirmTitle() }}</ui-dialog-title>
          <ui-dialog-description class="mt-1">{{ confirmMessage() }}</ui-dialog-description>
        </div>
      </div>
    </ui-dialog-header>
    <ui-dialog-footer class="mt-4">
      <ui-button type="button" variant="outline" [disabled]="saving()" (click)="cancelConfirm()">
        Cancelar
      </ui-button>
      <ui-button type="button"
        [variant]="confirmDanger() ? 'destructive' : 'default'"
        [disabled]="saving()"
        (click)="confirmAction()">
        {{ saving() ? 'Aguarde…' : 'Confirmar' }}
      </ui-button>
    </ui-dialog-footer>
  </ui-dialog>

</div>
  `,
})
export class SetoresPageComponent implements OnInit {

  // Icons
  readonly Building2 = Building2; readonly PlusCircle = PlusCircle;
  readonly Pencil = Pencil; readonly Trash2 = Trash2;
  readonly Search = Search; readonly X = X;
  readonly ShieldAlert = ShieldAlert;
  readonly ToggleLeft = ToggleLeft; readonly ToggleRight = ToggleRight;

  // Constants exposed to template
  readonly INPUT_CLS = INPUT_CLS;

  private readonly svc = inject(SetoresService);
  private readonly usersSvc = inject(UsersService);

  // ── State ─────────────────────────────────────────────────────────────────────────────
  loading = signal(true);
  loadingUsers = signal(true);
  activeUsers = computed(() => this.usersSvc.users().filter(u => u.ativo));
  searchQ = signal('');
  filterStatus = signal('');
  page = signal(1);

  // ── Derived ───────────────────────────────────────────────────────────────
  filteredSetores = computed(() => {
    const q = this.searchQ().toLowerCase().trim();
    const status = this.filterStatus();
    return this.svc.setores().filter(s => {
      if (q && !s.nome.toLowerCase().includes(q)
        && !s.descricao.toLowerCase().includes(q)
        && !s.responsavel.toLowerCase().includes(q)) return false;
      if (status === 'ativo' && !s.ativo) return false;
      if (status === 'inativo' && s.ativo) return false;
      return true;
    });
  });

  filteredTotal = computed(() => this.filteredSetores().length);
  activeCount = computed(() => this.filteredSetores().filter(s => s.ativo).length);
  inactiveCount = computed(() => this.filteredSetores().filter(s => !s.ativo).length);
  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredTotal() / PAGE_SIZE)));
  pageStart = computed(() => Math.min((this.page() - 1) * PAGE_SIZE + 1, this.filteredTotal()));
  pageEnd = computed(() => Math.min(this.page() * PAGE_SIZE, this.filteredTotal()));
  pagedSetores = computed(() => {
    const start = (this.page() - 1) * PAGE_SIZE;
    return this.filteredSetores().slice(start, start + PAGE_SIZE);
  });

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    this.loadingUsers.set(true);
    try {
      await Promise.all([this.svc.listar(), this.usersSvc.listar()]);
    } finally {
      this.loading.set(false);
      this.loadingUsers.set(false);
    }
  }

  // ── Form dialog ───────────────────────────────────────────────────────────
  formDialogOpen = signal(false);
  editTarget = signal<Setor | null>(null);
  form: SetorForm = emptyForm();
  formErrors: SetorErrors = {};
  saving = signal(false);

  openCreate() {
    this.editTarget.set(null);
    this.form = emptyForm();
    this.formErrors = {};
    this.formDialogOpen.set(true);
  }

  openEdit(s: Setor) {
    this.editTarget.set(s);
    this.form = { nome: s.nome, descricao: s.descricao, responsavel: s.responsavel, ativo: s.ativo };
    this.formErrors = {};
    this.formDialogOpen.set(true);
  }

  private validate(): boolean {
    const f = this.form;
    const errs: SetorErrors = {};
    if (!f.nome.trim() || f.nome.trim().length < 2)
      errs.nome = 'Nome deve ter pelo menos 2 caracteres.';
    else {
      const dup = this.svc.setores().find(s => s.nome.trim().toLowerCase() === f.nome.trim().toLowerCase() && s.id !== this.editTarget()?.id);
      if (dup) errs.nome = 'Já existe um setor com este nome.';
    }
    if (!f.responsavel.trim())
      errs.responsavel = 'Selecione um responsável.';
    else if (!this.activeUsers().some(u => u.nome === f.responsavel.trim()))
      errs.responsavel = 'Selecione um usuário válido da lista.';
    this.formErrors = errs;
    return Object.keys(errs).length === 0;
  }

  async submitForm() {
    if (!this.validate()) return;
    this.saving.set(true);
    try {
      const target = this.editTarget();
      if (target) {
        await this.svc.atualizar(target.id, {
          nome: this.form.nome.trim(),
          descricao: this.form.descricao.trim(),
          responsavel: this.form.responsavel.trim(),
          ativo: this.form.ativo,
        });
        toast.success('Setor atualizado com sucesso!');
      } else {
        await this.svc.criar({
          nome: this.form.nome.trim(),
          descricao: this.form.descricao.trim(),
          responsavel: this.form.responsavel.trim(),
          ativo: true,
        });
        toast.success('Setor criado com sucesso!');
      }
      this.formDialogOpen.set(false);
    } catch (err: any) {
      const msg: string = err?.error?.message ?? 'Erro ao salvar setor.';
      if (msg.toLowerCase().includes('nome') || msg.toLowerCase().includes('setor')) {
        this.formErrors = { nome: msg };
      } else {
        toast.error(msg);
      }
    } finally {
      this.saving.set(false);
    }
  }

  // ── Confirm dialog ────────────────────────────────────────────────────────
  confirmOpen = signal(false);
  confirmTitle = signal('');
  confirmMessage = signal('');
  confirmDanger = signal(false);
  private pendingAction: (() => Promise<void>) | null = null;

  askDelete(s: Setor) {
    this.confirmTitle.set('Excluir setor');
    this.confirmMessage.set(`Tem certeza que deseja excluir o setor "${s.nome}"? Esta ação não pode ser desfeita.`);
    this.confirmDanger.set(true);
    this.pendingAction = async () => {
      await this.svc.excluir(s.id);
      toast.success(`Setor "${s.nome}" excluído.`);
    };
    this.confirmOpen.set(true);
  }

  askToggleAtivo(s: Setor) {
    const ativando = !s.ativo;
    this.confirmTitle.set(ativando ? 'Reativar setor' : 'Desativar setor');
    this.confirmMessage.set(
      ativando
        ? `Deseja reativar o setor "${s.nome}"?`
        : `Deseja desativar o setor "${s.nome}"? Ele não ficará mais disponível para novas demandas.`
    );
    this.confirmDanger.set(!ativando);
    this.pendingAction = async () => {
      await this.svc.atualizar(s.id, { ativo: ativando });
      toast.success(`Setor "${s.nome}" ${ativando ? 'reativado' : 'desativado'} com sucesso.`);
    };
    this.confirmOpen.set(true);
  }

  async confirmAction() {
    if (!this.pendingAction) return;
    this.saving.set(true);
    try {
      await this.pendingAction();
    } catch (err: any) {
      toast.error(err?.error?.message ?? 'Erro ao executar ação.');
    } finally {
      this.saving.set(false);
      this.confirmOpen.set(false);
      this.pendingAction = null;
    }
  }

  cancelConfirm() {
    this.confirmOpen.set(false);
    this.pendingAction = null;
  }

  onConfirmClose(open: boolean) { if (!open) this.cancelConfirm(); }

  clearFilters() {
    this.searchQ.set('');
    this.filterStatus.set('');
    this.page.set(1);
  }
}

