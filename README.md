# ResolveAI

Plataforma web para resolver exercicios com inteligencia artificial, explicacao passo a passo, grafico para funcoes e historico por usuario.

## Visao Geral

O projeto foi separado em duas partes para deploy moderno:

- `frontend/`: interface web hospedada na Vercel
- `backend/`: API Flask hospedada no Render
- `mobile/`: app Expo com React Native WebView
- Banco de dados: PostgreSQL no Supabase
- IA: Hugging Face Inference API com `mistralai/Mistral-7B-Instruct-v0.2`

## Funcionalidades

- Cadastro e login com senha protegida por `bcrypt`
- Autenticacao com `JWT`
- Historico individual de perguntas e respostas
- Deteccao automatica entre matematica, fisica e texto
- Resolucao com passo a passo
- Grafico de funcoes quando aplicavel
- Paginas de Termos de Servico e Politica de Privacidade
- Favicon personalizado e identidade visual propria
- App mobile simples reaproveitando a versao web

## Stack

### Frontend

- HTML
- CSS
- JavaScript
- Deploy na Vercel

### Backend

- Python
- Flask
- Flask-CORS
- Flask-JWT-Extended
- Flask-Bcrypt
- Flask-SQLAlchemy
- SymPy
- Requests
- Deploy no Render

### Banco e IA

- Supabase PostgreSQL
- Hugging Face Inference API

## Estrutura do Projeto

```text
ResolveAI/
  backend/
    app.py
    requirements.txt
    .env.example
    render.yaml
  frontend/
    index.html
    app.js
    config.js
    styles.css
    favicon.svg
    termos.html
    privacidade.html
    vercel.json
  mobile/
    App.js
    app.json
    package.json
    README.md
  README.md
```

## Rodando Localmente

### 1. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python app.py
```

O backend fica disponivel em:

```text
http://127.0.0.1:5000
```

Teste rapido:

```text
http://127.0.0.1:5000/api/health
```

### 2. Frontend

```bash
cd frontend
python -m http.server 3000
```

Abra no navegador:

```text
http://127.0.0.1:3000
```

### 3. Mobile

```bash
cd mobile
npm install
npx expo start
```

Para abrir no Android Studio:

```bash
npx expo run:android
```

## Variaveis de Ambiente do Backend

Crie um arquivo `.env` dentro de `backend/`.

Exemplo:

```env
DATABASE_URL=postgresql://postgres:SUA_SENHA@HOST:5432/postgres
JWT_SECRET_KEY=sua-chave-secreta-forte
CORS_ORIGINS=http://127.0.0.1:3000,http://localhost:3000,https://seu-front.vercel.app
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxxxxxxxxx
HUGGINGFACE_MODEL=mistralai/Mistral-7B-Instruct-v0.2
FLASK_DEBUG=1
```

## Deploy

### Render

Configure o backend com:

- `Root Directory`: `backend`
- `Build Command`: `pip install -r requirements.txt`
- `Start Command`: `python app.py`

Adicione no painel do Render:

- `DATABASE_URL`
- `JWT_SECRET_KEY`
- `CORS_ORIGINS`
- `HUGGINGFACE_API_KEY`
- `HUGGINGFACE_MODEL`

### Vercel

Configure o frontend com:

- `Root Directory`: `frontend`

No arquivo `frontend/config.js`, use a URL publica do backend:

```js
window.APP_CONFIG = {
  API_BASE_URL: "https://seu-backend.onrender.com",
};
```

### Mobile

O app mobile abre a versao publicada do frontend dentro de um WebView.

Se a URL da Vercel mudar, atualize:

- `mobile/App.js`

## Banco de Dados

O projeto usa PostgreSQL no Supabase.

Na primeira execucao do backend, as tabelas principais sao criadas automaticamente:

- `users`
- `ai_history`

## Observacoes Importantes

- Nao suba `backend/.env` para o GitHub
- Nao suba `backend/.venv/`
- Revise respostas de IA antes de usar em contexto academico
- Se houver erro de CORS em producao, verifique `CORS_ORIGINS` no Render

## Criador

Desenvolvido por [Dioguinho-max](https://github.com/Dioguinho-max)

## Versao

`V1.0.7`
