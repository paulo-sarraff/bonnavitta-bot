import { AuthRequest } from '../middleware/auth.middleware.js';
import { Request, Response } from 'express';
import { sessionService } from '../services/session.service.js';
import { botFlowService } from '../services/bot-flow.service.js';
import { vendasService } from '../services/vendas.service.js';
import { chartService } from '../services/chart.service.js';
import logger from '../utils/logger.js';
import { EstadoBot } from '../models/schemas.js';

export class BotController {
  /**
   * Processar mensagem do usuário
   * POST /api/bot/message
   */
  async processarMensagem(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { canal, chatId, mensagem, usuarioId } = req.body;

      if (!canal || !chatId || !mensagem || !usuarioId) {

        res.status(400).json({
          success: false,
          mensagem: 'usuarioId, canal, chatId e mensagem são obrigatórios',
        });
        return;
      }

      logger.info(`Mensagem recebida de ${usuarioId}: ${mensagem}`);

      // Obter ou criar sessão
      let sessao = await sessionService.obterSessao(
        chatId,
        canal as 'telegram' | 'whatsapp'
      );

      if (!sessao) {
        sessao = await sessionService.criarSessao(
          usuarioId,
          canal as 'telegram' | 'whatsapp',
          chatId,
          EstadoBot.MENU_PRINCIPAL
        );
      }

      if (!sessao) {
        // segurança extra — nunca deveria acontecer
        throw new Error('Falha ao obter ou criar sessão do usuário');
      }

      // Processar resposta baseado no estado atual
      const resultado = await botFlowService.processarResposta(
        mensagem,
        (sessao.estadoAtual as EstadoBot) || EstadoBot.MENU_PRINCIPAL,
        sessao.dadosContexto || {}
      );

      // Atualizar estado da sessão
      await sessionService.atualizarEstado(sessao.id, resultado.proximoEstado, resultado.contextoAtualizado);

      // Se precisa processar dados (estado PROCESSANDO)
      let grafico: string | null = null;
      if (resultado.proximoEstado === EstadoBot.PROCESSANDO) {
        const resposta = await this.processarConsulta(resultado.contextoAtualizado);
        resultado.resposta.resposta = resposta.texto;
        grafico = resposta.grafico;

        // Atualizar para estado de exibição de resultado
        resultado.proximoEstado = EstadoBot.EXIBINDO_RESULTADO;
        await sessionService.atualizarEstado(sessao.id, resultado.proximoEstado, resultado.contextoAtualizado);
      }

      logger.info(`Resposta enviada para ${usuarioId}`);

      res.status(200).json({
        success: true,
        resposta: resultado.resposta.resposta,
        opcoes: resultado.resposta.opcoes,
        grafico,
        proximoEstado: resultado.proximoEstado,
      });
    } catch (error) {
      logger.error('Erro ao processar mensagem:', error);
      res.status(500).json({
        success: false,
        mensagem: 'Erro ao processar mensagem',
      });
    }
  }

  /**
   * Processar consulta de vendas - Alinhado com as 8 procedures
   */
  private async processarConsulta(contexto: any): Promise<{ texto: string; grafico: string | null }> {
    try {
      const { opcaoMenuPrincipal, dataInicio, dataFim, tipoConsulta } = contexto;

      // 1. Totalizador de Vendas
      if (opcaoMenuPrincipal === '1') {
        // 1.1 Vendas por Supervisor
        if (tipoConsulta === 'supervisor') {
          const vendas = await vendasService.getVendasPorSupervisor(dataInicio, dataFim);
          const texto = vendasService.formatarVendasPorSupervisor(vendas);
          const grafico = await chartService.gerarGraficoVendasPorSupervisor(vendas);
          return { texto, grafico };
        }
        // 1.2 Vendas por Vendedor
        else if (tipoConsulta === 'vendedor') {
          const vendas = await vendasService.getVendasPorVendedor(dataInicio, dataFim);
          const texto = vendasService.formatarVendasPorVendedor(vendas);
          const grafico = await chartService.gerarGraficoVendasPorVendedor(vendas);
          return { texto, grafico };
        }
        // 1.3 Vendas por Equipe
        else if (tipoConsulta === 'equipe') {
          const vendas = await vendasService.getVendasPorEquipe(dataInicio, dataFim);
          const texto = vendasService.formatarVendasPorFabricante(vendas);
          const grafico = await chartService.gerarGraficoVendasPorEquipe(vendas);
          return { texto, grafico };
        }
      }

      // 2. Vendas por Dia
      if (opcaoMenuPrincipal === '2') {
        const vendas = await vendasService.getVendasPorDia(dataInicio, dataFim);
        const texto = vendasService.formatarVendasPorDia(vendas);
        const grafico = await chartService.gerarGraficoVendasPorDia(vendas);
        return { texto, grafico };
      }

      // 3. Ranking de Produtos
      if (opcaoMenuPrincipal === '3') {
        const produtos = await vendasService.getRankingProdutos(dataInicio, dataFim, 10);
        const texto = vendasService.formatarRankingProdutos(produtos);
        const grafico = await chartService.gerarGraficoRankingProdutos(produtos);
        return { texto, grafico };
      }

      // 4. Totalizador por Fabricante
      if (opcaoMenuPrincipal === '4') {
        const vendas = await vendasService.getVendasPorFabricante(dataInicio, dataFim);
        const texto = vendasService.formatarVendasPorFabricante(vendas);
        const grafico = await chartService.gerarGraficoVendasPorFabricante(vendas);
        return { texto, grafico };
      }

      return { texto: 'Erro ao processar consulta', grafico: null };
    } catch (error) {
      logger.error('Erro ao processar consulta:', error);
      return { texto: 'Erro ao processar consulta', grafico: null };
    }
  }

  /**
   * Obter menu principal
   * GET /api/bot/menu
   */
  async getMenuPrincipal(_req: Request, res: Response): Promise<void> {
    try {
      const menu = botFlowService.getMenuPrincipal();
      res.status(200).json({
        success: true,
        menu,
      });
    } catch (error) {
      logger.error('Erro ao obter menu:', error);
      res.status(500).json({
        success: false,
        mensagem: 'Erro ao obter menu',
      });
    }
  }

  /**
   * Health check
   * GET /api/bot/health
   */
  async health(_req: Request, res: Response): Promise<void> {
    res.status(200).json({
      success: true,
      mensagem: 'Bot rodando normalmente',
    });
  }
}

const botController = new BotController();

export { botController };