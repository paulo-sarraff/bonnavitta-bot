/**
 * ChartService — geração de gráficos PNG usando chartjs-node-canvas.
 *
 * Escolha de tipo por contexto:
 *   Supervisores    → barras horizontais  (5 itens fixos, comparação de valor)
 *   Vendedores      → barras horizontais  (lista variável, labels com nome)
 *   Fabricantes     → barras horizontais  (ranking de participação, labels longos)
 *   Vendas dia/semana_dias/mes_dias → linha com área  (série temporal contínua)
 *   Vendas por semana/mes_semanas   → barras verticais (períodos discretos, poucos pontos)
 *   Vendas por mês/ano_meses        → barras verticais (até 12 pontos, comparação mensal)
 *
 * NÃO usa Puppeteer nem CDN externo — renderização é 100% server-side.
 */

import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { ChartConfiguration, ChartType } from 'chart.js';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger.js';

// ── Dimensões ────────────────────────────────────────────────────────────────
const W = 1000;
const H = 520;

// ── Paleta ───────────────────────────────────────────────────────────────────
const CORES = [
  '#2563EB','#16A34A','#DC2626','#D97706',
  '#7C3AED','#0891B2','#BE185D','#065F46','#92400E','#1E3A8A',
];
const CORES_BG = CORES.map(c => c + 'CC'); // 80% opacidade

// ── Renderer singleton ───────────────────────────────────────────────────────
const renderer = new ChartJSNodeCanvas({
  width: W, height: H, backgroundColour: 'white',
  plugins: { modern: ['chartjs-plugin-datalabels'] },
});

// ── Tipos públicos ────────────────────────────────────────────────────────────
export interface ItemGrafico  { label: string; valor: number }
export interface ItemSerie    { label: string; valor: number }

// ── Helpers internos ──────────────────────────────────────────────────────────

function fmtBRL(v: number): string {
  // Versão abreviada para eixos
  if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `R$${(v / 1_000).toFixed(0)}k`;
  return `R$${v.toFixed(0)}`;
}

function fmtBRLFull(v: number): string {
  // Versão completa para labels sobre barras/pontos
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function chartsDir(): string {
  const dir = path.join(process.cwd(), 'charts');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function renderBuffer(config: ChartConfiguration, prefixo: string): Promise<Buffer> {
  const buffer = await renderer.renderToBuffer(config as any);
  logger.info(`Gráfico renderizado: ${prefixo}`);
  return buffer;
}

// ── Barras horizontais ────────────────────────────────────────────────────────
async function barrasH(titulo: string, itens: ItemGrafico[], prefixo: string): Promise<Buffer | null> {
  if (!itens.length) return null;

  const ordenados = [...itens].sort((a, b) => b.valor - a.valor);
  const labels    = ordenados.map(i => i.label.trim());
  const valores   = ordenados.map(i => i.valor);

  // Altura dinâmica para listas longas
  const alturaFlex = Math.max(H, labels.length * 46 + 140);
  const rend = alturaFlex !== H
    ? new ChartJSNodeCanvas({ width: W, height: alturaFlex, backgroundColour: 'white', plugins: { modern: ['chartjs-plugin-datalabels'] } })
    : renderer;

  const config: ChartConfiguration = {
    type: 'bar' as ChartType,
    data: {
      labels,
      datasets: [{
        label: 'Vendas',
        data: valores,
        backgroundColor: CORES_BG.slice(0, valores.length),
        borderColor:     CORES.slice(0, valores.length),
        borderWidth: 1.5,
        borderRadius: 4,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: false,
      layout: { padding: { right: 90 } },
      plugins: {
        title: { display: true, text: titulo, font: { size: 15, weight: 'bold' }, padding: { bottom: 14 } },
        legend: { display: false },
        datalabels: {
          anchor: 'end',
          align: 'right',
          formatter: (v: number) => fmtBRLFull(v),
          font: { size: 11, weight: 'bold' },
          color: '#1F2937',
          clip: false,
        },
      } as any,
      scales: {
        x: {
          beginAtZero: true,
          ticks: { callback: (v) => fmtBRL(Number(v)), maxTicksLimit: 6, font: { size: 11 } },
          grid: { color: '#E5E7EB' },
        },
        y: { ticks: { font: { size: 12 } }, grid: { display: false } },
      },
    },
  };

  if (alturaFlex !== H) {
    const buf = await rend.renderToBuffer(config as any);
    logger.info(`Gráfico renderizado: ${prefixo}`);
    return buf;
  }
  return renderBuffer(config, prefixo);
}

// ── Barras verticais ──────────────────────────────────────────────────────────
async function barrasV(titulo: string, series: ItemSerie[], prefixo: string): Promise<Buffer | null> {
  if (!series.length) return null;

  const config: ChartConfiguration = {
    type: 'bar' as ChartType,
    data: {
      labels: series.map(s => s.label),
      datasets: [{
        label: 'Vendas',
        data: series.map(s => s.valor),
        backgroundColor: CORES_BG[0],
        borderColor:     CORES[0],
        borderWidth: 1.5,
        borderRadius: 4,
      }],
    },
    options: {
      responsive: false,
      layout: { padding: { top: 28 } },
      plugins: {
        title: { display: true, text: titulo, font: { size: 15, weight: 'bold' }, padding: { bottom: 14 } },
        legend: { display: false },
        datalabels: {
          anchor: 'end',
          align: 'top',
          formatter: (v: number) => fmtBRLFull(v),
          font: { size: 10, weight: 'bold' },
          color: '#1F2937',
          rotation: -35,
          clip: false,
        },
      } as any,
      scales: {
        x: { ticks: { font: { size: 11 }, maxRotation: 35 }, grid: { display: false } },
        y: {
          beginAtZero: true,
          ticks: { callback: (v) => fmtBRL(Number(v)), maxTicksLimit: 6, font: { size: 11 } },
          grid: { color: '#E5E7EB' },
        },
      },
    },
  };

  return renderBuffer(config, prefixo);
}

// ── Linha com área ────────────────────────────────────────────────────────────
async function linha(titulo: string, series: ItemSerie[], prefixo: string): Promise<Buffer | null> {
  if (!series.length) return null;

  const config: ChartConfiguration = {
    type: 'line' as ChartType,
    data: {
      labels: series.map(s => s.label),
      datasets: [{
        label: 'Vendas',
        data: series.map(s => s.valor),
        borderColor:     CORES[0],
        backgroundColor: CORES[0] + '22',
        borderWidth: 2.5,
        pointBackgroundColor: CORES[0],
        pointRadius: series.length <= 14 ? 5 : 3,
        pointHoverRadius: 7,
        fill: true,
        tension: 0.3,
      }],
    },
    options: {
      responsive: false,
      layout: { padding: { top: 28 } },
      plugins: {
        title: { display: true, text: titulo, font: { size: 15, weight: 'bold' }, padding: { bottom: 14 } },
        legend: { display: false },
        datalabels: {
          anchor: 'top',
          align: 'top',
          formatter: (v: number) => fmtBRLFull(v),
          font: { size: series.length > 14 ? 8 : 10, weight: 'bold' },
          color: '#1F2937',
          clip: false,
        },
      } as any,
      scales: {
        x: {
          ticks: { font: { size: series.length > 20 ? 9 : 11 }, maxRotation: 45 },
          grid: { color: '#E5E7EB' },
        },
        y: {
          beginAtZero: true,
          ticks: { callback: (v) => fmtBRL(Number(v)), maxTicksLimit: 6, font: { size: 11 } },
          grid: { color: '#E5E7EB' },
        },
      },
    },
  };

  return renderBuffer(config, prefixo);
}

// ── Classe principal ──────────────────────────────────────────────────────────
class ChartService {

  /** Supervisores — barras horizontais */
  async gerarGraficoSupervisores(itens: ItemGrafico[], titulo = 'Vendas por Supervisor'): Promise<Buffer | null> {
    try { return await barrasH(titulo, itens, 'supervisores'); }
    catch (e) { logger.error('Erro gráfico supervisores:', e); return null; }
  }

  /** Vendedores — barras horizontais */
  async gerarGraficoVendedores(itens: ItemGrafico[], titulo = 'Vendas por Vendedor'): Promise<Buffer | null> {
    try { return await barrasH(titulo, itens, 'vendedores'); }
    catch (e) { logger.error('Erro gráfico vendedores:', e); return null; }
  }

  /** Fabricantes — barras horizontais */
  async gerarGraficoFabricantes(itens: ItemGrafico[], titulo = 'Vendas por Fabricante'): Promise<Buffer | null> {
    try { return await barrasH(titulo, itens, 'fabricantes'); }
    catch (e) { logger.error('Erro gráfico fabricantes:', e); return null; }
  }

  /** Vendas dia a dia — linha com área (série temporal contínua) */
  async gerarGraficoVendasDia(series: ItemSerie[], titulo = 'Vendas por Dia'): Promise<Buffer | null> {
    try { return await linha(titulo, series, 'vendas-dia'); }
    catch (e) { logger.error('Erro gráfico vendas dia:', e); return null; }
  }

  /** Vendas por semana — barras verticais (períodos discretos) */
  async gerarGraficoVendasSemana(series: ItemSerie[], titulo = 'Vendas por Semana'): Promise<Buffer | null> {
    try { return await barrasV(titulo, series, 'vendas-semana'); }
    catch (e) { logger.error('Erro gráfico vendas semana:', e); return null; }
  }

  /** Vendas por mês — barras verticais (até 12 colunas) */
  async gerarGraficoVendasMes(series: ItemSerie[], titulo = 'Vendas por Mês'): Promise<Buffer | null> {
    try { return await barrasV(titulo, series, 'vendas-mes'); }
    catch (e) { logger.error('Erro gráfico vendas mês:', e); return null; }
  }

  removerGraficoAntigo(caminhoArquivo: string): void {
    try {
      if (fs.existsSync(caminhoArquivo)) { fs.unlinkSync(caminhoArquivo); }
    } catch (e) { logger.error('Erro ao remover gráfico:', e); }
  }

  limparGraficosAntigos(): void {
    try {
      const dir = chartsDir();
      const limite = Date.now() - 60 * 60 * 1000;
      fs.readdirSync(dir).forEach(f => {
        const full = path.join(dir, f);
        if (fs.statSync(full).mtimeMs < limite) fs.unlinkSync(full);
      });
    } catch (e) { logger.error('Erro ao limpar gráficos:', e); }
  }
}

export const chartService = new ChartService();