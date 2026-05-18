import { Component, inject, signal, AfterViewInit } from '@angular/core';
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
    <div class="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <ui-card class="w-full max-w-md shadow-xl">
        <ui-card-header class="text-center space-y-3">
          <div class="mx-auto h-14 w-14 rounded-lg bg-primary flex items-center justify-center">
            <lucide-angular [img]="Factory" size="28" class="text-primary-foreground" />
          </div>
          <ui-card-title class="text-2xl font-mono">DEMANDS</ui-card-title>
          <ui-card-description>Sistema de Gestão de Demandas Industriais</ui-card-description>
        </ui-card-header>

        <ui-card-content>
          <form [formGroup]="loginForm" (ngSubmit)="submitCredenciais()" class="space-y-4">
            <div class="space-y-2">
              <ui-label for="usua_login">Login</ui-label>
              <input id="usua_login" type="text" formControlName="usua_login"
                autocomplete="username" placeholder="seu.login"
                class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            </div>
            <div class="space-y-2">
              <ui-label for="usua_senha">Senha</ui-label>
              <input id="usua_senha" type="password" formControlName="usua_senha"
                autocomplete="current-password" placeholder="••••••"
                class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            </div>

            <ui-button type="submit" [disabled]="loading() || loginForm.invalid" class="w-full">
              {{ loading() ? 'Verificando...' : 'Entrar' }}
            </ui-button>
          </form>
        </ui-card-content>
      </ui-card>
    </div>
  `,
})
export class LoginPageComponent implements AfterViewInit {
  readonly Factory = Factory;

  loading = signal(false);

  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loginForm = this.fb.nonNullable.group({
    usua_login: ['', [Validators.required, Validators.minLength(1)]],
    usua_senha: ['', [Validators.required, Validators.minLength(1)]],
  });

  private extractErrorMessage(error: any): string {
    const nested = error?.error?.message;
    if (Array.isArray(nested)) return nested.join('; ');
    if (typeof nested === 'string' && nested.trim()) return nested;
    if (typeof error?.message === 'string' && error.message.trim()) return error.message;
    return 'Tente novamente';
  }

  ngAfterViewInit() { }

  async submitCredenciais() {
    if (this.loginForm.invalid) return;
    const { usua_login, usua_senha } = this.loginForm.getRawValue();
    this.loading.set(true);
    try {
      await this.auth.loginMock(usua_login, usua_senha);
      toast.success('Login realizado!');
      this.router.navigate(['/dashboard']);
    } catch (e: any) {
      toast.error('Erro ao entrar', this.extractErrorMessage(e));
    } finally {
      this.loading.set(false);
    }
  }
}