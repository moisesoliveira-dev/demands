import {
    Component, computed, inject, signal,
    ViewChild, ElementRef, TemplateRef, ViewContainerRef, OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
    LucideAngularModule, LucideIconData,
    Bell, BellRing, CheckCheck, Trash2, X, Clock,
    AlertTriangle, CheckCircle, Info, UserCheck,
    RefreshCw, AlertCircle, Plus,
} from 'lucide-angular';
import { Overlay, OverlayRef, ConnectedPosition } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { NotificacoesService } from '../../services/notificacoes.service';
import { Notificacao, NotificacaoTipo } from '../../types';

@Component({
    selector: 'app-notificacoes-bell',
    standalone: true,
    imports: [CommonModule, LucideAngularModule],
    template: `
    <!-- Bell trigger button -->
    <button #bellTrigger
        (click)="toggle()"
        [attr.aria-expanded]="aberto()"
        aria-label="Notificações"
        class="relative inline-flex items-center justify-center w-9 h-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
        <lucide-angular [img]="hasUnread() ? BellRing : Bell" size="20" />
        @if (svc.contadorNaoLidas() > 0) {
            <span class="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none pointer-events-none select-none">
                {{ svc.contadorNaoLidas() > 9 ? '9+' : svc.contadorNaoLidas() }}
            </span>
        }
    </button>

    <!-- Panel overlay template -->
    <ng-template #panelTpl>
        <div class="w-[22rem] flex flex-col rounded-xl border border-border bg-background shadow-2xl overflow-hidden animate-scale-in"
             style="max-height: min(520px, 80vh)"
             (click)="$event.stopPropagation()">

            <!-- Header -->
            <div class="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
                <div class="flex items-center gap-2">
                    <lucide-angular [img]="Bell" size="15" class="text-muted-foreground" />
                    <span class="font-semibold text-foreground text-sm">Notificações</span>
                    @if (svc.contadorNaoLidas() > 0) {
                        <span class="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                            {{ svc.contadorNaoLidas() }}
                        </span>
                    }
                </div>
                <div class="flex items-center gap-1">
                    @if (svc.contadorNaoLidas() > 0) {
                        <button (click)="marcarTodasLidas()"
                            class="text-xs text-primary hover:text-primary/80 px-2 py-1 rounded hover:bg-accent transition-colors flex items-center gap-1"
                            title="Marcar todas como lidas">
                            <lucide-angular [img]="CheckCheck" size="12" />
                            <span>Marcar todas</span>
                        </button>
                    }
                    <button (click)="fechar()"
                        class="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        aria-label="Fechar painel">
                        <lucide-angular [img]="X" size="15" />
                    </button>
                </div>
            </div>

            <!-- Notification list -->
            <div class="overflow-y-auto flex-1 divide-y divide-border">
                @if (svc.items().length === 0) {
                    <div class="flex flex-col items-center justify-center py-14 gap-3">
                        <div class="p-4 rounded-full bg-muted">
                            <lucide-angular [img]="Bell" size="22" class="text-muted-foreground" />
                        </div>
                        <div class="text-center">
                            <p class="text-sm font-medium text-foreground">Nenhuma notificação</p>
                            <p class="text-xs text-muted-foreground mt-0.5">Você está em dia com tudo!</p>
                        </div>
                    </div>
                }
                @for (n of svc.items(); track n.id) {
                    <button [class]="itemClass(n)" (click)="abrirNotificacao(n)">
                        <div class="flex gap-3">
                            <div [class]="iconWrapClass(n)">
                                <lucide-angular [img]="tipoIcon(n.tipo)" size="13" />
                            </div>
                            <div class="flex-1 min-w-0 text-left">
                                <div class="flex items-start justify-between gap-2">
                                    <p class="text-sm font-medium text-foreground leading-snug line-clamp-1">{{ n.titulo }}</p>
                                    @if (!n.lida) {
                                        <span class="flex-shrink-0 h-2 w-2 rounded-full bg-primary mt-1.5"></span>
                                    }
                                </div>
                                <p class="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{{ n.mensagem }}</p>
                                <p class="text-[10px] text-muted-foreground/60 mt-1.5 flex items-center gap-1">
                                    <lucide-angular [img]="Clock" size="9" />
                                    {{ timeAgo(n.timestamp) }}
                                </p>
                            </div>
                        </div>
                    </button>
                }
            </div>

            <!-- Footer -->
            @if (svc.items().length > 0) {
                <div class="px-4 py-2.5 border-t border-border bg-muted/20 flex items-center justify-between flex-shrink-0">
                    <button (click)="limpar()"
                        class="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1.5 transition-colors">
                        <lucide-angular [img]="Trash2" size="11" />
                        Limpar tudo
                    </button>
                    <span class="text-[11px] text-muted-foreground">
                        {{ svc.items().length }} {{ svc.items().length === 1 ? 'notificação' : 'notificações' }}
                    </span>
                </div>
            }
        </div>
    </ng-template>
  `,
})
export class NotificacoesBellComponent implements OnDestroy {
    readonly svc = inject(NotificacoesService);
    private readonly overlay = inject(Overlay);
    private readonly vcr = inject(ViewContainerRef);
    private readonly router = inject(Router);

    // Icons
    readonly Bell = Bell; readonly BellRing = BellRing; readonly CheckCheck = CheckCheck;
    readonly Trash2 = Trash2; readonly X = X; readonly Clock = Clock;
    readonly AlertTriangle = AlertTriangle; readonly CheckCircle = CheckCircle;
    readonly Info = Info; readonly UserCheck = UserCheck;
    readonly RefreshCw = RefreshCw; readonly AlertCircle = AlertCircle; readonly Plus = Plus;

    @ViewChild('bellTrigger') bellTrigger!: ElementRef;
    @ViewChild('panelTpl') panelTpl!: TemplateRef<unknown>;

    private overlayRef?: OverlayRef;
    aberto = signal(false);
    hasUnread = computed(() => this.svc.contadorNaoLidas() > 0);

    toggle() {
        if (this.aberto()) this.fechar();
        else this.abrirPanel();
    }

    abrirPanel() {
        const positions: ConnectedPosition[] = [
            { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 4 },
            { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -4 },
        ];
        const positionStrategy = this.overlay
            .position()
            .flexibleConnectedTo(this.bellTrigger.nativeElement)
            .withPositions(positions)
            .withPush(false);

        this.overlayRef = this.overlay.create({
            positionStrategy,
            scrollStrategy: this.overlay.scrollStrategies.close(),
            hasBackdrop: true,
            backdropClass: 'cdk-overlay-transparent-backdrop',
        });
        this.overlayRef.backdropClick().subscribe(() => this.fechar());
        this.overlayRef.attach(new TemplatePortal(this.panelTpl, this.vcr));
        this.aberto.set(true);
    }

    fechar() {
        this.overlayRef?.detach();
        this.overlayRef?.dispose();
        this.overlayRef = undefined;
        this.aberto.set(false);
    }

    async marcarTodasLidas() {
        await this.svc.marcarTodasLidas();
    }

    async limpar() {
        await this.svc.limpar();
        this.fechar();
    }

    async abrirNotificacao(n: Notificacao) {
        await this.svc.removerPorId(n.id);
        // Notificações relacionadas a uma demanda → vão para o kanban com o item destacado.
        if (n.demandaId) {
            this.router.navigate(['/demandas'], {
                queryParams: { view: 'kanban', highlight: n.demandaId },
            });
            this.fechar();
            return;
        }
        if (n.acao) {
            this.router.navigateByUrl(n.acao);
            this.fechar();
        }
        this.fechar();
    }

    // ── Helpers de estilo ────────────────────────────────────────────────────

    itemClass(n: Notificacao): string {
        return [
            'w-full block px-4 py-3 transition-colors text-left cursor-pointer',
            n.lida ? 'hover:bg-muted/50' : 'bg-primary/5 hover:bg-primary/10',
        ].join(' ');
    }

    iconWrapClass(n: Notificacao): string {
        const base = 'mt-0.5 h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0';
        const map: Record<NotificacaoTipo, string> = {
            demanda_criada: 'bg-blue-500/10 text-blue-600',
            demanda_atualizada: 'bg-amber-500/10 text-amber-600',
            demanda_bloqueada: 'bg-red-500/10 text-red-600',
            demanda_concluida: 'bg-green-500/10 text-green-600',
            demanda_atribuida: 'bg-purple-500/10 text-purple-600',
            sistema: 'bg-slate-500/10 text-muted-foreground',
            alerta: 'bg-orange-500/10 text-orange-600',
        };
        return `${base} ${map[n.tipo] ?? map.sistema}`;
    }

    tipoIcon(tipo: NotificacaoTipo): LucideIconData {
        const map: Record<NotificacaoTipo, LucideIconData> = {
            demanda_criada: this.Plus,
            demanda_atualizada: this.RefreshCw,
            demanda_bloqueada: this.AlertTriangle,
            demanda_concluida: this.CheckCircle,
            demanda_atribuida: this.UserCheck,
            sistema: this.Info,
            alerta: this.AlertCircle,
        };
        return map[tipo] ?? this.Info;
    }

    timeAgo(timestamp: string): string {
        const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
        if (diff < 60) return 'agora mesmo';
        if (diff < 3600) { const m = Math.floor(diff / 60); return `há ${m} ${m === 1 ? 'minuto' : 'minutos'}`; }
        if (diff < 86400) { const h = Math.floor(diff / 3600); return `há ${h} ${h === 1 ? 'hora' : 'horas'}`; }
        const d = Math.floor(diff / 86400);
        return `há ${d} ${d === 1 ? 'dia' : 'dias'}`;
    }

    ngOnDestroy() {
        this.fechar();
    }
}
