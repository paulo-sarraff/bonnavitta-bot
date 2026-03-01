import { AuthRequest } from '../middleware/auth.middleware.js';
import { Request, Response } from 'express';
import { sessionService } from '../services/session.service.js';
import { botFlowService, SUPERVISORES } from '../services/bot-flow.service.js';
import { vendasService } from '../services/vendas.service.js';
import { chartService } from '../services/chart.service.js';
import logger from '../utils/logger.js';
import { EstadoBot } from '../models/schemas.js';
import { BotProcessResult } from '../models/bot-response.js';
import { authService } from '../services/auth.service.js';
import { usuariosCadastrados } from '../config/usuarios-cadastrados.js';
import { formatarNumero, formatarData, formatarIntervaloData, diaSemanaParaPtBR } from '../utils/formatter.js';

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

      // ─────────────────────────────────────────────────────────────
      // Obter ou criar sessão
      // ─────────────────────────────────────────────────────────────
      let sessao = await sessionService.obterSessao(chatId, canal as 'telegram' | 'whatsapp');

      if (!sessao) {
        sessao = await sessionService.criarSessao(
          usuarioId,
          canal as 'telegram' | 'whatsapp',
          chatId,
          ''
        );
      }

      if (!sessao) {
        throw new Error('Falha ao obter ou criar sessão do usuário');
      }

      // ─────────────────────────────────────────────────────────────
      // BLOCO 1: AGUARDANDO CPF
      // ─────────────────────────────────────────────────────────────
      if (sessao.estadoAtual === EstadoBot.AGUARDANDO_CPF) {
        const cpfLimpo = mensagem.trim().replace(/\D/g, '');

        if (cpfLimpo.length !== 11) {
          return {
            resposta: '❌ CPF inválido. Informe um CPF válido com 11 dígitos.\n\nExemplo: 12345678910',
            proximoEstado: EstadoBot.AGUARDANDO_CPF,
          };
        }

        const usuarioComCPF = usuariosCadastrados.find(u => u.cpf === cpfLimpo);

        if (!usuarioComCPF) {
          return {
            resposta: '❌ CPF não encontrado. Verifique e tente novamente.\n\nExemplo: 12345678910',
            proximoEstado: EstadoBot.AGUARDANDO_CPF,
          };
        }

        if (!usuarioComCPF.ativo) {
          return {
            resposta: '❌ Seu usuário está inativo. Entre em contato com o administrador.',
            proximoEstado: EstadoBot.AGUARDANDO_CPF,
          };
        }

        await sessionService.atualizarSessaoCompleta(sessao.id, {
          estadoAtual: EstadoBot.AGUARDANDO_TELEFONE,
          dadosContexto: { cpfTemporario: cpfLimpo },
        });

        return {
          resposta: '✅ CPF recebido!\n\n📞 Agora informe seu telefone:\n\nExemplo: 92999999999',
          proximoEstado: EstadoBot.AGUARDANDO_TELEFONE,
        };
      }

      // ─────────────────────────────────────────────────────────────
      // BLOCO 2: AGUARDANDO TELEFONE
      // ─────────────────────────────────────────────────────────────
      if (sessao.estadoAtual === EstadoBot.AGUARDANDO_TELEFONE) {
        const telefoneLimpo = mensagem.trim().replace(/\D/g, '');

        if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
          return {
            resposta: '❌ Telefone inválido. Informe um telefone válido com 10 ou 11 dígitos.\n\nExemplo: 92999999999',
            proximoEstado: EstadoBot.AGUARDANDO_TELEFONE,
          };
        }

        const cpfTemporario = sessao.dadosContexto?.cpfTemporario;
        if (!cpfTemporario) {
          return {
            resposta: '❌ Erro ao processar login. Tente novamente.\n\n📱 Informe seu CPF:',
            proximoEstado: EstadoBot.AGUARDANDO_CPF,
          };
        }

        const usuarioValidado = usuariosCadastrados.find(
          u => u.cpf === cpfTemporario && u.telefone === telefoneLimpo
        );

        if (!usuarioValidado) {
          await sessionService.atualizarSessaoCompleta(sessao.id, {
            estadoAtual: EstadoBot.AGUARDANDO_CPF,
            dadosContexto: {},
          });
          return {
            resposta: '❌ CPF ou telefone inválidos. Tente novamente.\n\n📱 Informe seu CPF:',
            proximoEstado: EstadoBot.AGUARDANDO_CPF,
          };
        }

        if (!usuarioValidado.ativo) {
          return {
            resposta: '❌ Seu usuário está inativo. Entre em contato com o administrador.',
            proximoEstado: EstadoBot.AGUARDANDO_CPF,
          };
        }

        const token = authService.gerarToken(usuarioValidado);

        const roles = usuarioValidado.roles ?? [];
        const menuInicial = botFlowService.getMenuPrincipal(roles, usuarioValidado.nome);
        // Respeita o proximoEstado que o próprio menu define
        // (ex: comercial puro → MENU_COMERCIAL; admin/diretoria → MENU_PRINCIPAL)
        const estadoInicial = menuInicial.proximoEstado as EstadoBot;

        await sessionService.atualizarSessaoCompleta(sessao.id, {
          usuarioId: usuarioValidado.id,
          token,
          estadoAtual: estadoInicial,
          dadosContexto: {},
        });

        return {
          resposta: `✅ Login realizado com sucesso!\n\nBem-vindo, ${usuarioValidado.nome}! 🎉\n\n${menuInicial.resposta}`,
          opcoes: menuInicial.opcoes,
          proximoEstado: estadoInicial,
        };
      }

      // ─────────────────────────────────────────────────────────────
      // COMANDO RESET (oi, menu, start…)
      // ─────────────────────────────────────────────────────────────
      const mensagemNormalizada = mensagem.trim().toLowerCase();
      const comandosReset = ['oi', 'olá', 'ola', 'menu', 'iniciar', 'start'];

      if (comandosReset.includes(mensagemNormalizada)) {
        logger.info(`Comando reset detectado: ${mensagemNormalizada}`);

        const usuario = usuariosCadastrados.find(u => u.id === sessao.usuarioId);
        const roles = usuario?.roles ?? [];
        const menu = botFlowService.getMenuPrincipal(roles, usuario?.nome ?? '');
        const estadoReset = menu.proximoEstado as EstadoBot;

        await sessionService.atualizarSessaoCompleta(sessao.id, {
          estadoAtual: estadoReset,
          dadosContexto: {},
        });

        return {
          resposta: menu.resposta,
          opcoes: menu.opcoes,
          proximoEstado: estadoReset,
        };
      }

      // ─────────────────────────────────────────────────────────────
      // PROCESSAR FLUXO NORMAL via BotFlowService
      // ─────────────────────────────────────────────────────────────
      const usuarioSession = usuariosCadastrados.find(u => u.id === sessao.usuarioId);
      const usuarioRoles = usuarioSession?.roles ?? [];
      const nomeUsuario = usuarioSession?.nome ?? '';

      const resultadoFluxo = await botFlowService.processarResposta(
        mensagem,
        (sessao.estadoAtual as EstadoBot) || EstadoBot.MENU_PRINCIPAL,
        sessao.dadosContexto || {},
        usuarioRoles,
        nomeUsuario
      );

      // Atualizar estado da sessão
      await sessionService.atualizarEstado(
        sessao.id,
        resultadoFluxo.proximoEstado,
        resultadoFluxo.contextoAtualizado
      );

      // ─────────────────────────────────────────────────────────────
      // LOGOUT
      // ─────────────────────────────────────────────────────────────
      if (resultadoFluxo.proximoEstado === EstadoBot.ENCERRADO) {
        await sessionService.resetarSessao(chatId, canal as 'telegram' | 'whatsapp');
        return {
          resposta: resultadoFluxo.resposta.resposta,
          opcoes: [],
          grafico: null,
          proximoEstado: EstadoBot.AGUARDANDO_CPF,
        };
      }

      // ─────────────────────────────────────────────────────────────
      // PROCESSAMENTO DE CONSULTA (estado PROCESSANDO)
      // ─────────────────────────────────────────────────────────────
      if (resultadoFluxo.proximoEstado === EstadoBot.PROCESSANDO) {
        const respostaConsulta = await this.processarConsulta(
          resultadoFluxo.contextoAtualizado,
          usuarioRoles,
          nomeUsuario
        );

        // Atualizar sessão com o próximo estado pós-processamento
        await sessionService.atualizarEstado(
          sessao.id,
          respostaConsulta.proximoEstado,
          respostaConsulta.contexto
        );

        return {
          resposta: respostaConsulta.texto,
          opcoes: respostaConsulta.opcoes,
          grafico: respostaConsulta.grafico,
          proximoEstado: respostaConsulta.proximoEstado,
        };
      }

      // ─────────────────────────────────────────────────────────────
      // Retorno padrão
      // ─────────────────────────────────────────────────────────────
      return {
        resposta: resultadoFluxo.resposta.resposta,
        opcoes: resultadoFluxo.resposta.opcoes,
        grafico: null,
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

  // ─────────────────────────────────────────────────────────────────────────
  // PROCESSAMENTO DE CONSULTAS — lógica centralizada por subFluxo
  // ─────────────────────────────────────────────────────────────────────────

  private async processarConsulta(
    contexto: any,
    roles: string[],
    nomeUsuario: string
  ): Promise<{
    texto: string;
    opcoes?: any[];
    grafico: string | null;
    proximoEstado: EstadoBot;
    contexto: any;
  }> {
    try {
      const { subFluxo, dataInicio, dataFim } = contexto;

      // ── 1. Carregar lista de supervisores e exibir ─────────────────────────
      if (subFluxo === 'carregar_supervisores') {
        const vendas = await vendasService.getVendasPorSupervisor(dataInicio, dataFim);

        // Ordenar pelo índice fixo de SUPERVISORES (Loja, Food, Varejo, Redes, Telemarketing)
        const ordemFixa = SUPERVISORES.map(s => s.nome.toUpperCase());
        const vendasOrdenadas = [...vendas].sort((a: any, b: any) => {
          const iA = ordemFixa.findIndex(n => a.NomeSetor?.toUpperCase().includes(n) || n.includes(a.NomeSetor?.toUpperCase()));
          const iB = ordemFixa.findIndex(n => b.NomeSetor?.toUpperCase().includes(n) || n.includes(b.NomeSetor?.toUpperCase()));
          const posA = iA === -1 ? 99 : iA;
          const posB = iB === -1 ? 99 : iB;
          return posA - posB;
        });

        // Salvar lista já ordenada no contexto para reuso nos loops
        const novoContexto = { ...contexto, supervisoresCarregados: vendasOrdenadas };

        // Montar texto com totalizador
        let texto = `📊 *Totalizador de Vendas por Supervisor*\n`;
        texto += `📅 Período: ${this.formatarPeriodo(dataInicio, dataFim)}\n\n`;

        if (vendasOrdenadas.length === 0) {
          texto += 'Nenhum dado encontrado para o período.';
        } else {
          // Exibir na ordem fixa usando o número do SUPERVISORES (1-5)
          SUPERVISORES.forEach(sup => {
            const v = vendasOrdenadas.find((v: any) =>
              v.NomeSetor?.toUpperCase().includes(sup.nome.toUpperCase()) ||
              sup.nome.toUpperCase().includes(v.NomeSetor?.toUpperCase())
            );
            if (v) {
              texto += `${sup.id} - ${v.NomeSetor} — R$ ${this.formatarMoeda(v.TotalVendas)}\n`;
              texto += `    Pedidos: ${v.QuantidadePedidos} | Vendedores: ${v.QuantidadeVendedores} | TM: R$ ${this.formatarMoeda(v.TicketMedio)}\n`;
            }
          });
          const totalGeral = vendasOrdenadas.reduce((s: number, v: any) => s + v.TotalVendas, 0);
          texto += `\n💰 *TOTAL GERAL: R$ ${this.formatarMoeda(totalGeral)}*`;
        }

        texto += `\n\nDeseja análise de algum supervisor?\n*Digite o número (1-${SUPERVISORES.length})* ou *0* para voltar ao menu:`;

        return {
          texto,
          grafico: null,
          proximoEstado: EstadoBot.AGUARDANDO_ESCOLHA_SUPERVISOR,
          contexto: novoContexto,
        };
      }

      // ── 2. Análise detalhada de supervisor específico ──────────────────────
      if (subFluxo === 'analise_supervisor') {
        const { supervisorNome } = contexto;

        // ⚠️ SOLUÇÃO TEMPORÁRIA — substituir quando sp_GetVendasPorVendedorDoSupervisor
        // estiver criada no banco (script: scripts/03_sp_vendedores_por_supervisor.sql).
        // Estratégia atual:
        //   1. Busca as equipes do supervisor via sp_GetVendasPorSupervisorPorEquipe
        //   2. Para cada equipe, busca os vendedores via sp_GetVendasPorVendedorEmEquipe
        //   3. Consolida e reordena tudo por SetorClientes ASC no código
        const equipes = await vendasService.getVendasPorSupervisorPorEquipe(dataInicio, dataFim, supervisorNome);
        const vendedoresPorEquipe = await Promise.all(
          equipes.map((e: any) =>
            vendasService.getVendasPorVendedorEmEquipe(dataInicio, dataFim, e.EquipeNome)
          )
        );
        const vendedores = vendedoresPorEquipe
          .flat()
          .sort((a: any, b: any) => (a.SetorClientes ?? 0) - (b.SetorClientes ?? 0));
        // ⚠️ FIM SOLUÇÃO TEMPORÁRIA

        // ⚠️ SOLUÇÃO TEMPORÁRIA — substituir quando sp_GetFabricantesPorSupervisor
        // estiver criada no banco (script: scripts/03_sp_vendedores_por_supervisor.sql).
        // Quando disponível, trocar a linha abaixo por:
        // const fabricantes = await vendasService.getFabricantesPorSupervisor(dataInicio, dataFim, supervisorNome);
        const fabricantes = await vendasService.getVendasPorFabricante(dataInicio, dataFim);
        // ⚠️ FIM SOLUÇÃO TEMPORÁRIA

        let texto = `👔 *Análise — Supervisor: ${supervisorNome.trim()}*\n`;
        texto += `📅 Período: ${this.formatarPeriodo(dataInicio, dataFim)}\n\n`;

        if (vendedores.length === 0) {
          texto += 'Nenhum dado encontrado para o período.\n';
        } else {
          vendedores.forEach((v: any) => {
            const nome = this.limparTexto(v.NomeVendedor);
            texto += `${v.SetorClientes} - ${nome}\n`;
            texto += `  R$ ${this.formatarMoeda(v.TotalVendas)}`;
            texto += ` | Pedidos: ${v.QuantidadePedidos}`;
            texto += ` | TM: R$ ${this.formatarMoeda(v.TicketMedio)}\n`;
          });

          const totalGeral = vendedores.reduce((s: number, v: any) => s + v.TotalVendas, 0);
          texto += `\n💰 *TOTAL SUPERVISOR: R$ ${this.formatarMoeda(totalGeral)}*\n`;
        }

        // Fabricantes (top 5)
        if (fabricantes.length > 0) {
          texto += `\n*🏭 Fabricantes (Top 5):*\n`;
          fabricantes.slice(0, 5).forEach((f: any, idx: number) => {
            texto += `  ${idx + 1}. ${this.limparTexto(f.NomeFabricante)} — R$ ${this.formatarMoeda(f.TotalVendas)}\n`;
          });
        }

        const pergunta = botFlowService.getPerguntaOutroSupervisor();

        return {
          texto: texto + `\n${pergunta.resposta}`,
          opcoes: pergunta.opcoes,
          grafico: null,
          proximoEstado: EstadoBot.EXIBINDO_ANALISE_SUPERVISOR,
          contexto,
        };
      }

      // ── 3. Carregar lista de vendedores e exibir ───────────────────────────
      if (subFluxo === 'carregar_vendedores') {

        // ⚠️ SOLUÇÃO TEMPORÁRIA — substituir quando sp_GetVendasPorVendedorComCodigo
        // estiver criada no banco (script: scripts/03_sp_vendedores_por_supervisor.sql).
        // Limitações atuais:
        //   - sp_GetVendasPorVendedor não retorna SetorClientes (código do vendedor)
        //   - Vendedores sem venda no período não aparecem (sem tabela de cadastro)
        // Quando disponível, trocar por:
        //   const vendas = await vendasService.getVendasPorVendedorComCodigo(dataInicio, dataFim);
        const vendas = await vendasService.getVendasPorVendedor(dataInicio, dataFim);
        const vendasOrdenadas = [...vendas].sort((a: any, b: any) => {
          const cA = parseInt(a.SetorClientes ?? '0', 10) || 0;
          const cB = parseInt(b.SetorClientes ?? '0', 10) || 0;
          return cA - cB;
        });
        // ⚠️ FIM SOLUÇÃO TEMPORÁRIA

        const novoContexto = { ...contexto, vendedoresCarregados: vendasOrdenadas };

        let texto = `👥 *Totalizador de Vendas por Vendedor*\n`;
        texto += `📅 Período: ${this.formatarPeriodo(dataInicio, dataFim)}\n\n`;

        if (vendasOrdenadas.length === 0) {
          texto += 'Nenhum dado encontrado para o período.';
        } else {
          vendasOrdenadas.forEach((v: any) => {
            const codigo = v.SetorClientes ?? '—';
            const nome = this.limparTexto(v.NomeVendedor);
            const total = v.TotalVendas ?? 0;
            texto += `${codigo} - ${nome} — R$ ${this.formatarMoeda(total)}\n`;
          });
          const totalGeral = vendasOrdenadas.reduce((s: number, v: any) => s + (v.TotalVendas ?? 0), 0);
          texto += `\n💰 *TOTAL GERAL: R$ ${this.formatarMoeda(totalGeral)}*`;
          // ⚠️ Vendedores sem venda no período não são exibidos (aguardando sp_GetTodosVendedoresComZerados)
        }

        texto += `\n\nDeseja análise de algum vendedor?\n*Digite o código* do vendedor ou *0* para voltar ao menu:`;

        return {
          texto,
          grafico: null,
          proximoEstado: EstadoBot.AGUARDANDO_CODIGO_VENDEDOR,
          contexto: novoContexto,
        };
      }

      // ── 4. Análise detalhada de vendedor específico ────────────────────────
      if (subFluxo === 'analise_vendedor') {
        const { codigoVendedor } = contexto;
        const detalhe = await vendasService.getDetalheVendedor(dataInicio, dataFim, codigoVendedor);

        let texto = '';
        if (!detalhe || !detalhe.NomeVendedor) {
          texto = `❌ Vendedor com código *${codigoVendedor}* não encontrado no período.\n`;
        } else {
          texto = `👤 *${codigoVendedor} — ${detalhe.NomeVendedor}*\n`;
          texto += `📅 Período: ${this.formatarPeriodo(dataInicio, dataFim)}\n\n`;
          texto += `💰 Vendas: R$ ${this.formatarMoeda(detalhe.TotalVendas)}\n`;
          texto += `📦 Pedidos: ${detalhe.QuantidadePedidos}\n`;
          texto += `🎫 Ticket Médio: R$ ${this.formatarMoeda(detalhe.TotalVendas / (detalhe.QuantidadePedidos || 1))}\n`;
          texto += `🏪 Clientes: ${detalhe.QuantidadeClientes}\n`;
          texto += `🏭 Fabricante mais vendido: ${detalhe.FabricanteMaisVendido}\n`;
          texto += `🥇 Produto mais vendido: ${detalhe.ProdutoMaisVendido} (${detalhe.QuantidadeProdutoMaisVendido} vol.)\n`;
        }

        const pergunta = botFlowService.getPerguntaOutroVendedor();

        return {
          texto: texto + `\n${pergunta.resposta}`,
          opcoes: pergunta.opcoes,
          grafico: null,
          proximoEstado: EstadoBot.EXIBINDO_ANALISE_VENDEDOR,
          contexto,
        };
      }

      // ── 5. Vendas por Dia ──────────────────────────────────────────────────
      if (subFluxo === 'vendas_por_dia') {
        const { agrupamentoDia, formatoDia, tipoResumoDia } = contexto;
        const vendas = await vendasService.getVendasPorDiaDetalhado(dataInicio, dataFim);

        let texto = `📅 *Vendas por Dia*\n`;
        texto += `📅 Período: ${this.formatarPeriodo(dataInicio, dataFim)}\n\n`;

        if (vendas.length === 0) {
          texto += 'Nenhum dado encontrado para o período.';
        } else {
          // Agrupamento conforme tipo de resumo
          if (agrupamentoDia === 'ano_meses') {
            texto += this.agruparVendasPorMes(vendas);
          } else if (agrupamentoDia === 'ano_semanas') {
            texto += this.agruparVendasPorSemana(vendas);
          } else {
            // Extenso padrão (dia a dia)
            vendas.forEach((v: any) => {
            const data = formatarData(v.Data + 'T12:00:00');
            const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
            const dia = diasSemana[parseInt(v.DiaSemana) || 0];

              texto += `*${data}* (${dia})\n`;
              texto += `  Venda: R$ ${this.formatarMoeda(v.TotalVendas)} | Pedidos: ${v.QuantidadePedidos}\n`;
            });
          }

          const totalGeral = vendas.reduce((s: number, v: any) => s + v.TotalVendas, 0);
          texto += `\n💰 *TOTAL: R$ ${this.formatarMoeda(totalGeral)}*`;
        }

        const pergunta = botFlowService.getPerguntaOutroPeriodoDia();

        return {
          texto: texto + `\n\n${pergunta.resposta}`,
          opcoes: pergunta.opcoes,
          grafico: null,
          proximoEstado: EstadoBot.EXIBINDO_RESULTADO_DIA,
          contexto,
        };
      }

      // ── 6. Fabricante (totalizador direto) ────────────────────────────────
      if (subFluxo === 'fabricante') {
        const vendas = await vendasService.getVendasPorFabricante(dataInicio, dataFim);
        const texto = vendasService.formatarVendasPorFabricante(vendas);
        const menuPrincipal = botFlowService.getMenuPrincipal(roles, nomeUsuario);

        return {
          texto: texto + `\n\n${menuPrincipal.resposta}`,
          opcoes: menuPrincipal.opcoes,
          grafico: null,
          proximoEstado: EstadoBot.MENU_PRINCIPAL,
          contexto: {},
        };
      }

      // ── Fallback ──────────────────────────────────────────────────────────
      logger.warn(`subFluxo desconhecido no processarConsulta: ${subFluxo}`);
      const menuFallback = botFlowService.getMenuPrincipal(roles, nomeUsuario);
      return {
        texto: menuFallback.resposta,
        opcoes: menuFallback.opcoes,
        grafico: null,
        proximoEstado: EstadoBot.MENU_PRINCIPAL,
        contexto: {},
      };

    } catch (error) {
      logger.error('Erro ao processar consulta:', error);
      return {
        texto: '❌ Erro ao processar consulta. Tente novamente.',
        grafico: null,
        proximoEstado: EstadoBot.MENU_PRINCIPAL,
        contexto: {},
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS DE FORMATAÇÃO — delegam para formatter.ts
  // ─────────────────────────────────────────────────────────────────────────

  private formatarMoeda(valor: number): string {
    return formatarNumero(valor);
  }

  /**
   * Remove espaços em branco extras (padding vindo do banco de dados)
   */
  private limparTexto(valor: string): string {
    return (valor ?? '').trim();
  }

  private formatarPeriodo(dataInicio: string, dataFim: string): string {
    // Adiciona T12:00:00 para evitar off-by-one por timezone ao parsear só a data
    const di = formatarData(dataInicio + 'T12:00:00');
    const df = formatarData(dataFim + 'T12:00:00');
    return di === df ? di : `${di} a ${df}`;
  }

  private agruparVendasPorMes(vendas: any[]): string {
    const meses: Record<string, { total: number; pedidos: number }> = {};
    const nomesMes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    vendas.forEach(v => {
      const dataFormatada = formatarData(v.Data + 'T12:00:00');
      const [dia, mes, ano] = dataFormatada.split('/');
      const chave = `${ano}-${mes}`;

      if (!meses[chave]) meses[chave] = { total: 0, pedidos: 0 };
      meses[chave].total += v.TotalVendas;
      meses[chave].pedidos += v.QuantidadePedidos;
    });

    return Object.entries(meses)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([chave, dados]) => {
        const [ano, mes] = chave.split('-');
        return `*${nomesMes[parseInt(mes) - 1]}/${ano}*: R$ ${this.formatarMoeda(dados.total)} | Pedidos: ${dados.pedidos}`;
      })
      .join('\n') + '\n';
  }

  private agruparVendasPorSemana(vendas: any[]): string {
    const semanas: Record<string, { total: number; pedidos: number; inicio: Date; fim: Date }> = {};

    vendas.forEach(v => {
      const d = new Date(v.Data + 'T12:00:00');
      const dia = d.getDay() === 0 ? 7 : d.getDay();
      const inicioSemana = new Date(d);
      inicioSemana.setDate(d.getDate() - dia + 1);
      inicioSemana.setHours(0, 0, 0, 0);
      const chave = inicioSemana.toISOString().split('T')[0];

      if (!semanas[chave]) {
        const fimSemana = new Date(inicioSemana);
        fimSemana.setDate(inicioSemana.getDate() + 6);
        semanas[chave] = { total: 0, pedidos: 0, inicio: inicioSemana, fim: fimSemana };
      }
      semanas[chave].total += v.TotalVendas;
      semanas[chave].pedidos += v.QuantidadePedidos;
    });

    return Object.entries(semanas)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, dados]) => {
        const ini = dados.inicio.toLocaleDateString('pt-BR');
        const fim = dados.fim.toLocaleDateString('pt-BR');
        return `*${ini} - ${fim}*: R$ ${this.formatarMoeda(dados.total)} | Pedidos: ${dados.pedidos}`;
      })
      .join('\n') + '\n';
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