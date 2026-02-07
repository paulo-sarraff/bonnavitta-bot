import { startServer } from './app.js';
import logger from './utils/logger.js';

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  logger.error('Exceção não capturada:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, _promise) => {
  logger.error('Promise rejeitada não tratada:', reason);
  process.exit(1);
});

// Iniciar servidor
startServer().catch((error) => {
  logger.error('Erro fatal ao iniciar servidor:', error);
  process.exit(1);
});
