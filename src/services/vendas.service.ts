import { getDatabase } from '../config/database.js';
import sql from 'mssql';
import logger from '../utils/logger.js';

// ✅ INTERFACES EXISTENTES
interface VendasPorSupervisor {
  NomeSetor: string;
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

// ✅ NOVAS INTERFACES
interface VendasPorSupervisorDetalhado {
  EquipeNome: string;
  QuantidadePedidos: number;
  QuantidadeVendedores: number;
  TotalVendas: number;
  TicketMedio: number;
}

interface VendasPorVendedorEmEquipe {
  SetorClientes: number;
  NomeVendedor: string;
  TotalVendas: number;
  QuantidadePedidos: number;
  TicketMedio: number;
}

interface DetalheVendedor {
  NomeVendedor: string;
  SetorClientes: number;
  TotalVendas: number;
  QuantidadePedidos: number;
  QuantidadeClientes: number;
  FabricanteMaisVendido: string;
  ProdutoMaisVendido: string;
  QuantidadeProdutoMaisVendido: number;
}

interface VendasPorDiaDetalhado {
  Data: string;
  DiaSemana: string;
  TotalVendas: number;
  QuantidadePedidos: number;
}

interface DetalheFabricante {
  NomeFabricante: string;
  TotalVendas: number;
  QuantidadePedidos: number;
  QuantidadeVendedores: number;
  QuantidadeClientes: number;
  ProdutoMaisVendido: string;
  QuantidadeProdutoMaisVendido: number;
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
   * ✅ NOVO: Obtém vendas por supervisor agrupadas por equipe
   * Retorna resumo por equipe (NomeSetor) com totais
   */
  async getVendasPorSupervisorPorEquipe(
    dataInicio: string,
    dataFim: string,
    nomeSupervisor: string
  ): Promise<VendasPorSupervisorDetalhado[]> {
    try {
      const db = await getDatabase();
      const request = new sql.Request(db);

      request.input('DataInicio', sql.Date, dataInicio);
      request.input('DataFim', sql.Date, dataFim);
      request.input('NomeSupervisor', sql.NVarChar, nomeSupervisor);

      const result = await request.execute('sp_GetVendasPorSupervisorPorEquipe');

      logger.info(`Vendas por supervisor (${nomeSupervisor}) recuperadas: ${result.recordset.length} registros`);
      return result.recordset;
    } catch (error) {
      logger.error('Erro ao obter vendas por supervisor por equipe:', error);
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
   * ✅ NOVO: Obtém vendas por vendedor em uma equipe específica
   * Retorna lista de vendedores com seus totais
   */
  async getVendasPorVendedorEmEquipe(
    dataInicio: string,
    dataFim: string,
    nomeSetor: string
  ): Promise<VendasPorVendedorEmEquipe[]> {
    try {
      const db = await getDatabase();
      const request = new sql.Request(db);

      request.input('DataInicio', sql.Date, dataInicio);
      request.input('DataFim', sql.Date, dataFim);
      request.input('NomeSetor', sql.NVarChar, nomeSetor);

      const result = await request.execute('sp_GetVendasPorVendedorEmEquipe');

      logger.info(`Vendas por vendedor em ${nomeSetor}: ${result.recordset.length} registros`);
      return result.recordset;
    } catch (error) {
      logger.error('Erro ao obter vendas por vendedor em equipe:', error);
      throw error;
    }
  }

  /**
   * ✅ NOVO: Obtém detalhe completo de um vendedor específico
   * Retorna: Totais, Clientes, Fabricante mais vendido, Produto mais vendido
   */
  async getDetalheVendedor(
    dataInicio: string,
    dataFim: string,
    setorClientes: number
  ): Promise<DetalheVendedor> {
    try {
      const db = await getDatabase();
      const request = new sql.Request(db);

      request.input('DataInicio', sql.Date, dataInicio);
      request.input('DataFim', sql.Date, dataFim);
      request.input('SetorClientes', sql.Int, setorClientes);

      const result = await request.execute('sp_GetDetalheVendedor');

      logger.info(`Detalhe do vendedor ${setorClientes} recuperado`);
      return result.recordset[0] || {};
    } catch (error) {
      logger.error('Erro ao obter detalhe do vendedor:', error);
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
   * ✅ NOVO: Obtém vendas por dia com informações detalhadas
   * Retorna: Data, Dia da semana, Totais, Pedidos
   */
  async getVendasPorDiaDetalhado(
    dataInicio: string,
    dataFim: string
  ): Promise<VendasPorDiaDetalhado[]> {
    try {
      const db = await getDatabase();
      const request = new sql.Request(db);

      request.input('DataInicio', sql.Date, dataInicio);
      request.input('DataFim', sql.Date, dataFim);

      const result = await request.execute('sp_GetVendasPorDiaDetalhado');

      logger.info(`Vendas por dia detalhado: ${result.recordset.length} registros`);
      return result.recordset;
    } catch (error) {
      logger.error('Erro ao obter vendas por dia detalhado:', error);
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
   * ✅ NOVO: Obtém detalhe completo de um fabricante específico
   * Retorna: Totais, Vendedores, Clientes, Produto mais vendido
   */
  async getDetalheFabricante(
    dataInicio: string,
    dataFim: string,
    nomeFabricante: string
  ): Promise<DetalheFabricante> {
    try {
      const db = await getDatabase();
      const request = new sql.Request(db);

      request.input('DataInicio', sql.Date, dataInicio);
      request.input('DataFim', sql.Date, dataFim);
      request.input('NomeFabricante', sql.NVarChar, nomeFabricante);

      const result = await request.execute('sp_GetDetalheFabricante');

      logger.info(`Detalhe do fabricante ${nomeFabricante} recuperado`);
      return result.recordset[0] || {};
    } catch (error) {
      logger.error('Erro ao obter detalhe do fabricante:', error);
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
   * ✅ NOVO: Formata resposta de vendas por supervisor por equipe
   */
  formatarVendasPorSupervisorPorEquipe(vendas: VendasPorSupervisorDetalhado[]): string {
    if (vendas.length === 0) {
      return 'Nenhum dado encontrado para o período solicitado.';
    }

    let resposta = `👥 *Totalizador de Vendas por Equipe*\n\n`;

    vendas.forEach((venda) => {
      resposta += `*${venda.EquipeNome}*\n`;
      resposta += `  Venda R$ ${this.formatarMoeda(venda.TotalVendas)}\n`;
      resposta += `  Quantidade de pedidos: ${venda.QuantidadePedidos}\n`;
      resposta += `  Vendedores com pedido: ${venda.QuantidadeVendedores}\n\n`;
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
      resposta += `*${venda.NomeSetor}*\n`;
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
   * ✅ NOVO: Formata resposta de vendas por vendedor em equipe
   */
  formatarVendasPorVendedorEmEquipe(vendas: VendasPorVendedorEmEquipe[]): string {
    if (vendas.length === 0) {
      return 'Nenhum dado encontrado para o período solicitado.';
    }

    let resposta = `👥 *Totalizador de Vendas por Vendedor*\n\n`;

    vendas.forEach((venda) => {
      resposta += `${venda.SetorClientes} - *${venda.NomeVendedor}* - Valor R$ ${this.formatarMoeda(venda.TotalVendas)}\n`;
    });

    const totalGeral = vendas.reduce((sum, v) => sum + v.TotalVendas, 0);
    resposta += `\n*Total: R$ ${this.formatarMoeda(totalGeral)}*\n`;

    return resposta;
  }

  /**
   * ✅ NOVO: Formata resposta de detalhe de vendedor
   */
  formatarDetalheVendedor(detalhe: DetalheVendedor): string {
    return `*${detalhe.SetorClientes} - ${detalhe.NomeVendedor}*\n` +
      `Vendas R$ ${this.formatarMoeda(detalhe.TotalVendas)}\n` +
      `Quantidade de pedidos: ${detalhe.QuantidadePedidos}\n` +
      `Quantidade de clientes: ${detalhe.QuantidadeClientes}\n` +
      `Fabricante mais vendido: ${detalhe.FabricanteMaisVendido}\n` +
      `Produto mais vendido: ${detalhe.ProdutoMaisVendido}\n`;
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
   * ✅ NOVO: Formata resposta de vendas por dia detalhado
   */
  formatarVendasPorDiaDetalhado(vendas: VendasPorDiaDetalhado[]): string {
    if (vendas.length === 0) {
      return 'Nenhum dado encontrado para o período solicitado.';
    }

    let resposta = `📅 *Vendas por Dia*\n\n`;

    vendas.forEach((venda) => {
      const data = new Date(venda.Data).toLocaleDateString('pt-BR');
      resposta += `*${data}* (${venda.DiaSemana})\n`;
      resposta += `  Venda R$ ${this.formatarMoeda(venda.TotalVendas)}\n`;
      resposta += `  Quantidade de pedidos: ${venda.QuantidadePedidos}\n\n`;
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

    vendas.forEach((venda, index) => {
      resposta += `${index + 1} - ${venda.NomeFabricante} - R$ ${this.formatarMoeda(venda.TotalVendas)}\n`;
    });

    const totalGeral = vendas.reduce((sum, v) => sum + v.TotalVendas, 0);
    resposta += `\n*💰 TOTAL GERAL: R$ ${this.formatarMoeda(totalGeral)}*\n`;

    return resposta;
  }

  /**
   * ✅ NOVO: Formata resposta de detalhe de fabricante
   */
  formatarDetalheFabricante(detalhe: DetalheFabricante): string {
    return `*${detalhe.NomeFabricante}* - R$ ${this.formatarMoeda(detalhe.TotalVendas)}\n` +
      `Quantidade de pedidos: ${detalhe.QuantidadePedidos}\n` +
      `Vendedores: ${detalhe.QuantidadeVendedores}\n` +
      `Clientes: ${detalhe.QuantidadeClientes}\n` +
      `Produto mais vendido: ${detalhe.ProdutoMaisVendido}\n` +
      `Quantidade do produto mais vendido: ${detalhe.QuantidadeProdutoMaisVendido} volume(s)\n`;
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