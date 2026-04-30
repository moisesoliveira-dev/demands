import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule, FileX } from 'lucide-angular';
import { UiButton } from '../components/ui/button.component';

@Component({
    selector: 'app-not-found',
    standalone: true,
    imports: [CommonModule, LucideAngularModule, UiButton],
    template: `
    <div class="min-h-[80vh] flex flex-col items-center justify-center text-center p-6">
      <lucide-angular [img]="FileX" size="64" class="text-slate-400 mb-4" />
      <h1 class="text-3xl font-bold text-slate-900 mb-2">404</h1>
      <p class="text-slate-600 mb-6">Página não encontrada</p>
      <ui-button (click)="router.navigate(['/dashboard'])">Voltar ao Dashboard</ui-button>
    </div>
  `,
})
export class NotFoundPageComponent {
    readonly FileX = FileX;
    router = inject(Router);
}
