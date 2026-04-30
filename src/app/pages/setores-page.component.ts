import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Building2, PlusCircle, Pencil, Trash2 } from 'lucide-angular';
import { UiCard, UiCardContent, UiCardHeader, UiCardTitle } from '../components/ui/card.component';
import { UiButton } from '../components/ui/button.component';

interface Setor { id: string; nome: string; descricao: string; ativo: boolean; }

const KEY = 'setores';
const DEFAULTS: Setor[] = [
    { id: 's1', nome: 'Produção', descricao: 'Linha de produção principal', ativo: true },
    { id: 's2', nome: 'Usinagem', descricao: 'Setor de usinagem CNC', ativo: true },
    { id: 's3', nome: 'Montagem', descricao: 'Montagem de conjuntos', ativo: true },
    { id: 's4', nome: 'Qualidade', descricao: 'Controle de qualidade', ativo: true },
    { id: 's5', nome: 'Manutenção', descricao: 'Manutenção industrial', ativo: true },
    { id: 's6', nome: 'TI', descricao: 'Tecnologia da informação', ativo: true },
];

@Component({
    selector: 'app-setores',
    standalone: true,
    imports: [CommonModule, LucideAngularModule, UiCard, UiCardContent, UiCardHeader, UiCardTitle, UiButton],
    template: `
    <div class="space-y-4">
      <div class="flex justify-between items-center">
        <p class="text-slate-600 text-sm">Gerenciar setores da empresa</p>
        <ui-button size="sm"><lucide-angular [img]="PlusCircle" size="16" class="mr-1" /> Novo Setor</ui-button>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        @for (s of setores(); track s.id) {
          <ui-card>
            <ui-card-header>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <lucide-angular [img]="Building2" size="20" class="text-amber-600" />
                  <ui-card-title class="text-base">{{ s.nome }}</ui-card-title>
                </div>
                <span [class]="s.ativo ? 'text-green-600' : 'text-slate-400'" class="text-xs font-medium">
                  {{ s.ativo ? 'Ativo' : 'Inativo' }}
                </span>
              </div>
            </ui-card-header>
            <ui-card-content class="space-y-3">
              <p class="text-sm text-slate-600">{{ s.descricao }}</p>
              <div class="flex gap-2">
                <ui-button variant="outline" size="sm" class="flex-1">
                  <lucide-angular [img]="Pencil" size="14" class="mr-1" /> Editar
                </ui-button>
                <ui-button variant="outline" size="sm" (click)="remover(s.id)">
                  <lucide-angular [img]="Trash2" size="14" />
                </ui-button>
              </div>
            </ui-card-content>
          </ui-card>
        }
      </div>
    </div>
  `,
})
export class SetoresPageComponent {
    readonly Building2 = Building2; readonly PlusCircle = PlusCircle; readonly Pencil = Pencil; readonly Trash2 = Trash2;

    setores = signal<Setor[]>(this.load());

    private load(): Setor[] {
        try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch { }
        return DEFAULTS;
    }

    private save() { try { localStorage.setItem(KEY, JSON.stringify(this.setores())); } catch { } }

    remover(id: string) {
        this.setores.update((arr) => arr.filter((s) => s.id !== id));
        this.save();
    }
}
