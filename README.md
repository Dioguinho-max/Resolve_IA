# ResolveAI

Arquitetura separada para deploy moderno:

- `frontend/`: site estatico para subir na Vercel
- `backend/`: API Flask para subir no Render
- Banco: PostgreSQL do Supabase
- IA: Hugging Face Inference API com `mistralai/Mistral-7B-Instruct-v0.2`

## Funcionalidades

- Cadastro e login com senha criptografada por `bcrypt`
- Autenticacao com `JWT`
- Historico de perguntas e respostas por usuario
- Deteccao automatica entre matematica, fisica e texto
- Grafico de funcoes quando a pergunta permite
- Estrutura pronta para integrar Hugging Face no backend

## Estrutura

```text
backend/
  app.py
  requirements.txt
  .env.example
  render.yaml
frontend/
  index.html
  styles.css
  app.js
  config.js
  vercel.json
```

## Backend local

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python app.py
```

## Frontend local

Abra `frontend/index.html` em um servidor estatico. Se quiser:

```bash
cd frontend
python -m http.server 3000
```

Depois abra `http://127.0.0.1:3000`.

## Variaveis do backend

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
JWT_SECRET_KEY=sua-chave-secreta
CORS_ORIGINS=http://localhost:3000,https://seu-front.vercel.app
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxxxxxxxxx
HUGGINGFACE_MODEL=mistralai/Mistral-7B-Instruct-v0.2
```

## Supabase

1. Crie um projeto no Supabase.
2. Copie a connection string do Postgres.
3. Cole em `DATABASE_URL`.
4. Na primeira execucao, o backend cria as tabelas `users` e `ai_history`.

## Render

1. Aponte o deploy para a pasta `backend`.
2. Use `pip install -r requirements.txt` no build.
3. Use `python app.py` no start.
4. Configure as variaveis de ambiente do `.env.example`.

## Vercel

1. Aponte o deploy para a pasta `frontend`.
2. Antes do deploy, troque `frontend/config.js` para a URL publica do backend Render.
3. Adicione essa URL em `CORS_ORIGINS` no backend.

## Observacao

Neste ambiente eu deixei a integracao com Hugging Face pronta no codigo, mas nao consegui validar chamadas reais da API porque a rede e as chaves nao estao disponiveis aqui.
