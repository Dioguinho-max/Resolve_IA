# ResolveAI v1.0.8

<p align="center">
  <img src="https://img.shields.io/badge/Plataforma-Estudos-2f6c54?style=for-the-badge" alt="Plataforma Estudos">
  <img src="https://img.shields.io/badge/Versão-1.0.8-d75f39?style=for-the-badge" alt="Versão 1.0.8">
  <img src="https://img.shields.io/badge/Frontend-Web-4c956c?style=for-the-badge" alt="Frontend Web">
  <img src="https://img.shields.io/badge/Backend-Flask-f4a261?style=for-the-badge" alt="Backend Flask">
  <img src="https://img.shields.io/badge/Banco-PostgreSQL-577590?style=for-the-badge" alt="Banco PostgreSQL">
</p>

<p align="center">
  Plataforma de estudos com inteligência artificial para resolver exercícios, revisar conteúdos,
  organizar consultas e acompanhar a evolução do usuário de forma prática, moderna e segura.
</p>

---

## Links do Projeto

- **Frontend:** `https://resolve-ia.vercel.app`
- **Backend:** `https://resolve-ia-hdx7.onrender.com`
- **Repositório:** `https://github.com/Dioguinho-max/Resolve_IA`

---

## Release 1.0.8

<p>
  <img src="https://img.shields.io/badge/Chat%20único-Ativo-264653?style=flat-square" alt="Chat único">
  <img src="https://img.shields.io/badge/Modo%20escuro-Ativo-1d3557?style=flat-square" alt="Modo escuro">
  <img src="https://img.shields.io/badge/Gráfico%20matemático-Ativo-6a994e?style=flat-square" alt="Gráfico matemático">
  <img src="https://img.shields.io/badge/Dashboard-Ativo-b56576?style=flat-square" alt="Dashboard">
  <img src="https://img.shields.io/badge/Exportação-PDF%20%7C%20Imagem-e76f51?style=flat-square" alt="Exportação">
  <img src="https://img.shields.io/badge/Histórico-Favoritos%20%7C%20Categorias-5a189a?style=flat-square" alt="Histórico">
</p>

A versão **1.0.8** consolida a base atual do produto com uma experiência mais completa de estudo, organização e visualização de respostas.

---

## Visão Geral

O **ResolveAI** reúne em um único ambiente:

- chat de estudos para exercícios, revisões e planos de estudo
- respostas com explicações passo a passo
- gráfico para funções matemáticas
- histórico salvo por usuário
- favoritos e categorias pessoais
- dashboard com métricas e calendário de atividade
- exportação da resposta em PDF e imagem

---

## Tabela de Funcionalidades

| Área | Funcionalidade | Status |
|---|---|---|
| Conta | Cadastro e login | ✅ |
| Conta | Recuperação de senha por código | ✅ |
| Chat | Chat único de estudos | ✅ |
| Respostas | Animação de escrita da IA | ✅ |
| Matemática | Resolução de expressões e equações | ✅ |
| Matemática | Geração de gráfico | ✅ |
| Matemática | Eixos numerados no gráfico | ✅ |
| Histórico | Salvamento automático | ✅ |
| Histórico | Busca e filtros | ✅ |
| Histórico | Favoritos | ✅ |
| Histórico | Categorias pessoais | ✅ |
| Histórico | Exclusão individual e limpeza total | ✅ |
| Dashboard | Uso por período | ✅ |
| Dashboard | Evolução semanal | ✅ |
| Dashboard | Sequência de estudo | ✅ |
| Dashboard | Calendário de atividade | ✅ |
| Exportação | Copiar resposta | ✅ |
| Exportação | PDF | ✅ |
| Exportação | Imagem | ✅ |
| Interface | Modo escuro | ✅ |
| Segurança | JWT + bcrypt + CSRF | ✅ |
| Banco | Histórico protegido por RLS | ✅ |

---

## Blocos do Produto

### Autenticação
<p>
  <img src="https://img.shields.io/badge/JWT-Sessão%20segura-0a9396?style=flat-square" alt="JWT">
  <img src="https://img.shields.io/badge/CSRF-Protegido-005f73?style=flat-square" alt="CSRF">
  <img src="https://img.shields.io/badge/bcrypt-Hash%20de%20senha-94d2bd?style=flat-square" alt="bcrypt">
</p>

- Criar conta com segurança
- Entrar e sair da plataforma
- Recuperar senha com código temporário
- Sessão protegida por autenticação baseada em cookies

### Chat de Estudos
<p>
  <img src="https://img.shields.io/badge/UX-Chat%20único-3a5a40?style=flat-square" alt="Chat único">
  <img src="https://img.shields.io/badge/IA-Resposta%20guiada-588157?style=flat-square" alt="Resposta guiada">
  <img src="https://img.shields.io/badge/Animação-Escrita%20progressiva-a3b18a?style=flat-square" alt="Animação">
</p>

- Um único fluxo para exercícios, revisões e planos de estudo
- Respostas explicadas de forma mais organizada
- Feedback visual durante a geração da resposta

### Matemática e Visualização
<p>
  <img src="https://img.shields.io/badge/SymPy-Motor%20matemático-283618?style=flat-square" alt="SymPy">
  <img src="https://img.shields.io/badge/Canvas-Gráfico%20ativo-bf6f2f?style=flat-square" alt="Canvas">
  <img src="https://img.shields.io/badge/Zoom-Habilitado-dd8b3d?style=flat-square" alt="Zoom">
</p>

- Detecção automática de perguntas matemáticas
- Geração de gráfico para funções e expressões compatíveis
- Eixos com numeração para facilitar leitura
- Zoom para melhorar visualização

### Histórico e Organização
<p>
  <img src="https://img.shields.io/badge/Histórico-Salvo-6d597a?style=flat-square" alt="Histórico">
  <img src="https://img.shields.io/badge/Favoritos-Ativo-b56576?style=flat-square" alt="Favoritos">
  <img src="https://img.shields.io/badge/Categorias-Pessoais-e56b6f?style=flat-square" alt="Categorias">
</p>

- Histórico por usuário
- Busca de consultas antigas
- Filtro por categoria
- Favoritar respostas importantes
- Limpeza individual ou total

### Dashboard
<p>
  <img src="https://img.shields.io/badge/Uso%20por%20período-7d%20%7C%2030d%20%7C%20Geral-355070?style=flat-square" alt="Uso por período">
  <img src="https://img.shields.io/badge/Evolução-Semanal-6d597a?style=flat-square" alt="Evolução semanal">
  <img src="https://img.shields.io/badge/Calendário-Atividade-e56b6f?style=flat-square" alt="Calendário">
</p>

- Questões no período
- Dias ativos
- Sequência atual e melhor sequência
- Evolução semanal
- Calendário de atividade recente

### Exportação
<p>
  <img src="https://img.shields.io/badge/PDF-Exportar-c1121f?style=flat-square" alt="PDF">
  <img src="https://img.shields.io/badge/Imagem-Baixar-f77f00?style=flat-square" alt="Imagem">
  <img src="https://img.shields.io/badge/Copiar-Resposta-fcbf49?style=flat-square" alt="Copiar resposta">
</p>

- Exportação da resolução atual em PDF
- Download da resposta como imagem
- Cópia rápida da resposta

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Python, Flask |
| Banco de Dados | PostgreSQL |
| Autenticação | JWT, bcrypt |
| Matemática | SymPy |
| IA geral | Hugging Face |

---

## Segurança e Privacidade

- Histórico separado por usuário
- Proteção por JWT com cookies
- Proteção CSRF
- Rate limit nas rotas de IA
- RLS no histórico do usuário
- Bloqueio de envio de dados sensíveis para IA externa

---

## Endpoints de Status

A API informa a versão atual nos endpoints:

- `GET /`
- `GET /api/health`

---

## Status da Plataforma

<p>
  <img src="https://img.shields.io/badge/Status-Estável-2a9d8f?style=for-the-badge" alt="Status estável">
  <img src="https://img.shields.io/badge/Release-v1.0.8-e76f51?style=for-the-badge" alt="Release v1.0.8">
</p>

A base do projeto está estável na **v1.0.8**, pronta para receber novas evoluções de produto, experiência e inteligência.

---

<p align="center">
  <strong>ResolveAI 1.0.8</strong><br>
  Estudo com IA, organização pessoal e evolução contínua em um só lugar.
</p>
