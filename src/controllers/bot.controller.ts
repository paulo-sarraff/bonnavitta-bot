import { AuthRequest } from '../middleware/auth.middleware.js';
import { Request, Response } from 'express';
import { sessionService } from '../services/session.service.js';
import { botFlowService } from '../services/bot-flow.service.js';
import { vendasService } from '../services/vendas.service.js';
import { chartService } from '../services/chart.service.js';
import logger from '../utils/logger.js';
import { EstadoBot } from '../models/schemas.js';
import { BotProcessResult } from '../models/bot-response.js';
import { authService } from '../services/auth.service.js';

export class BotController {

  async message(req: AuthRequest, res: Response) {
    try {
      const resultado = await this.processarMensagem(req);
      return res.json(resultado);
    } catch (error) {
      logger.error(error);
      return res.status(500).json({ erro: 'Erro interno' });
    }
  }

  /**
   * Processar mensagem do usuário
   * POST /api/bot/message
   */
  async processarMensagem(req: AuthRequest): Promise<BotProcessResult> {
    try {
      const { canal, chatId, mensagem, usuarioId } = req.body ?? {};

      if (!canal || !chatId || !mensagem || !usuarioId) {
        throw new Error('canal, chatId, mensagem e usuarioId são obrigatórios');
      }

      logger.info(`Mensagem recebida de ${usuarioId}: ${mensagem}`);

      // =========================
      // Obter ou criar sessão
      // =========================
      let sessao = await sessionService.obterSessao(
        chatId,
        canal as 'telegram' | 'whatsapp'
      );

      if (!sessao) {
        sessao = await sessionService.criarSessao(
          usuarioId, 
          canal as 'telegram' | 'whatsapp',
          chatId,
          '' // token vazio
        );
      }

      if (!sessao) {
        throw new Error('Falha ao obter ou criar sessão do usuário');
      }

      // ✅ CORRIGIDO: Inicializar estado apenas na primeira mensagem
      // Antes: Forçava estado para AGUARDANDO_LOGIN a cada mensagem
      // Agora: Inicializa apenas se sessão não tem estado definido
      if (!sessao.estadoAtual) {
        logger.info(`Inicializando estado da sessão ${sessao.id} para AGUARDANDO_LOGIN`);
        await sessionService.atualizarSessaoCompleta(sessao.id, {
          estadoAtual: EstadoBot.AGUARDANDO_LOGIN,
        });
        sessao.estadoAtual = EstadoBot.AGUARDANDO_LOGIN;
      }

      // =========================
      // BLOCO DE LOGIN
      // =========================
      if (sessao.estadoAtual === EstadoBot.AGUARDANDO_LOGIN) {
        logger.info(`Sessão ${sessao.id} aguardando login`);

        const partes = mensagem.trim().split(' ');

        if (partes.length < 2) {
          return {
            resposta:
              '🔐 Para acessar o bot, informe seu CPF e telefone.\n\nExemplo:\n77803450253 92994375522',
            proximoEstado: EstadoBot.AGUARDANDO_LOGIN,
          };
        }

        const [cpf, telefone] = partes;

        const resultadoLogin = await authService.login(cpf, telefone);

        if (
          !resultadoLogin.success ||
          !resultadoLogin.usuario ||
          !resultadoLogin.token
        ) {
          logger.warn(`Login inválido para chatId ${chatId}`);

          return {
            resposta: '❌ CPF ou telefone inválidos. Tente novamente.',
            proximoEstado: EstadoBot.AGUARDANDO_LOGIN,
          };
        }

        // ✅ Atualiza sessão com dados do usuário autenticado
        await sessionService.atualizarSessaoCompleta(sessao.id, {
          usuarioId: resultadoLogin.usuario.id,
          token: resultadoLogin.token,
          estadoAtual: EstadoBot.MENU_PRINCIPAL,
        });

        logger.info(
          `Usuário ${resultadoLogin.usuario.nome} autenticado na sessão ${sessao.id}`
        );

        return {
          resposta: `✅ Login realizado com sucesso!\n\nBem-vindo, ${resultadoLogin.usuario.nome}`,
          opcoes: botFlowService.getMenuPrincipal().opcoes,
          proximoEstado: EstadoBot.MENU_PRINCIPAL,
        };
      }

      // =========================
      // COMANDO RESET (Menu/Início)
      // =========================
      // ✅ CORRIGIDO: Este bloco agora é alcançável porque não força estado para AGUARDANDO_LOGIN
      const mensagemNormalizada = mensagem.trim().toLowerCase();
      const comandosReset = ['oi', 'olá', 'ola', 'menu', 'iniciar', 'start'];

      if (comandosReset.includes(mensagemNormalizada)) {
        logger.info(`Comando reset detectado: ${mensagemNormalizada}`);
        
        await sessionService.atualizarSessaoCompleta(sessao.id, {
          estadoAtual: EstadoBot.MENU_PRINCIPAL,
          dadosContexto: {},
        });

        return {
          resposta: botFlowService.getMenuPrincipal().resposta,
          opcoes: botFlowService.getMenuPrincipal().opcoes,
          proximoEstado: EstadoBot.MENU_PRINCIPAL,
        };
      }

      // =========================
      // PROCESSAR FLUXO NORMAL
      // =========================
      const resultadoFluxo = await botFlowService.processarResposta(
        mensagem,
        (sessao.estadoAtual as EstadoBot) || EstadoBot.MENU_PRINCIPAL,
        sessao.dadosContexto || {}
      );

      // Atualizar estado da sessão
      await sessionService.atualizarEstado(
        sessao.id,
        resultadoFluxo.proximoEstado,
        resultadoFluxo.contextoAtualizado
      );

      // =========================
      // PROCESSAMENTO DE CONSULTA
      // =========================
      let grafico: string | null = null;
      let respostaFinal = resultadoFluxo.resposta.resposta;

      if (resultadoFluxo.proximoEstado === EstadoBot.PROCESSANDO) {
        const respostaConsulta = await this.processarConsulta(
          resultadoFluxo.contextoAtualizado
        );

        respostaFinal = respostaConsulta.texto;
        grafico = respostaConsulta.grafico;

        // Atualizar para estado de exibição de resultado
        await sessionService.atualizarEstado(
          sessao.id,
          EstadoBot.EXIBINDO_RESULTADO,
          resultadoFluxo.contextoAtualizado
        );

        resultadoFluxo.proximoEstado = EstadoBot.EXIBINDO_RESULTADO;
      }

      logger.info(`Resposta enviada para ${usuarioId}`);

      // =========================
      // Retorno PADRONIZADO para webhook
      // =========================
      return {
        resposta: respostaFinal,
        opcoes: resultadoFluxo.resposta.opcoes,
        grafico,
        proximoEstado: resultadoFluxo.proximoEstado,
      };
    } catch (error) {
      logger.error('Erro ao processar mensagem:', error);

      return {
        resposta: 'Erro ao processar mensagem',
        proximoEstado: EstadoBot.MENU_PRINCIPAL,
      };
    }
  }

  /**
   * Processar consulta de vendas
   */
  private async processarConsulta(
    contexto: any
  ): Promise<{ texto: string; grafico: string | null }> {
    try {
      const { opcaoMenuPrincipal, dataInicio, dataFim, tipoConsulta } = contexto;

      // 1. Totalizador de Vendas
      if (opcaoMenuPrincipal === '1') {
        if (tipoConsulta === 'supervisor') {
          const vendas = await vendasService.getVendasPorSupervisor(dataInicio, dataFim);
          const texto = vendasService.formatarVendasPorSupervisor(vendas);
          const grafico = await chartService.gerarGraficoVendasPorSupervisor(vendas);
          return { texto, grafico };
        }

        if (tipoConsulta === 'vendedor') {
          const vendas = await vendasService.getVendasPorVendedor(dataInicio, dataFim);
          const texto = vendasService.formatarVendasPorVendedor(vendas);
          const grafico = await chartService.gerarGraficoVendasPorVendedor(vendas);
          return { texto, grafico };
        }

        if (tipoConsulta === 'equipe') {
          const vendas = await vendasService.getVendasPorEquipe(dataInicio, dataFim);
          const texto = vendasService.formatarVendasPorEquipe(vendas);
          const grafico = await chartService.gerarGraficoVendasPorEquipe(vendas);
          return { texto, grafico };
        }

        if (tipoConsulta === 'fabricante') {
          const vendas = await vendasService.getVendasPorFabricante(dataInicio, dataFim);
          const texto = vendasService.formatarVendasPorFabricante(vendas);
          const grafico = await chartService.gerarGraficoVendasPorFabricante(vendas);
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