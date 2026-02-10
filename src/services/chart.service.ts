import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger.js';

// Interfaces para os dados
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

interface VendasPorEquipe {
  NomeEquipe: string;
  QuantidadePedidos: number;
  TotalVendas: number;
  TicketMedio: number;
  QuantidadeUnidades: number;
}

class ChartService {
  private chartsDir: string;

  constructor() {
    this.chartsDir = path.join(process.cwd(), 'charts');
    if (!fs.existsSync(this.chartsDir)) {
      fs.mkdirSync(this.chartsDir, { recursive: true });
    }
  }

  /**
   * Valida se há dados para renderizar
   */
  private validarDados(labels: string[], valores: number[]): boolean {
    if (!labels || labels.length === 0) {
      logger.warn('Nenhum label fornecido para o gráfico');
      return false;
    }
    
    if (!valores || valores.length === 0) {
      logger.warn('Nenhum valor fornecido para o gráfico');
      return false;
    }
    
    if (labels.length !== valores.length) {
      logger.warn('Quantidade de labels diferente de valores');
      return false;
    }
    
    return true;
  }

  /**
   * Gera gráfico de vendas por supervisor
   */
  async gerarGraficoVendasPorSupervisor(vendas: VendasPorSupervisor[]): Promise<string | null> {
    try {
      if (!vendas || vendas.length === 0) {
        logger.warn('Nenhum dado de vendas por supervisor fornecido');
        return null;
      }

      const labels = vendas.map((v) => v.NomeSupervisor);
      const valores = vendas.map((v) => v.TotalVendas);

      if (!this.validarDados(labels, valores)) {
        return null;
      }

      const html = this.gerarHtmlGraficoBarras(
        'Vendas por Supervisor',
        labels,
        valores,
        'Valor (R$)'
      );

      const arquivo = await this.renderizarGrafico(html, 'vendas-supervisor');
      return arquivo;
    } catch (error) {
      logger.error('Erro ao gerar gráfico de vendas por supervisor:', error);
      return null;
    }
  }

  /**
   * Gera gráfico de vendas por vendedor
   */
  async gerarGraficoVendasPorVendedor(vendas: VendasPorVendedorSP[]): Promise<string | null> {
    try {
      if (!vendas || vendas.length === 0) {
        logger.warn('Nenhum dado de vendas por vendedor fornecido');
        return null;
      }

      const labels = vendas.map((v) => v.NomeVendedor);
      const valores = vendas.map((v) => v.TotalVendas);

      if (!this.validarDados(labels, valores)) {
        return null;
      }

      const html = this.gerarHtmlGraficoBarras(
        'Vendas por Vendedor',
        labels,
        valores,
        'Valor (R$)'
      );

      const arquivo = await this.renderizarGrafico(html, 'vendas-vendedor');
      return arquivo;
    } catch (error) {
      logger.error('Erro ao gerar gráfico de vendas por vendedor:', error);
      return null;
    }
  }

  /**
   * Gera gráfico de vendas por dia
   */
  async gerarGraficoVendasPorDia(vendas: VendasPorDia[]): Promise<string | null> {
    try {
      if (!vendas || vendas.length === 0) {
        logger.warn('Nenhum dado de vendas por dia fornecido');
        return null;
      }

      const labels = vendas.map((v) => new Date(v.Data).toLocaleDateString('pt-BR'));
      const valores = vendas.map((v) => v.TotalVendas);

      if (!this.validarDados(labels, valores)) {
        return null;
      }

      const html = this.gerarHtmlGraficoLinha(
        'Vendas por Dia',
        labels,
        valores,
        'Valor (R$)'
      );

      const arquivo = await this.renderizarGrafico(html, 'vendas-dia');
      return arquivo;
    } catch (error) {
      logger.error('Erro ao gerar gráfico de vendas por dia:', error);
      return null;
    }
  }

  /**
   * Gera gráfico de vendas por fabricante
   */
  async gerarGraficoVendasPorFabricante(vendas: VendasPorFabricante[]): Promise<string | null> {
    try {
      if (!vendas || vendas.length === 0) {
        logger.warn('Nenhum dado de vendas por fabricante fornecido');
        return null;
      }

      const labels = vendas.map((v) => v.NomeFabricante);
      const valores = vendas.map((v) => v.TotalVendas);

      if (!this.validarDados(labels, valores)) {
        return null;
      }

      const html = this.gerarHtmlGraficoBarras(
        'Vendas por Fabricante',
        labels,
        valores,
        'Valor (R$)'
      );

      const arquivo = await this.renderizarGrafico(html, 'vendas-fabricante');
      return arquivo;
    } catch (error) {
      logger.error('Erro ao gerar gráfico de vendas por fabricante:', error);
      return null;
    }
  }

  /**
   * Gera gráfico de vendas por equipe
   */
  async gerarGraficoVendasPorEquipe(vendas: VendasPorEquipe[]): Promise<string | null> {
    try {
      if (!vendas || vendas.length === 0) {
        logger.warn('Nenhum dado de vendas por equipe fornecido');
        return null;
      }

      const labels = vendas.map((v) => v.NomeEquipe);
      const valores = vendas.map((v) => v.TotalVendas);

      if (!this.validarDados(labels, valores)) {
        return null;
      }

      const html = this.gerarHtmlGraficoBarras(
        'Vendas por Equipe',
        labels,
        valores,
        'Valor (R$)'
      );

      const arquivo = await this.renderizarGrafico(html, 'vendas-equipe');
      return arquivo;
    } catch (error) {
      logger.error('Erro ao gerar gráfico de vendas por equipe:', error);
      return null;
    }
  }

  /**
   * Gera gráfico de ranking de produtos
   */
  async gerarGraficoRankingProdutos(produtos: RankingProdutoSP[]): Promise<string | null> {
    try {
      if (!produtos || produtos.length === 0) {
        logger.warn('Nenhum dado de ranking de produtos fornecido');
        return null;
      }

      const labels = produtos.map((p) => p.NomeProduto);
      const valores = produtos.map((p) => p.QuantidadeVendida);

      if (!this.validarDados(labels, valores)) {
        return null;
      }

      const html = this.gerarHtmlGraficoBarras(
        'Ranking de Produtos',
        labels,
        valores,
        'Quantidade Vendida'
      );

      const arquivo = await this.renderizarGrafico(html, 'ranking-produtos');
      return arquivo;
    } catch (error) {
      logger.error('Erro ao gerar gráfico de ranking de produtos:', error);
      return null;
    }
  }

  /**
   * Gera HTML para gráfico de barras
   */
  private gerarHtmlGraficoBarras(
    titulo: string,
    labels: string[],
    valores: number[],
    labelEixoY: string
  ): string {
    const cores = [
      '#FF6B6B',
      '#4ECDC4',
      '#45B7D1',
      '#FFA07A',
      '#98D8C8',
      '#F7DC6F',
      '#BB8FCE',
      '#85C1E2',
    ];

    const labelsJSON = JSON.stringify(labels);
    const valoresJSON = JSON.stringify(valores);
    const coresJSON = JSON.stringify(cores.slice(0, valores.length));

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
          body { margin: 0; padding: 20px; background: white; font-family: Arial, sans-serif; }
          canvas { max-width: 100%; }
        </style>
      </head>
      <body>
        <canvas id="chart"></canvas>
        <script>
          // Função para sinalizar que o gráfico foi renderizado
          window.chartReady = false;
          
          const ctx = document.getElementById('chart' ).getContext('2d');
          const chart = new Chart(ctx, {
            type: 'bar',
            data: {
              labels: ${labelsJSON},
              datasets: [{
                label: '${labelEixoY}',
                data: ${valoresJSON},
                backgroundColor: ${coresJSON},
                borderColor: '#333',
                borderWidth: 1
              }]
            },
            options: {
              responsive: true,
              plugins: {
                title: {
                  display: true,
                  text: '${titulo}',
                  font: { size: 16, weight: 'bold' }
                },
                legend: { display: true }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  title: { display: true, text: '${labelEixoY}' }
                }
              }
            }
          });
          
          // Sinalizar quando o gráfico está pronto
          chart.resize();
          window.chartReady = true;
        </script>
      </body>
      </html>
    `;
  }

  /**
   * Gera HTML para gráfico de linhas
   */
  private gerarHtmlGraficoLinha(
    titulo: string,
    labels: string[],
    valores: number[],
    labelEixoY: string
  ): string {
    const labelsJSON = JSON.stringify(labels);
    const valoresJSON = JSON.stringify(valores);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
          body { margin: 0; padding: 20px; background: white; font-family: Arial, sans-serif; }
          canvas { max-width: 100%; }
        </style>
      </head>
      <body>
        <canvas id="chart"></canvas>
        <script>
          // Função para sinalizar que o gráfico foi renderizado
          window.chartReady = false;
          
          const ctx = document.getElementById('chart' ).getContext('2d');
          const chart = new Chart(ctx, {
            type: 'line',
            data: {
              labels: ${labelsJSON},
              datasets: [{
                label: '${labelEixoY}',
                data: ${valoresJSON},
                borderColor: '#4ECDC4',
                backgroundColor: 'rgba(78, 205, 196, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
              }]
            },
            options: {
              responsive: true,
              plugins: {
                title: {
                  display: true,
                  text: '${titulo}',
                  font: { size: 16, weight: 'bold' }
                },
                legend: { display: true }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  title: { display: true, text: '${labelEixoY}' }
                }
              }
            }
          });
          
          // Sinalizar quando o gráfico está pronto
          chart.resize();
          window.chartReady = true;
        </script>
      </body>
      </html>
    `;
  }

  /**
   * Renderiza HTML para PNG usando Puppeteer
   */
  private async renderizarGrafico(html: string, nomeArquivo: string): Promise<string> {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      
      // Definir viewport para melhor renderização
      await page.setViewport({ width: 1200, height: 600 });
      
      // Carregar o HTML
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      // Aguardar o canvas estar disponível
      await page.waitForSelector('canvas');
      
      // ✅ NOVO: Aguardar o Chart.js renderizar completamente
      await page.waitForFunction(
        'window.chartReady === true',
        { timeout: 5000 }
      );
      
      // ✅ NOVO: Aguardar mais um pouco para garantir renderização
      await new Promise(resolve => setTimeout(resolve, 500));

      const timestamp = Date.now();
      const nomeArquivoFinal = `${nomeArquivo}-${timestamp}.png`;
      const caminhoArquivo = path.join(this.chartsDir, nomeArquivoFinal);

      // Capturar screenshot do canvas
      await page.screenshot({ 
        path: caminhoArquivo, 
        fullPage: true,
        type: 'png'
      });

      logger.info(`Gráfico gerado com sucesso: ${nomeArquivoFinal}`);

      return caminhoArquivo;
    } catch (error) {
      logger.error('Erro ao renderizar gráfico:', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Remove arquivo de gráfico antigo
   */
  removerGraficoAntigo(caminhoArquivo: string): void {
    try {
      if (fs.existsSync(caminhoArquivo)) {
        fs.unlinkSync(caminhoArquivo);
        logger.info(`Gráfico removido: ${caminhoArquivo}`);
      }
    } catch (error) {
      logger.error('Erro ao remover gráfico:', error);
    }
  }

  /**
   * Limpa todos os gráficos antigos (mais de 1 hora)
   */
  limparGraficosAntigos(): void {
    try {
      const agora = Date.now();
      const umHora = 60 * 60 * 1000;

      const arquivos = fs.readdirSync(this.chartsDir);
      arquivos.forEach((arquivo) => {
        const caminhoCompleto = path.join(this.chartsDir, arquivo);
        const stats = fs.statSync(caminhoCompleto);

        if (agora - stats.mtimeMs > umHora) {
          fs.unlinkSync(caminhoCompleto);
          logger.info(`Gráfico antigo removido: ${arquivo}`);
        }
      });
    } catch (error) {
      logger.error('Erro ao limpar gráficos antigos:', error);
    }
  }
}

export const chartService = new ChartService();