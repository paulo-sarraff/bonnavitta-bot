# 🤖 Chatbot BonnaVitta - Bot Tradicional com Menu Interativo

**Versão:** 1.0.0  
**Status:** ✅ Produção  
**Linguagem:** Node.js + Express + TypeScript  
**Banco de Dados:** SQL Server 2019+

---

## 📋 Visão Geral

O **Chatbot BonnaVitta** é um assistente inteligente para o time comercial de uma empresa de atacado de alimentos. Funciona através de **Telegram** e **WhatsApp**, permitindo que gestores e vendedores consultem dados de vendas através de um **menu interativo tradicional** (sem IA).

### 🎯 Funcionalidades Principais

- ✅ **Menu Interativo:** Navegação intuitiva com opções pré-programadas
- ✅ **Autenticação Segura:** Login por CPF + Telefone com JWT
- ✅ **Consultas de Vendas:** Totalizador, por equipe, por vendedor, ranking de produtos
- ✅ **Gráficos Automáticos:** Geração de gráficos em PNG com Puppeteer
- ✅ **Telegram & WhatsApp:** Integração com ambos os canais
- ✅ **Controle de Acesso:** Autorização por role (admin, gerente, vendedor)
- ✅ **Logging Completo:** Auditoria de todas as ações
- ✅ **Pool de Conexões:** Gerenciamento eficiente do SQL Server

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    Usuário Final                             │
│              (Telegram / WhatsApp)                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              API Express (Node.js)                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Controllers: Auth, Bot, Webhook                      │   │
│  │ Routers: /api/auth, /api/bot, /api/webhook         │   │
│  │ Middleware: Autenticação, Autorização               │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
   ┌────────┐  ┌──────────┐  ┌─────────┐
   │ Groq  │  │ Telegram │  │WhatsApp │\n   │ API   │  │ Bot API  │  │ Cloud   │\n   └────────┘  └──────────┘  └─────────┘\n        │            │            │\n        └────────────┼────────────┘\n                     │\n                     ▼\n        ┌────────────────────────┐\n        │   SQL Server 2019+     │\n        │  ┌──────────────────┐  │\n        │  │ Tabelas          │  │\n        │  │ Views            │  │\n        │  │ Stored Procedures│  │\n        │  └──────────────────┘  │\n        └────────────────────────┘\n```

---

## 📦 Stack Tecnológico

| Componente | Tecnologia | Versão |\n|---|---|---|\n| **Runtime** | Node.js | 18+ |\n| **Framework** | Express | 4.x |\n| **Linguagem** | TypeScript | 5.x |\n| **Banco de Dados** | SQL Server | 2019+ |\n| **ORM** | mssql | 9.x |\n| **Autenticação** | JWT | jsonwebtoken |\n| **Gráficos** | Puppeteer + Chart.js | Último |\n| **Logging** | Winston | 3.x |\n| **Testes** | Vitest | Último |\n| **Validação** | Zod | Último |\n\n---\n\n## 🚀 Quick Start (5 minutos)\n\n### Pré-requisitos\n\n- Node.js 18+\n- SQL Server 2019+\n- npm ou yarn\n\n### Instalação\n\n```bash\n# 1. Clonar repositório\ngit clone <repo-url>\ncd chatbot-bonnavitta-bot-tradicional\n\n# 2. Instalar dependências\nnpm install\n\n# 3. Configurar variáveis de ambiente\ncp .env.example .env\n# Editar .env com suas credenciais\n\n# 4. Criar banco de dados\nsqlcmd -S localhost -U sa -P \"YourPassword123!\" -d BonnaVitta -i scripts/01_create_schema.sql\nsqlcmd -S localhost -U sa -P \"YourPassword123!\" -d BonnaVitta -i scripts/02_create_sps.sql\nsqlcmd -S localhost -U sa -P \"YourPassword123!\" -d BonnaVitta -i scripts/03_seed_data.sql\n\n# 5. Executar em desenvolvimento\nnpm run dev\n\n# 6. Testar\ncurl http://localhost:8000/health\n```\n\n---\n\n## 📚 Documentação Completa\n\n- **[COMECE_AQUI.md](./COMECE_AQUI.md)** - Guia rápido (5 minutos)\n- **[SETUP_LOCAL.md](./SETUP_LOCAL.md)** - Instalação detalhada\n- **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** - Exemplos de testes\n- **[TELEGRAM_SETUP.md](./docs/TELEGRAM_SETUP.md)** - Configurar Telegram\n- **[WHATSAPP_SETUP.md](./docs/WHATSAPP_SETUP.md)** - Configurar WhatsApp\n\n---\n\n## 🔌 Endpoints da API\n\n### Autenticação (Público)\n\n```bash\n# Login\nPOST /api/auth/login\n{\n  \"cpf\": \"12345678901\",\n  \"telefone\": \"11999999999\",\n  \"canal\": \"telegram\",\n  \"chatId\": \"123456789\"\n}\n\n# Validar Token\nGET /api/auth/validate\nHeader: Authorization: Bearer <token>\n```\n\n### Bot (Protegido)\n\n```bash\n# Processar Mensagem\nPOST /api/bot/message\nHeader: Authorization: Bearer <token>\n{\n  \"usuarioId\": 1,\n  \"canal\": \"telegram\",\n  \"chatId\": \"123456789\",\n  \"mensagem\": \"1\"\n}\n\n# Obter Menu\nGET /api/bot/menu\nHeader: Authorization: Bearer <token>\n```\n\n### Webhooks (Público)\n\n```bash\n# Telegram\nPOST /api/webhook/telegram\nGET /api/webhook/telegram?token=<token>\n\n# WhatsApp\nPOST /api/webhook/whatsapp\nGET /api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=<challenge>\n```\n\n---\n\n## 🔐 Segurança\n\n### Autenticação\n\n- ✅ Login por CPF + Telefone\n- ✅ JWT com expiração de 24h\n- ✅ Validação em middleware\n- ✅ Proteção de rotas sensíveis\n\n### Autorização\n\n- ✅ Roles: admin, gerente, vendedor\n- ✅ Controle de acesso por equipe\n- ✅ Validação de permissões\n\n### Banco de Dados\n\n- ✅ Apenas Stored Procedures (sem SQL dinâmico)\n- ✅ Pool de conexões com validação\n- ✅ Reciclagem automática de conexões\n- ✅ Health check antes de usar\n\n### Logging\n\n- ✅ Auditoria de todas as ações\n- ✅ Logs estruturados com Winston\n- ✅ Separação por nível (info, warn, error)\n- ✅ Rotação automática de arquivos\n\n---\n\n## 📊 Estrutura de Dados\n\n### Tabelas Principais\n\n| Tabela | Descrição |\n|---|---|\n| `Usuarios` | Usuários do sistema (CPF, telefone, role) |\n| `Equipes` | Equipes comerciais (Loja, Food Service, etc) |\n| `Vendedores` | Vendedores por equipe |\n| `Vendas` | Transações de vendas |\n| `Produtos` | Catálogo de produtos |\n| `SessoesBot` | Sessões ativas de usuários |\n\n### Stored Procedures\n\n| SP | Descrição |\n|---|---|\n| `sp_ValidarUsuario` | Valida credenciais de login |\n| `sp_GetVendasPorEquipe` | Vendas por equipe em período |\n| `sp_GetVendasPorVendedor` | Vendas por vendedor em período |\n| `sp_GetRankingProdutos` | Top N produtos mais vendidos |\n| `sp_GetPerformanceEquipe` | Performance de cada equipe |\n| `sp_CriarSessaoBot` | Cria nova sessão de usuário |\n| `sp_GetSessaoBot` | Recupera sessão ativa |\n| `sp_AtualizarEstadoSessao` | Atualiza estado da conversação |\n\n---\n\n## 🧪 Testes\n\n```bash\n# Executar todos os testes\nnpm test\n\n# Testes com coverage\nnpm run test:coverage\n\n# Testes em modo watch\nnpm run test:watch\n```\n\n### Testes Inclusos\n\n- ✅ Autenticação e JWT\n- ✅ Fluxo de conversação\n- ✅ Validadores\n- ✅ Formatadores\n\n---\n\n## 📝 Scripts Disponíveis\n\n```bash\n# Desenvolvimento\nnpm run dev          # Inicia com hot-reload\nnpm run build        # Compila TypeScript\nnpm start            # Inicia em produção\n\n# Testes\nnpm test             # Executa testes\nnpm run test:watch   # Testes em watch mode\n\n# Linting\nnpm run lint         # Verifica código\nnpm run format       # Formata código\n\n# Banco de Dados\nnpm run db:seed      # Popula dados de exemplo\nnpm run db:reset     # Reseta banco\n```\n\n---\n\n## 🎓 Fluxo de Conversação\n\n```\n1. Usuário inicia conversa\n   ↓\n2. Bot exibe Menu Principal\n   - Totalizador de Vendas\n   - Vendas por Vendedor\n   - Ranking de Produtos\n   - Performance por Equipe\n   - Sair\n   ↓\n3. Usuário seleciona opção\n   ↓\n4. Bot pergunta período (Hoje, Ontem, 7 dias, etc)\n   ↓\n5. Usuário seleciona data\n   ↓\n6. Bot pergunta tipo de consulta (Total ou por Equipe)\n   ↓\n7. Usuário seleciona tipo\n   ↓\n8. Bot consulta banco de dados\n   ↓\n9. Bot gera gráfico (se aplicável)\n   ↓\n10. Bot envia resposta + gráfico\n    ↓\n11. Usuário pode fazer nova consulta\n```\n\n---\n\n## 🐛 Troubleshooting\n\n### Erro de Conexão com SQL Server\n\n```\nSolução: Verifique credenciais em .env\n- DATABASE_HOST\n- DATABASE_PORT\n- DATABASE_USERNAME\n- DATABASE_PASSWORD\n```\n\n### Webhook não recebe mensagens\n\n```\nSolução: Verifique URL pública\n- ngrok para desenvolvimento local\n- Domínio HTTPS para produção\n```\n\n### Gráficos não geram\n\n```\nSolução: Instale dependências do Puppeteer\nnpm install puppeteer\n```\n\nVeja **[TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)** para mais soluções.\n\n---\n\n## 📞 Suporte\n\nPara dúvidas ou problemas:\n\n1. Consulte a documentação em `/docs`\n2. Verifique os logs em `/logs`\n3. Execute os testes: `npm test`\n4. Abra uma issue no repositório\n\n---\n\n## 📄 Licença\n\nMIT License - Veja [LICENSE](./LICENSE) para detalhes.\n\n---\n\n**Desenvolvido com ❤️ por Manus AI**\n
