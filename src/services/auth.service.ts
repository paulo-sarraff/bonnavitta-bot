import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { Usuario, LoginResponse } from '../models/schemas.js';
import { usuariosCadastrados } from '../config/usuarios-cadastrados.js';

class AuthService {
  /**
   * Valida credenciais do usuário (busca em arquivo local)
   */
  async validarUsuario(cpf: string, telefone: string): Promise<Usuario | null> {
    try {
      // Limpar CPF e telefone (remover caracteres especiais)
      const cpfLimpo = this.limparCPF(cpf);
      const telefoneLimpo = this.limparTelefone(telefone);

      logger.info(`Tentativa de login: CPF ${cpfLimpo}, Telefone ${telefoneLimpo}`);

      // Buscar usuário no array local
      const usuarioEncontrado = usuariosCadastrados.find(
        (u) => u.cpf === cpfLimpo && u.telefone === telefoneLimpo
      );

      if (!usuarioEncontrado) {
        logger.warn(`Tentativa de login inválida: CPF ${cpfLimpo}`);
        return null;
      }

      if (!usuarioEncontrado.ativo) {
        logger.warn(`Usuário inativo: ${usuarioEncontrado.nome}`);
        return null;
      }

      logger.info(`Usuário autenticado: ${usuarioEncontrado.nome} (${usuarioEncontrado.cpf})`);

      return {
        id: usuarioEncontrado.id,
        cpf: usuarioEncontrado.cpf,
        nome: usuarioEncontrado.nome,
        email: usuarioEncontrado.email,
        telefone: usuarioEncontrado.telefone,
        equipeId: usuarioEncontrado.equipeId,
        nomeEquipe: usuarioEncontrado.nomeEquipe,
        role: usuarioEncontrado.role,
        ativo: usuarioEncontrado.ativo,
      };
    } catch (error) {
      logger.error('Erro ao validar usuário:', error);
      throw error;
    }
  }

  /**
   * Limpa CPF (remove caracteres especiais)
   */
  private limparCPF(cpf: string): string {
    return cpf.replace(/\D/g, '');
  }

  /**
   * Limpa telefone (remove caracteres especiais)
   */
  private limparTelefone(telefone: string): string {
    return telefone.replace(/\D/g, '');
  }

  /**
   * Gera token JWT
   */
  gerarToken(usuario: Usuario): string {
    try {
      const token = jwt.sign(
        {
          id: usuario.id,
          cpf: usuario.cpf,
          nome: usuario.nome,
          equipeId: usuario.equipeId,
          role: usuario.role,
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiration }
      );

      logger.info(`Token gerado para usuário: ${usuario.nome}`);
      return token;
    } catch (error) {
      logger.error('Erro ao gerar token:', error);
      throw error;
    }
  }

  /**
   * Verifica e decodifica token JWT
   */
  verificarToken(token: string): any {
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      return decoded;
    } catch (error) {
      logger.warn('Token inválido ou expirado');
      return null;
    }
  }

  /**
   * Realiza login do usuário
   */
  async login(cpf: string, telefone: string): Promise<LoginResponse> {
    try {
      // Validar credenciais
      const usuario = await this.validarUsuario(cpf, telefone);

      if (!usuario) {
        return {
          success: false,
          mensagem: 'CPF ou telefone inválidos. Tente novamente.',
        };
      }

      // Gerar token
      const token = this.gerarToken(usuario);

      return {
        success: true,
        token,
        usuario,
        mensagem: `Bem-vindo, ${usuario.nome}!`,
      };
    } catch (error) {
      logger.error('Erro durante login:', error);
      return {
        success: false,
        mensagem: 'Erro ao processar login. Tente novamente.',
      };
    }
  }

  /**
   * Valida autorização por role
   */
  validarAutorizacao(usuarioRole: string, rolesPermitidos: string[]): boolean {
    return rolesPermitidos.includes(usuarioRole);
  }

  /**
   * Valida se usuário pode acessar dados de uma equipe
   */
  validarAcessoEquipe(
    usuarioRole: string,
    usuarioEquipeId: number,
    equipeIdSolicitada: number
  ): boolean {
    // Admin pode acessar tudo
    if (usuarioRole === 'admin') {
      return true;
    }

    // Gerente/Vendedor só pode acessar sua própria equipe
    if (usuarioRole === 'gerente' || usuarioRole === 'vendedor') {
      return usuarioEquipeId === equipeIdSolicitada;
    }

    return false;
  }
}

export const authService = new AuthService();