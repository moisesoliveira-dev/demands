/**
 * Árvore de menus retornada pelo backend (espelho de `MenuTreeNode` em
 * demands-api/src/dbacesso/types.ts). Compatível com `MenuItem` do PrimeNG.
 */
export interface MenuTreeNode {
    id: number;
    label: string;
    icon: string | null;
    routerLink: string | null;
    order: number;
    perfilId: number | null;
    permissions: { insert: boolean; update: boolean; delete: boolean };
    items: MenuTreeNode[];
}
