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
    role: 'admin',
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
    role: 'diretoria',
    ativo: true,
  }
  // Adicione mais usuários conforme necessário
];