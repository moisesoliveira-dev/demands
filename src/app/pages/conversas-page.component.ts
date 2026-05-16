import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { DemandasService } from '../services/demandas.service';
import { DemandasChatsViewComponent } from '../components/demandas/demandas-chats-view.component';

/**
 * Página dedicada de Conversas — layout estilo WhatsApp.
 *
 * Rota: /conversas
 * Query param suportado: ?demandaId=xxx — pré-seleciona a conversa.
 *
 * Esta página existe para ser ligada a um item de menu próprio no CASCI
 * (menu_url='/conversas'). Links a partir de outras telas (kanban,
 * demanda-detalhe) navegam para cá passando `demandaId`.
 */
@Component({
    selector: 'app-conversas-page',
    standalone: true,
    imports: [CommonModule, DemandasChatsViewComponent],
    template: `
    <demandas-chats-view #chats />
  `,
})
export class ConversasPageComponent implements OnInit {
    @ViewChild('chats') chats!: DemandasChatsViewComponent;

    private route = inject(ActivatedRoute);
    private demandasService = inject(DemandasService);

    async ngOnInit() {
        // Garante que demandas estão carregadas (página acessível direto via URL).
        if (this.demandasService.demandas().length === 0) {
            await this.demandasService.carregar();
        }

        this.route.queryParamMap.subscribe((params) => {
            const id = params.get('demandaId');
            if (id && this.chats) this.chats.selecionar(id);
        });
    }
}
