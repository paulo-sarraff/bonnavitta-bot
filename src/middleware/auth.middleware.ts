import { Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import logger from '../utils/logger.js';
import { AuthRequest } from '../types/auth-request.js';

/**
 * Middleware para validar token JWT
 */
export const validarToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
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

    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Erro no middleware de autenticação:', error);
    res.status(500).json({
      success: false,
      mensagem: 'Erro ao validar autenticação',
    });
  }
};

/**
 * Middleware de autenticação JWT
 */
export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

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

    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Erro no middleware de autenticação:', error);
    res.status(500).json({
      success: false,
      mensagem: 'Erro ao validar token',
    });
  }
};

/**
 * Middleware para validar role do usuário
 */
export const roleMiddleware = (rolesPermitidos: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          mensagem: 'Usuário não autenticado',
        });
        return;
      }

      if (!authService.validarAutorizacao(req.user.role, rolesPermitidos)) {
        logger.warn(`Acesso negado para usuário ${req.user.id} com role ${req.user.role}`);
        res.status(403).json({
          success: false,
          mensagem: 'Você não tem permissão para acessar este recurso',
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Erro no middleware de role:', error);
      res.status(500).json({
        success: false,
        mensagem: 'Erro ao validar permissões',
      });
    }
  };
};

/**
 * Middleware para validar acesso por equipe
 */
export const equipeMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        mensagem: 'Usuário não autenticado',
      });
      return;
    }

    const equipeIdSolicitada = parseInt(req.query.equipeId as string, 10);

    if (!equipeIdSolicitada) {
      next();
      return;
    }

    if (!authService.validarAcessoEquipe(req.user.role, req.user.equipeId, equipeIdSolicitada)) {
      logger.warn(
        `Acesso negado à equipe ${equipeIdSolicitada} para usuário ${req.user.id} da equipe ${req.user.equipeId}`
      );
      res.status(403).json({
        success: false,
        mensagem: 'Você não tem permissão para acessar dados desta equipe',
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Erro no middleware de equipe:', error);
    res.status(500).json({
      success: false,
      mensagem: 'Erro ao validar acesso à equipe',
    });
  }
};
export { AuthRequest };

