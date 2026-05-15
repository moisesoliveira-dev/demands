import { Role, Permission } from './permissions';

export interface User {
    id: string;
    nome: string;
    email: string;
    /** Login corporativo (dbacesso) */
    usua_login?: string;
    usua_nome?: string;
    usua_email?: string;
    usua_id?: number;
    usua_cpf?: string;
    usua_foto?: string;
    usua_sfcs_idusuario?: number;
    cargo?: string;
    setor?: string;
    role: Role;
    customPermissions?: Permission[];
    avatar?: string;
    avatarUrl?: string;
    ativo: boolean;
    criadoEm?: string;
    ultimoAcesso?: string;
}

export interface CreateUserInput {
    nome: string;
    email: string;
    senha: string;
    cargo: string;
    setor: string;
    role: Role;
    customPermissions?: Permission[];
}

export interface UpdateUserInput {
    nome?: string;
    email?: string;
    cargo?: string;
    setor?: string;
    role?: Role;
    customPermissions?: Permission[];
    ativo?: boolean;
}
