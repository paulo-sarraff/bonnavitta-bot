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
   * Valida se o usuário possui uma das roles permitidas
   */
  validarAutorizacao(usuarioRole: string, rolesPermitidos: string[]): boolean {
    try {
      if (!usuarioRole) {
        logger.warn('Role do usuário não informada');
        return false;
      }

      if (!rolesPermitidos || rolesPermitidos.length === 0) {
        logger.warn('Nenhuma role permitida foi definida');
        return false;
      }

      const autorizado = rolesPermitidos.includes(usuarioRole);

      if (!autorizado) {
        logger.warn(
          `Role não autorizada. Role do usuário: ${usuarioRole} | Permitidas: ${rolesPermitidos.join(', ')}`
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
    usuarioRole: string,
    usuarioEquipeId: number,
    equipeIdSolicitada: number
  ): boolean {
    try {
      if (!usuarioRole) {
        logger.warn('Role do usuário não informada para validação de equipe');
        return false;
      }

      if (!equipeIdSolicitada) {
        logger.warn('Equipe solicitada não informada');
        return false;
      }

      // Admin pode acessar qualquer equipe
      if (usuarioRole === 'admin') {
        return true;
      }

      // Gerente e vendedor só podem acessar a própria equipe
      if (usuarioRole === 'gerente' || usuarioRole === 'vendedor') {
        const permitido = usuarioEquipeId === equipeIdSolicitada;

        if (!permitido) {
          logger.warn(
            `Acesso negado. Usuário da equipe ${usuarioEquipeId} tentou acessar equipe ${equipeIdSolicitada}`
          );
        }

        return permitido;
      }

      // Qualquer outro perfil é negado
      logger.warn(`Role não reconhecida para acesso por equipe: ${usuarioRole}`);
      return false;

    } catch (error) {
      logger.error('Erro ao validar acesso por equipe:', error);
      return false;
    }
  }


}

export const authService = new AuthService();