import winston from 'winston';
import path from 'path';
import fs from 'fs';
import config from '../config/index.js';

// Criar diretório de logs se não existir
const logsDir = config.logging.dir;
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, timestamp, ...meta }) => {
      const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
      return `${timestamp} [${level}]: ${message} ${metaStr}`;
    })
  ),
  defaultMeta: { service: 'chatbot-bonnavitta' },
  transports: [
    // Console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp }) => {
          return `${timestamp} [${level}]: ${message}`;
        })
      ),
    }),

    // Error log
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: parseInt(config.logging.maxSize.replace('m', '')) * 1024 * 1024,
      maxFiles: config.logging.maxFiles,
    }),

    // Combined log
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: parseInt(config.logging.maxSize.replace('m', '')) * 1024 * 1024,
      maxFiles: config.logging.maxFiles,
    }),
  ],
});

export default logger;
