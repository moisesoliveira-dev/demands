import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule, Factory } from 'lucide-angular';
import { AuthService } from '../services/auth.service';
import { UiCard, UiCardContent, UiCardDescription, UiCardHeader, UiCardTitle } from '../components/ui/card.component';
import { UiLabel } from '../components/ui/form-elements.component';
import { UiButton } from '../components/ui/button.component';
import { toast } from '../lib/toast';

@Component({
    selector: 'app-login-page',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, UiCard, UiCardContent, UiCardDescription, UiCardHeader, UiCardTitle, UiLabel, UiButton],
    template: `
    <div class="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <ui-card class="w-full max-w-md shadow-xl">
        <ui-card-header class="text-center space-y-3">
          <div class="mx-auto h-14 w-14 rounded-lg bg-primary flex items-center justify-center">
            <lucide-angular [img]="Factory" size="28" class="text-primary-foreground" />
          </div>
          <ui-card-title class="text-2xl font-mono">DEMANDS</ui-card-title>
          <ui-card-description>Sistema de Gestão de Demandas Industriais</ui-card-description>
        </ui-card-header>
        <ui-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
            <div class="space-y-2">
              <ui-label for="email">Email</ui-label>
              <input id="email" type="email" formControlName="email" placeholder="seu.email@fabrica.com" class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            </div>
            <div class="space-y-2">
              <ui-label for="senha">Senha</ui-label>
              <input id="senha" type="password" formControlName="senha" placeholder="••••••" class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            </div>

            <ui-button type="submit" [disabled]="loading() || form.invalid" class="w-full">
              {{ loading() ? 'Entrando...' : 'Entrar' }}
            </ui-button>

            <div class="rounded-md bg-slate-50 border border-slate-200 p-3 text-xs space-y-1 text-slate-600">
              <p class="font-semibold text-slate-700">Credenciais de teste:</p>
              <p>admin&#64;fabrica.com / 123456 (Admin)</p>
              <p>supervisor&#64;fabrica.com / 123456 (Supervisor)</p>
              <p>operador&#64;fabrica.com / 123456 (Operador)</p>
              <p>visualizador&#64;fabrica.com / 123456 (Visualizador)</p>
            </div>
          </form>
        </ui-card-content>
      </ui-card>
    </div>
  `,
})
export class LoginPageComponent {
    readonly Factory = Factory;
    loading = signal(false);
    private fb = inject(FormBuilder);
    private auth = inject(AuthService);
    private router = inject(Router);

    form = this.fb.nonNullable.group({
        email: ['', [Validators.required, Validators.email]],
        senha: ['', [Validators.required, Validators.minLength(4)]],
    });

    async submit() {
        if (this.form.invalid) return;
        const { email, senha } = this.form.getRawValue();
        this.loading.set(true);
        try {
            await this.auth.loginMock(email, senha);
            toast.success('Login realizado!');
            this.router.navigate(['/dashboard']);
        } catch (e: any) {
            toast.error('Erro ao entrar', e?.message || 'Tente novamente');
        } finally {
            this.loading.set(false);
        }
    }
}
