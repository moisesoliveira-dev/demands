import { Injectable, signal, effect } from '@angular/core';

const KEY = 'ui-storage';

interface UIState {
    sidebarCollapsed: boolean;
    sidebarMobileOpen: boolean;
    theme: 'light' | 'dark';
}

@Injectable({ providedIn: 'root' })
export class UIService {
    private readonly _state = signal<UIState>(this.load());

    readonly sidebarCollapsed = signal(this._state().sidebarCollapsed);
    readonly sidebarMobileOpen = signal(this._state().sidebarMobileOpen);
    readonly theme = signal<'light' | 'dark'>(this._state().theme ?? 'light');

    constructor() {
        effect(() => {
            const t = this.theme();
            document.documentElement.classList.toggle('dark', t === 'dark');
        });
        effect(() => {
            const s: UIState = {
                sidebarCollapsed: this.sidebarCollapsed(),
                sidebarMobileOpen: this.sidebarMobileOpen(),
                theme: this.theme(),
            };
            try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { }
        });
    }

    private load(): UIState {
        try {
            const raw = localStorage.getItem(KEY);
            if (raw) return JSON.parse(raw);
        } catch { }
        return { sidebarCollapsed: false, sidebarMobileOpen: false, theme: 'light' };
    }

    toggleSidebar() { this.sidebarCollapsed.update((v) => !v); }
    setSidebarMobileOpen(v: boolean) { this.sidebarMobileOpen.set(v); }
    toggleTheme() { this.theme.update(t => t === 'light' ? 'dark' : 'light'); }
}

