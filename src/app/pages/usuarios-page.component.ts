import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  PlusCircle, Pencil, Trash2, Search, X,
  UserCheck, UserX, ShieldAlert, Users,
} from 'lucide-angular';
import { UsersService } from '../services/users.service';
import { SetoresService } from '../services/setores.service';
import { User } from '../types';
import { Role } from '../types/permissions';
import { UiCard, UiCardContent, UiCardHeader } from '../components/ui/card.component';
import { UiButton } from '../components/ui/button.component';
import { UiAvatar } from '../components/ui/avatar.component';
import {
  UiDialog, UiDialogHeader, UiDialogTitle,
  UiDialogDescription, UiDialogFooter,
} from '../components/ui/dialog.component';
import { UiLabel } from '../components/ui/form-elements.component';
import { UiSelect } from '../components/ui/select.component';
import { toast } from '../lib/toast';
import { MotionInViewDirective } from '../lib/motion.directives';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 9;

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin', supervisor: 'Supervisor', operador: 'Operador', visualizador: 'Visualizador',
};

const ROLE_BADGE: Record<Role, string> = {
  admin: 'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold bg-rose-100 text-rose-700 border-rose-200',
  supervisor: 'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 border-amber-200',
  operador: 'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 border-blue-200',
  visualizador: 'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-600 border-slate-200',
};

// ─── Form types ───────────────────────────────────────────────────────────────

interface UserForm {
  nome: string; email: string; senha: string;
  cargo: string; setor: string; role: Role; ativo: boolean;
}

type FormErrors = Partial<Record<'nome' | 'email' | 'senha' | 'cargo' | 'setor', string>>;

const emptyForm = (): UserForm =>
  ({ nome: '', email: '', senha: '', cargo: '', setor: '', role: 'operador', ativo: true });

// ─── Input class helpers ──────────────────────────────────────────────────────

const INPUT_CLS = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50';
const SELECT_CLS = INPUT_CLS + ' appearance-none cursor-pointer';

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [
    CommonModule, FormsModule, LucideAngularModule,
    UiCard, UiCardContent, UiCardHeader,
    UiButton, UiAvatar,
    UiDialog, UiDialogHeader, UiDialogTitle, UiDialogDescription, UiDialogFooter,
    UiLabel, UiSelect,
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
          class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          [(ngModel)]="searchQ"
          (ngModelChange)="page.set(1)"
          placeholder="Buscar por nome, e-mail ou cargo…"
          class="h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-8 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        @if (searchQ.length) {
          <button type="button" (click)="searchQ=''; page.set(1)"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors">
            <lucide-angular [img]="X" size="13" />
          </button>
        }
      </div>

      <!-- Role filter -->
      <ui-select
        [value]="filterRole()"
        [options]="roleFilterOpts"
        class="w-44"
        (valueChange)="filterRole.set($event); page.set(1)"
      />

      <!-- Status filter -->
      <ui-select
        [value]="filterStatus()"
        [options]="statusFilterOpts"
        class="w-36"
        (valueChange)="filterStatus.set($event); page.set(1)"
      />
    </div>

    <ui-button (click)="openCreate()">
      <lucide-angular [img]="PlusCircle" size="16" /> Novo Usuário
    </ui-button>
  </div>

  <!-- ── Stats ── -->
  <div class="flex items-center gap-4 text-sm">
    <span class="text-slate-500">
      <strong class="text-slate-900">{{ filteredTotal() }}</strong> usuário(s) encontrado(s)
    </span>
    <span class="text-green-600 font-medium">{{ activeCount() }} ativo(s)</span>
    <span class="text-slate-400">{{ inactiveCount() }} inativo(s)</span>
  </div>

  <!-- ── Empty state ── -->
  @if (filteredTotal() === 0) {
    <div class="flex flex-col items-center justify-center py-20 text-slate-400">
      <lucide-angular [img]="Users" size="48" class="mb-3 opacity-30" />
      <p class="text-sm font-medium">Nenhum usuário encontrado</p>
      @if (searchQ.length || filterRole() || filterStatus()) {
        <button type="button" (click)="clearFilters()"
          class="mt-3 text-xs text-primary underline-offset-2 hover:underline">
          Limpar filtros
        </button>
      }
    </div>
  } @else {

    <!-- ── Card grid ── -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      @for (u of pagedUsers(); track u.id) {
        <div motionInView [class.opacity-60]="!u.ativo" class="transition-opacity">
          <ui-card class="h-full">
            <ui-card-header class="pb-3">
              <div class="flex items-start gap-3">
                <ui-avatar [name]="u.nome" [src]="u.avatar"
                  class="h-11 w-11 shrink-0"
                  fallbackClass="bg-amber-500 text-slate-900 text-sm font-semibold" />
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-2">
                    <p class="font-semibold text-slate-900 leading-tight truncate">{{ u.nome }}</p>
                    <span [class]="ROLE_BADGE[u.role]" class="shrink-0">{{ ROLE_LABELS[u.role] }}</span>
                  </div>
                  <p class="text-xs text-slate-500 truncate mt-0.5">{{ u.email }}</p>
                </div>
              </div>
            </ui-card-header>
            <ui-card-content class="pt-0 pb-3 space-y-3">
              <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <div>
                  <p class="text-slate-400 uppercase tracking-wide text-[10px] font-semibold">Cargo</p>
                  <p class="text-slate-700 truncate">{{ u.cargo }}</p>
                </div>
                <div>
                  <p class="text-slate-400 uppercase tracking-wide text-[10px] font-semibold">Setor</p>
                  <p class="text-slate-700 truncate">{{ u.setor }}</p>
                </div>
                @if (u.ultimoAcesso) {
                  <div class="col-span-2">
                    <p class="text-slate-400 uppercase tracking-wide text-[10px] font-semibold">Último acesso</p>
                    <p class="text-slate-500">{{ u.ultimoAcesso | date:'dd/MM/yyyy HH:mm' }}</p>
                  </div>
                }
              </div>
              <div class="flex items-center justify-between pt-1 border-t border-slate-100">
                <span [class]="u.ativo
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-slate-50 text-slate-500 border-slate-200'"
                  class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold">
                  {{ u.ativo ? 'Ativo' : 'Inativo' }}
                </span>
                <div class="flex gap-0.5">
                  <ui-button variant="ghost" size="sm" (click)="openEdit(u)" title="Editar usuário">
                    <lucide-angular [img]="Pencil" size="14" />
                  </ui-button>
                  <ui-button variant="ghost" size="sm" (click)="askToggleAtivo(u)"
                    [title]="u.ativo ? 'Desativar usuário' : 'Reativar usuário'"
                    [class]="u.ativo ? 'text-amber-600 hover:text-amber-700' : 'text-green-600 hover:text-green-700'">
                    <lucide-angular [img]="u.ativo ? UserX : UserCheck" size="14" />
                  </ui-button>
                  <ui-button variant="ghost" size="sm" (click)="askDelete(u)"
                    title="Excluir usuário" class="text-red-500 hover:text-red-700">
                    <lucide-angular [img]="Trash2" size="14" />
                  </ui-button>
                </div>
              </div>
            </ui-card-content>
          </ui-card>
        </div>
      }
    </div>

    <!-- ── Pagination ── -->
    @if (totalPages() > 1) {
      <div class="flex items-center justify-between border-t border-slate-100 pt-4">
        <p class="text-sm text-slate-500">
          Exibindo <strong>{{ pageStart() }}–{{ pageEnd() }}</strong> de {{ filteredTotal() }}
        </p>
        <div class="flex items-center gap-2">
          <ui-button variant="outline" size="sm"
            [disabled]="page() === 1" (click)="page.set(page() - 1)">
            ‹ Anterior
          </ui-button>
          <span class="min-w-22 text-center text-sm font-medium text-slate-700">
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

  <!-- ── Form Dialog (create / edit) ── -->
  <ui-dialog [open]="formDialogOpen()" (openChange)="formDialogOpen.set($event)" contentClass="max-w-lg">
    <ui-dialog-header>
      <ui-dialog-title>{{ editTarget() ? 'Editar Usuário' : 'Novo Usuário' }}</ui-dialog-title>
      <ui-dialog-description>
        {{ editTarget() ? 'Altere os dados do usuário abaixo.' : 'Preencha os dados para criar um novo usuário no sistema.' }}
      </ui-dialog-description>
    </ui-dialog-header>

    <form (ngSubmit)="submitForm()" class="mt-4 space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">

        <!-- Nome -->
        <div class="sm:col-span-2 space-y-1.5">
          <ui-label for="f-nome">Nome completo *</ui-label>
          <input id="f-nome" name="nome" type="text" [(ngModel)]="form.nome"
            placeholder="Ex: João da Silva" [class]="INPUT_CLS" />
          @if (formErrors.nome) {
            <p class="text-xs text-red-600">{{ formErrors.nome }}</p>
          }
        </div>

        <!-- Email -->
        <div class="sm:col-span-2 space-y-1.5">
          <ui-label for="f-email">E-mail *</ui-label>
          <input id="f-email" name="email" type="email" [(ngModel)]="form.email"
            placeholder="usuario@empresa.com" [class]="INPUT_CLS" />
          @if (formErrors.email) {
            <p class="text-xs text-red-600">{{ formErrors.email }}</p>
          }
        </div>

        <!-- Senha -->
        <div class="sm:col-span-2 space-y-1.5">
          <ui-label for="f-senha">
            Senha {{ editTarget() ? '(deixe em branco para não alterar)' : '*' }}
          </ui-label>
          <input id="f-senha" name="senha" type="password" [(ngModel)]="form.senha"
            placeholder="Mínimo 6 caracteres" [class]="INPUT_CLS" />
          @if (formErrors.senha) {
            <p class="text-xs text-red-600">{{ formErrors.senha }}</p>
          }
        </div>

        <!-- Cargo -->
        <div class="space-y-1.5">
          <ui-label for="f-cargo">Cargo *</ui-label>
          <input id="f-cargo" name="cargo" type="text" [(ngModel)]="form.cargo"
            placeholder="Ex: Operador de Máquina" [class]="INPUT_CLS" />
          @if (formErrors.cargo) {
            <p class="text-xs text-red-600">{{ formErrors.cargo }}</p>
          }
        </div>

        <!-- Setor -->
        <div class="space-y-1.5">
          <ui-label for="f-setor">Setor *</ui-label>
          <select id="f-setor" name="setor" [(ngModel)]="form.setor" [class]="SELECT_CLS">
            <option value="">Selecione…</option>
            @for (s of setorNomes(); track s) {
              <option [value]="s">{{ s }}</option>
            }
          </select>
          @if (formErrors.setor) {
            <p class="text-xs text-red-600">{{ formErrors.setor }}</p>
          }
        </div>

        <!-- Perfil de acesso -->
        <div class="space-y-1.5">
          <ui-label for="f-role">Perfil de acesso *</ui-label>
          <select id="f-role" name="role" [(ngModel)]="form.role" [class]="SELECT_CLS">
            @for (opt of roleOpts; track opt.value) {
              <option [value]="opt.value">{{ opt.label }}</option>
            }
          </select>
        </div>

        <!-- Toggle ativo (edit only) -->
        @if (editTarget()) {
          <div class="flex items-center gap-2 pt-5">
            <input id="f-ativo" name="ativo" type="checkbox" [(ngModel)]="form.ativo"
              class="h-4 w-4 rounded border-slate-300 accent-primary cursor-pointer" />
            <label for="f-ativo" class="text-sm font-medium text-slate-700 cursor-pointer select-none">
              Usuário ativo
            </label>
          </div>
        }

      </div>

      <ui-dialog-footer class="pt-2">
        <ui-button type="button" variant="outline" [disabled]="saving()" (click)="closeFormDialog()">
          Cancelar
        </ui-button>
        <ui-button type="submit" [disabled]="saving()">
          {{ saving() ? 'Salvando…' : (editTarget() ? 'Salvar alterações' : 'Criar usuário') }}
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
export class UsuariosPageComponent implements OnInit {

  // Icons
  readonly PlusCircle = PlusCircle; readonly Pencil = Pencil; readonly Trash2 = Trash2;
  readonly Search = Search; readonly X = X;
  readonly UserCheck = UserCheck; readonly UserX = UserX;
  readonly ShieldAlert = ShieldAlert; readonly Users = Users;

  // Constants exposed to template
  readonly ROLE_LABELS = ROLE_LABELS;
  readonly ROLE_BADGE = ROLE_BADGE;
  readonly INPUT_CLS = INPUT_CLS;
  readonly SELECT_CLS = SELECT_CLS;

  readonly roleOpts = (Object.keys(ROLE_LABELS) as Role[]).map(v => ({ value: v, label: ROLE_LABELS[v] }));
  readonly roleFilterOpts = [{ value: '', label: 'Todos os perfis' }, ...this.roleOpts];
  readonly statusFilterOpts = [
    { value: '', label: 'Qualquer status' },
    { value: 'ativo', label: 'Ativos' },
    { value: 'inativo', label: 'Inativos' },
  ];

  // ── Services ──────────────────────────────────────────────────────────────
  private usersService = inject(UsersService);
  private setoresService = inject(SetoresService);

  readonly setorNomes = computed(() =>
    this.setoresService.setores().filter(s => s.ativo).map(s => s.nome)
  );

  // ── Filter state ──────────────────────────────────────────────────────────
  searchQ = '';
  filterRole = signal('');
  filterStatus = signal('');
  page = signal(1);

  ngOnInit(): void {
    this.usersService.listar();
    if (this.setoresService.setores().length === 0) this.setoresService.listar();
  }

  // ── Derived data ──────────────────────────────────────────────────────────
  private allUsers = computed(() => this.usersService.users());

  filteredUsers = computed(() => {
    const q = this.searchQ.toLowerCase().trim();
    const role = this.filterRole();
    const status = this.filterStatus();
    return this.allUsers().filter(u => {
      if (q && !u.nome.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q) && !u.cargo.toLowerCase().includes(q)) return false;
      if (role && u.role !== role) return false;
      if (status === 'ativo' && !u.ativo) return false;
      if (status === 'inativo' && u.ativo) return false;
      return true;
    });
  });

  filteredTotal = computed(() => this.filteredUsers().length);
  activeCount = computed(() => this.filteredUsers().filter(u => u.ativo).length);
  inactiveCount = computed(() => this.filteredUsers().filter(u => !u.ativo).length);
  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredTotal() / PAGE_SIZE)));
  pageStart = computed(() => Math.min((this.page() - 1) * PAGE_SIZE + 1, this.filteredTotal()));
  pageEnd = computed(() => Math.min(this.page() * PAGE_SIZE, this.filteredTotal()));
  pagedUsers = computed(() => {
    const start = (this.page() - 1) * PAGE_SIZE;
    return this.filteredUsers().slice(start, start + PAGE_SIZE);
  });

  // ── Form dialog ───────────────────────────────────────────────────────────
  formDialogOpen = signal(false);
  editTarget = signal<User | null>(null);
  form: UserForm = emptyForm();
  formErrors: FormErrors = {};
  saving = signal(false);

  openCreate() {
    this.editTarget.set(null);
    this.form = emptyForm();
    this.formErrors = {};
    this.formDialogOpen.set(true);
  }

  openEdit(u: User) {
    this.editTarget.set(u);
    this.form = { nome: u.nome, email: u.email, senha: '', cargo: u.cargo, setor: u.setor, role: u.role, ativo: u.ativo };
    this.formErrors = {};
    this.formDialogOpen.set(true);
  }

  closeFormDialog() { this.formDialogOpen.set(false); }

  private validate(): boolean {
    const f = this.form;
    const errs: FormErrors = {};
    if (!f.nome.trim() || f.nome.trim().length < 2)
      errs.nome = 'Nome deve ter pelo menos 2 caracteres.';
    if (!f.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim()))
      errs.email = 'Informe um e-mail válido.';
    else {
      const dup = this.allUsers().find(u => u.email === f.email.trim() && u.id !== this.editTarget()?.id);
      if (dup) errs.email = 'Já existe um usuário com este e-mail.';
    }
    if (!f.cargo.trim() || f.cargo.trim().length < 2)
      errs.cargo = 'Cargo deve ter pelo menos 2 caracteres.';
    if (!f.setor)
      errs.setor = 'Selecione um setor.';
    if (!this.editTarget() && f.senha.length < 6)
      errs.senha = 'Senha deve ter pelo menos 6 caracteres.';
    if (this.editTarget() && f.senha && f.senha.length < 6)
      errs.senha = 'Se informada, a senha deve ter pelo menos 6 caracteres.';
    this.formErrors = errs;
    return Object.keys(errs).length === 0;
  }

  async submitForm() {
    if (!this.validate()) return;
    this.saving.set(true);
    try {
      const target = this.editTarget();
      if (target) {
        await this.usersService.atualizar(target.id, {
          nome: this.form.nome.trim(),
          email: this.form.email.trim(),
          cargo: this.form.cargo.trim(),
          setor: this.form.setor,
          role: this.form.role,
          ativo: this.form.ativo,
        });
        toast.success('Usuário atualizado com sucesso!');
      } else {
        await this.usersService.criar({
          nome: this.form.nome.trim(),
          email: this.form.email.trim(),
          senha: this.form.senha,
          cargo: this.form.cargo.trim(),
          setor: this.form.setor,
          role: this.form.role,
        });
        toast.success('Usuário criado com sucesso!');
      }
      this.formDialogOpen.set(false);
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao salvar usuário.');
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

  askDelete(u: User) {
    this.confirmTitle.set('Excluir usuário');
    this.confirmMessage.set(`Tem certeza que deseja excluir o usuário "${u.nome}"? Esta ação não pode ser desfeita.`);
    this.confirmDanger.set(true);
    this.pendingAction = async () => {
      await this.usersService.excluir(u.id);
      toast.success(`Usuário "${u.nome}" excluído.`);
    };
    this.confirmOpen.set(true);
  }

  askToggleAtivo(u: User) {
    const ativando = !u.ativo;
    this.confirmTitle.set(ativando ? 'Reativar usuário' : 'Desativar usuário');
    this.confirmMessage.set(
      ativando
        ? `Deseja reativar o acesso de "${u.nome}"?`
        : `Deseja desativar o acesso de "${u.nome}"? O usuário não conseguirá mais entrar no sistema.`
    );
    this.confirmDanger.set(!ativando);
    this.pendingAction = async () => {
      await this.usersService.toggleAtivo(u.id, ativando);
      toast.success(`Usuário "${u.nome}" ${ativando ? 'reativado' : 'desativado'} com sucesso.`);
    };
    this.confirmOpen.set(true);
  }

  async confirmAction() {
    if (!this.pendingAction) return;
    this.saving.set(true);
    try {
      await this.pendingAction();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao executar ação.');
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

  onConfirmClose(open: boolean) {
    if (!open) this.cancelConfirm();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  clearFilters() {
    this.searchQ = '';
    this.filterRole.set('');
    this.filterStatus.set('');
    this.page.set(1);
  }
}

