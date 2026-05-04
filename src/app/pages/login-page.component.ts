import { Component, inject, signal, ViewChild, ElementRef, AfterViewInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule, Factory, ShieldCheck, ArrowLeft, Mail } from 'lucide-angular';
import { AuthService } from '../services/auth.service';
import { UiCard, UiCardContent, UiCardDescription, UiCardHeader, UiCardTitle } from '../components/ui/card.component';
import { UiLabel } from '../components/ui/form-elements.component';
import { UiButton } from '../components/ui/button.component';
import { toast } from '../lib/toast';

type Step = 'credenciais' | '2fa';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, UiCard, UiCardContent, UiCardDescription, UiCardHeader, UiCardTitle, UiLabel, UiButton],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <ui-card class="w-full max-w-md shadow-xl">
        <ui-card-header class="text-center space-y-3">
          <div class="mx-auto h-14 w-14 rounded-lg bg-primary flex items-center justify-center">
            <lucide-angular [img]="step() === 'credenciais' ? Factory : ShieldCheck" size="28" class="text-primary-foreground" />
          </div>
          <ui-card-title class="text-2xl font-mono">DEMANDS</ui-card-title>
          <ui-card-description>
            @if (step() === 'credenciais') {
              Sistema de Gestão de Demandas Industriais
            } @else {
              Autenticação em duas etapas
            }
          </ui-card-description>
        </ui-card-header>

        <ui-card-content>
          @if (step() === 'credenciais') {
            <form [formGroup]="loginForm" (ngSubmit)="submitCredenciais()" class="space-y-4">
              <div class="space-y-2">
                <ui-label for="email">Email</ui-label>
                <input id="email" type="email" formControlName="email" autocomplete="email" placeholder="seu.email@fabrica.com" class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              </div>
              <div class="space-y-2">
                <ui-label for="senha">Senha</ui-label>
                <input id="senha" type="password" formControlName="senha" autocomplete="current-password" placeholder="••••••" class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              </div>

              <ui-button type="submit" [disabled]="loading() || loginForm.invalid" class="w-full">
                {{ loading() ? 'Verificando...' : 'Entrar' }}
              </ui-button>

              <div class="rounded-md bg-slate-50 border border-slate-200 p-3 text-xs space-y-1 text-slate-600">
                <p class="font-semibold text-slate-700">Credenciais de teste:</p>
                <p>admin&#64;fabrica.com / 123456 (Admin)</p>
                <p>supervisor&#64;fabrica.com / 123456 (Supervisor)</p>
                <p>operador&#64;fabrica.com / 123456 (Operador)</p>
                <p class="pt-1 mt-1 border-t border-slate-200 text-amber-700 font-medium">Código 2FA de teste: 123456</p>
              </div>
            </form>
          } @else {
            <form [formGroup]="otpForm" (ngSubmit)="submit2FA()" class="space-y-4">
              <div class="rounded-md bg-blue-50 border border-blue-200 p-3 text-xs flex items-start gap-2">
                <lucide-angular [img]="Mail" size="14" class="text-blue-600 mt-0.5 flex-shrink-0" />
                <div class="text-blue-900">
                  Enviamos um código de 6 dígitos para
                  <span class="font-semibold">{{ destino() || 'seu email' }}</span>.
                  O código expira em 5 minutos.
                </div>
              </div>

              <div class="space-y-2">
                <ui-label for="codigo">Código de verificação</ui-label>
                <input
                  #otpInput
                  id="codigo"
                  type="text"
                  inputmode="numeric"
                  autocomplete="one-time-code"
                  maxlength="6"
                  formControlName="codigo"
                  placeholder="000000"
                  class="flex h-12 w-full rounded-md border border-input bg-transparent px-3 text-center text-2xl font-mono tracking-[0.5em] shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                @if (otpForm.controls.codigo.touched && otpForm.controls.codigo.invalid) {
                  <p class="text-xs text-red-600">Digite os 6 dígitos do código.</p>
                }
              </div>

              <ui-button type="submit" [disabled]="loading() || otpForm.invalid" class="w-full">
                {{ loading() ? 'Verificando...' : 'Verificar e entrar' }}
              </ui-button>

              <div class="flex items-center justify-between text-xs">
                <button type="button" (click)="voltar()" class="flex items-center gap-1 text-slate-600 hover:text-slate-900 transition-colors">
                  <lucide-angular [img]="ArrowLeft" size="12" /> Voltar
                </button>
                <button type="button" (click)="reenviar()" [disabled]="reenvioCooldown() > 0"
                  class="text-primary hover:text-primary/80 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors">
                  @if (reenvioCooldown() > 0) {
                    Reenviar em {{ reenvioCooldown() }}s
                  } @else {
                    Reenviar código
                  }
                </button>
              </div>
            </form>
          }
        </ui-card-content>
      </ui-card>
    </div>
  `,
})
export class LoginPageComponent implements AfterViewInit {
  readonly Factory = Factory;
  readonly ShieldCheck = ShieldCheck;
  readonly ArrowLeft = ArrowLeft;
  readonly Mail = Mail;

  loading = signal(false);
  step = signal<Step>('credenciais');
  challengeToken = signal<string | null>(null);
  destino = signal<string | undefined>(undefined);
  reenvioCooldown = signal(0);

  @ViewChild('otpInput') otpInput?: ElementRef<HTMLInputElement>;

  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required, Validators.minLength(4)]],
  });

  otpForm = this.fb.nonNullable.group({
    codigo: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  constructor() {
    // Foco automático no input OTP quando entramos na etapa 2FA
    effect(() => {
      if (this.step() === '2fa') {
        queueMicrotask(() => this.otpInput?.nativeElement.focus());
      }
    });
  }

  ngAfterViewInit() { /* foco gerido por effect() */ }

  async submitCredenciais() {
    if (this.loginForm.invalid) return;
    const { email, senha } = this.loginForm.getRawValue();
    this.loading.set(true);
    try {
      const result = await this.auth.loginMock(email, senha);
      if (result.kind === 'authenticated') {
        toast.success('Login realizado!');
        this.router.navigate(['/dashboard']);
        return;
      }
      // Desafio 2FA
      this.challengeToken.set(result.challengeToken);
      this.destino.set(result.destino);
      this.step.set('2fa');
      this.startReenvioCooldown();
      toast.success('Código enviado', `Verifique ${result.destino ?? 'seu email'}`);
    } catch (e: any) {
      toast.error('Erro ao entrar', e?.message || 'Tente novamente');
    } finally {
      this.loading.set(false);
    }
  }

  async submit2FA() {
    if (this.otpForm.invalid) return;
    const token = this.challengeToken();
    if (!token) {
      this.voltar();
      return;
    }
    this.loading.set(true);
    try {
      await this.auth.verificar2FA(token, this.otpForm.getRawValue().codigo);
      toast.success('Login realizado!');
      this.router.navigate(['/dashboard']);
    } catch (e: any) {
      toast.error('Código inválido', e?.message || 'Verifique o código e tente novamente');
      this.otpForm.controls.codigo.reset();
      this.otpInput?.nativeElement.focus();
    } finally {
      this.loading.set(false);
    }
  }

  async reenviar() {
    const token = this.challengeToken();
    if (!token || this.reenvioCooldown() > 0) return;
    try {
      await this.auth.reenviar2FA(token);
      this.startReenvioCooldown();
      toast.success('Novo código enviado');
    } catch {
      toast.error('Falha ao reenviar', 'Tente novamente em alguns instantes');
    }
  }

  voltar() {
    this.step.set('credenciais');
    this.challengeToken.set(null);
    this.destino.set(undefined);
    this.otpForm.reset();
  }

  private startReenvioCooldown() {
    this.reenvioCooldown.set(30);
    const interval = setInterval(() => {
      const v = this.reenvioCooldown() - 1;
      if (v <= 0) { clearInterval(interval); this.reenvioCooldown.set(0); }
      else this.reenvioCooldown.set(v);
    }, 1000);
  }
}
