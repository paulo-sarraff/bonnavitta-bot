-- ============================================
-- SCRIPT: Stored Procedures Baseadas em VIEW_VENDAS
-- ============================================
-- Este script cria 8 Stored Procedures para o Chatbot BonnaVitta
-- Todas as procedures consultam a VIEW_VENDAS
-- ============================================

USE BonnaVittaBot;
GO

-- ============================================
-- PROCEDURE 1: Vendas por Supervisor
-- ============================================
-- Retorna total de vendas agrupado por supervisor em um período
-- Parâmetros: @DataInicio, @DataFim
-- Retorno: NomeSupervisor, QuantidadePedidos, TotalVendas, TicketMedio

IF OBJECT_ID('dbo.sp_GetVendasPorSupervisor', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_GetVendasPorSupervisor;
GO

CREATE PROCEDURE dbo.sp_GetVendasPorSupervisor
    @DataInicio DATE,
    @DataFim DATE
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        NomeSupervisor AS Supervisor,
        COUNT(DISTINCT NumeroPed) AS QuantidadePedidos,
        CAST(SUM(ValorFinal) AS DECIMAL(18, 2)) AS TotalVendas,
        CAST(AVG(ValorFinal) AS DECIMAL(18, 2)) AS TicketMedio,
        CAST(SUM(QuantEmUnidades) AS DECIMAL(18, 2)) AS QuantidadeUnidades
    FROM dbo.VIEW_VENDAS
    WHERE Data BETWEEN @DataInicio AND @DataFim
        AND NomeSupervisor IS NOT NULL
    GROUP BY NomeSupervisor
    ORDER BY TotalVendas DESC;
END;
GO

-- ============================================
-- PROCEDURE 2: Vendas por Vendedor
-- ============================================
-- Retorna total de vendas agrupado por vendedor em um período
-- Parâmetros: @DataInicio, @DataFim
-- Retorno: NomeVendedor, NomeSupervisor, QuantidadePedidos, TotalVendas, TicketMedio

IF OBJECT_ID('dbo.sp_GetVendasPorVendedor', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_GetVendasPorVendedor;
GO

CREATE PROCEDURE dbo.sp_GetVendasPorVendedor
    @DataInicio DATE,
    @DataFim DATE
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        Vendedor_Pedido AS Vendedor,
        NomeSupervisor AS Supervisor,
        COUNT(DISTINCT NumeroPed) AS QuantidadePedidos,
        CAST(SUM(ValorFinal) AS DECIMAL(18, 2)) AS TotalVendas,
        CAST(AVG(ValorFinal) AS DECIMAL(18, 2)) AS TicketMedio,
        CAST(SUM(QuantEmUnidades) AS DECIMAL(18, 2)) AS QuantidadeUnidades
    FROM dbo.VIEW_VENDAS
    WHERE Data BETWEEN @DataInicio AND @DataFim
        AND Vendedor_Pedido IS NOT NULL
    GROUP BY Vendedor_Pedido, NomeSupervisor
    ORDER BY TotalVendas DESC;
END;
GO

-- ============================================
-- PROCEDURE 3: Vendas por Dia
-- ============================================
-- Retorna total de vendas por dia em um período (para gráfico de série temporal)
-- Parâmetros: @DataInicio, @DataFim
-- Retorno: Data, QuantidadePedidos, TotalVendas, TicketMedio

IF OBJECT_ID('dbo.sp_GetVendasPorDia', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_GetVendasPorDia;
GO

CREATE PROCEDURE dbo.sp_GetVendasPorDia
    @DataInicio DATE,
    @DataFim DATE
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        Data,
        COUNT(DISTINCT NumeroPed) AS QuantidadePedidos,
        CAST(SUM(ValorFinal) AS DECIMAL(18, 2)) AS TotalVendas,
        CAST(AVG(ValorFinal) AS DECIMAL(18, 2)) AS TicketMedio,
        CAST(SUM(QuantEmUnidades) AS DECIMAL(18, 2)) AS QuantidadeUnidades
    FROM dbo.VIEW_VENDAS
    WHERE Data BETWEEN @DataInicio AND @DataFim
    GROUP BY Data
    ORDER BY Data ASC;
END;
GO

-- ============================================
-- PROCEDURE 4: Vendas por Fabricante
-- ============================================
-- Retorna total de vendas agrupado por fabricante em um período
-- Parâmetros: @DataInicio, @DataFim
-- Retorno: Fabricante, QuantidadePedidos, TotalVendas, TicketMedio

IF OBJECT_ID('dbo.sp_GetVendasPorFabricante', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_GetVendasPorFabricante;
GO

CREATE PROCEDURE dbo.sp_GetVendasPorFabricante
    @DataInicio DATE,
    @DataFim DATE
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        Fabricante,
        COUNT(DISTINCT NumeroPed) AS QuantidadePedidos,
        CAST(SUM(ValorFinal) AS DECIMAL(18, 2)) AS TotalVendas,
        CAST(AVG(ValorFinal) AS DECIMAL(18, 2)) AS TicketMedio,
        CAST(SUM(QuantEmUnidades) AS DECIMAL(18, 2)) AS QuantidadeUnidades
    FROM dbo.VIEW_VENDAS
    WHERE Data BETWEEN @DataInicio AND @DataFim
        AND Fabricante IS NOT NULL
    GROUP BY Fabricante
    ORDER BY TotalVendas DESC;
END;
GO

-- ============================================
-- PROCEDURE 5: Detalhes de Vendas por Fabricante
-- ============================================
-- Retorna detalhes de produtos de um fabricante específico
-- Parâmetros: @DataInicio, @DataFim, @Fabricante
-- Retorno: Produto, Categoria, QuantidadePedidos, TotalVendas

IF OBJECT_ID('dbo.sp_GetDetalhesVendasPorFabricante', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_GetDetalhesVendasPorFabricante;
GO

CREATE PROCEDURE dbo.sp_GetDetalhesVendasPorFabricante
    @DataInicio DATE,
    @DataFim DATE,
    @Fabricante VARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        Produto,
        Categoria,
        COUNT(DISTINCT NumeroPed) AS QuantidadePedidos,
        CAST(SUM(ValorFinal) AS DECIMAL(18, 2)) AS TotalVendas,
        CAST(SUM(QuantEmUnidades) AS DECIMAL(18, 2)) AS QuantidadeUnidades
    FROM dbo.VIEW_VENDAS
    WHERE Data BETWEEN @DataInicio AND @DataFim
        AND Fabricante = @Fabricante
    GROUP BY Produto, Categoria
    ORDER BY TotalVendas DESC;
END;
GO

-- ============================================
-- PROCEDURE 6: Vendas por Equipe
-- ============================================
-- Retorna total de vendas agrupado por equipe em um período
-- Parâmetros: @DataInicio, @DataFim
-- Retorno: Equipe, QuantidadePedidos, TotalVendas, TicketMedio

IF OBJECT_ID('dbo.sp_GetVendasPorEquipe', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_GetVendasPorEquipe;
GO

CREATE PROCEDURE dbo.sp_GetVendasPorEquipe
    @DataInicio DATE,
    @DataFim DATE
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        Equipe_Cliente AS Equipe,
        COUNT(DISTINCT NumeroPed) AS QuantidadePedidos,
        CAST(SUM(ValorFinal) AS DECIMAL(18, 2)) AS TotalVendas,
        CAST(AVG(ValorFinal) AS DECIMAL(18, 2)) AS TicketMedio,
        CAST(SUM(QuantEmUnidades) AS DECIMAL(18, 2)) AS QuantidadeUnidades
    FROM dbo.VIEW_VENDAS
    WHERE Data BETWEEN @DataInicio AND @DataFim
        AND Equipe_Cliente IS NOT NULL
    GROUP BY Equipe_Cliente
    ORDER BY TotalVendas DESC;
END;
GO

-- ============================================
-- PROCEDURE 7: Ranking de Produtos
-- ============================================
-- Retorna os produtos mais vendidos em um período
-- Parâmetros: @DataInicio, @DataFim, @Limite (padrão 10)
-- Retorno: Posição, Produto, Fabricante, QuantidadePedidos, TotalVendas

IF OBJECT_ID('dbo.sp_GetRankingProdutos', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_GetRankingProdutos;
GO

CREATE PROCEDURE dbo.sp_GetRankingProdutos
    @DataInicio DATE,
    @DataFim DATE,
    @Limite INT = 10
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT TOP (@Limite)
        ROW_NUMBER() OVER (ORDER BY SUM(ValorFinal) DESC) AS Posicao,
        Produto,
        Fabricante,
        COUNT(DISTINCT NumeroPed) AS QuantidadePedidos,
        CAST(SUM(ValorFinal) AS DECIMAL(18, 2)) AS TotalVendas,
        CAST(SUM(QuantEmUnidades) AS DECIMAL(18, 2)) AS QuantidadeUnidades
    FROM dbo.VIEW_VENDAS
    WHERE Data BETWEEN @DataInicio AND @DataFim
        AND Produto IS NOT NULL
    GROUP BY Produto, Fabricante
    ORDER BY TotalVendas DESC;
END;
GO

-- ============================================
-- PROCEDURE 8: Ticket Médio Geral
-- ============================================
-- Retorna estatísticas gerais de ticket em um período
-- Parâmetros: @DataInicio, @DataFim
-- Retorno: TicketMedio, TicketMinimo, TicketMaximo, TotalVendas, QuantidadePedidos

IF OBJECT_ID('dbo.sp_GetTicketMedio', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_GetTicketMedio;
GO

CREATE PROCEDURE dbo.sp_GetTicketMedio
    @DataInicio DATE,
    @DataFim DATE
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        CAST(AVG(ValorFinal) AS DECIMAL(18, 2)) AS TicketMedio,
        CAST(MIN(ValorFinal) AS DECIMAL(18, 2)) AS TicketMinimo,
        CAST(MAX(ValorFinal) AS DECIMAL(18, 2)) AS TicketMaximo,
        CAST(SUM(ValorFinal) AS DECIMAL(18, 2)) AS TotalVendas,
        COUNT(DISTINCT NumeroPed) AS QuantidadePedidos,
        CAST(SUM(QuantEmUnidades) AS DECIMAL(18, 2)) AS QuantidadeUnidades
    FROM dbo.VIEW_VENDAS
    WHERE Data BETWEEN @DataInicio AND @DataFim;
END;
GO

-- ============================================
-- TESTES DAS PROCEDURES
-- ============================================

PRINT '========================================';
PRINT 'TESTANDO STORED PROCEDURES';
PRINT '========================================';

-- Teste 1: Vendas por Supervisor
PRINT '';
PRINT 'Teste 1: sp_GetVendasPorSupervisor';
PRINT '---';
EXEC dbo.sp_GetVendasPorSupervisor 
    @DataInicio = '2026-01-01',
    @DataFim = '2026-01-31';
GO

-- Teste 2: Vendas por Vendedor
PRINT '';
PRINT 'Teste 2: sp_GetVendasPorVendedor';
PRINT '---';
EXEC dbo.sp_GetVendasPorVendedor 
    @DataInicio = '2026-01-01',
    @DataFim = '2026-01-31';
GO

-- Teste 3: Vendas por Dia
PRINT '';
PRINT 'Teste 3: sp_GetVendasPorDia';
PRINT '---';
EXEC dbo.sp_GetVendasPorDia 
    @DataInicio = '2026-01-01',
    @DataFim = '2026-01-31';
GO

-- Teste 4: Vendas por Fabricante
PRINT '';
PRINT 'Teste 4: sp_GetVendasPorFabricante';
PRINT '---';
EXEC dbo.sp_GetVendasPorFabricante 
    @DataInicio = '2026-01-01',
    @DataFim = '2026-01-31';
GO

-- Teste 5: Detalhes de Vendas por Fabricante
PRINT '';
PRINT 'Teste 5: sp_GetDetalhesVendasPorFabricante';
PRINT '---';
-- Primeiro, pega um fabricante da tabela
DECLARE @FabricanteTeste VARCHAR(100);
SELECT TOP 1 @FabricanteTeste = Fabricante FROM dbo.VIEW_VENDAS;
EXEC dbo.sp_GetDetalhesVendasPorFabricante 
    @DataInicio = '2026-01-01',
    @DataFim = '2026-01-31',
    @Fabricante = @FabricanteTeste;
GO

-- Teste 6: Vendas por Equipe
PRINT '';
PRINT 'Teste 6: sp_GetVendasPorEquipe';
PRINT '---';
EXEC dbo.sp_GetVendasPorEquipe 
    @DataInicio = '2026-01-01',
    @DataFim = '2026-01-31';
GO

-- Teste 7: Ranking de Produtos
PRINT '';
PRINT 'Teste 7: sp_GetRankingProdutos (Top 10)';
PRINT '---';
EXEC dbo.sp_GetRankingProdutos 
    @DataInicio = '2026-01-01',
    @DataFim = '2026-01-31',
    @Limite = 10;
GO

-- Teste 8: Ticket Médio
PRINT '';
PRINT 'Teste 8: sp_GetTicketMedio';
PRINT '---';
EXEC dbo.sp_GetTicketMedio 
    @DataInicio = '2026-01-01',
    @DataFim = '2026-01-31';
GO

-- ============================================
-- VALIDAÇÃO FINAL
-- ============================================

PRINT '';
PRINT '========================================';
PRINT 'VALIDAÇÃO FINAL';
PRINT '========================================';

-- Listar todas as procedures criadas
PRINT '';
PRINT 'Procedures criadas:';
SELECT 
    ROUTINE_NAME,
    ROUTINE_TYPE
FROM INFORMATION_SCHEMA.ROUTINES
WHERE ROUTINE_SCHEMA = 'dbo'
    AND ROUTINE_NAME LIKE 'sp_Get%'
ORDER BY ROUTINE_NAME;
GO

-- Contar registros na VIEW
PRINT '';
PRINT 'Total de registros na VIEW_VENDAS:';
SELECT COUNT(*) AS TotalRegistros FROM dbo.VIEW_VENDAS;
GO

-- Período de dados disponíveis
PRINT '';
PRINT 'Período de dados disponíveis:';
SELECT 
    MIN(Data) AS DataInicio,
    MAX(Data) AS DataFim,
    COUNT(DISTINCT Data) AS DiasCom Vendas
FROM dbo.VIEW_VENDAS;
GO

PRINT '';
PRINT '========================================';
PRINT '✅ TODAS AS PROCEDURES CRIADAS COM SUCESSO!';
PRINT '========================================';
