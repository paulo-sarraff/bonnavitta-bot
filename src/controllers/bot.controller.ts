import { AuthRequest } from '../middleware/auth.middleware.js';
import { Request, Response } from 'express';
import { sessionService } from '../services/session.service.js';
import { botFlowService, SUPERVISORES } from '../services/bot-flow.service.js';
import { vendasService } from '../services/vendas.service.js';
import { chartService, ItemGrafico, ItemSerie } from '../services/chart.service.js';
import logger from '../utils/logger.js';
import { EstadoBot } from '../models/schemas.js';
import { BotProcessResult } from '../models/bot-response.js';
import { authService } from '../services/auth.service.js';
import { usuariosCadastrados } from '../config/usuarios-cadastrados.js';
import {
  formatarNumero, formatarData, calcDiaSemana,
  buildDateString, addDays,
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
      if (!canal || !chatId || !mensagem || !usuarioId) throw new Error('canal, chatId, mensagem e usuarioId sao obrigatorios');

      logger.info(`Mensagem recebida de ${usuarioId}: ${mensagem}`);

      let sessao = await sessionService.obterSessao(chatId, canal as 'telegram' | 'whatsapp');
      if (!sessao) sessao = await sessionService.criarSessao(usuarioId, canal as 'telegram' | 'whatsapp', chatId, '');
      if (!sessao) throw new Error('Falha ao obter ou criar sessao do usuario');

      if (sessao.estadoAtual === EstadoBot.AGUARDANDO_CPF) {
        const cpfLimpo = mensagem.trim().replace(/\D/g, '');
        if (cpfLimpo.length !== 11) return { resposta: '❌ CPF invalido. Informe um CPF com 11 digitos.\n\nExemplo: 12345678910', proximoEstado: EstadoBot.AGUARDANDO_CPF };
        const usuarioComCPF = usuariosCadastrados.find(u => u.cpf === cpfLimpo);
        if (!usuarioComCPF) return { resposta: '❌ CPF nao encontrado. Verifique e tente novamente.\n\nExemplo: 12345678910', proximoEstado: EstadoBot.AGUARDANDO_CPF };
        if (!usuarioComCPF.ativo) return { resposta: '❌ Seu usuario esta inativo. Entre em contato com o administrador.', proximoEstado: EstadoBot.AGUARDANDO_CPF };
        await sessionService.atualizarSessaoCompleta(sessao.id, { estadoAtual: EstadoBot.AGUARDANDO_TELEFONE, dadosContexto: { cpfTemporario: cpfLimpo } });
        return { resposta: '✅ CPF recebido!\n\n📞 Agora informe seu telefone:\n\nExemplo: 92999999999', proximoEstado: EstadoBot.AGUARDANDO_TELEFONE };
      }

      if (sessao.estadoAtual === EstadoBot.AGUARDANDO_TELEFONE) {
        const telefoneLimpo = mensagem.trim().replace(/\D/g, '');
        if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) return { resposta: '❌ Telefone invalido. Informe um telefone com 10 ou 11 digitos.\n\nExemplo: 92999999999', proximoEstado: EstadoBot.AGUARDANDO_TELEFONE };
        const cpfTemporario = sessao.dadosContexto?.cpfTemporario;
        if (!cpfTemporario) return { resposta: '❌ Erro ao processar login. Tente novamente.\n\n📱 Informe seu CPF:', proximoEstado: EstadoBot.AGUARDANDO_CPF };
        const usuarioValidado = usuariosCadastrados.find(u => u.cpf === cpfTemporario && u.telefone === telefoneLimpo);
        if (!usuarioValidado) {
          await sessionService.atualizarSessaoCompleta(sessao.id, { estadoAtual: EstadoBot.AGUARDANDO_CPF, dadosContexto: {} });
          return { resposta: '❌ CPF ou telefone invalidos. Tente novamente.\n\n📱 Informe seu CPF:', proximoEstado: EstadoBot.AGUARDANDO_CPF };
        }
        if (!usuarioValidado.ativo) return { resposta: '❌ Seu usuario esta inativo. Entre em contato com o administrador.', proximoEstado: EstadoBot.AGUARDANDO_CPF };
        const token = authService.gerarToken(usuarioValidado);
        const roles = usuarioValidado.roles ?? [];
        const menuInicial = botFlowService.getMenuPrincipal(roles, usuarioValidado.nome);
        const estadoInicial = menuInicial.proximoEstado as EstadoBot;
        await sessionService.atualizarSessaoCompleta(sessao.id, { usuarioId: usuarioValidado.id, token, estadoAtual: estadoInicial, dadosContexto: {} });
        return { resposta: `✅ Login realizado com sucesso!\n\nBem-vindo, ${usuarioValidado.nome}! 🎉\n\n${menuInicial.resposta}`, opcoes: menuInicial.opcoes, proximoEstado: estadoInicial };
      }

      const mensagemNorm = mensagem.trim().toLowerCase();
      if (['oi', 'olá', 'ola', 'menu', 'iniciar', 'start'].includes(mensagemNorm)) {
        const usuario = usuariosCadastrados.find(u => u.id === sessao.usuarioId);
        const roles = usuario?.roles ?? [];
        const menu = botFlowService.getMenuPrincipal(roles, usuario?.nome ?? '');
        const estadoReset = menu.proximoEstado as EstadoBot;
        await sessionService.atualizarSessaoCompleta(sessao.id, { estadoAtual: estadoReset, dadosContexto: {} });
        return { resposta: menu.resposta, opcoes: menu.opcoes, proximoEstado: estadoReset };
      }

      const usuarioSession = usuariosCadastrados.find(u => u.id === sessao.usuarioId);
      const usuarioRoles   = usuarioSession?.roles ?? [];
      const nomeUsuario    = usuarioSession?.nome ?? '';

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

  private async processarConsulta(
    contexto: any, roles: string[], nomeUsuario: string
  ): Promise<{ texto: string; opcoes?: any[]; grafico: Buffer | null; proximoEstado: EstadoBot; contexto: any }> {
    try {
      const { subFluxo, dataInicio } = contexto;
      // ⚠️ TEMPORÁRIO — remove após executar 04_fix_where_cast_date.sql no banco
      const dataFim = addDays(contexto.dataFim, 1);

      // ── 1. Lista de supervisores ──────────────────────────────────────────
      if (subFluxo === 'carregar_supervisores') {
        const vendas = await vendasService.getVendasPorSupervisor(dataInicio, dataFim);
        const novoContexto = { ...contexto, supervisoresCarregados: vendas };

        let texto = `📊 *Vendas por Supervisor*\n`;
        texto += `📅 Período: ${this.fmtPeriodo(contexto.dataInicio, contexto.dataFim)}\n\n`;

        SUPERVISORES.forEach(sup => {
          const nomeSup = sup.nome.toUpperCase();
          const v = vendas.find((x: any) => {
            const col = (x.NomeSupervisor ?? x.NomeSetor ?? x.Supervisor ?? '').toUpperCase().trim();
            return col === nomeSup;
          });
          const total = v ? (v.TotalVendas         ?? 0) : 0;
          const vends = v ? (v.QuantidadeVendedores ?? 0) : 0;
          const peds  = v ? (v.QuantidadePedidos    ?? 0) : 0;
          const tm    = v ? (v.TicketMedio           ?? 0) : 0;

          texto += `${sup.id} - ${sup.nome}\n`;
          texto += `💰 R$ ${this.fmt(total)}\n`;
          texto += `👥 ${vends} Vendedor(es)\n`;
          texto += `📦 ${peds} pedidos\n`;
          texto += `🎟 Ticket médio: R$ ${this.fmt(tm)}\n\n`;
        });

        const totalGeral = vendas.reduce((s: number, v: any) => s + v.TotalVendas, 0);
        texto += `💰 *TOTAL GERAL: R$ ${this.fmt(totalGeral)}*`;
        texto += `\n\nDeseja análise de algum supervisor?\n*Digite o número (1-${SUPERVISORES.length})* ou *0* para voltar ao menu:`;

        return { texto, grafico: null, proximoEstado: EstadoBot.AGUARDANDO_ESCOLHA_SUPERVISOR, contexto: novoContexto };
      }

      // ── 2. Análise de supervisor ──────────────────────────────────────────
      if (subFluxo === 'analise_supervisor') {
        const { supervisorNome } = contexto;
        const vendedores  = await vendasService.getVendasPorVendedorDoSupervisor(dataInicio, dataFim, supervisorNome);
        const fabricantes = await vendasService.getFabricantesPorSupervisor(dataInicio, dataFim, supervisorNome);

        let texto = `👔 *Análise — ${supervisorNome.trim()}*\n`;
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

        if (fabricantes.length > 0) {
          texto += `\n*🏭 Fabricantes:*\n`;
          const totalFab1 = fabricantes.reduce((s: number, f: any) => s + (f.TotalVendas ?? 0), 0);
          fabricantes.forEach((f: any, i: number) => {
            const pct = totalFab1 > 0 ? ((f.TotalVendas / totalFab1) * 100).toFixed(1) : '0.0';
            texto += `  ${i + 1}. ${this.limpar(f.NomeFabricante)} — R$ ${this.fmt(f.TotalVendas)} (${pct}%)\n`;
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
            const nome  = this.limpar(v.NomeVendedor);
            const total = v.TotalVendas ?? 0;
            texto += `${v.SetorClientes ?? '—'} - ${nome} — R$ ${this.fmt(total)}\n`;
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
        const detalhe     = await vendasService.getDetalheVendedor(dataInicio, dataFim, codigoVendedor);
        const fabricantes = await vendasService.getFabricantesDoVendedor(dataInicio, dataFim, codigoVendedor);

        let texto = '';

        if (!detalhe || !detalhe.NomeVendedor) {
          texto = `❌ Vendedor com código *${codigoVendedor}* não encontrado no período.\n`;
        } else {
          texto  = `👤 *${codigoVendedor} — ${this.limpar(detalhe.NomeVendedor)}*\n`;
          texto += `📅 Período: ${this.fmtPeriodo(contexto.dataInicio, contexto.dataFim)}\n\n`;
          texto += `💰 Vendas: R$ ${this.fmt(detalhe.TotalVendas)}\n`;
          texto += `📦 Pedidos: ${detalhe.QuantidadePedidos}\n`;
          texto += `🎟 Ticket Médio: R$ ${this.fmt(detalhe.TotalVendas / (detalhe.QuantidadePedidos || 1))}\n`;
          texto += `🏪 Clientes: ${detalhe.QuantidadeClientes}\n`;
          texto += `🏭 Fabricante top: ${this.limpar(detalhe.FabricanteMaisVendido)}\n`;
          texto += `🥇 Produto top: ${this.limpar(detalhe.ProdutoMaisVendido)} (${detalhe.QuantidadeProdutoMaisVendido} vol.)\n`;

          if (fabricantes && fabricantes.length > 0) {
            texto += `\n*🏭 Vendas por Fabricante:*\n`;
            const totalFab2 = fabricantes.reduce((s: number, f: any) => s + (f.TotalVendas ?? 0), 0);
            fabricantes.forEach((f: any, i: number) => {
              const pct = totalFab2 > 0 ? ((f.TotalVendas / totalFab2) * 100).toFixed(1) : '0.0';
              texto += `  ${i + 1}. ${this.limpar(f.NomeFabricante)} — R$ ${this.fmt(f.TotalVendas)} (${pct}%)\n`;
            });
          }
        }

        const pergunta = botFlowService.getPerguntaOutroVendedor();
        return { texto: texto + `\n${pergunta.resposta}`, opcoes: pergunta.opcoes, grafico: null, proximoEstado: EstadoBot.EXIBINDO_ANALISE_VENDEDOR, contexto };
      }

      // ── 5. Vendas por Dia ─────────────────────────────────────────────────
      if (subFluxo === 'vendas_por_dia') {
        const { agrupamentoDia, formatoDia } = contexto;
        const modoGrafico = formatoDia === 'grafico';
        const vendas = await vendasService.getVendasPorDiaDetalhado(dataInicio, dataFim);

        let texto = `📅 *Vendas por Dia*\n`;
        texto += `📅 Período: ${this.fmtPeriodo(contexto.dataInicio, contexto.dataFim)}\n\n`;

        let grafico: Buffer | null = null;

        if (vendas.length === 0) {
          texto += 'Nenhum dado encontrado para o período.';
        } else if (agrupamentoDia === 'ano_meses') {
          const grupos = this.agruparMeses(vendas);
          if (!modoGrafico) {
            texto += grupos.map(g => `*${g.label}*: R$ ${this.fmt(g.valor)} | Pedidos: ${g.pedidos}`).join('\n') + '\n';
          } else {
            grafico = await chartService.gerarGraficoVendasMes(grupos, `Vendas Mensais — ${contexto.dataInicio.slice(0, 4)}`);
          }
        } else if (agrupamentoDia === 'ano_semanas' || agrupamentoDia === 'mes_semanas') {
          const grupos = this.agruparSemanas(vendas);
          if (!modoGrafico) {
            texto += grupos.map(g => `*${g.label}*: R$ ${this.fmt(g.valor)} | Pedidos: ${g.pedidos}`).join('\n') + '\n';
          } else {
            grafico = await chartService.gerarGraficoVendasSemana(grupos, 'Vendas por Semana');
          }
        } else {
          // semana_dias / mes_dias
          const vendasIdx: Record<string, { TotalVendas: number; QuantidadePedidos: number }> = {};
          vendas.forEach((v: any) => {
            const d: Date = v.DataPreVenda instanceof Date ? v.DataPreVenda : new Date(v.DataPreVenda);
            const chave = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
            vendasIdx[chave] = { TotalVendas: v.TotalVendas, QuantidadePedidos: v.QuantidadePedidos };
          });

          const series: ItemSerie[] = [];
          let cursor = contexto.dataInicio;
          while (cursor <= contexto.dataFim) {
            const [yyyy, mesC, diaC] = cursor.split('-').map(Number);
            const dd      = String(diaC).padStart(2, '0');
            const mm      = String(mesC).padStart(2, '0');
            const dataFmt = `${dd}/${mm}/${yyyy}`;
            const reg     = vendasIdx[cursor] ?? { TotalVendas: 0, QuantidadePedidos: 0 };

            if (!modoGrafico) {
              const dataLocal = new Date(Date.UTC(yyyy, mesC - 1, diaC, 12, 0, 0));
              const dia = calcDiaSemana(dataLocal);
              texto += `*${dataFmt}* (${dia})\n`;
              texto += `  Venda: R$ ${this.fmt(reg.TotalVendas)} | Pedidos: ${reg.QuantidadePedidos}\n`;
            }
            series.push({ label: dataFmt, valor: reg.TotalVendas });
            cursor = addDays(cursor, 1);
          }
          if (modoGrafico) {
            grafico = await chartService.gerarGraficoVendasDia(series, 'Vendas por Dia');
          }
        }

        const totalGeral = vendas.reduce((s: number, v: any) => s + v.TotalVendas, 0);
        texto += `\n💰 *TOTAL: R$ ${this.fmt(totalGeral)}*`;

        const pergunta = botFlowService.getPerguntaOutroPeriodoDia();
        return { texto: texto + `\n\n${pergunta.resposta}`, opcoes: pergunta.opcoes, grafico, proximoEstado: EstadoBot.EXIBINDO_RESULTADO_DIA, contexto };
      }

      // ── 6. Lista de fabricantes ───────────────────────────────────────────
      if (subFluxo === 'fabricante') {
        const vendas = await vendasService.getVendasPorFabricante(dataInicio, dataFim);
        const novoContexto = { ...contexto, fabricantesCarregados: vendas };

        const itensGrafico: ItemGrafico[] = vendas.map((v: any) => ({ label: (v.NomeFabricante ?? '').trim(), valor: v.TotalVendas }));
        const grafico: Buffer | null = itensGrafico.length
          ? await chartService.gerarGraficoFabricantes(itensGrafico, `Fabricantes — ${this.fmtPeriodo(contexto.dataInicio, contexto.dataFim)}`)
          : null;

        const pergunta = botFlowService.montarPerguntaFabricante(novoContexto);
        return { texto: pergunta.resposta, grafico, proximoEstado: EstadoBot.EXIBINDO_LISTA_FABRICANTE, contexto: novoContexto };
      }

      // ── 7. Detalhe de fabricante ──────────────────────────────────────────
      if (subFluxo === 'detalhe_fabricante') {
        const { nomeFabricante } = contexto;
        const detalhe = await vendasService.getDetalheFabricante(dataInicio, dataFim, nomeFabricante);

        let texto = '';
        if (!detalhe || !detalhe.NomeFabricante) {
          texto = `❌ Nenhum dado encontrado para *${nomeFabricante}* no período.\n`;
        } else {
          texto  = `📊 *${this.limpar(detalhe.NomeFabricante)}*\n`;
          texto += `📅 Período: ${this.fmtPeriodo(contexto.dataInicio, contexto.dataFim)}\n\n`;
          texto += `💰 Valor total: R$ ${this.fmt(detalhe.TotalVendas)}\n`;
          texto += `📦 Pedidos: ${detalhe.QuantidadePedidos}\n`;
          texto += `👤 Vendedores: ${detalhe.QuantidadeVendedores}\n`;
          texto += `🏪 Clientes: ${detalhe.QuantidadeClientes}\n`;
          texto += `🏆 Produto top: ${this.limpar(detalhe.ProdutoMaisVendido)}\n`;
          texto += `📊 Qtd vendida: ${detalhe.QuantidadeProdutoMaisVendido} vol.\n`;
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

  private fmt(valor: number): string { return formatarNumero(valor); }
  private limpar(v: string): string  { return (v ?? '').trim(); }

  private fmtPeriodo(dataInicio: string, dataFim: string): string {
    const di = formatarData(dataInicio);
    const df = formatarData(dataFim);
    return di === df ? di : `${di} a ${df}`;
  }

  private agruparMeses(vendas: any[]): (ItemSerie & { pedidos: number })[] {
    const acc: Record<string, { valor: number; pedidos: number }> = {};
    const nomesMes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

    vendas.forEach(v => {
      const d: Date = v.DataPreVenda instanceof Date ? v.DataPreVenda : new Date(v.DataPreVenda);
      const mm   = String(d.getUTCMonth() + 1).padStart(2, '0');
      const aaaa = String(d.getUTCFullYear());
      const chave = `${aaaa}-${mm}`;
      if (!acc[chave]) acc[chave] = { valor: 0, pedidos: 0 };
      acc[chave].valor   += v.TotalVendas;
      acc[chave].pedidos += v.QuantidadePedidos;
    });

    return Object.entries(acc)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([chave, d]) => {
        const [ano, mes] = chave.split('-');
        return { label: `${nomesMes[parseInt(mes) - 1]}/${ano}`, valor: d.valor, pedidos: d.pedidos };
      });
  }

  private agruparSemanas(vendas: any[]): (ItemSerie & { pedidos: number })[] {
    const acc: Record<string, { valor: number; pedidos: number; inicioStr: string; fimStr: string }> = {};
    const f2 = (n: number) => String(n).padStart(2, '0');

    vendas.forEach(v => {
      const d: Date = v.DataPreVenda instanceof Date ? v.DataPreVenda : new Date(v.DataPreVenda);
      const ano = d.getUTCFullYear();
      const mes = d.getUTCMonth() + 1;
      const dia = d.getUTCDate();
      const dow    = new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
      const isoDay = dow === 0 ? 7 : dow;
      const ini    = new Date(Date.UTC(ano, mes - 1, dia - (isoDay - 1)));
      const fim    = new Date(Date.UTC(ano, mes - 1, dia - (isoDay - 1) + 6));
      const chave  = buildDateString(ini.getUTCFullYear(), ini.getUTCMonth() + 1, ini.getUTCDate());
      const inicioStr = `${f2(ini.getUTCDate())}/${f2(ini.getUTCMonth()+1)}/${ini.getUTCFullYear()}`;
      const fimStr    = `${f2(fim.getUTCDate())}/${f2(fim.getUTCMonth()+1)}/${fim.getUTCFullYear()}`;

      if (!acc[chave]) acc[chave] = { valor: 0, pedidos: 0, inicioStr, fimStr };
      acc[chave].valor   += v.TotalVendas;
      acc[chave].pedidos += v.QuantidadePedidos;
    });

    return Object.entries(acc)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, d]) => ({ label: `${d.inicioStr}-${d.fimStr}`, valor: d.valor, pedidos: d.pedidos }));
  }

  async health(_req: Request, res: Response): Promise<void> {
    res.status(200).json({ success: true, mensagem: 'Bot rodando normalmente' });
  }
}

const botController = new BotController();
export { botController };