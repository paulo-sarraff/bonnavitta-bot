import dotenv from 'dotenv';
import logger from '../utils/logger.js';

dotenv.config();

/**
 * Helper para converter boolean vindo do .env
 */
function envToBool(value?: string, defaultValue = false): boolean {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
}

/**
 * Helper para converter number vindo do .env
 */
function envToNumber(value?: string, defaultValue = 0): number {
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

const config = {
  // ==================================================
  // API
  // ==================================================
  api: {
    host: process.env.API_HOST || '0.0.0.0',
    port: envToNumber(process.env.API_PORT, 8000),
    env: process.env.NODE_ENV || 'development',
    debug: envToBool(process.env.DEBUG, false),
  },

  // ==================================================
  // CORS
  // ==================================================
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: envToBool(process.env.CORS_CREDENTIALS, true),
  },

  // ==================================================
  // Banco de Dados (SQL Server)
  // ==================================================
  database: {
    host: process.env.SQL_SERVER_HOST || 'chatbot-sqlserver.co3y6ok4qk49.us-east-1.rds.amazonaws.com',
    port: parseInt(process.env.SQL_SERVER_PORT || '1433', 10),
    database: process.env.SQL_SERVER_DATABASE || 'xxx',
    username: process.env.SQL_SERVER_USERNAME || 'yyy',
    password: process.env.SQL_SERVER_PASSWORD || 'zzz!',
    options: {
      trustServerCertificate: true,
      enableKeepAlive: true,
      keepAliveInitialDelayMs: 30000,
    },
    pool: {
      min: 5,
      max: 15,
      idleTimeoutMillis: 30000,
    },
  },

    // ==================================================
    // JWT
    // ==================================================
    jwt: {
      secret: process.env.JWT_SECRET || 'dev-secret-key-change-in-production-12345',

      // GARANTIDO
      expiration: (process.env.JWT_EXPIRES_IN || '1d') as
        | '1d'
        | '7d'
        | '30d'
        | '12h'
        | '24h',
    },

  // ==================================================
  // Telegram
  // ==================================================
  telegram: {
    enabled: envToBool(process.env.ENABLE_TELEGRAM),
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    webhookUrl: process.env.TELEGRAM_WEBHOOK_URL || '',
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET || '',
  },

  // ==================================================
  // WhatsApp
  // ==================================================
  whatsapp: {
    enabled: envToBool(process.env.ENABLE_WHATSAPP),
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    webhookVerifyToken:
      process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '',
    businessAccountId:
      process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
  },

  // ==================================================
  // Sessões
  // ==================================================
  session: {
    timeoutHours: envToNumber(
      process.env.SESSION_TIMEOUT_HOURS,
      24
    ),
    cleanupIntervalMinutes: envToNumber(
      process.env.SESSION_CLEANUP_INTERVAL_MINUTES,
      60
    ),
  },

  // ==================================================
  // Gráficos
  // ==================================================
  charts: {
    enabled: envToBool(process.env.ENABLE_CHARTS),
    width: envToNumber(process.env.CHART_WIDTH, 1200),
    height: envToNumber(process.env.CHART_HEIGHT, 600),
    fontSize: envToNumber(process.env.CHART_FONT_SIZE, 14),
    backgroundColor:
      process.env.CHART_BACKGROUND_COLOR || '#FFFFFF',
  },

  // ==================================================
  // Logs
  // ==================================================
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || './logs',
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    maxFiles: envToNumber(process.env.LOG_MAX_FILES, 14),
  },

  // ==================================================
  // Rate Limit
  // ==================================================
  rateLimit: {
    windowMs: envToNumber(
      process.env.RATE_LIMIT_WINDOW_MS,
      15 * 60 * 1000
    ),
    maxRequests: envToNumber(
      process.env.RATE_LIMIT_MAX_REQUESTS,
      100
    ),
  },

  // ==================================================
  // Features
  // ==================================================
  features: {
    enableTelegram: envToBool(process.env.ENABLE_TELEGRAM),
    enableWhatsApp: envToBool(process.env.ENABLE_WHATSAPP),
    enableCharts: envToBool(process.env.ENABLE_CHARTS),
    enableAuditLog: envToBool(process.env.ENABLE_AUDIT_LOG),
  },
};

export default config;