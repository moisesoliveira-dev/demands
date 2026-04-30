import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormularioDemandaComponent } from '../components/demandas/formulario-demanda.component';
import { UiCard, UiCardContent, UiCardHeader, UiCardTitle, UiCardDescription } from '../components/ui/card.component';

@Component({
    selector: 'app-nova-demanda',
    standalone: true,
    imports: [CommonModule, FormularioDemandaComponent, UiCard, UiCardContent, UiCardHeader, UiCardTitle, UiCardDescription],
    template: `
    <div class="max-w-3xl mx-auto">
      <ui-card>
        <ui-card-header>
          <ui-card-title>Nova Demanda</ui-card-title>
          <ui-card-description>Preencha os dados para criar uma nova demanda industrial.</ui-card-description>
        </ui-card-header>
        <ui-card-content>
          <formulario-demanda (created)="onCreated()" (cancel)="router.navigate(['/demandas'])" />
        </ui-card-content>
      </ui-card>
    </div>
  `,
})
export class NovaDemandaPageComponent {
    router = inject(Router);
    onCreated() { this.router.navigate(['/demandas']); }
}
