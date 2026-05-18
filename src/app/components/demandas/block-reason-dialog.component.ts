import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule, AlertCircle } from 'lucide-angular';
import { UiDialog, UiDialogHeader, UiDialogTitle, UiDialogDescription, UiDialogFooter } from '../ui/dialog.component';
import { UiButton } from '../ui/button.component';
import { UiLabel } from '../ui/form-elements.component';

@Component({
    selector: 'block-reason-dialog',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, UiDialog, UiDialogHeader, UiDialogTitle, UiDialogDescription, UiDialogFooter, UiButton, UiLabel],
    template: `
    <ui-dialog [open]="open()" (openChange)="cancel()">
      <ui-dialog-header>
        <div class="flex items-center gap-2">
          <lucide-angular [img]="AlertCircle" size="20" class="text-destructive" />
          <ui-dialog-title>Motivo do Bloqueio</ui-dialog-title>
        </div>
        <ui-dialog-description>
          Informe o motivo pelo qual esta demanda está sendo bloqueada (mínimo 10 caracteres).
        </ui-dialog-description>
      </ui-dialog-header>
      <form [formGroup]="form" (ngSubmit)="confirm()" class="space-y-3">
        <ui-label for="motivo">Motivo *</ui-label>
        <textarea id="motivo" formControlName="motivo" maxlength="500" rows="4"
          class="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder="Ex: Aguardando peça do fornecedor..."></textarea>
        <p class="text-xs text-muted-foreground">{{ form.value.motivo?.length || 0 }}/500</p>
        <ui-dialog-footer>
          <ui-button variant="outline" type="button" (click)="cancel()">Cancelar</ui-button>
          <ui-button variant="destructive" type="submit" [disabled]="form.invalid">Bloquear</ui-button>
        </ui-dialog-footer>
      </form>
    </ui-dialog>
  `,
})
export class BlockReasonDialogComponent {
    readonly AlertCircle = AlertCircle;
    open = signal(false);
    @Output() confirmed = new EventEmitter<string>();

    private fb = new FormBuilder();
    form = this.fb.nonNullable.group({
        motivo: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
    });

    show() { this.form.reset(); this.open.set(true); }
    cancel() { this.open.set(false); }
    confirm() {
        if (this.form.invalid) return;
        this.confirmed.emit(this.form.getRawValue().motivo);
        this.open.set(false);
    }
}
