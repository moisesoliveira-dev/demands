import { Injectable, computed } from '@angular/core';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { Permission, ROLE_PERMISSIONS } from '../types';

@Injectable({ providedIn: 'root' })
export class PermissionsService {
    private readonly auth = inject(AuthService);

    readonly permissions = computed<Permission[]>(() => {
        const u = this.auth.user();
        if (!u) return [];
        const base = ROLE_PERMISSIONS[u.role] ?? [];
        return [...new Set([...base, ...(u.customPermissions ?? [])])];
    });

    has(p: Permission, demandaResponsavelId?: string): boolean {
        const perms = this.permissions();
        if (perms.includes(p)) return true;
        // fallback to .proprias variant
        if (p.endsWith('.proprias')) return false;
        const proprias = (p + '.proprias') as Permission;
        if (perms.includes(proprias)) {
            const u = this.auth.user();
            return !!u && demandaResponsavelId === u.nome;
        }
        return false;
    }
}
