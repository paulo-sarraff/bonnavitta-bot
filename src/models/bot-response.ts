import { EstadoBot } from './schemas.js';

export interface BotProcessResult {
  resposta: string;
  opcoes?: {
    id: string;
    texto: string;
    emoji?: string;
  }[];
  grafico?: string | null;
  proximoEstado: EstadoBot;
}
