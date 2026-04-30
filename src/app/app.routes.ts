import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './guards/auth.guard';

export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () => import('./pages/login-page.component').then((m) => m.LoginPageComponent),
    },
    {
        path: '',
        canActivate: [authGuard],
        loadComponent: () => import('./components/app-shell.component').then((m) => m.AppShellComponent),
        children: [
            { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
            {
                path: 'dashboard',
                loadComponent: () => import('./pages/dashboard-page.component').then((m) => m.DashboardPageComponent),
                data: { pageTitle: 'Dashboard', breadcrumbs: [{ label: 'Dashboard' }] },
            },
            {
                path: 'demandas',
                loadComponent: () => import('./pages/demandas-page.component').then((m) => m.DemandasPageComponent),
                data: { pageTitle: 'Gerenciar Demandas', breadcrumbs: [{ label: 'Demandas' }] },
            },
            {
                path: 'nova-demanda',
                loadComponent: () => import('./pages/nova-demanda-page.component').then((m) => m.NovaDemandaPageComponent),
                data: { pageTitle: 'Nova Demanda', breadcrumbs: [{ label: 'Demandas' }, { label: 'Nova Demanda' }] },
            },
            {
                path: 'demanda-detalhe/:id',
                loadComponent: () => import('./pages/demanda-detalhe-page.component').then((m) => m.DemandaDetalhePageComponent),
                data: { pageTitle: 'Detalhes da Demanda', breadcrumbs: [{ label: 'Demandas' }, { label: 'Detalhes' }] },
            },
            {
                path: 'relatorios',
                loadComponent: () => import('./pages/relatorios-page.component').then((m) => m.RelatoriosPageComponent),
                data: { pageTitle: 'Relatórios', breadcrumbs: [{ label: 'Relatórios' }] },
            },
            {
                path: 'usuarios',
                canActivate: [adminGuard],
                loadComponent: () => import('./pages/usuarios-page.component').then((m) => m.UsuariosPageComponent),
                data: { pageTitle: 'Usuários', breadcrumbs: [{ label: 'Usuários' }] },
            },
            {
                path: 'setores',
                canActivate: [adminGuard],
                loadComponent: () => import('./pages/setores-page.component').then((m) => m.SetoresPageComponent),
                data: { pageTitle: 'Setores', breadcrumbs: [{ label: 'Setores' }] },
            },
            {
                path: 'configuracoes',
                canActivate: [adminGuard],
                loadComponent: () => import('./pages/configuracoes-page.component').then((m) => m.ConfiguracoesPageComponent),
                data: { pageTitle: 'Configurações', breadcrumbs: [{ label: 'Configurações' }] },
            },
        ],
    },
    {
        path: '**',
        loadComponent: () => import('./pages/not-found-page.component').then((m) => m.NotFoundPageComponent),
    },
];
