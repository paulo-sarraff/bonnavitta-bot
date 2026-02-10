import { getDatabase, sql } from '../config/database.js';
import logger from '../utils/logger.js';

// Interfaces para os dados retornados pelas procedures
interface VendasPorSupervisor {
  NomeSupervisor: string;
  QuantidadePedidos: number;
  QuantidadeVendedores: number;
  TotalVendas: number;
  TicketMedio: number;
}

interface VendasPorVendedorSP {
  NomeVendedor: string;
  NomeSupervisor: string;
  QuantidadePedidos: number;
  TotalVendas: number;
  TicketMedio: number;
}

interface VendasPorDia {
  Data: string;
  QuantidadePedidos: number;
  TotalVendas: number;
  TicketMedio: number;
}

interface VendasPorFabricante {
  NomeFabricante: string;
  QuantidadePedidos: number;
  TotalVendas: number;
  TicketMedio: number;
}

interface RankingProdutoSP {
  NomeProduto: string;
  NomeFabricante: string;
  QuantidadeVendida: number;
  TotalVendas: number;
  TicketMedio: number;
}

interface TicketMedioDados {
  TicketMedio: number;
  TotalVendas: number;
  TotalPedidos: number;
}

interface VendasPorEquipe {
  NomeEquipe: string;
  QuantidadePedidos: number;
  TotalVendas: number;
  TicketMedio: number;
  QuantidadeUnidades: number;
}


class VendasService {
  /**
   * Obtém vendas por supervisor em um período
   */
  async getVendasPorSupervisor(
    dataInicio: string,
    dataFim: string
  ): Promise<VendasPorSupervisor[]> {
    try {
      const db = await getDatabase();
      const request = new sql.Request(db);

      request.input('DataInicio', sql.Date, dataInicio);
      request.input('DataFim', sql.Date, dataFim);

      const result = await request.execute('sp_GetVendasPorSupervisor');

      logger.info(`Vendas por supervisor recuperadas: ${result.recordset.length} registros`);
      return result.recordset;
    } catch (error) {
      logger.error('Erro ao obter vendas por supervisor:', error);
      throw error;
    }
  }

  /**
   * Obtém vendas por vendedor em um período
   */
  async getVendasPorVendedor(
    dataInicio: string,
    dataFim: string
  ): Promise<VendasPorVendedorSP[]> {
    try {
      const db = await getDatabase();
      const request = new sql.Request(db);

      request.input('DataInicio', sql.Date, dataInicio);
      request.input('DataFim', sql.Date, dataFim);

      const result = await request.execute('sp_GetVendasPorVendedor');

      logger.info(`Vendas por vendedor recuperadas: ${result.recordset.length} registros`);
      return result.recordset;
    } catch (error) {
      logger.error('Erro ao obter vendas por vendedor:', error);
      throw error;
    }
  }

  /**
   * Obtém vendas por dia em um período
   */
  async getVendasPorDia(
    dataInicio: string,
    dataFim: string
  ): Promise<VendasPorDia[]> {
    try {
      const db = await getDatabase();
      const request = new sql.Request(db);

      request.input('DataInicio', sql.Date, dataInicio);
      request.input('DataFim', sql.Date, dataFim);

      const result = await request.execute('sp_GetVendasPorDia');

      logger.info(`Vendas por dia recuperadas: ${result.recordset.length} registros`);
      return result.recordset;
    } catch (error) {
      logger.error('Erro ao obter vendas por dia:', error);
      throw error;
    }
  }

  /**
   * Obtém vendas por fabricante em um período
   */
  async getVendasPorFabricante(
    dataInicio: string,
    dataFim: string
  ): Promise<VendasPorFabricante[]> {
    try {
      const db = await getDatabase();
      const request = new sql.Request(db);

      request.input('DataInicio', sql.Date, dataInicio);
      request.input('DataFim', sql.Date, dataFim);

      const result = await request.execute('sp_GetVendasPorFabricante');

      logger.info(`Vendas por fabricante recuperadas: ${result.recordset.length} registros`);
      return result.recordset;
    } catch (error) {
      logger.error('Erro ao obter vendas por fabricante:', error);
      throw error;
    }
  }

  /**
   * Obtém detalhes de vendas por fabricante (produtos)
   */
  async getDetalhesVendasPorFabricante(
    dataInicio: string,
    dataFim: string,
    nomeFabricante: string
  ): Promise<RankingProdutoSP[]> {
    try {
      const db = await getDatabase();
      const request = new sql.Request(db);

      request.input('DataInicio', sql.Date, dataInicio);
      request.input('DataFim', sql.Date, dataFim);
      request.input('NomeFabricante', sql.VarChar(100), nomeFabricante);

      const result = await request.execute('sp_GetDetalhesVendasPorFabricante');

      logger.info(`Detalhes de vendas por fabricante recuperados: ${result.recordset.length} registros`);
      return result.recordset;
    } catch (error) {
      logger.error('Erro ao obter detalhes de vendas por fabricante:', error);
      throw error;
    }
  }

  /**
   * Obtém vendas por equipe em um período
   */
  async getVendasPorEquipe(
    dataInicio: string,
    dataFim: string
  ): Promise<VendasPorEquipe[]> {
    try {
      const db = await getDatabase();
      const request = new sql.Request(db);

      request.input('DataInicio', sql.Date, dataInicio);
      request.input('DataFim', sql.Date, dataFim);

      const result = await request.execute('sp_GetVendasPorEquipe');

      logger.info(`Vendas por equipe recuperadas: ${result.recordset.length} registros`);
      return result.recordset;
    } catch (error) {
      logger.error('Erro ao obter vendas por equipe:', error);
      throw error;
    }
  }

  /**
   * Obtém ranking de produtos
   */
  async getRankingProdutos(
    dataInicio: string,
    dataFim: string,
    limite: number = 10
  ): Promise<RankingProdutoSP[]> {
    try {
      const db = await getDatabase();
      const request = new sql.Request(db);

      request.input('DataInicio', sql.Date, dataInicio);
      request.input('DataFim', sql.Date, dataFim);
      request.input('Limite', sql.Int, limite);

      const result = await request.execute('sp_GetRankingProdutos');

      logger.info(`Ranking de produtos recuperado: ${result.recordset.length} registros`);
      return result.recordset;
    } catch (error) {
      logger.error('Erro ao obter ranking de produtos:', error);
      throw error;
    }
  }

  /**
   * Obtém ticket médio geral
   */
  async getTicketMedio(
    dataInicio: string,
    dataFim: string
  ): Promise<TicketMedioDados> {
    try {
      const db = await getDatabase();
      const request = new sql.Request(db);

      request.input('DataInicio', sql.Date, dataInicio);
      request.input('DataFim', sql.Date, dataFim);

      const result = await request.execute('sp_GetTicketMedio');

      logger.info(`Ticket médio recuperado`);
      return result.recordset[0] || { TicketMedio: 0, TotalVendas: 0, TotalPedidos: 0 };
    } catch (error) {
      logger.error('Erro ao obter ticket médio:', error);
      throw error;
    }
  }

    /**
   * Formata resposta de vendas por equipe
   */
  formatarVendasPorEquipe(vendas: VendasPorEquipe[]): string {
    if (vendas.length === 0) {
      return 'Nenhum dado encontrado para o período solicitado.';
    }

    let resposta = `👥 *Totalizador de Vendas por Equipe*\n\n`;

    vendas.forEach((venda) => {
      resposta += `*${venda.NomeEquipe}*\n`;
      resposta += `  💰 Total de Vendas: R$ ${this.formatarMoeda(venda.TotalVendas)}\n`;
      resposta += `  🎫 Ticket Médio: R$ ${this.formatarMoeda(venda.TicketMedio)}\n`;
      resposta += `  📦 Pedidos: ${venda.QuantidadePedidos}\n\n`;
    });

    const totalGeral = vendas.reduce((sum, v) => sum + v.TotalVendas, 0);
    resposta += `*💰 TOTAL GERAL: R$ ${this.formatarMoeda(totalGeral)}*\n`;

    return resposta;
  }


  /**
   * Formata resposta de vendas por supervisor
   */
  formatarVendasPorSupervisor(vendas: VendasPorSupervisor[]): string {
    if (vendas.length === 0) {
      return 'Nenhum dado encontrado para o período solicitado.';
    }

    let resposta = `📊 *Totalizador de Vendas por Supervisor*\n\n`;

    vendas.forEach((venda) => {
      resposta += `*${venda.NomeSupervisor}*\n`;
      resposta += `  💰 Total de Vendas: R$ ${this.formatarMoeda(venda.TotalVendas)}\n`;
      resposta += `  🎫 Ticket Médio: R$ ${this.formatarMoeda(venda.TicketMedio)}\n`;
      resposta += `  📦 Pedidos: ${venda.QuantidadePedidos}\n`;
      resposta += `  👥 Vendedores: ${venda.QuantidadeVendedores}\n\n`;
    });

    const totalGeral = vendas.reduce((sum, v) => sum + v.TotalVendas, 0);
    resposta += `*💰 TOTAL GERAL: R$ ${this.formatarMoeda(totalGeral)}*\n`;

    return resposta;
  }

  /**
   * Formata resposta de vendas por vendedor
   */
  formatarVendasPorVendedor(vendas: VendasPorVendedorSP[]): string {
    if (vendas.length === 0) {
      return 'Nenhum dado encontrado para o período solicitado.';
    }

    let resposta = `👥 *Vendas por Vendedor*\n\n`;

    vendas.forEach((venda) => {
      resposta += `*${venda.NomeVendedor}* (${venda.NomeSupervisor})\n`;
      resposta += `  💰 Total de Vendas: R$ ${this.formatarMoeda(venda.TotalVendas)}\n`;
      resposta += `  🎫 Ticket Médio: R$ ${this.formatarMoeda(venda.TicketMedio)}\n`;
      resposta += `  📦 Pedidos: ${venda.QuantidadePedidos}\n\n`;
    });

    return resposta;
  }

  /**
   * Formata resposta de vendas por dia
   */
  formatarVendasPorDia(vendas: VendasPorDia[]): string {
    if (vendas.length === 0) {
      return 'Nenhum dado encontrado para o período solicitado.';
    }

    let resposta = `📅 *Vendas por Dia*\n\n`;

    vendas.forEach((venda) => {
      const data = new Date(venda.Data).toLocaleDateString('pt-BR');
      resposta += `*${data}*\n`;
      resposta += `  💰 Total: R$ ${this.formatarMoeda(venda.TotalVendas)}\n`;
      resposta += `  📦 Pedidos: ${venda.QuantidadePedidos}\n`;
      resposta += `  🎫 Ticket Médio: R$ ${this.formatarMoeda(venda.TicketMedio)}\n\n`;
    });

    return resposta;
  }

  /**
   * Formata resposta de vendas por fabricante
   */
  formatarVendasPorFabricante(vendas: VendasPorFabricante[]): string {
    if (vendas.length === 0) {
      return 'Nenhum dado encontrado para o período solicitado.';
    }

    let resposta = `🏭 *Totalizador de Vendas por Fabricante*\n\n`;

    vendas.forEach((venda) => {
      resposta += `*${venda.NomeFabricante}*\n`;
      resposta += `  💰 Total de Vendas: R$ ${this.formatarMoeda(venda.TotalVendas)}\n`;
      resposta += `  🎫 Ticket Médio: R$ ${this.formatarMoeda(venda.TicketMedio)}\n`;
      resposta += `  📦 Pedidos: ${venda.QuantidadePedidos}\n\n`;
    });

    const totalGeral = vendas.reduce((sum, v) => sum + v.TotalVendas, 0);
    resposta += `*💰 TOTAL GERAL: R$ ${this.formatarMoeda(totalGeral)}*\n`;

    return resposta;
  }

  /**
   * Formata resposta de ranking de produtos
   */
  formatarRankingProdutos(produtos: RankingProdutoSP[]): string {
    if (produtos.length === 0) {
      return 'Nenhum produto vendido no período.';
    }

    let resposta = `🏆 *Ranking de Produtos*\n\n`;

    produtos.forEach((produto, index) => {
      resposta += `${index + 1}. *${produto.NomeProduto}*\n`;
      resposta += `   🏭 Fabricante: ${produto.NomeFabricante}\n`;
      resposta += `   📦 Quantidade: ${produto.QuantidadeVendida} un.\n`;
      resposta += `   💰 Total: R$ ${this.formatarMoeda(produto.TotalVendas)}\n`;
      resposta += `   🎫 Ticket Médio: R$ ${this.formatarMoeda(produto.TicketMedio)}\n\n`;
    });

    return resposta;
  }

  /**
   * Formata resposta de ticket médio
   */
  formatarTicketMedio(dados: TicketMedioDados): string {
    return `🎫 *Ticket Médio Geral*\n\n` +
      `  💰 Ticket Médio: R$ ${this.formatarMoeda(dados.TicketMedio)}\n` +
      `  💵 Total de Vendas: R$ ${this.formatarMoeda(dados.TotalVendas)}\n` +
      `  📦 Total de Pedidos: ${dados.TotalPedidos}\n`;
  }

  /**
   * Formata valor em moeda brasileira
   */
  private formatarMoeda(valor: number): string {
    return valor.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
}

export const vendasService = new VendasService();
