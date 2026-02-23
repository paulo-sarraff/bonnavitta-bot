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
    roles: ['admin', 'diretoria', 'comercial'], // ✅ NOVO: Múltiplas roles
    ativo: true,
  },
  {
    id: 2,
    cpf: '00684932237',
    telefone: '92988023600',
    nome: 'Eduardo Grigoletto',
    email: 'luiz@bonnavitta.com',
    equipeId: 2,
    nomeEquipe: 'Food Service',
    roles: ['diretoria', 'comercial'], // ✅ NOVO: Múltiplas roles
    ativo: true,
  },
  // ✅ NOVO: Usuário com role comercial
  {
    id: 3,
    cpf: '12345678901',
    telefone: '92999999999',
    nome: 'Vendedor Comercial',
    email: 'vendedor@bonnavitta.com',
    equipeId: 3,
    nomeEquipe: 'Vendas',
    roles: ['comercial'],
    ativo: true,
  },
  // ✅ NOVO: Usuário com role financeiro
  {
    id: 4,
    cpf: '98765432109',
    telefone: '92988888888',
    nome: 'Analista Financeiro',
    email: 'financeiro@bonnavitta.com',
    equipeId: 4,
    nomeEquipe: 'Financeiro',
    roles: ['financeiro'],
    ativo: true,
  },
  // Adicione mais usuários conforme necessário
];