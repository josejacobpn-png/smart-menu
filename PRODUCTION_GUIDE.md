# Guia de Configuração para Produção

Este guia explica como criar um novo ambiente "Produção" no Supabase, mantendo seu ambiente atual como "Teste".

## 1. Criar Novo Projeto no Supabase

1.  Acesse [app.supabase.com](https://app.supabase.com).
2.  Clique em **"New Project"**.
3.  Escolha sua organização.
4.  Defina o nome (ex: `MenuMasters - Produção`).
5.  Defina uma senha segura para o banco de dados.
6.  Escolha a região (mesma do teste, geralmente `sa-east-1` para Brasil).
7.  Clique em **"Create new project"** e aguarde a configuração finalizar.

## 2. Rodar o Script de Instalação

O arquivo `production_setup.sql` contém tudo o que você precisa para configurar o banco de dados do zero.

1.  No painel do seu **NOVO** projeto Supabase, vá para o **SQL Editor** (ícone de terminal na barra lateral esquerda).
2.  Clique em **"New Query"**.
3.  Copie TODO o conteúdo do arquivo `production_setup.sql` (que está na raiz do seu projeto).
4.  Cole no editor do Supabase.
5.  Clique em **"Run"**.

> **Sucesso:** Se tudo der certo, você verá "Success. No rows returned." e suas tabelas serão criadas na aba "Table Editor".

## 3. Conectar o Aplicativo à Produção

Para usar o novo banco de dados no seu sistema, você precisa apontar as chaves de acesso para ele.

1.  No painel do novo projeto, vá em **Project Settings** (engrenagem) -> **API**.
2.  Copie a **Project URL** e a **anon public Key**.
3.  No seu código (VS Code), crie um arquivo chamado `.env.production` na raiz (ao lado do `.env` atual).
4.  Cole as novas chaves nesse arquivo:

```env
VITE_SUPABASE_URL=Sua_Nova_Url_Aqui
VITE_SUPABASE_ANON_KEY=Sua_Nova_Key_Aqui
```

## 4. Rodar em Modo de Produção

Quando quiser rodar o sistema conectado ao banco de produção:

**Opção A (Temporária/Teste Local):**
Apenas altere o arquivo `.env` original com as novas chaves. Lembre-se de reiniciar o servidor (`npm run dev`) para pegar as mudanças.

**Opção B (Build/Deploy):**
Se for colocar o site no ar (Vercel, Netlify), você deve configurar essas "Environment Variables" no painel da hospedagem.

## 5. (Opcional) Migrar Dados de Cardápio

Se quiser copiar seus produtos e categorias do teste para a produção, a maneira mais fácil sem scripts complexos de dados é:
1.  Vá no projeto de **Teste** -> Table Editor -> Categories -> "Export to CSV".
2.  Faça o mesmo para Products.
3.  Vá no projeto de **Produção** -> Table Editor -> Categories -> "Import Data from CSV".
4.  Vá no projeto de **Produção** -> Table Editor -> Products -> "Import Data from CSV".

> **Atenção:** Importe primeiro Restaurantes e Profiles, depois Categorias, depois Produtos, para respeitar as relações.
