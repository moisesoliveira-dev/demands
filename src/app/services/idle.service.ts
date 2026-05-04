import { Injectable, inject, signal, NgZone, DestroyRef } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { toast } from '../lib/toast';

/** Tempo limite de inatividade até o logout automático (ms). */
const IDLE_TIMEOUT_MS = 60 * 60 * 1000;     // 1 hora
/** Aviso antes do logout (ms). */
const WARNING_BEFORE_MS = 60 * 1000;        // 1 minuto antes
/** Eventos que reiniciam o timer. */
const ACTIVITY_EVENTS: ReadonlyArray<keyof DocumentEventMap> = [
    'mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click', 'wheel',
];
/** Throttle entre resets do timer (ms) — evita custo em mousemove. */
const RESET_THROTTLE_MS = 5_000;
/** Chave de storage usada para sincronizar atividade entre abas. */
const ACTIVITY_KEY = 'last-activity-ts';

/**
 * Monitora inatividade do usuário e desloga após `IDLE_TIMEOUT_MS`.
 *
 * Características:
 * - Funciona entre múltiplas abas via `localStorage` (atividade em uma aba reinicia todas).
 * - Aviso 1 minuto antes do logout via toast.
 * - Eventos com throttle para não impactar a performance.
 */
@Injectable({ providedIn: 'root' })
export class IdleService {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly zone = inject(NgZone);
    private readonly destroyRef = inject(DestroyRef);

    private logoutTimer?: ReturnType<typeof setTimeout>;
    private warningTimer?: ReturnType<typeof setTimeout>;
    private lastResetTs = 0;
    private started = false;

    readonly idleSegundosRestantes = signal<number>(IDLE_TIMEOUT_MS / 1000);

    private readonly handleActivity = () => this.reset();
    private readonly handleStorage = (e: StorageEvent) => {
        if (e.key === ACTIVITY_KEY) this.reset(/* skipBroadcast */ true);
    };

    /** Inicia o monitoramento. Idempotente. */
    start(): void {
        if (this.started) return;
        if (!this.auth.isAuthenticated()) return;
        this.started = true;

        this.zone.runOutsideAngular(() => {
            for (const ev of ACTIVITY_EVENTS) {
                document.addEventListener(ev, this.handleActivity, { passive: true });
            }
            window.addEventListener('storage', this.handleStorage);
        });

        this.reset();
        this.destroyRef.onDestroy(() => this.stop());
    }

    /** Encerra o monitoramento (chamado em logout ou destroy). */
    stop(): void {
        if (!this.started) return;
        this.started = false;
        for (const ev of ACTIVITY_EVENTS) {
            document.removeEventListener(ev, this.handleActivity);
        }
        window.removeEventListener('storage', this.handleStorage);
        this.clearTimers();
    }

    /** Reinicia o timer de inatividade. */
    reset(skipBroadcast = false): void {
        const now = Date.now();
        if (now - this.lastResetTs < RESET_THROTTLE_MS) return;
        this.lastResetTs = now;

        this.clearTimers();

        // Sincroniza atividade entre abas
        if (!skipBroadcast) {
            try { localStorage.setItem(ACTIVITY_KEY, String(now)); } catch { }
        }

        this.zone.runOutsideAngular(() => {
            this.warningTimer = setTimeout(() => {
                this.zone.run(() => {
                    toast.warning('Sessão expirando', 'Você será desconectado em 1 minuto por inatividade.');
                });
            }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);

            this.logoutTimer = setTimeout(() => {
                this.zone.run(() => this.fazerLogoutPorInatividade());
            }, IDLE_TIMEOUT_MS);
        });
    }

    private clearTimers() {
        if (this.logoutTimer) { clearTimeout(this.logoutTimer); this.logoutTimer = undefined; }
        if (this.warningTimer) { clearTimeout(this.warningTimer); this.warningTimer = undefined; }
    }

    private fazerLogoutPorInatividade() {
        this.stop();
        this.auth.logout();
        toast.error('Sessão expirada', 'Você foi desconectado por 1 hora de inatividade.');
        this.router.navigate(['/login']);
    }
}
