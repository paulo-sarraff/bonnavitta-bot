-- ============================================================
-- SCRIPT: Stored Procedures — Chatbot BonnaVitta
-- View base: [BonnaVitta.Log].[dbo].[vw_fPreVendas]
-- Filtro de data: DataPreVenda
-- Coluna de valor: ValorFinalPV
-- Identificador único: Numero
-- ============================================================
-- STATUS DAS PROCEDURES:
--   [ATIVA]   Chamada pelo bot.controller.ts
--   [INATIVA] Existe no vendas.service.ts mas não é chamada pelo controller
-- ============================================================

USE [BonnaVitta.Log];
GO

-- ============================================================
-- [ATIVA] SP 01: Vendas por Supervisor
-- Chamada em: getVendasPorSupervisor()
-- Retorna: NomeSetor, NomeSupervisor, QuantidadeVendedores,
--          QuantidadePedidos, TotalVendas, TicketMedio
-- ============================================================
IF OBJECT_ID('dbo.sp_GetVendasPorSupervisor', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_GetVendasPorSupervisor;
GO

CREATE PROCEDURE dbo.sp_GetVendasPorSupervisor
    @DataInicio DATE,
    @DataFim    DATE
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        NomeSetor                                                           AS NomeSetor,
        NomeSupervisor,
        COUNT(DISTINCT Vendedor_Pedido)                                     AS QuantidadeVendedores,
        COUNT(DISTINCT Numero)                                              AS QuantidadePedidos,
        CAST(SUM(ValorFinalPV)   AS DECIMAL(18,2))                         AS TotalVendas,
        CAST(SUM(ValorFinalPV) / NULLIF(COUNT(DISTINCT Numero), 0)
             AS DECIMAL(18,2))                                              AS TicketMedio
    FROM [BonnaVitta.Log].[dbo].[vw_fPreVendas]
    WHERE DataPreVenda BETWEEN @DataInicio AND @DataFim
      AND NomeSupervisor IS NOT NULL
    GROUP BY NomeSetor, NomeSupervisor
    ORDER BY TotalVendas DESC;
END;
GO

-- ============================================================
-- [ATIVA] SP 02: Vendas por Vendedor do Supervisor
-- Chamada em: getVendasPorVendedorDoSupervisor()
-- Retorna: SetorClientes, NomeVendedor, TotalVendas,
--          QuantidadePedidos, TicketMedio
-- ============================================================
IF OBJECT_ID('dbo.sp_GetVendasPorVendedorDoSupervisor', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_GetVendasPorVendedorDoSupervisor;
GO

CREATE PROCEDURE dbo.sp_GetVendasPorVendedorDoSupervisor
    @DataInicio     DATE,
    @DataFim        DATE,
    @NomeSupervisor NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        Setor_Cliente                                                       AS SetorClientes,
        NomeGuerr_Pedido                                                    AS NomeVendedor,
        CAST(SUM(ValorFinalPV)   AS DECIMAL(18,2))                         AS TotalVendas,
        COUNT(DISTINCT Numero)                                              AS QuantidadePedidos,
        CAST(SUM(ValorFinalPV) / NULLIF(COUNT(DISTINCT Numero), 0)
             AS DECIMAL(18,2))                                              AS TicketMedio
    FROM [BonnaVitta.Log].[dbo].[vw_fPreVendas]
    WHERE DataPreVenda BETWEEN @DataInicio AND @DataFim
      AND NomeSupervisor = @NomeSupervisor
    GROUP BY Setor_Cliente, NomeGuerr_Pedido
    ORDER BY Setor_Cliente ASC, TotalVendas DESC;
END;
GO

-- ============================================================
-- [ATIVA] SP 03: Fabricantes por Supervisor
-- Chamada em: getFabricantesPorSupervisor()
-- Retorna: NomeFabricante, TotalVendas, QuantidadePedidos, TicketMedio
-- ============================================================
IF OBJECT_ID('dbo.sp_GetFabricantesPorSupervisor', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_GetFabricantesPorSupervisor;
GO

CREATE PROCEDURE dbo.sp_GetFabricantesPorSupervisor
    @DataInicio     DATE,
    @DataFim        DATE,
    @NomeSupervisor NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        NomeFabricante,
        CAST(SUM(ValorFinalPV)   AS DECIMAL(18,2))                         AS TotalVendas,
        COUNT(DISTINCT Numero)                                              AS QuantidadePedidos,
        CAST(SUM(ValorFinalPV) / NULLIF(COUNT(DISTINCT Numero), 0)
             AS DECIMAL(18,2))                                              AS TicketMedio
    FROM [BonnaVitta.Log].[dbo].[vw_fPreVendas]
    WHERE DataPreVenda BETWEEN @DataInicio AND @DataFim
      AND NomeSupervisor = @NomeSupervisor
    GROUP BY NomeFabricante
    ORDER BY TotalVendas DESC;
END;
GO

-- ============================================================
-- [ATIVA] SP 04: Vendas por Vendedor com Código
-- Chamada em: getVendasPorVendedorComCodigo()
-- Retorna: SetorClientes, NomeVendedor, NomeSupervisor,
--          TotalVendas, QuantidadePedidos, TicketMedio
-- ============================================================
IF OBJECT_ID('dbo.sp_GetVendasPorVendedorComCodigo', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_GetVendasPorVendedorComCodigo;
GO

CREATE PROCEDURE dbo.sp_GetVendasPorVendedorComCodigo
    @DataInicio DATE,
    @DataFim    DATE
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        Setor_Cliente                                                       AS SetorClientes,
        NomeGuerr_Pedido                                                    AS NomeVendedor,
        NomeSupervisor,
        CAST(SUM(ValorFinalPV)   AS DECIMAL(18,2))                         AS TotalVendas,
        COUNT(DISTINCT Numero)                                              AS QuantidadePedidos,
        CAST(SUM(ValorFinalPV) / NULLIF(COUNT(DISTINCT Numero), 0)
             AS DECIMAL(18,2))                                              AS TicketMedio
    FROM [BonnaVitta.Log].[dbo].[vw_fPreVendas]
    WHERE DataPreVenda BETWEEN @DataInicio AND @DataFim
    GROUP BY Setor_Cliente, NomeGuerr_Pedido, NomeSupervisor
    ORDER BY Setor_Cliente ASC;
END;
GO

-- ============================================================
-- [ATIVA] SP 05: Detalhe de Vendedor
-- Chamada em: getDetalheVendedor()
-- Retorna: NomeVendedor, SetorClientes, TotalVendas,
--          QuantidadePedidos, QuantidadeClientes,
--          FabricanteMaisVendido, ProdutoMaisVendido,
--          QuantidadeProdutoMaisVendido
-- ============================================================
IF OBJECT_ID('dbo.sp_GetDetalheVendedor', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_GetDetalheVendedor;
GO

CREATE PROCEDURE dbo.sp_GetDetalheVendedor
    @DataInicio     DATE,
    @DataFim        DATE,
    @SetorClientes  INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Totais do vendedor
    SELECT
        NomeGuerr_Pedido                                                    AS NomeVendedor,
        Setor_Cliente                                                       AS SetorClientes,
        CAST(SUM(ValorFinalPV)   AS DECIMAL(18,2))                         AS TotalVendas,
        COUNT(DISTINCT Numero)                                              AS QuantidadePedidos,
        COUNT(DISTINCT NroInscCliente)                                      AS QuantidadeClientes,
        -- Fabricante mais vendido
        (
            SELECT TOP 1 NomeFabricante
            FROM [BonnaVitta.Log].[dbo].[vw_fPreVendas]
            WHERE DataPreVenda BETWEEN @DataInicio AND @DataFim
              AND Setor_Cliente = @SetorClientes
            GROUP BY NomeFabricante
            ORDER BY SUM(ValorFinalPV) DESC
        )                                                                   AS FabricanteMaisVendido,
        -- Produto mais vendido
        (
            SELECT TOP 1 Produto
            FROM [BonnaVitta.Log].[dbo].[vw_fPreVendas]
            WHERE DataPreVenda BETWEEN @DataInicio AND @DataFim
              AND Setor_Cliente = @SetorClientes
            GROUP BY Produto
            ORDER BY SUM(QuantEmUnidadesPV) DESC
        )                                                                   AS ProdutoMaisVendido,
        -- Quantidade do produto mais vendido
        (
            SELECT TOP 1 CAST(SUM(QuantEmUnidadesPV) AS DECIMAL(18,2))
            FROM [BonnaVitta.Log].[dbo].[vw_fPreVendas]
            WHERE DataPreVenda BETWEEN @DataInicio AND @DataFim
              AND Setor_Cliente = @SetorClientes
            GROUP BY Produto
            ORDER BY SUM(QuantEmUnidadesPV) DESC
        )                                                                   AS QuantidadeProdutoMaisVendido
    FROM [BonnaVitta.Log].[dbo].[vw_fPreVendas]
    WHERE DataPreVenda BETWEEN @DataInicio AND @DataFim
      AND Setor_Cliente = @SetorClientes
    GROUP BY NomeGuerr_Pedido, Setor_Cliente;
END;
GO

-- ============================================================
-- [ATIVA] SP 06: Vendas por Dia Detalhado
-- Chamada em: getVendasPorDiaDetalhado()
-- Retorna: DataPreVenda, TotalVendas, QuantidadePedidos
-- ============================================================
IF OBJECT_ID('dbo.sp_GetVendasPorDiaDetalhado', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_GetVendasPorDiaDetalhado;
GO

CREATE PROCEDURE dbo.sp_GetVendasPorDiaDetalhado
    @DataInicio DATE,
    @DataFim    DATE
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        CAST(DataPreVenda AS DATE)                                          AS DataPreVenda,
        CAST(SUM(ValorFinalPV)   AS DECIMAL(18,2))                         AS TotalVendas,
        COUNT(DISTINCT Numero)                                              AS QuantidadePedidos
    FROM [BonnaVitta.Log].[dbo].[vw_fPreVendas]
    WHERE DataPreVenda BETWEEN @DataInicio AND @DataFim
    GROUP BY CAST(DataPreVenda AS DATE)
    ORDER BY CAST(DataPreVenda AS DATE) ASC;
END;
GO

-- ============================================================
-- [ATIVA] SP 07: Vendas por Fabricante
-- Chamada em: getVendasPorFabricante()
-- Retorna: NomeFabricante, TotalVendas, QuantidadePedidos, TicketMedio
-- ============================================================
IF OBJECT_ID('dbo.sp_GetVendasPorFabricante', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_GetVendasPorFabricante;
GO

CREATE PROCEDURE dbo.sp_GetVendasPorFabricante
    @DataInicio DATE,
    @DataFim    DATE
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        NomeFabricante,
        CAST(SUM(ValorFinalPV)   AS DECIMAL(18,2))                         AS TotalVendas,
        COUNT(DISTINCT Numero)                                              AS QuantidadePedidos,
        CAST(SUM(ValorFinalPV) / NULLIF(COUNT(DISTINCT Numero), 0)
             AS DECIMAL(18,2))                                              AS TicketMedio
    FROM [BonnaVitta.Log].[dbo].[vw_fPreVendas]
    WHERE DataPreVenda BETWEEN @DataInicio AND @DataFim
      AND NomeFabricante IS NOT NULL
    GROUP BY NomeFabricante
    ORDER BY TotalVendas DESC;
END;
GO

-- ============================================================
-- [ATIVA] SP 08: Detalhe de Fabricante
-- Chamada em: getDetalheFabricante()
-- Retorna: NomeFabricante, TotalVendas, QuantidadePedidos,
--          QuantidadeVendedores, QuantidadeClientes,
--          ProdutoMaisVendido, QuantidadeProdutoMaisVendido
-- ============================================================
IF OBJECT_ID('dbo.sp_GetDetalheFabricante', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_GetDetalheFabricante;
GO

CREATE PROCEDURE dbo.sp_GetDetalheFabricante
    @DataInicio    DATE,
    @DataFim       DATE,
    @NomeFabricante NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        NomeFabricante,
        CAST(SUM(ValorFinalPV)   AS DECIMAL(18,2))                         AS TotalVendas,
        COUNT(DISTINCT Numero)                                              AS QuantidadePedidos,
        COUNT(DISTINCT Vendedor_Pedido)                                     AS QuantidadeVendedores,
        COUNT(DISTINCT NroInscCliente)                                      AS QuantidadeClientes,
        (
            SELECT TOP 1 Produto
            FROM [BonnaVitta.Log].[dbo].[vw_fPreVendas]
            WHERE DataPreVenda BETWEEN @DataInicio AND @DataFim
              AND NomeFabricante = @NomeFabricante
            GROUP BY Produto
            ORDER BY SUM(QuantEmUnidadesPV) DESC
        )                                                                   AS ProdutoMaisVendido,
        (
            SELECT TOP 1 CAST(SUM(QuantEmUnidadesPV) AS DECIMAL(18,2))
            FROM [BonnaVitta.Log].[dbo].[vw_fPreVendas]
            WHERE DataPreVenda BETWEEN @DataInicio AND @DataFim
              AND NomeFabricante = @NomeFabricante
            GROUP BY Produto
            ORDER BY SUM(QuantEmUnidadesPV) DESC
        )                                                                   AS QuantidadeProdutoMaisVendido
    FROM [BonnaVitta.Log].[dbo].[vw_fPreVendas]
    WHERE DataPreVenda BETWEEN @DataInicio AND @DataFim
      AND NomeFabricante = @NomeFabricante
    GROUP BY NomeFabricante;
END;
GO

-- ============================================================
-- [INATIVA] SP 09: Vendas por Dia (simples)
-- Existe em vendas.service.ts > getVendasPorDia()
-- Não é chamada pelo controller — substituída pela SP 06
-- ============================================================
IF OBJECT_ID('dbo.sp_GetVendasPorDia', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_GetVendasPorDia;
GO

CREATE PROCEDURE dbo.sp_GetVendasPorDia
    @DataInicio DATE,
    @DataFim    DATE
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        CAST(DataPreVenda AS DATE)                                          AS DataPreVenda,
        COUNT(DISTINCT Numero)                                              AS QuantidadePedidos,
        CAST(SUM(ValorFinalPV)   AS DECIMAL(18,2))                         AS TotalVendas,
        CAST(SUM(ValorFinalPV) / NULLIF(COUNT(DISTINCT Numero), 0)
             AS DECIMAL(18,2))                                              AS TicketMedio
    FROM [BonnaVitta.Log].[dbo].[vw_fPreVendas]
    WHERE DataPreVenda BETWEEN @DataInicio AND @DataFim
    GROUP BY CAST(DataPreVenda AS DATE)
    ORDER BY CAST(DataPreVenda AS DATE) ASC;
END;
GO

-- ============================================================
-- [INATIVA] SP 10: Vendas por Vendedor (sem código)
-- Existe em vendas.service.ts > getVendasPorVendedor()
-- Não é chamada pelo controller — substituída pela SP 04
-- ============================================================
IF OBJECT_ID('dbo.sp_GetVendasPorVendedor', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_GetVendasPorVendedor;
GO

CREATE PROCEDURE dbo.sp_GetVendasPorVendedor
    @DataInicio DATE,
    @DataFim    DATE
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        NomeGuerr_Pedido                                                    AS NomeVendedor,
        NomeSupervisor,
        COUNT(DISTINCT Numero)                                              AS QuantidadePedidos,
        CAST(SUM(ValorFinalPV)   AS DECIMAL(18,2))                         AS TotalVendas,
        CAST(SUM(ValorFinalPV) / NULLIF(COUNT(DISTINCT Numero), 0)
             AS DECIMAL(18,2))                                              AS TicketMedio
    FROM [BonnaVitta.Log].[dbo].[vw_fPreVendas]
    WHERE DataPreVenda BETWEEN @DataInicio AND @DataFim
      AND NomeGuerr_Pedido IS NOT NULL
    GROUP BY NomeGuerr_Pedido, NomeSupervisor
    ORDER BY TotalVendas DESC;
END;
GO

-- ============================================================
-- [INATIVA] SP 11: Vendas por Supervisor por Equipe
-- Existe em vendas.service.ts > getVendasPorSupervisorPorEquipe()
-- Não é chamada pelo controller
-- ============================================================
IF OBJECT_ID('dbo.sp_GetVendasPorSupervisorPorEquipe', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_GetVendasPorSupervisorPorEquipe;
GO

CREATE PROCEDURE dbo.sp_GetVendasPorSupervisorPorEquipe
    @DataInicio DATE,
    @DataFim    DATE
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        NomeSupervisor,
        Equipe_Cliente                                                      AS Equipe,
        COUNT(DISTINCT Numero)                                              AS QuantidadePedidos,
        CAST(SUM(ValorFinalPV)   AS DECIMAL(18,2))                         AS TotalVendas,
        CAST(SUM(ValorFinalPV) / NULLIF(COUNT(DISTINCT Numero), 0)
             AS DECIMAL(18,2))                                              AS TicketMedio
    FROM [BonnaVitta.Log].[dbo].[vw_fPreVendas]
    WHERE DataPreVenda BETWEEN @DataInicio AND @DataFim
      AND NomeSupervisor IS NOT NULL
    GROUP BY NomeSupervisor, Equipe_Cliente
    ORDER BY NomeSupervisor ASC, TotalVendas DESC;
END;
GO

-- ============================================================
-- [INATIVA] SP 12: Vendas por Vendedor em Equipe
-- Existe em vendas.service.ts > getVendasPorVendedorEmEquipe()
-- Não é chamada pelo controller
-- ============================================================
IF OBJECT_ID('dbo.sp_GetVendasPorVendedorEmEquipe', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_GetVendasPorVendedorEmEquipe;
GO

CREATE PROCEDURE dbo.sp_GetVendasPorVendedorEmEquipe
    @DataInicio DATE,
    @DataFim    DATE
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        Setor_Cliente                                                       AS SetorClientes,
        NomeGuerr_Pedido                                                    AS NomeVendedor,
        Equipe_Cliente                                                      AS Equipe,
        COUNT(DISTINCT Numero)                                              AS QuantidadePedidos,
        CAST(SUM(ValorFinalPV)   AS DECIMAL(18,2))                         AS TotalVendas,
        CAST(SUM(ValorFinalPV) / NULLIF(COUNT(DISTINCT Numero), 0)
             AS DECIMAL(18,2))                                              AS TicketMedio
    FROM [BonnaVitta.Log].[dbo].[vw_fPreVendas]
    WHERE DataPreVenda BETWEEN @DataInicio AND @DataFim
    GROUP BY Setor_Cliente, NomeGuerr_Pedido, Equipe_Cliente
    ORDER BY Setor_Cliente ASC;
END;
GO

-- ============================================================
-- [INATIVA] SP 13: Detalhes de Vendas por Fabricante (produtos)
-- Existe em vendas.service.ts > getDetalhesVendasPorFabricante()
-- Não é chamada pelo controller
-- ============================================================
IF OBJECT_ID('dbo.sp_GetDetalhesVendasPorFabricante', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_GetDetalhesVendasPorFabricante;
GO

CREATE PROCEDURE dbo.sp_GetDetalhesVendasPorFabricante
    @DataInicio     DATE,
    @DataFim        DATE,
    @NomeFabricante NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        Produto,
        COUNT(DISTINCT Numero)                                              AS QuantidadePedidos,
        CAST(SUM(ValorFinalPV)   AS DECIMAL(18,2))                         AS TotalVendas,
        CAST(SUM(QuantEmUnidadesPV) AS DECIMAL(18,2))                      AS QuantidadeUnidades
    FROM [BonnaVitta.Log].[dbo].[vw_fPreVendas]
    WHERE DataPreVenda BETWEEN @DataInicio AND @DataFim
      AND NomeFabricante = @NomeFabricante
    GROUP BY Produto
    ORDER BY TotalVendas DESC;
END;
GO

-- ============================================================
-- [INATIVA] SP 14: Vendas por Equipe
-- Existe em vendas.service.ts > getVendasPorEquipe()
-- Não é chamada pelo controller
-- ============================================================
IF OBJECT_ID('dbo.sp_GetVendasPorEquipe', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_GetVendasPorEquipe;
GO

CREATE PROCEDURE dbo.sp_GetVendasPorEquipe
    @DataInicio DATE,
    @DataFim    DATE
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        Equipe_Cliente                                                      AS Equipe,
        COUNT(DISTINCT Numero)                                              AS QuantidadePedidos,
        CAST(SUM(ValorFinalPV)   AS DECIMAL(18,2))                         AS TotalVendas,
        CAST(SUM(ValorFinalPV) / NULLIF(COUNT(DISTINCT Numero), 0)
             AS DECIMAL(18,2))                                              AS TicketMedio
    FROM [BonnaVitta.Log].[dbo].[vw_fPreVendas]
    WHERE DataPreVenda BETWEEN @DataInicio AND @DataFim
      AND Equipe_Cliente IS NOT NULL
    GROUP BY Equipe_Cliente
    ORDER BY TotalVendas DESC;
END;
GO

-- ============================================================
-- [INATIVA] SP 15: Ranking de Produtos
-- Existe em vendas.service.ts > getRankingProdutos()
-- Não é chamada pelo controller
-- ============================================================
IF OBJECT_ID('dbo.sp_GetRankingProdutos', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_GetRankingProdutos;
GO

CREATE PROCEDURE dbo.sp_GetRankingProdutos
    @DataInicio DATE,
    @DataFim    DATE,
    @Limite     INT = 10
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP (@Limite)
        ROW_NUMBER() OVER (ORDER BY SUM(ValorFinalPV) DESC)                AS Posicao,
        Produto,
        NomeFabricante,
        COUNT(DISTINCT Numero)                                              AS QuantidadePedidos,
        CAST(SUM(ValorFinalPV)   AS DECIMAL(18,2))                         AS TotalVendas,
        CAST(SUM(QuantEmUnidadesPV) AS DECIMAL(18,2))                      AS QuantidadeUnidades
    FROM [BonnaVitta.Log].[dbo].[vw_fPreVendas]
    WHERE DataPreVenda BETWEEN @DataInicio AND @DataFim
      AND Produto IS NOT NULL
    GROUP BY Produto, NomeFabricante
    ORDER BY TotalVendas DESC;
END;
GO

-- ============================================================
-- [INATIVA] SP 16: Ticket Médio Geral
-- Existe em vendas.service.ts > getTicketMedio()
-- Não é chamada pelo controller
-- ============================================================
IF OBJECT_ID('dbo.sp_GetTicketMedio', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_GetTicketMedio;
GO

CREATE PROCEDURE dbo.sp_GetTicketMedio
    @DataInicio DATE,
    @DataFim    DATE
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        CAST(AVG(ValorFinalPV)   AS DECIMAL(18,2))                         AS TicketMedio,
        CAST(MIN(ValorFinalPV)   AS DECIMAL(18,2))                         AS TicketMinimo,
        CAST(MAX(ValorFinalPV)   AS DECIMAL(18,2))                         AS TicketMaximo,
        CAST(SUM(ValorFinalPV)   AS DECIMAL(18,2))                         AS TotalVendas,
        COUNT(DISTINCT Numero)                                              AS QuantidadePedidos,
        CAST(SUM(QuantEmUnidadesPV) AS DECIMAL(18,2))                      AS QuantidadeUnidades
    FROM [BonnaVitta.Log].[dbo].[vw_fPreVendas]
    WHERE DataPreVenda BETWEEN @DataInicio AND @DataFim;
END;
GO

PRINT '✅ 16 procedures criadas/atualizadas com sucesso.';
PRINT '   Ativas (usadas pelo controller): SP 01 a SP 08';
PRINT '   Inativas (apenas no service):    SP 09 a SP 16';
GO
