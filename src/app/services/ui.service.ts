import { Injectable, signal, effect } from '@angular/core';

const KEY = 'ui-storage';

interface UIState {
    sidebarCollapsed: boolean;
    sidebarMobileOpen: boolean;
}

@Injectable({ providedIn: 'root' })
export class UIService {
    private readonly _state = signal<UIState>(this.load());

    readonly sidebarCollapsed = signal(this._state().sidebarCollapsed);
    readonly sidebarMobileOpen = signal(this._state().sidebarMobileOpen);

    constructor() {
        effect(() => {
            const s = { sidebarCollapsed: this.sidebarCollapsed(), sidebarMobileOpen: this.sidebarMobileOpen() };
            try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { }
        });
    }

    private load(): UIState {
        try {
            const raw = localStorage.getItem(KEY);
            if (raw) return JSON.parse(raw);
        } catch { }
        return { sidebarCollapsed: false, sidebarMobileOpen: false };
    }

    toggleSidebar() { this.sidebarCollapsed.update((v) => !v); }
    setSidebarMobileOpen(v: boolean) { this.sidebarMobileOpen.set(v); }
}
