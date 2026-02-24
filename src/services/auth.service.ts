import jwt from 'jsonwebtoken';
import { usuariosCadastrados } from '../config/usuarios-cadastrados.js';
import logger from '../utils/logger.js';
import config from '../config/index.js';
import { Usuario } from '../models/schemas.js';

export interface LoginResponse {
  success: boolean;
  token?: string;
  usuario?: Usuario;
  mensagem: string;
}

class AuthService {
  /**
   * Limpa CPF removendo caracteres especiais
   */
  private limparCPF(cpf: string): string {
    return cpf.replace(/\D/g, '');
  }

  /**
   * Limpa telefone removendo caracteres especiais
   */
  private limparTelefone(telefone: string): string {
    return telefone.replace(/\D/g, '');
  }

  /**
   * Valida usuário pelo CPF e telefone
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
        email: usuarioEncontrado.email || '',
        telefone: usuarioEncontrado.telefone,
        equipeId: usuarioEncontrado.equipeId,
        nomeEquipe: usuarioEncontrado.nomeEquipe,
        roles: usuarioEncontrado.roles, // CORRIGIDO: Usar roles (array)
        ativo: usuarioEncontrado.ativo,
      };
    } catch (error) {
      logger.error('Erro ao validar usuário:', error);
      throw error;
    }
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
          roles: usuario.roles, // ✅ CORRIGIDO: Usar roles (array) em vez de role (string)
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
   * Valida se o usuário possui uma das roles permitidas
   */
  validarAutorizacao(usuarioRoles: string[], rolesPermitidos: string[]): boolean { // ✅ CORRIGIDO: Usar roles (array)
    try {
      if (!usuarioRoles || usuarioRoles.length === 0) {
        logger.warn('Roles do usuário não informadas');
        return false;
      }

      if (!rolesPermitidos || rolesPermitidos.length === 0) {
        logger.warn('Nenhuma role permitida foi definida');
        return false;
      }

      // Verificar se o usuário possui pelo menos uma das roles permitidas
      const autorizado = usuarioRoles.some(role => rolesPermitidos.includes(role));

      if (!autorizado) {
        logger.warn(
          `Role não autorizada. Roles do usuário: ${usuarioRoles.join(', ')} | Permitidas: ${rolesPermitidos.join(', ')}`
        );
      }

      return autorizado;
    } catch (error) {
      logger.error('Erro ao validar autorização:', error);
      return false;
    }
  }

  /**
   * Valida se o usuário pode acessar dados de determinada equipe
   */
  validarAcessoEquipe(
    usuarioRoles: string[], // ✅ CORRIGIDO: Usar roles (array)
    usuarioEquipeId: number,
    equipeIdSolicitada: number
  ): boolean {
    try {
      if (!usuarioRoles || usuarioRoles.length === 0) {
        logger.warn('Roles do usuário não informadas para validação de equipe');
        return false;
      }

      if (!equipeIdSolicitada) {
        logger.warn('Equipe solicitada não informada');
        return false;
      }

      // Admin, diretoria podem acessar qualquer equipe
      if (usuarioRoles.includes('admin') || usuarioRoles.includes('diretoria')) {
        return true;
      }

      // Comercial e financeiro só podem acessar a própria equipe
      if (usuarioRoles.includes('comercial') || usuarioRoles.includes('financeiro')) {
        const permitido = usuarioEquipeId === equipeIdSolicitada;

        if (!permitido) {
          logger.warn(
            `Acesso negado. Usuário da equipe ${usuarioEquipeId} tentou acessar equipe ${equipeIdSolicitada}`
          );
        }

        return permitido;
      }

      logger.warn(`Roles não reconhecidas para validação de equipe: ${usuarioRoles.join(', ')}`);
      return false;
    } catch (error) {
      logger.error('Erro ao validar acesso à equipe:', error);
      return false;
    }
  }
}

export const authService = new AuthService();
