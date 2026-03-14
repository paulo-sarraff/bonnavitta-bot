import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import config from './config/index.js';
import logger from './utils/logger.js';
import { initializeDatabase } from './config/database.js';

// Importar routers
import authRoutes from './routes/auth.routes.js';
import botRoutes from './routes/bot.routes.js';
import webhookRoutes from './routes/webhook.routes.js';

// ✅ NOVO: Importar sessionService para limpeza de sessões
import { sessionService } from './services/session.service.js';
import { chartService } from './services/chart.service.js';

const app: Express = express();

// ============================================
// Middlewares Globais
// ============================================

// Segurança
app.use(helmet());

// CORS
app.use(
  cors({
    origin: ['http://localhost:3000', 'http://localhost:8000', 'https://*'],
    credentials: true,
  })
);

// Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Logging
app.use(morgan('combined', { stream: { write: (msg: string) => logger.info(msg.trim()) } }));

// ============================================
// Health Check
// ============================================

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ============================================
// Rotas Públicas
// ============================================

// Autenticação (sem middleware)
app.use('/api/auth', authRoutes);

// Webhooks (sem middleware)
app.use('/api/webhook', webhookRoutes);

// ============================================
// Rotas Protegidas
// ============================================

// Bot (com middleware de autenticação)
app.use('/api/bot', botRoutes);

// ============================================
// Rota Raiz
// ============================================

app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    nome: 'Chatbot BonnaVitta',
    versao: '1.0.0',
    descricao: 'Bot inteligente para consulta de dados de vendas',
    endpoints: {
      autenticacao: '/api/auth/login',
      bot: '/api/bot/message',
      webhooks: {
        telegram: '/api/webhook/telegram',
        whatsapp: '/api/webhook/whatsapp',
      },
      saude: '/health',
    },
  });
});

// ============================================
// Tratamento de Erros
// ============================================

// 404 - Rota não encontrada
app.use((req: Request, res: Response) => {
  logger.warn(`Rota não encontrada: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    mensagem: 'Rota não encontrada',
    path: req.path,
  });
});

// Erro global
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Erro não tratado:', err);
  res.status(err.status || 500).json({
    success: false,
    mensagem: err.message || 'Erro interno do servidor',
    ...(config.api.env === 'development' && { stack: err.stack }),
  });
});

// ============================================
// Inicialização
// ============================================

export async function startServer(): Promise<void> {
  try {
    // Inicializar banco de dados
    logger.info('Inicializando banco de dados...');
    await initializeDatabase();
    logger.info('Banco de dados conectado com sucesso');

    // Limpeza periódica de sessões expiradas e gráficos antigos (a cada 1 hora)
    const intervaloLimpeza = 60 * 60 * 1000;
    setInterval(() => {
      sessionService.limparSessoesExpiradas();
      chartService.limparGraficosAntigos();
    }, intervaloLimpeza);
    // Limpeza inicial ao subir o servidor (remove arquivos de execuções anteriores)
    chartService.limparGraficosAntigos();
    logger.info('✅ Limpeza periódica de sessões e gráficos iniciada (a cada 1 hora)');

    // Iniciar servidor
    const port = config.api.port;
    const host = config.api.host;
    app.listen(port, host, () => {
      logger.info(`🚀 Servidor rodando em http://${host}:${port}`);
      logger.info(`📝 Documentação disponível em http://${host}:${port}/`);
      logger.info(`💚 Health check em http://${host}:${port}/health`);
    });
  } catch (error) {
    logger.error('Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

export default app;