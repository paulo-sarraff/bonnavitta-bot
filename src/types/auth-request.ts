import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    cpf: string;
    nome: string;
    email: string;
    telefone: string;
    equipeId: number;
    nomeEquipe: string;
    role: 'gerente' | 'vendedor' | 'admin';
    ativo: boolean;
  };
  body: any;
  headers: any;
  query: any;
}