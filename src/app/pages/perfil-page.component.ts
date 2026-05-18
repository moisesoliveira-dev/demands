import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { LucideAngularModule, User as UserIcon, Mail, Shield, Building2, Calendar, KeyRound, Save, Camera, Check as CheckIcon, X as XIcon, Loader2 } from 'lucide-angular';
import { AuthService } from '../services/auth.service';
import { UiCard, UiCardContent, UiCardHeader, UiCardTitle, UiCardDescription } from '../components/ui/card.component';
import { UiButton } from '../components/ui/button.component';
import { UiLabel } from '../components/ui/form-elements.component';
import { UiAvatar } from '../components/ui/avatar.component';
import { UiBadge } from '../components/ui/badge.component';
import { MotionInViewDirective } from '../lib/motion.directives';
import { toast } from '../lib/toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

@Component({
  selector: 'app-perfil-page',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, LucideAngularModule,
    UiCard, UiCardContent, UiCardHeader, UiCardTitle, UiCardDescription,
    UiButton, UiLabel, UiAvatar, UiBadge,
    MotionInViewDirective,
  ],
  template: `
    @if (auth.user(); as user) {
      <div class="max-w-5xl mx-auto space-y-6">
        <!-- Header / cartão de identificação -->
        <ui-card motionInView class="overflow-hidden">
          <div class="h-24 bg-linear-to-r from-amber-500 via-orange-500 to-rose-500"></div>
          <div class="px-6 pb-6">
            <div class="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
              <div class="relative">
                <ui-avatar [name]="user.nome" [src]="avatarPreview() ?? user.avatar"
                  class="h-24 w-24 border-4 border-background ring-2 ring-amber-500/20"
                  fallbackClass="bg-muted text-muted-foreground text-2xl font-semibold" />
                <button type="button" (click)="fileInput.click()" [disabled]="savingAvatar()"
                  class="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow hover:scale-105 transition-transform disabled:opacity-60 disabled:cursor-not-allowed"
                  title="Alterar foto">
                  @if (savingAvatar()) {
                    <lucide-angular [img]="Loader2" size="14" class="animate-spin" />
                  } @else {
                    <lucide-angular [img]="Camera" size="14" />
                  }
                </button>
                <input #fileInput type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                  class="hidden" (change)="onFileSelected($event)" />
                @if (avatarPreview()) {
                  <div class="absolute -top-1 -right-1 flex gap-0.5">
                    <button type="button" (click)="confirmAvatar()" [disabled]="savingAvatar()"
                      class="h-5 w-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow hover:bg-emerald-600 transition-colors"
                      title="Confirmar">
                      <lucide-angular [img]="CheckIcon" size="11" />
                    </button>
                    <button type="button" (click)="cancelAvatar()"
                      class="h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow hover:bg-red-600 transition-colors"
                      title="Cancelar">
                      <lucide-angular [img]="XIcon" size="11" />
                    </button>
                  </div>
                }
              </div>
              <div class="flex-1 min-w-0 sm:pb-2">
                <h2 class="text-2xl font-bold text-foreground truncate">{{ user.nome }}</h2>
                <p class="text-sm text-muted-foreground truncate">{{ user.email }}</p>
                <div class="flex flex-wrap gap-2 mt-2">
                  <ui-badge variant="secondary" class="bg-amber-500/10 text-amber-700 border-amber-500/20">
                    <lucide-angular [img]="Shield" size="11" class="mr-1" /> {{ user.role | titlecase }}
                  </ui-badge>
                  <ui-badge variant="secondary" class="bg-blue-500/10 text-blue-700 border-blue-500/20">
                    <lucide-angular [img]="Building2" size="11" class="mr-1" /> {{ user.setor }}
                  </ui-badge>
                  @if (user.ativo) {
                    <ui-badge variant="secondary" class="bg-green-500/10 text-green-700 border-green-500/20">Ativo</ui-badge>
                  } @else {
                    <ui-badge variant="secondary" class="bg-red-500/10 text-red-700 border-red-500/20">Inativo</ui-badge>
                  }
                </div>
              </div>
              <div class="text-xs text-muted-foreground sm:pb-2 space-y-1">
                <div class="flex items-center gap-1.5">
                  <lucide-angular [img]="Calendar" size="12" />
                  Membro desde {{ formatDate(user.criadoEm) }}
                </div>
                @if (user.ultimoAcesso) {
                  <div class="flex items-center gap-1.5">
                    <lucide-angular [img]="Calendar" size="12" />
                    Último acesso: {{ formatDate(user.ultimoAcesso) }}
                  </div>
                }
              </div>
            </div>
          </div>
        </ui-card>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Dados pessoais (2 cols) -->
          <ui-card motionInView class="lg:col-span-2">
            <ui-card-header>
              <ui-card-title class="flex items-center gap-2">
                <lucide-angular [img]="UserIcon" size="18" />
                Dados pessoais
              </ui-card-title>
              <ui-card-description>Atualize suas informações de contato.</ui-card-description>
            </ui-card-header>
            <ui-card-content>
              <form [formGroup]="perfilForm" (ngSubmit)="salvarPerfil()" class="space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="space-y-2">
                    <ui-label for="nome">Nome completo</ui-label>
                    <input id="nome" type="text" formControlName="nome"
                      class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                    @if (showError(perfilForm.controls.nome)) {
                      <p class="text-xs text-red-600">Nome é obrigatório (mínimo 3 caracteres).</p>
                    }
                  </div>
                  <div class="space-y-2">
                    <ui-label for="email">Email</ui-label>
                    <input id="email" type="email" formControlName="email"
                      class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                    @if (showError(perfilForm.controls.email)) {
                      <p class="text-xs text-red-600">Email inválido.</p>
                    }
                  </div>
                  <div class="space-y-2 sm:col-span-2">
                    <ui-label for="cargo">Cargo</ui-label>
                    <input id="cargo" type="text" formControlName="cargo"
                      class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                  </div>
                </div>

                <div class="flex justify-end gap-2 pt-2 border-t border-border">
                  <ui-button type="button" variant="outline" (click)="resetarPerfil()" [disabled]="!perfilForm.dirty || savingPerfil()">
                    Cancelar
                  </ui-button>
                  <ui-button type="submit" [disabled]="perfilForm.invalid || !perfilForm.dirty || savingPerfil()">
                    <lucide-angular [img]="Save" size="14" class="mr-1.5" />
                    {{ savingPerfil() ? 'Salvando...' : 'Salvar alterações' }}
                  </ui-button>
                </div>
              </form>
            </ui-card-content>
          </ui-card>

          <!-- Informações somente leitura -->
          <ui-card motionInView>
            <ui-card-header>
              <ui-card-title class="text-base flex items-center gap-2">
                <lucide-angular [img]="Building2" size="16" />
                Organização
              </ui-card-title>
            </ui-card-header>
            <ui-card-content>
              <dl class="space-y-3 text-sm">
                <div>
                  <dt class="text-xs text-muted-foreground">Setor</dt>
                  <dd class="font-medium text-foreground">{{ user.setor }}</dd>
                </div>
                <div>
                  <dt class="text-xs text-muted-foreground">Perfil de acesso</dt>
                  <dd class="font-medium text-foreground">{{ user.role | titlecase }}</dd>
                </div>
                <div>
                  <dt class="text-xs text-muted-foreground">ID do usuário</dt>
                  <dd class="font-mono text-xs text-foreground break-all">{{ user.id }}</dd>
                </div>
              </dl>
              <p class="text-xs text-muted-foreground mt-4 pt-3 border-t border-border">
                Para alterar setor ou perfil de acesso, contate um administrador.
              </p>
            </ui-card-content>
          </ui-card>

          <!-- Alterar senha (full width) -->
          <ui-card motionInView class="lg:col-span-3">
            <ui-card-header>
              <ui-card-title class="flex items-center gap-2">
                <lucide-angular [img]="KeyRound" size="18" />
                Alterar senha
              </ui-card-title>
              <ui-card-description>
                Use uma senha forte com no mínimo 8 caracteres, incluindo letras e números.
              </ui-card-description>
            </ui-card-header>
            <ui-card-content>
              <form [formGroup]="senhaForm" (ngSubmit)="alterarSenha()" class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div class="space-y-2">
                  <ui-label for="senhaAtual">Senha atual</ui-label>
                  <input id="senhaAtual" type="password" formControlName="senhaAtual" autocomplete="current-password"
                    class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                </div>
                <div class="space-y-2">
                  <ui-label for="novaSenha">Nova senha</ui-label>
                  <input id="novaSenha" type="password" formControlName="novaSenha" autocomplete="new-password"
                    class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                  @if (showError(senhaForm.controls.novaSenha)) {
                    <p class="text-xs text-red-600">Mínimo 8 caracteres com letras e números.</p>
                  }
                </div>
                <div class="space-y-2">
                  <ui-label for="confirmarSenha">Confirmar nova senha</ui-label>
                  <input id="confirmarSenha" type="password" formControlName="confirmarSenha" autocomplete="new-password"
                    class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                  @if (senhaForm.errors?.['naoConfere'] && senhaForm.controls.confirmarSenha.touched) {
                    <p class="text-xs text-red-600">As senhas não coincidem.</p>
                  }
                </div>
                <div class="sm:col-span-3 flex justify-end gap-2 pt-2 border-t border-border">
                  <ui-button type="button" variant="outline" (click)="senhaForm.reset()" [disabled]="savingSenha()">
                    Limpar
                  </ui-button>
                  <ui-button type="submit" [disabled]="senhaForm.invalid || savingSenha()">
                    <lucide-angular [img]="KeyRound" size="14" class="mr-1.5" />
                    {{ savingSenha() ? 'Alterando...' : 'Alterar senha' }}
                  </ui-button>
                </div>
              </form>
            </ui-card-content>
          </ui-card>
        </div>
      </div>
    } @else {
      <p class="text-sm text-muted-foreground">Carregando perfil...</p>
    }
  `,
})
export class PerfilPageComponent {
  readonly UserIcon = UserIcon; readonly Mail = Mail; readonly Shield = Shield;
  readonly Building2 = Building2; readonly Calendar = Calendar;
  readonly KeyRound = KeyRound; readonly Save = Save; readonly Camera = Camera;
  readonly CheckIcon = CheckIcon; readonly XIcon = XIcon; readonly Loader2 = Loader2;

  readonly auth = inject(AuthService);
  private fb = inject(FormBuilder);

  savingPerfil = signal(false);
  savingSenha = signal(false);
  savingAvatar = signal(false);
  avatarPreview = signal<string | null>(null);

  private _pendingAvatarDataUrl: string | null = null;

  perfilForm = this.fb.nonNullable.group({
    nome: [this.auth.user()?.nome ?? '', [Validators.required, Validators.minLength(3)]],
    email: [this.auth.user()?.email ?? '', [Validators.required, Validators.email]],
    cargo: [this.auth.user()?.cargo ?? ''],
  });

  senhaForm = this.fb.nonNullable.group(
    {
      senhaAtual: ['', [Validators.required]],
      novaSenha: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/)]],
      confirmarSenha: ['', [Validators.required]],
    },
    { validators: [matchPasswordsValidator] },
  );

  showError(control: AbstractControl): boolean {
    return control.invalid && (control.dirty || control.touched);
  }

  formatDate(iso?: string): string {
    if (!iso) return '—';
    try { return format(new Date(iso), "d 'de' MMMM 'de' yyyy", { locale: ptBR }); }
    catch { return iso; }
  }

  async salvarPerfil() {
    if (this.perfilForm.invalid) return;
    this.savingPerfil.set(true);
    try {
      const v = this.perfilForm.getRawValue();
      await this.auth.atualizarMeuPerfil(v);
      toast.success('Perfil atualizado');
      this.perfilForm.markAsPristine();
    } catch (e: any) {
      toast.error('Erro ao salvar', e?.message || 'Tente novamente');
    } finally {
      this.savingPerfil.set(false);
    }
  }

  resetarPerfil() {
    const u = this.auth.user();
    if (!u) return;
    this.perfilForm.reset({ nome: u.nome, email: u.email, cargo: u.cargo });
  }

  async alterarSenha() {
    if (this.senhaForm.invalid) return;
    this.savingSenha.set(true);
    try {
      const { senhaAtual, novaSenha } = this.senhaForm.getRawValue();
      await this.auth.alterarSenha(senhaAtual, novaSenha);
      toast.success('Senha alterada com sucesso');
      this.senhaForm.reset();
    } catch (e: any) {
      toast.error('Erro ao alterar senha', e?.message || 'Verifique sua senha atual');
    } finally {
      this.savingSenha.set(false);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Reset input so the same file can be selected again if cancelled
    input.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande', 'Tamanho máximo: 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const MAX = 256;
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        const resized = canvas.toDataURL('image/jpeg', 0.85);
        this._pendingAvatarDataUrl = resized;
        this.avatarPreview.set(resized);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  cancelAvatar() {
    this.avatarPreview.set(null);
    this._pendingAvatarDataUrl = null;
  }

  async confirmAvatar() {
    const dataUrl = this._pendingAvatarDataUrl;
    if (!dataUrl) return;
    this.savingAvatar.set(true);
    try {
      await this.auth.atualizarMeuPerfil({ avatar: dataUrl });
      this.avatarPreview.set(null);
      this._pendingAvatarDataUrl = null;
      toast.success('Foto atualizada');
    } catch (e: any) {
      toast.error('Erro ao salvar foto', e?.message || 'Tente novamente');
    } finally {
      this.savingAvatar.set(false);
    }
  }
}

function matchPasswordsValidator(group: AbstractControl): ValidationErrors | null {
  const nova = group.get('novaSenha')?.value;
  const conf = group.get('confirmarSenha')?.value;
  return nova && conf && nova !== conf ? { naoConfere: true } : null;
}
