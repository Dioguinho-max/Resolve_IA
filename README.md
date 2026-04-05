# ResolveAI

Versao atual: `1.0.8`

ResolveAI e uma plataforma de estudos com IA focada em exercicios, revisoes e organizacao do aprendizado. O projeto combina chat de estudos, historico salvo por usuario, graficos matematicos e recursos de acompanhamento de uso.

## Release 1.0.8

A versao `1.0.8` consolida a base atual do produto com melhorias importantes na experiencia de estudo:

- chat unico para exercicios, revisoes e planos de estudo
- deteccao automatica de perguntas matematicas no fluxo principal
- grafico de funcoes com eixos numerados
- historico com favoritos, categorias e paginacao reduzida
- dashboard com ritmo de estudo, evolucao semanal e calendario de atividade
- exportacao da resposta em PDF e imagem
- modo escuro
- autenticacao, recuperacao de senha e historico protegido por usuario

## Funcionalidades principais

- criar conta, entrar e sair com seguranca
- recuperar senha com codigo temporario
- enviar perguntas no chat de estudos
- receber respostas explicadas com animacao de escrita
- visualizar graficos quando a pergunta envolver funcao matematica
- salvar consultas no historico
- favoritar respostas importantes
- organizar consultas com categorias pessoais
- buscar, filtrar e apagar itens do historico
- acompanhar uso no dashboard e no calendario de atividade

## Stack

- Frontend: HTML, CSS e JavaScript
- Backend: Python e Flask
- Banco de dados: PostgreSQL
- Autenticacao: JWT e bcrypt
- IA matematica: SymPy
- IA geral: Hugging Face

## Privacidade e seguranca

- historico separado por usuario
- cookies autenticados com protecao CSRF
- limitacao de taxa nas rotas de IA
- bloqueio de envio de dados sensiveis para IA externa
- RLS aplicada no historico do usuario

## Endpoints de status

A API principal agora informa a versao atual nos endpoints:

- `GET /`
- `GET /api/health`

## Proxima linha de evolucao

A base do projeto esta estavel na `1.0.8`. A partir daqui, as proximas atualizacoes podem focar em refinamentos de produto, experiencia e inteligencia da plataforma.
