// Usuários cadastrados localmente
// ⚠️ AVISO: Dados sensíveis em código. Usar apenas para MVP!

import { Usuario } from "../models/schemas";

export const usuariosCadastrados: Usuario[] = [
  {
    id: 1,
    cpf: '77803450253',
    telefone: '92994375522',
    nome: 'Paulo Sarraff',
    email: 'sarraffjr@gmail.com',
    equipeId: 1,
    nomeEquipe: 'Administradores',
    roles: ['admin', 'diretoria', 'comercial'],
    ativo: true,
  },
  {
    id: 2,
    cpf: '00684932237',
    telefone: '92988023600',
    nome: 'Eduardo Grigoletto',
    email: 'luiz@bonnavitta.com',
    equipeId: 2,
    nomeEquipe: 'Diretoria',
    roles: ['diretoria', 'comercial'],
    ativo: true,
  },
  {
    id: 3,
    cpf: '21276978049',
    telefone: '92988023605',
    nome: 'Devanei Grigoletto',
    email: 'devanei@bonnavitta.com',
    equipeId: 3,
    nomeEquipe: 'Diretoria',
    roles: ['diretoria', 'comercial'],
    ativo: true,
  },
  {
    id: 4,
    cpf: '62637940204',
    telefone: '92988020288',
    nome: 'Nivaldino Junior',
    email: 'junior@bonnavitta.com',
    equipeId: 4,
    nomeEquipe: 'Diretoria',
    roles: ['diretoria'],
    ativo: true,
  },
  {
    id: 5,
    cpf: '00422812293',
    telefone: '92981940699',
    nome: 'Yan Goes',
    email: 'yan@patrimonio.com',
    equipeId: 4,
    nomeEquipe: 'Diretoria',
    roles: ['diretoria'],
    ativo: true,
  },  
];