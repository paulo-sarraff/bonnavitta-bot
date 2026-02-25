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
import { usuariosCadastrados } from '../config/usuarios-cadastrados.js';

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

      // =========================
      // BLOCO 1: AGUARDANDO CPF
      // =========================
      if (sessao.estadoAtual === EstadoBot.AGUARDANDO_CPF) {
        logger.info(`Sessão ${sessao.id} aguardando CPF`);

        const cpfLimpo = mensagem.trim().replace(/\D/g, '');

        // Validar se é um CPF válido (11 dígitos)
        if (cpfLimpo.length !== 11) {
          return {
            resposta: '❌ CPF inválido. Informe um CPF válido com 11 dígitos.\n\nExemplo: 12345678910',
            proximoEstado: EstadoBot.AGUARDANDO_CPF,
          };
        }

        // ✅ Validar se CPF existe na lista de usuários cadastrados
        const usuarioComCPF = usuariosCadastrados.find(u => u.cpf === cpfLimpo);

        if (!usuarioComCPF) {
          logger.warn(`CPF não encontrado na lista de usuários: ${cpfLimpo}`);
          return {
            resposta: '❌ CPF não encontrado. Verifique e tente novamente.\n\nExemplo: 12345678910',
            proximoEstado: EstadoBot.AGUARDANDO_CPF,
          };
        }

        if (!usuarioComCPF.ativo) {
          logger.warn(`Usuário inativo: ${usuarioComCPF.nome}`);
          return {
            resposta: '❌ Seu usuário está inativo. Entre em contato com o administrador.',
            proximoEstado: EstadoBot.AGUARDANDO_CPF,
          };
        }

        // ✅ Armazenar CPF no contexto
        await sessionService.atualizarSessaoCompleta(sessao.id, {
          estadoAtual: EstadoBot.AGUARDANDO_TELEFONE,
          dadosContexto: {
            cpfTemporario: cpfLimpo,
          },
        });

        logger.info(`CPF recebido e validado para sessão ${sessao.id}: ${cpfLimpo}`);

        return {
          resposta: '✅ CPF recebido!\n\n📞 Agora informe seu telefone:\n\nExemplo: 92999999999',
          proximoEstado: EstadoBot.AGUARDANDO_TELEFONE,
        };
      }

      // =========================
      // BLOCO 2: AGUARDANDO TELEFONE
      // =========================
      if (sessao.estadoAtual === EstadoBot.AGUARDANDO_TELEFONE) {
        logger.info(`Sessão ${sessao.id} aguardando telefone`);

        const telefoneLimpo = mensagem.trim().replace(/\D/g, '');

        // Validar se é um telefone válido (10-11 dígitos)
        if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
          return {
            resposta: '❌ Telefone inválido. Informe um telefone válido com 10 ou 11 dígitos.\n\nExemplo: 92999999999',
            proximoEstado: EstadoBot.AGUARDANDO_TELEFONE,
          };
        }

        // ✅ Recuperar CPF do contexto
        const cpfTemporario = sessao.dadosContexto?.cpfTemporario;

        if (!cpfTemporario) {
          logger.error(`CPF não encontrado no contexto da sessão ${sessao.id}`);
          return {
            resposta: '❌ Erro ao processar login. Tente novamente.\n\n📱 Informe seu CPF:',
            proximoEstado: EstadoBot.AGUARDANDO_CPF,
          };
        }

        // ✅ Validar CPF + Telefone contra usuários cadastrados
        const usuarioValidado = usuariosCadastrados.find(
          u => u.cpf === cpfTemporario && u.telefone === telefoneLimpo
        );

        if (!usuarioValidado) {
          logger.warn(`Login inválido para chatId ${chatId}: CPF ${cpfTemporario}, Telefone ${telefoneLimpo}`);
          
          // ✅ CORRIGIDO: Limpar contexto ao retornar para AGUARDANDO_CPF
          await sessionService.atualizarSessaoCompleta(sessao.id, {
            estadoAtual: EstadoBot.AGUARDANDO_CPF,
            dadosContexto: {}, // ✅ Limpar contexto
          });

          return {
            resposta: '❌ CPF ou telefone inválidos. Tente novamente.\n\n📱 Informe seu CPF:',
            proximoEstado: EstadoBot.AGUARDANDO_CPF,
          };
        }

        if (!usuarioValidado.ativo) {
          logger.warn(`Usuário inativo tentou fazer login: ${usuarioValidado.nome}`);
          return {
            resposta: '❌ Seu usuário está inativo. Entre em contato com o administrador.',
            proximoEstado: EstadoBot.AGUARDANDO_CPF,
          };
        }

        // ✅ Gerar token usando authService
        const token = authService.gerarToken(usuarioValidado);

        // ✅ Atualizar sessão com dados do usuário autenticado
        await sessionService.atualizarSessaoCompleta(sessao.id, {
          usuarioId: usuarioValidado.id,
          token: token,
          estadoAtual: EstadoBot.MENU_PRINCIPAL,
          dadosContexto: {}, // ✅ Limpar contexto temporário
        });

        logger.info(
          `Usuário ${usuarioValidado.nome} (ID: ${usuarioValidado.id}) autenticado na sessão ${sessao.id}`
        );

        return {
          resposta: `✅ Login realizado com sucesso!\n\nBem-vindo, ${usuarioValidado.nome}! 🎉`,
          opcoes: botFlowService.getMenuPrincipal(usuarioValidado.roles, usuarioValidado.nome).opcoes, // ✅ CORRIGIDO: Passar roles
          proximoEstado: EstadoBot.MENU_PRINCIPAL,
        };
      }

      // =========================
      // COMANDO RESET (Menu/Início)
      // =========================
      const mensagemNormalizada = mensagem.trim().toLowerCase();
      const comandosReset = ['oi', 'olá', 'ola', 'menu', 'iniciar', 'start'];

      if (comandosReset.includes(mensagemNormalizada)) {
        logger.info(`Comando reset detectado: ${mensagemNormalizada}`);
        
        await sessionService.atualizarSessaoCompleta(sessao.id, {
          estadoAtual: EstadoBot.MENU_PRINCIPAL,
          dadosContexto: {},
        });

        const usuario = usuariosCadastrados.find(u => u.id === sessao.usuarioId);
        const roles = usuario?.roles || [];
        const menu = botFlowService.getMenuPrincipal(roles, usuario?.nome || ''); // ✅ CORRIGIDO: Passar roles
        
        return {
          resposta: menu.resposta,
          opcoes: menu.opcoes,
          proximoEstado: EstadoBot.MENU_PRINCIPAL,
        };
      }

      // =========================
      // PROCESSAR FLUXO NORMAL
      // =========================
      // ✅ CORRIGIDO: Passar roles do usuário para processarResposta
      const usuarioSession = usuariosCadastrados.find(u => u.id === sessao.usuarioId);
      const usuarioRoles = usuarioSession?.roles || [];
      const resultadoFluxo = await botFlowService.processarResposta(
        mensagem,
        (sessao.estadoAtual as EstadoBot) || EstadoBot.MENU_PRINCIPAL,
        sessao.dadosContexto || {},
        usuarioRoles, 
        usuarioSession?.nome || ''
      );

      // Atualizar estado da sessão
      await sessionService.atualizarEstado(
        sessao.id,
        resultadoFluxo.proximoEstado,
        resultadoFluxo.contextoAtualizado
      );

      // =========================
      // TRATAMENTO DE LOGOUT
      // =========================
      if (resultadoFluxo.proximoEstado === EstadoBot.ENCERRADO) {
        logger.info(`Sessao ${sessao.id} encerrada (logout)`);
        // Resetar sessao para estado inicial (AGUARDANDO_CPF)
        await sessionService.resetarSessao(chatId, canal as 'telegram' | 'whatsapp');
        
        return {
          resposta: resultadoFluxo.resposta.resposta,
          opcoes: [],
          grafico: null,
          proximoEstado: EstadoBot.AGUARDANDO_CPF, // Retornar para tela de login
        };
      }

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
        //grafico = respostaConsulta.grafico;

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
        if (tipoConsulta === '1') {
          const vendas = await vendasService.getVendasPorSupervisor(dataInicio, dataFim);
          const texto = vendasService.formatarVendasPorSupervisor(vendas);
          const grafico = '';//await chartService.gerarGraficoVendasPorSupervisor(vendas);
          return { texto, grafico };
        }

        if (tipoConsulta === '2') {
          const vendas = await vendasService.getVendasPorVendedor(dataInicio, dataFim);
          const texto = vendasService.formatarVendasPorVendedor(vendas);
          const grafico = '';//await chartService.gerarGraficoVendasPorVendedor(vendas);
          return { texto, grafico };
        }

        if (tipoConsulta === '3') {
          const vendas = await vendasService.getVendasPorEquipe(dataInicio, dataFim);
          const texto = vendasService.formatarVendasPorEquipe(vendas);
          const grafico = '';//await chartService.gerarGraficoVendasPorEquipe(vendas);
          return { texto, grafico };
        }

        if (tipoConsulta === '4') {
          const vendas = await vendasService.getVendasPorFabricante(dataInicio, dataFim);
          const texto = vendasService.formatarVendasPorFabricante(vendas);
          const grafico = '';//await chartService.gerarGraficoVendasPorFabricante(vendas);
          return { texto, grafico };
        }
      }

      // 2. Vendas por Dia
      if (opcaoMenuPrincipal === '2') {
        const vendas = await vendasService.getVendasPorDia(dataInicio, dataFim);
        const texto = vendasService.formatarVendasPorDia(vendas);
        const grafico = '';//await chartService.gerarGraficoVendasPorDia(vendas);
        return { texto, grafico };
      }

      // 3. Ranking de Produtos
      if (opcaoMenuPrincipal === '3') {
        const produtos = await vendasService.getRankingProdutos(dataInicio, dataFim, 10);
        const texto = vendasService.formatarRankingProdutos(produtos);
        const grafico = '';//await chartService.gerarGraficoRankingProdutos(produtos);
        return { texto, grafico };
      }

      // 4. Totalizador por Fabricante
      if (opcaoMenuPrincipal === '4') {
        const vendas = await vendasService.getVendasPorFabricante(dataInicio, dataFim);
        const texto = vendasService.formatarVendasPorFabricante(vendas);
        const grafico = '';//await chartService.gerarGraficoVendasPorFabricante(vendas);
        return { texto, grafico };
      }
      
      return { texto: 'Erro ao processar consulta', grafico: null };
    } catch (error) {
      logger.error('Erro ao processar consulta:', error);
      return { texto: 'Erro ao processar consulta', grafico: null };
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