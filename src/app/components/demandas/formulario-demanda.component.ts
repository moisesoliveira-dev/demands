import { Component, EventEmitter, Output, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { UiButton } from '../ui/button.component';
import { UiLabel } from '../ui/form-elements.component';
import { UiSelect } from '../ui/select.component';
import { UiRadioGroup, UiRadioItem } from '../ui/radio-group.component';
import { Demanda, DemandStatus, Prioridade } from '../../types';
import { PRIORIDADE_CONFIG } from './demand-card.component';
import { DemandasService } from '../../services/demandas.service';
import { AuthService } from '../../services/auth.service';
import { toast } from '../../lib/toast';

const SETORES = ['Usinagem', 'Montagem', 'Pintura', 'Manutenção', 'Qualidade', 'Expedição'];
const RESPONSAVEIS = ['João Silva', 'Maria Santos', 'Pedro Oliveira', 'Ana Costa', 'Carlos Souza', 'Beatriz Lima', 'Rafael Mendes', 'Camila Rocha', 'Lucas Pereira', 'Juliana Alves'];

@Component({
    selector: 'formulario-demanda',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, UiButton, UiLabel, UiSelect, UiRadioGroup, UiRadioItem],
    template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-6">
      <div class="space-y-2">
        <ui-label for="titulo">Título *</ui-label>
        <input id="titulo" formControlName="titulo" placeholder="Ex: Manutenção preventiva linha 3"
          class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        @if (form.controls.titulo.touched && form.controls.titulo.invalid) {
          <p class="text-xs text-destructive">Mínimo 5 caracteres</p>
        }
      </div>

      <div class="space-y-2">
        <ui-label for="descricao">Descrição *</ui-label>
        <textarea id="descricao" formControlName="descricao" rows="4" placeholder="Detalhe a demanda..."
          class="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"></textarea>
        @if (form.controls.descricao.touched && form.controls.descricao.invalid) {
          <p class="text-xs text-destructive">Mínimo 10 caracteres</p>
        }
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <ui-label>Setor *</ui-label>
          <ui-select [value]="form.value.setor || ''" [options]="setorOpts" (valueChange)="form.controls.setor.setValue($event)" placeholder="Selecione" />
        </div>
        <div class="space-y-2">
          <ui-label>Responsável *</ui-label>
          <ui-select [value]="form.value.responsavel || ''" [options]="respOpts" (valueChange)="form.controls.responsavel.setValue($event)" placeholder="Selecione" />
        </div>
      </div>

      <div class="space-y-2">
        <ui-label>Prioridade *</ui-label>
        <ui-radio-group class="grid grid-cols-2 md:grid-cols-5 gap-2">
          @for (p of prioridades; track p.value) {
            <label [class]="cardClass(p.value)" (click)="form.controls.prioridade.setValue(p.value)">
              <ui-radio-item [value]="String(p.value)" [selected]="form.value.prioridade === p.value" (select)="form.controls.prioridade.setValue(p.value)" />
              <span class="text-xs font-semibold">{{ p.label }}</span>
            </label>
          }
        </ui-radio-group>
      </div>

      <div class="flex justify-end gap-2 pt-4 border-t">
        <ui-button variant="outline" type="button" (click)="cancel.emit()">Cancelar</ui-button>
        <ui-button type="submit" [disabled]="form.invalid || saving()">{{ saving() ? 'Salvando...' : 'Criar Demanda' }}</ui-button>
      </div>
    </form>
  `,
})
export class FormularioDemandaComponent {
    @Output() created = new EventEmitter<Demanda>();
    @Output() cancel = new EventEmitter<void>();

    String = String;
    saving = signal(false);

    setorOpts = SETORES.map((s) => ({ value: s, label: s }));
    respOpts = RESPONSAVEIS.map((s) => ({ value: s, label: s }));
    prioridades = ([1, 2, 3, 4, 5] as Prioridade[]).map((p) => ({ value: p, ...PRIORIDADE_CONFIG[p] }));

    private fb = inject(FormBuilder);
    private demandasService = inject(DemandasService);
    private auth = inject(AuthService);

    form = this.fb.group({
        titulo: ['', [Validators.required, Validators.minLength(5)]],
        descricao: ['', [Validators.required, Validators.minLength(10)]],
        setor: ['', Validators.required],
        responsavel: ['', Validators.required],
        prioridade: [3 as Prioridade, Validators.required],
    });

    cardClass(p: Prioridade) {
        const cfg = PRIORIDADE_CONFIG[p];
        const selected = this.form.value.prioridade === p;
        return `flex items-center gap-2 rounded-md border-2 p-3 cursor-pointer transition-all ${cfg.bg} ${cfg.color} ${selected ? 'ring-2 ring-primary' : ''}`;
    }

    async submit() {
        if (this.form.invalid) return;
        this.saving.set(true);
        try {
            const v = this.form.getRawValue();
            const nova = await this.demandasService.criar({
                titulo: v.titulo!,
                descricao: v.descricao!,
                setor: v.setor!,
                responsavel: v.responsavel!,
                prioridade: v.prioridade!,
                status: DemandStatus.PENDENTE,
            });
            toast.success('Demanda criada!');
            this.created.emit(nova);
            this.form.reset({ prioridade: 3 });
        } catch (e: any) {
            toast.error('Erro', e?.message);
        } finally {
            this.saving.set(false);
        }
    }
}
