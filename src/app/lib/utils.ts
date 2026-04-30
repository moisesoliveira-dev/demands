import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function getInitials(name: string): string {
    if (!name) return '?';
    return name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

export function uid(prefix = 'id'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}
