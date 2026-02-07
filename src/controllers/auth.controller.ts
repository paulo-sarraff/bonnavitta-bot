import { Request, Response } from 'express';
import { authService } from '../services/auth.service.js';
import logger from '../utils/logger.js';

class AuthController {
  /**
   * Login do usuário com CPF e telefone
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { cpf, telefone } = req.body;

      // Validar entrada
      if (!cpf || !telefone) {
        res.status(400).json({
          success: false,
          mensagem: 'CPF e telefone são obrigatórios',
        });
        return;
      }

      // Realizar login
      const resultado = await authService.login(cpf, telefone);

      if (!resultado.success) {
        res.status(401).json(resultado);
        return;
      }

      // Retornar sucesso com token
      res.status(200).json(resultado);
    } catch (error) {
      logger.error('Erro no controller de login:', error);
      res.status(500).json({
        success: false,
        mensagem: 'Erro ao processar login',
      });
    }
  }

  /**
   * Validar token
   */
  async validarToken(req: Request, res: Response): Promise<void> {
    try {
      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
        res.status(401).json({
          success: false,
          mensagem: 'Token não fornecido',
        });
        return;
      }

      const decoded = authService.verificarToken(token);

      if (!decoded) {
        res.status(401).json({
          success: false,
          mensagem: 'Token inválido ou expirado',
        });
        return;
      }

      res.status(200).json({
        success: true,
        usuario: decoded,
      });
    } catch (error) {
      logger.error('Erro ao validar token:', error);
      res.status(500).json({
        success: false,
        mensagem: 'Erro ao validar token',
      });
    }
  }
}

export const authController = new AuthController();