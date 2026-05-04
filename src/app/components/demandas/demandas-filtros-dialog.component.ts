import { Component, EventEmitter, Output, computed, inject, input, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Filter, X, Search } from 'lucide-angular';
import { DemandasService } from '../../services/demandas.service';
import { DemandStatus, Prioridade, DemandFilters } from '../../types';
import { UiDialog, UiDialogHeader, UiDialogTitle, UiDialogDescription, UiDialogFooter } from '../ui/dialog.component';
import { UiButton } from '../ui/button.component';
import { UiBadge } from '../ui/badge.component';
import { UiLabel } from '../ui/form-elements.component';
import { UiCheckbox } from '../ui/checkbox.component';

interface Option<T> { value: T; label: string; }

const STATUS_OPTIONS: Option<DemandStatus>[] = [
    { value: DemandStatus.PENDENTE, label: 'Pendente' },
    { value: DemandStatus.EM_ANDAMENTO, label: 'Em Andamento' },
    { value: DemandStatus.BLOQUEADO, label: 'Bloqueado' },
    { value: DemandStatus.CONCLUIDO, label: 'Concluído' },
];

const PRIORIDADE_OPTIONS: Option<Prioridade>[] = [
    { value: 1, label: 'Baixa' },
    { value: 2, label: 'Normal' },
    { value: 3, label: 'Alta' },
    { value: 4, label: 'Urgente' },
    { value: 5, label: 'Crítico' },
];

@Component({
    selector: 'demandas-filtros-dialog',
    standalone: true,
    imports: [
        CommonModule, LucideAngularModule,
        UiDialog, UiDialogHeader, UiDialogTitle, UiDialogDescription, UiDialogFooter,
        UiButton, UiBadge, UiLabel, UiCheckbox,
    ],
    template: `
    <ui-dialog [open]="open()" (openChange)="openChange.emit($event)" contentClass="max-w-2xl">
      <ui-dialog-header>
        <ui-dialog-title class="flex items-center gap-2">
          <lucide-angular [img]="Filter" size="18" />
          Filtros de demandas
        </ui-dialog-title>
        <ui-dialog-description>
          Refine a visualização do kanban e da tabela. Os filtros são aplicados imediatamente.
        </ui-dialog-description>
      </ui-dialog-header>

      <div class="space-y-5 py-2 max-h-[60vh] overflow-y-auto pr-1">
        <!-- Busca -->
        <div class="space-y-2">
          <ui-label for="busca-filter">Buscar</ui-label>
          <div class="relative">
            <lucide-angular [img]="Search" size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              id="busca-filter"
              type="text"
              [value]="local().busca ?? ''"
              (input)="setBusca($any($event.target).value)"
              placeholder="Buscar por título ou descrição..."
              class="flex h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          </div>
        </div>

        <!-- Status -->
        <div class="space-y-2">
          <ui-label>Status</ui-label>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            @for (opt of statusOptions; track opt.value) {
              <label class="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-md border border-border hover:bg-muted transition-colors"
                [class.bg-primary]="isStatusSelected(opt.value)"
                [class.text-primary-foreground]="isStatusSelected(opt.value)"
                [class.border-primary]="isStatusSelected(opt.value)">
                <ui-checkbox [checked]="isStatusSelected(opt.value)" (checkedChange)="toggleStatus(opt.value)" />
                <span>{{ opt.label }}</span>
              </label>
            }
          </div>
        </div>

        <!-- Prioridade -->
        <div class="space-y-2">
          <ui-label>Prioridade</ui-label>
          <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
            @for (opt of prioridadeOptions; track opt.value) {
              <label class="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-md border border-border hover:bg-muted transition-colors"
                [class.bg-primary]="isPrioridadeSelected(opt.value)"
                [class.text-primary-foreground]="isPrioridadeSelected(opt.value)"
                [class.border-primary]="isPrioridadeSelected(opt.value)">
                <ui-checkbox [checked]="isPrioridadeSelected(opt.value)" (checkedChange)="togglePrioridade(opt.value)" />
                <span>{{ opt.label }}</span>
              </label>
            }
          </div>
        </div>

        <!-- Setor -->
        <div class="space-y-2">
          <ui-label>Setor</ui-label>
          @if (setoresDisponiveis().length === 0) {
            <p class="text-xs text-muted-foreground italic">Nenhum setor encontrado nas demandas atuais.</p>
          } @else {
            <div class="flex flex-wrap gap-2">
              @for (setor of setoresDisponiveis(); track setor) {
                <button type="button" (click)="toggleSetor(setor)"
                  [class]="chipClass(isSetorSelected(setor))">
                  {{ setor }}
                </button>
              }
            </div>
          }
        </div>

        <!-- Responsável -->
        <div class="space-y-2">
          <ui-label>Responsável</ui-label>
          @if (responsaveisDisponiveis().length === 0) {
            <p class="text-xs text-muted-foreground italic">Nenhum responsável encontrado nas demandas atuais.</p>
          } @else {
            <div class="flex flex-wrap gap-2">
              @for (resp of responsaveisDisponiveis(); track resp) {
                <button type="button" (click)="toggleResponsavel(resp)"
                  [class]="chipClass(isResponsavelSelected(resp))">
                  {{ resp }}
                </button>
              }
            </div>
          }
        </div>

        <!-- Período -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="space-y-2">
            <ui-label for="dt-inicio">Criadas a partir de</ui-label>
            <input id="dt-inicio" type="date"
              [value]="local().dataInicio ?? ''"
              (change)="setDataInicio($any($event.target).value)"
              class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          </div>
          <div class="space-y-2">
            <ui-label for="dt-fim">Criadas até</ui-label>
            <input id="dt-fim" type="date"
              [value]="local().dataFim ?? ''"
              (change)="setDataFim($any($event.target).value)"
              class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          </div>
        </div>

        @if (totalAtivos() > 0) {
          <div class="rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5 text-xs flex items-center gap-2 text-amber-800">
            <ui-badge variant="secondary" class="bg-amber-500/20 text-amber-700">{{ totalAtivos() }}</ui-badge>
            {{ totalAtivos() === 1 ? 'filtro ativo' : 'filtros ativos' }}
          </div>
        }
      </div>

      <ui-dialog-footer class="gap-2 pt-3 border-t border-border">
        <ui-button variant="ghost" (click)="limpar()">
          <lucide-angular [img]="X" size="14" class="mr-1" /> Limpar tudo
        </ui-button>
        <ui-button variant="outline" (click)="openChange.emit(false)">Fechar</ui-button>
        <ui-button (click)="aplicar()">Aplicar filtros</ui-button>
      </ui-dialog-footer>
    </ui-dialog>
  `,
})
export class DemandasFiltrosDialogComponent {
    open = input(false);
    @Output() openChange = new EventEmitter<boolean>();

    readonly Filter = Filter; readonly X = X; readonly Search = Search;
    readonly statusOptions = STATUS_OPTIONS;
    readonly prioridadeOptions = PRIORIDADE_OPTIONS;

    private demandas = inject(DemandasService);

    /** Cópia local mutável dos filtros — só aplica no service ao clicar "Aplicar". */
    local = signal<DemandFilters>({});

    constructor() {
        // Quando abrir o dialog, sincroniza com filtros vigentes do service.
        effect(() => {
            if (this.open()) {
                this.local.set({ ...this.demandas.filtros() });
            }
        });
    }

    // ── Listas dinâmicas (a partir das demandas atuais) ──────────────────────
    setoresDisponiveis = computed(() =>
        Array.from(new Set(this.demandas.demandas().map((d) => d.setor).filter(Boolean))).sort(),
    );
    responsaveisDisponiveis = computed(() =>
        Array.from(new Set(this.demandas.demandas().map((d) => d.responsavel).filter(Boolean))).sort(),
    );

    totalAtivos = computed(() => {
        const f = this.local();
        return Object.values(f).reduce((acc: number, v) => acc + (Array.isArray(v) ? v.length : v ? 1 : 0), 0);
    });

    // ── Helpers de seleção ───────────────────────────────────────────────────
    isStatusSelected(s: DemandStatus) { return (this.local().status ?? []).includes(s); }
    isPrioridadeSelected(p: Prioridade) { return (this.local().prioridade ?? []).includes(p); }
    isSetorSelected(s: string) { return (this.local().setor ?? []).includes(s); }
    isResponsavelSelected(r: string) { return (this.local().responsavel ?? []).includes(r); }

    toggleStatus(s: DemandStatus) {
        this.local.update((f) => ({ ...f, status: toggleArr(f.status, s) }));
    }
    togglePrioridade(p: Prioridade) {
        this.local.update((f) => ({ ...f, prioridade: toggleArr(f.prioridade, p) }));
    }
    toggleSetor(s: string) {
        this.local.update((f) => ({ ...f, setor: toggleArr(f.setor, s) }));
    }
    toggleResponsavel(r: string) {
        this.local.update((f) => ({ ...f, responsavel: toggleArr(f.responsavel, r) }));
    }
    setBusca(v: string) {
        this.local.update((f) => ({ ...f, busca: v.trim() || undefined }));
    }
    setDataInicio(v: string) {
        this.local.update((f) => ({ ...f, dataInicio: v || undefined }));
    }
    setDataFim(v: string) {
        this.local.update((f) => ({ ...f, dataFim: v || undefined }));
    }

    chipClass(active: boolean): string {
        return [
            'px-3 py-1.5 text-xs rounded-full border transition-colors',
            active
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-foreground border-border hover:bg-muted',
        ].join(' ');
    }

    aplicar() {
        // Limpa propriedades vazias antes de enviar para o service.
        const cleaned = sanitize(this.local());
        this.demandas.setFiltros(cleaned);
        this.openChange.emit(false);
    }

    limpar() {
        this.local.set({});
        this.demandas.limparFiltros();
    }
}

function toggleArr<T>(arr: T[] | undefined, value: T): T[] | undefined {
    const set = new Set(arr ?? []);
    if (set.has(value)) set.delete(value);
    else set.add(value);
    const next = Array.from(set);
    return next.length > 0 ? next : undefined;
}

function sanitize(f: DemandFilters): DemandFilters {
    const out: DemandFilters = {};
    if (f.status?.length) out.status = f.status;
    if (f.prioridade?.length) out.prioridade = f.prioridade;
    if (f.setor?.length) out.setor = f.setor;
    if (f.responsavel?.length) out.responsavel = f.responsavel;
    if (f.busca) out.busca = f.busca;
    if (f.dataInicio) out.dataInicio = f.dataInicio;
    if (f.dataFim) out.dataFim = f.dataFim;
    return out;
}
