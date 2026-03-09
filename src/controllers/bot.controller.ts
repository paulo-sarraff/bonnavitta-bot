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
import {
  formatarNumero, formatarData, calcDiaSemana,
  buildDateString, addDays, hojeStr,
} from '../utils/formatter.js';

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

  async processarMensagem(req: AuthRequest): Promise<BotProcessResult> {
    try {
      const { canal, chatId, mensagem, usuarioId } = req.body ?? {};

      if (!canal || !chatId || !mensagem || !usuarioId) {
        throw new Error('canal, chatId, mensagem e usuarioId são obrigatórios');
      }

      logger.info(`Mensagem recebida de ${usuarioId}: ${mensagem}`);

      let sessao = await sessionService.obterSessao(chatId, canal as 'telegram' | 'whatsapp');
      if (!sessao) {
        sessao = await sessionService.criarSessao(usuarioId, canal as 'telegram' | 'whatsapp', chatId, '');
      }
      if (!sessao) throw new Error('Falha ao obter ou criar sessão do usuário');

      // ── AGUARDANDO CPF ──────────────────────────────────────────────────────
      if (sessao.estadoAtual === EstadoBot.AGUARDANDO_CPF) {
        const cpfLimpo = mensagem.trim().replace(/\D/g, '');
        if (cpfLimpo.length !== 11) {
          return { resposta: '❌ CPF inválido. Informe um CPF válido com 11 dígitos.\n\nExemplo: 12345678910', proximoEstado: EstadoBot.AGUARDANDO_CPF };
        }
        const usuarioComCPF = usuariosCadastrados.find(u => u.cpf === cpfLimpo);
        if (!usuarioComCPF) {
          return { resposta: '❌ CPF não encontrado. Verifique e tente novamente.\n\nExemplo: 12345678910', proximoEstado: EstadoBot.AGUARDANDO_CPF };
        }
        if (!usuarioComCPF.ativo) {
          return { resposta: '❌ Seu usuário está inativo. Entre em contato com o administrador.', proximoEstado: EstadoBot.AGUARDANDO_CPF };
        }
        await sessionService.atualizarSessaoCompleta(sessao.id, { estadoAtual: EstadoBot.AGUARDANDO_TELEFONE, dadosContexto: { cpfTemporario: cpfLimpo } });
        return { resposta: '✅ CPF recebido!\n\n📞 Agora informe seu telefone:\n\nExemplo: 92999999999', proximoEstado: EstadoBot.AGUARDANDO_TELEFONE };
      }

      // ── AGUARDANDO TELEFONE ─────────────────────────────────────────────────
      if (sessao.estadoAtual === EstadoBot.AGUARDANDO_TELEFONE) {
        const telefoneLimpo = mensagem.trim().replace(/\D/g, '');
        if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
          return { resposta: '❌ Telefone inválido. Informe um telefone válido com 10 ou 11 dígitos.\n\nExemplo: 92999999999', proximoEstado: EstadoBot.AGUARDANDO_TELEFONE };
        }
        const cpfTemporario = sessao.dadosContexto?.cpfTemporario;
        if (!cpfTemporario) {
          return { resposta: '❌ Erro ao processar login. Tente novamente.\n\n📱 Informe seu CPF:', proximoEstado: EstadoBot.AGUARDANDO_CPF };
        }
        const usuarioValidado = usuariosCadastrados.find(u => u.cpf === cpfTemporario && u.telefone === telefoneLimpo);
        if (!usuarioValidado) {
          await sessionService.atualizarSessaoCompleta(sessao.id, { estadoAtual: EstadoBot.AGUARDANDO_CPF, dadosContexto: {} });
          return { resposta: '❌ CPF ou telefone inválidos. Tente novamente.\n\n📱 Informe seu CPF:', proximoEstado: EstadoBot.AGUARDANDO_CPF };
        }
        if (!usuarioValidado.ativo) {
          return { resposta: '❌ Seu usuário está inativo. Entre em contato com o administrador.', proximoEstado: EstadoBot.AGUARDANDO_CPF };
        }
        const token = authService.gerarToken(usuarioValidado);
        const roles = usuarioValidado.roles ?? [];
        const menuInicial = botFlowService.getMenuPrincipal(roles, usuarioValidado.nome);
        const estadoInicial = menuInicial.proximoEstado as EstadoBot;
        await sessionService.atualizarSessaoCompleta(sessao.id, { usuarioId: usuarioValidado.id, token, estadoAtual: estadoInicial, dadosContexto: {} });
        return {
          resposta: `✅ Login realizado com sucesso!\n\nBem-vindo, ${usuarioValidado.nome}! 🎉\n\n${menuInicial.resposta}`,
          opcoes: menuInicial.opcoes,
          proximoEstado: estadoInicial,
        };
      }

      // ── RESET ───────────────────────────────────────────────────────────────
      const mensagemNorm = mensagem.trim().toLowerCase();
      if (['oi', 'olá', 'ola', 'menu', 'iniciar', 'start'].includes(mensagemNorm)) {
        const usuario = usuariosCadastrados.find(u => u.id === sessao.usuarioId);
        const roles = usuario?.roles ?? [];
        const menu = botFlowService.getMenuPrincipal(roles, usuario?.nome ?? '');
        const estadoReset = menu.proximoEstado as EstadoBot;
        await sessionService.atualizarSessaoCompleta(sessao.id, { estadoAtual: estadoReset, dadosContexto: {} });
        return { resposta: menu.resposta, opcoes: menu.opcoes, proximoEstado: estadoReset };
      }

      // ── FLUXO NORMAL ────────────────────────────────────────────────────────
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

      await sessionService.atualizarEstado(sessao.id, resultadoFluxo.proximoEstado, resultadoFluxo.contextoAtualizado);

      if (resultadoFluxo.proximoEstado === EstadoBot.ENCERRADO) {
        await sessionService.resetarSessao(chatId, canal as 'telegram' | 'whatsapp');
        return { resposta: resultadoFluxo.resposta.resposta, opcoes: [], grafico: null, proximoEstado: EstadoBot.AGUARDANDO_CPF };
      }

      if (resultadoFluxo.proximoEstado === EstadoBot.PROCESSANDO) {
        const respostaConsulta = await this.processarConsulta(resultadoFluxo.contextoAtualizado, usuarioRoles, nomeUsuario);
        await sessionService.atualizarEstado(sessao.id, respostaConsulta.proximoEstado, respostaConsulta.contexto);
        return { resposta: respostaConsulta.texto, opcoes: respostaConsulta.opcoes, grafico: respostaConsulta.grafico, proximoEstado: respostaConsulta.proximoEstado };
      }

      return { resposta: resultadoFluxo.resposta.resposta, opcoes: resultadoFluxo.resposta.opcoes, grafico: null, proximoEstado: resultadoFluxo.proximoEstado };

    } catch (error) {
      logger.error('Erro ao processar mensagem:', error);
      return { resposta: 'Erro ao processar mensagem', proximoEstado: EstadoBot.MENU_PRINCIPAL };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PROCESSAMENTO DE CONSULTAS
  // ─────────────────────────────────────────────────────────────────────────

  private async processarConsulta(
    contexto: any, roles: string[], nomeUsuario: string
  ): Promise<{ texto: string; opcoes?: any[]; grafico: string | null; proximoEstado: EstadoBot; contexto: any }> {
    try {
      const { subFluxo, dataInicio } = contexto;
      // Passa dataFim+1 para contornar bug das SPs (WHERE DateTime BETWEEN DATE).
      // ⚠️ TEMPORÁRIO — remover após executar 04_fix_where_cast_date.sql no banco.
      const dataFim = addDays(contexto.dataFim, 1);

      // ── 1. Lista de supervisores ──────────────────────────────────────────
      if (subFluxo === 'carregar_supervisores') {
        const vendas = await vendasService.getVendasPorSupervisor(dataInicio, dataFim);

        // Garante que supervisores sem venda apareçam (com zero)
        const novoContexto = { ...contexto, supervisoresCarregados: vendas };

        let texto = `📊 *Vendas por Supervisor*\n`;
        texto += `📅 Período: ${this.fmtPeriodo(contexto.dataInicio, contexto.dataFim)}\n\n`;

        SUPERVISORES.forEach(sup => {
          const v = vendas.find((x: any) =>
            x.NomeSetor?.toUpperCase().includes(sup.nome.toUpperCase()) ||
            sup.nome.toUpperCase().includes(x.NomeSetor?.toUpperCase())
          );
          if (v) {
            texto += `${sup.id} - ${v.NomeSetor.trim()}\n`;
            texto += `💰 R$ ${this.fmt(v.TotalVendas)}\n`;
            texto += `👥 ${v.QuantidadeVendedores} Vendedor(es)\n`;
            texto += `📦 ${v.QuantidadePedidos} pedidos\n`;
            texto += `🎟 Ticket médio: R$ ${this.fmt(v.TicketMedio)}\n\n`;
          } else {
            texto += `${sup.id} - ${sup.nome}\n`;
            texto += `💰 R$ 0,00\n`;
            texto += `👥 0 Vendedor(es)\n`;
            texto += `📦 0 pedidos\n`;
            texto += `🎟 Ticket médio: R$ 0,00\n\n`;
          }
        });

        const totalGeral = vendas.reduce((s: number, v: any) => s + v.TotalVendas, 0);
        texto += `💰 *TOTAL GERAL: R$ ${this.fmt(totalGeral)}*`;
        texto += `\n\nDeseja análise de algum supervisor?\n*Digite o número (1-${SUPERVISORES.length})* ou *0* para voltar ao menu:`;

        return { texto, grafico: null, proximoEstado: EstadoBot.AGUARDANDO_ESCOLHA_SUPERVISOR, contexto: novoContexto };
      }

      // ── 2. Análise de supervisor ──────────────────────────────────────────
      if (subFluxo === 'analise_supervisor') {
        const { supervisorNome } = contexto;
        const vendedores = await vendasService.getVendasPorVendedorDoSupervisor(dataInicio, dataFim, supervisorNome);
        const fabricantes = await vendasService.getFabricantesPorSupervisor(dataInicio, dataFim, supervisorNome);

        let texto = `👔 *Análise — Supervisor: ${supervisorNome.trim()}*\n`;
        texto += `📅 Período: ${this.fmtPeriodo(contexto.dataInicio, contexto.dataFim)}\n\n`;

        if (vendedores.length === 0) {
          texto += 'Nenhum dado encontrado para o período.\n';
        } else {
          vendedores.forEach((v: any) => {
            texto += `*${v.SetorClientes} - ${this.limpar(v.NomeVendedor)}*\n`;
            texto += `💰 R$ ${this.fmt(v.TotalVendas)}\n`;
            texto += `📦 ${v.QuantidadePedidos} pedidos\n`;
            texto += `🎟 TM: R$ ${this.fmt(v.TicketMedio)}\n\n`;
          });
          const totalGeral = vendedores.reduce((s: number, v: any) => s + v.TotalVendas, 0);
          texto += `💰 *TOTAL SUPERVISOR: R$ ${this.fmt(totalGeral)}*\n`;
        }

        // Todos os fabricantes com venda (sem limite de top 5)
        if (fabricantes.length > 0) {
          texto += `\n*🏭 Fabricantes:*\n`;
          fabricantes.forEach((f: any, idx: number) => {
            texto += `  ${idx + 1}. ${this.limpar(f.NomeFabricante)} — R$ ${this.fmt(f.TotalVendas)}\n`;
          });
        }

        const pergunta = botFlowService.getPerguntaOutroSupervisor();
        return { texto: texto + `\n${pergunta.resposta}`, opcoes: pergunta.opcoes, grafico: null, proximoEstado: EstadoBot.EXIBINDO_ANALISE_SUPERVISOR, contexto };
      }

      // ── 3. Lista de vendedores ────────────────────────────────────────────
      if (subFluxo === 'carregar_vendedores') {
        const vendas = await vendasService.getVendasPorVendedorComCodigo(dataInicio, dataFim);
        const novoContexto = { ...contexto, vendedoresCarregados: vendas };

        let texto = `👥 *Vendas por Vendedor*\n`;
        texto += `📅 Período: ${this.fmtPeriodo(contexto.dataInicio, contexto.dataFim)}\n\n`;

        if (vendas.length === 0) {
          texto += 'Nenhum dado encontrado para o período.';
        } else {
          vendas.forEach((v: any) => {
            const codigo = v.SetorClientes ?? '—';
            const nome = this.limpar(v.NomeVendedor);
            const total = v.TotalVendas ?? 0;
            texto += `${codigo} - ${nome} — R$ ${this.fmt(total)}\n`;
          });
          const totalGeral = vendas.reduce((s: number, v: any) => s + (v.TotalVendas ?? 0), 0);
          texto += `\n💰 *TOTAL GERAL: R$ ${this.fmt(totalGeral)}*`;
        }

        texto += `\n\nDeseja análise de algum vendedor?\n*Digite o código* do vendedor ou *0* para voltar ao menu:`;
        return { texto, grafico: null, proximoEstado: EstadoBot.AGUARDANDO_CODIGO_VENDEDOR, contexto: novoContexto };
      }

      // ── 4. Análise de vendedor ────────────────────────────────────────────
      if (subFluxo === 'analise_vendedor') {
        const { codigoVendedor } = contexto;
        const detalhe = await vendasService.getDetalheVendedor(dataInicio, dataFim, codigoVendedor);
        const fabricantes = await vendasService.getFabricantesDoVendedor(dataInicio, dataFim, codigoVendedor);

        let texto = '';
        if (!detalhe || !detalhe.NomeVendedor) {
          texto = `❌ Vendedor com código *${codigoVendedor}* não encontrado no período.\n`;
        } else {
          texto = `👤 *${codigoVendedor} — ${this.limpar(detalhe.NomeVendedor)}*\n`;
          texto += `📅 Período: ${this.fmtPeriodo(contexto.dataInicio, contexto.dataFim)}\n\n`;
          texto += `💰 Vendas: R$ ${this.fmt(detalhe.TotalVendas)}\n`;
          texto += `📦 Pedidos: ${detalhe.QuantidadePedidos}\n`;
          texto += `🎟 Ticket Médio: R$ ${this.fmt(detalhe.TotalVendas / (detalhe.QuantidadePedidos || 1))}\n`;
          texto += `🏪 Clientes: ${detalhe.QuantidadeClientes}\n`;
          texto += `🏭 Fabricante mais vendido: ${this.limpar(detalhe.FabricanteMaisVendido)}\n`;
          texto += `🥇 Produto mais vendido: ${this.limpar(detalhe.ProdutoMaisVendido)} (${detalhe.QuantidadeProdutoMaisVendido} vol.)\n`;

          // Todos os fabricantes com venda do vendedor
          if (fabricantes && fabricantes.length > 0) {
            texto += `\n*🏭 Vendas por Fabricante:*\n`;
            fabricantes.forEach((f: any, idx: number) => {
              texto += `  ${idx + 1}. ${this.limpar(f.NomeFabricante)} — R$ ${this.fmt(f.TotalVendas)}\n`;
            });
          }
        }

        const pergunta = botFlowService.getPerguntaOutroVendedor();
        return { texto: texto + `\n${pergunta.resposta}`, opcoes: pergunta.opcoes, grafico: null, proximoEstado: EstadoBot.EXIBINDO_ANALISE_VENDEDOR, contexto };
      }

      // ── 5. Vendas por Dia ─────────────────────────────────────────────────
      if (subFluxo === 'vendas_por_dia') {
        const { agrupamentoDia } = contexto;
        const vendas = await vendasService.getVendasPorDiaDetalhado(dataInicio, dataFim);

        let texto = `📅 *Vendas por Dia*\n`;
        texto += `📅 Período: ${this.fmtPeriodo(contexto.dataInicio, contexto.dataFim)}\n\n`;

        if (vendas.length === 0) {
          texto += 'Nenhum dado encontrado para o período.';
        } else if (agrupamentoDia === 'ano_meses') {
          texto += this.agruparPorMes(vendas);
        } else if (agrupamentoDia === 'ano_semanas' || agrupamentoDia === 'mes_semanas') {
          texto += this.agruparPorSemana(vendas);
        } else {
          // semana_dias ou mes_dias — exibe dia a dia
          vendas.forEach((v: any) => {
            const dataObj: Date = v.Data instanceof Date ? v.Data : new Date(v.Data);
            const data = dataObj.toLocaleDateString('pt-BR', { timeZone: 'America/Manaus' });
            const dia = calcDiaSemana(dataObj);
            texto += `*${data}* (${dia})\n`;
            texto += `  Venda: R$ ${this.fmt(v.TotalVendas)} | Pedidos: ${v.QuantidadePedidos}\n`;
          });
        }

        const totalGeral = vendas.reduce((s: number, v: any) => s + v.TotalVendas, 0);
        texto += `\n💰 *TOTAL: R$ ${this.fmt(totalGeral)}*`;

        const pergunta = botFlowService.getPerguntaOutroPeriodoDia();
        return { texto: texto + `\n\n${pergunta.resposta}`, opcoes: pergunta.opcoes, grafico: null, proximoEstado: EstadoBot.EXIBINDO_RESULTADO_DIA, contexto };
      }

      // ── 6. Lista de fabricantes ───────────────────────────────────────────
      if (subFluxo === 'fabricante') {
        const vendas = await vendasService.getVendasPorFabricante(dataInicio, dataFim);
        const novoContexto = { ...contexto, fabricantesCarregados: vendas };
        const pergunta = botFlowService.montarPerguntaFabricante(novoContexto);
        return { texto: pergunta.resposta, grafico: null, proximoEstado: EstadoBot.EXIBINDO_LISTA_FABRICANTE, contexto: novoContexto };
      }

      // ── 7. Detalhe de fabricante ──────────────────────────────────────────
      if (subFluxo === 'detalhe_fabricante') {
        const { nomeFabricante } = contexto;
        const detalhe = await vendasService.getDetalheFabricante(dataInicio, dataFim, nomeFabricante);

        let texto = '';
        if (!detalhe || !detalhe.NomeFabricante) {
          texto = `❌ Nenhum dado encontrado para *${nomeFabricante}* no período.\n`;
        } else {
          texto = `📊 *Resumo Analítico — ${this.limpar(detalhe.NomeFabricante)}*\n`;
          texto += `📅 Período: ${this.fmtPeriodo(contexto.dataInicio, contexto.dataFim)}\n\n`;
          texto += `💰 Valor total: R$ ${this.fmt(detalhe.TotalVendas)}\n`;
          texto += `📦 Quantidade de pedidos: ${detalhe.QuantidadePedidos}\n`;
          texto += `👤 Vendedores envolvidos: ${detalhe.QuantidadeVendedores}\n`;
          texto += `🏪 Clientes atendidos: ${detalhe.QuantidadeClientes}\n`;
          texto += `🏆 Produto mais vendido: ${this.limpar(detalhe.ProdutoMaisVendido)}\n`;
          texto += `📊 Quantidade vendida: ${detalhe.QuantidadeProdutoMaisVendido} vol.\n`;
        }

        const pergunta = botFlowService.getPerguntaOutroFabricante();
        return { texto: texto + `\n${pergunta.resposta}`, opcoes: pergunta.opcoes, grafico: null, proximoEstado: EstadoBot.EXIBINDO_DETALHE_FABRICANTE, contexto };
      }

      // ── Fallback ──────────────────────────────────────────────────────────
      logger.warn(`subFluxo desconhecido: ${subFluxo}`);
      const menuFallback = botFlowService.getMenuPrincipal(roles, nomeUsuario);
      return { texto: menuFallback.resposta, opcoes: menuFallback.opcoes, grafico: null, proximoEstado: EstadoBot.MENU_PRINCIPAL, contexto: {} };

    } catch (error) {
      logger.error('Erro ao processar consulta:', error);
      return { texto: '❌ Erro ao processar consulta. Tente novamente.', grafico: null, proximoEstado: EstadoBot.MENU_PRINCIPAL, contexto: {} };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS PRIVADOS
  // ─────────────────────────────────────────────────────────────────────────

  private fmt(valor: number): string {
    return formatarNumero(valor);
  }

  private limpar(valor: string): string {
    return (valor ?? '').trim();
  }

  /** Formata o período para exibição — usa strings YYYY-MM-DD diretamente. */
  private fmtPeriodo(dataInicio: string, dataFim: string): string {
    const di = formatarData(dataInicio);
    const df = formatarData(dataFim);
    return di === df ? di : `${di} a ${df}`;
  }

  private agruparPorMes(vendas: any[]): string {
    const meses: Record<string, { total: number; pedidos: number }> = {};
    const nomesMes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

    vendas.forEach(v => {
      const d: Date = v.Data instanceof Date ? v.Data : new Date(v.Data);
      const partes = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Manaus', year: 'numeric', month: '2-digit' }).format(d);
      const [mm, aaaa] = partes.split('/');
      const chave = `${aaaa}-${mm}`;
      if (!meses[chave]) meses[chave] = { total: 0, pedidos: 0 };
      meses[chave].total += v.TotalVendas;
      meses[chave].pedidos += v.QuantidadePedidos;
    });

    return Object.entries(meses)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([chave, d]) => {
        const [ano, mes] = chave.split('-');
        return `*${nomesMes[parseInt(mes) - 1]}/${ano}*: R$ ${this.fmt(d.total)} | Pedidos: ${d.pedidos}`;
      }).join('\n') + '\n';
  }

  private agruparPorSemana(vendas: any[]): string {
    const semanas: Record<string, { total: number; pedidos: number; inicioStr: string; fimStr: string }> = {};

    vendas.forEach(v => {
      const d: Date = v.Data instanceof Date ? v.Data : new Date(v.Data);
      // Extrair data no fuso Manaus como string YYYY-MM-DD
      const dataLocalStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Manaus' }).format(d);
      // Calcular início da semana (seg) sem depender de timezone
      const [ano, mes, dia] = dataLocalStr.split('-').map(Number);
      const dow = new Date(ano, mes - 1, dia).getDay();
      const isoDay = dow === 0 ? 7 : dow;
      const inicioD = new Date(ano, mes - 1, dia - (isoDay - 1));
      const fimD   = new Date(ano, mes - 1, dia - (isoDay - 1) + 6);
      const chave  = buildDateString(inicioD.getFullYear(), inicioD.getMonth() + 1, inicioD.getDate());
      const inicioStr = `${String(inicioD.getDate()).padStart(2,'0')}/${String(inicioD.getMonth()+1).padStart(2,'0')}/${inicioD.getFullYear()}`;
      const fimStr    = `${String(fimD.getDate()).padStart(2,'0')}/${String(fimD.getMonth()+1).padStart(2,'0')}/${fimD.getFullYear()}`;

      if (!semanas[chave]) semanas[chave] = { total: 0, pedidos: 0, inicioStr, fimStr };
      semanas[chave].total += v.TotalVendas;
      semanas[chave].pedidos += v.QuantidadePedidos;
    });

    return Object.entries(semanas)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, d]) => `*${d.inicioStr} - ${d.fimStr}*: R$ ${this.fmt(d.total)} | Pedidos: ${d.pedidos}`)
      .join('\n') + '\n';
  }

  async health(_req: Request, res: Response): Promise<void> {
    res.status(200).json({ success: true, mensagem: 'Bot rodando normalmente' });
  }
}

const botController = new BotController();
export { botController };