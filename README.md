# ResolveAI v1.1.0

<p align="center">
  <strong>
    Estudo com IA, organizacao pessoal e evolucao continua em um so lugar.
  </strong>
</p>

<p align="center">
  O ResolveAI e uma plataforma de estudos com inteligencia artificial para resolver exercicios,
  revisar conteudos, visualizar graficos, organizar historico e acompanhar a propria evolucao.
</p>

---

## Versao atual

- Frontend: `v1.1.0`
- Backend/API: `v1.1.0`

---

## O que ha na v1.1.0

- respostas matematicas mais didaticas
- grafico premium com destaques visuais
- marcacao de raizes, vertice e intercepto em `y`
- eixo de simetria para funcoes quadraticas
- resumo matematico mais claro acima do grafico
- pagina publica separada da area interna da plataforma

---

## Principais funcionalidades

### Autenticacao e acesso
- cadastro de conta
- login e logout
- recuperacao de senha
- sessao com JWT em cookie e protecao CSRF

### Chat de estudos
- chat unico para exercicios, revisoes e planos de estudo
- respostas progressivas com animacao de escrita
- suporte a matematica, perguntas gerais e fluxo de estudo

### Matematica e visualizacao
- resolucao de expressoes e equacoes com SymPy
- graficos para funcoes e expressoes compativeis
- eixos numerados
- zoom no grafico
- destaques de raizes, vertice, intercepto em `y` e eixo de simetria

### Historico e organizacao
- historico por usuario
- favoritos
- categorias pessoais
- busca e filtros
- exclusao individual e limpeza total

### Dashboard
- uso por periodo
- evolucao semanal
- sequencia de estudo
- calendario de atividade

### Exportacao
- copiar resposta
- exportar PDF
- baixar imagem

---

## Estrutura do produto

### Area publica
- apresentacao do produto
- login, cadastro e recuperacao
- mensagem institucional e proposta de valor

### Area interna
- painel principal de estudos
- chat com IA
- historico
- dashboard
- grafico matematico

---

## Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Python, Flask
- Banco de dados: PostgreSQL
- Autenticacao: JWT, bcrypt
- Matematica: SymPy
- IA geral: Hugging Face

---

## Seguranca e privacidade

- historico separado por usuario
- cookies autenticados com protecao CSRF
- senhas protegidas com hash
- rate limit nas rotas de IA
- RLS no historico do usuario
- bloqueio de envio de dados sensiveis para IA externa

---

## Links do projeto

- Frontend: https://resolve-ia.vercel.app
- Backend: https://resolve-ia-hdx7.onrender.com
- Repositorio: https://github.com/Dioguinho-max/Resolve_IA

---

## Endpoints de status

- `GET /`
- `GET /api/health`

Ambos retornam a versao atual da API.

---

## Status

A `v1.1.0` marca a evolucao do ResolveAI de uma base estavel para uma experiencia mais refinada de estudo, com respostas matematicas melhores e visualizacao grafica mais forte.
