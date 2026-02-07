-- ============================================
-- Chatbot BonnaVitta - Banco de Dados
-- Atacado de Alimentos
-- ============================================

-- Criar banco de dados
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'BonnaVittaBot')
BEGIN
    CREATE DATABASE BonnaVittaBot;
END
GO