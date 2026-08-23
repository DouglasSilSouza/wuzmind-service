# WuzMind Service 🧠

Serviço cognitivo independente e desacoplado para o ecossistema Wuzbot, responsável por classificação de intenções, detecção de comportamento humano, extração de entidades financeiras, sugestão de rotas e recuperação de mensagens fora de fluxo.

---

## 🏗️ Arquitetura e Papel no Ecossistema

```text
WhatsApp ──► Wuzapi ──► Wuzbot Engine ──► WuzMind (Decisão Cognitiva)
                              │                     │
                              ▼                     ▼
                     Typebot (Menus)        n8n (OCR / Finanças)
```

### Princípios Fundamentais:
- **Desacoplamento Total:** O Wuzbot conhece apenas a API REST do WuzMind (`POST /v1/intent/classify`, etc.) e nunca provedores de IA específicos.
- **Failover em Camadas:** `OLLAMA` ➔ `GEMINI` ➔ `OPENAI` ➔ `STATIC` (Fallback determinístico seguro).
- **Sem mutação financeira direta:** O WuzMind nunca altera o banco de dados do GastoApp nem envia mensagens diretamente ao WhatsApp.
- **Segurança:** Autenticação obrigatória por header `x-wuzmind-api-key`, proteção contra prompt injection e redação automática de segredos nos logs.

---

## 🚀 Requisitos e Tecnologias

- **Node.js 22+**
- **NestJS 11** & **TypeScript** (Strict mode)
- **PostgreSQL** & **TypeORM**
- **Docker** & **Docker Compose**
- **Ollama** (Local AI Engine)

---

## ⚙️ Variáveis de Ambiente (`.env`)

Copie o arquivo de exemplo:
```bash
cp .env.example .env
```

| Variável | Descrição | Padrão |
|---|---|---|
| `PORT` | Porta do servidor HTTP | `3000` |
| `DATABASE_URL` | Conexão com PostgreSQL (ex: `postgresql://user:pass@host:5432/wuzmind`) | - |
| `WUZMIND_API_KEY` | Chave secreta de autenticação da API | *obrigatório* |
| `AI_PROVIDER_ORDER` | Ordem de tentativa dos provedores | `OLLAMA,GEMINI,OPENAI,STATIC` |
| `AI_REQUEST_TIMEOUT_MS` | Timeout por requisição de provedor | `8000` |
| `AI_MAX_RETRIES_PER_PROVIDER` | Retentativas por provedor antes do failover | `1` |
| `AI_MIN_CONFIDENCE` | Confiança mínima esperada | `0.65` |
| `OLLAMA_URL` | URL da instância do Ollama | `http://ollama:11434` |
| `OLLAMA_PRIMARY_MODEL` | Modelo principal local | `qwen3:4b` |
| `OLLAMA_FALLBACK_MODEL` | Modelo secundário local | `llama3.2:3b` |
| `GEMINI_API_KEY` | Chave de API Google Gemini (opcional) | - |
| `GEMINI_MODEL` | Modelo Gemini configurado | `gemini-1.5-flash` |
| `OPENAI_API_KEY` | Chave de API OpenAI (opcional) | - |
| `OPENAI_MODEL` | Modelo OpenAI configurado | `gpt-4o-mini` |

---

## 📦 Inicialização Local

```bash
# 1. Instalar dependências
npm install

# 2. Executar testes automatizados
npm test

# 3. Compilar projeto
npm run build

# 4. Iniciar em desenvolvimento
npm run start:dev
```

---

## 🐳 Docker e Ollama

Para subir o WuzMind junto ao container Ollama conectado na rede `ContasNet`:

```bash
docker compose up -d
```

### Baixar Modelos no Container Ollama

O container do Ollama não faz download automático durante o boot para evitar sobrecarga e lentidão. Baixe os modelos desejados executando:

```bash
# Baixar modelo principal (recomendado para VPS com 4GB+ RAM)
docker exec -it wuzmind-ollama ollama pull qwen3:4b

# Baixar modelo reserva
docker exec -it wuzmind-ollama ollama pull llama3.2:3b
```

---

## 📡 Endpoints da API

### 1. `GET /health` (Público)
Verificação de integridade dos serviços, banco e provedores configurados.

```bash
curl http://localhost:3000/health
```

### 2. `POST /v1/intent/classify`
Classifica a intenção da mensagem e extrai entidades.

```bash
curl -X POST http://localhost:3000/v1/intent/classify \
  -H "Content-Type: application/json" \
  -H "x-wuzmind-api-key: SUA_CHAVE" \
  -d '{
    "phone": "5511999999999",
    "message": "quanto gastei no nubank esse mês?",
    "currentState": "MAIN_MENU",
    "availableOptions": ["Registrar gasto", "Registrar entrada", "Relatórios"]
  }'
```

### 3. `POST /v1/recovery`
Gera mensagem curta e amigável para orientar usuário perdido no fluxo.

```bash
curl -X POST http://localhost:3000/v1/recovery \
  -H "Content-Type: application/json" \
  -H "x-wuzmind-api-key: SUA_CHAVE" \
  -d '{
    "phone": "5511999999999",
    "message": "como vejo meu saldo?",
    "currentState": "WAITING_MONTH",
    "waitingFor": "RELATORIO_MES",
    "availableOptions": ["Mês Atual", "Mês Anterior", "Mês Seguinte"]
  }'
```

### 4. `POST /v1/human-behavior/detect`
Detecção ultra-rápida (regras locais sem IA) de saudações, agradecimentos e risadas.

```bash
curl -X POST http://localhost:3000/v1/human-behavior/detect \
  -H "Content-Type: application/json" \
  -H "x-wuzmind-api-key: SUA_CHAVE" \
  -d '{"message": "oi, tudo bem?"}'
```

### 5. `POST /v1/media/classify`
Classificação preliminar de metadados de imagens, áudios e documentos.

```bash
curl -X POST http://localhost:3000/v1/media/classify \
  -H "Content-Type: application/json" \
  -H "x-wuzmind-api-key: SUA_CHAVE" \
  -d '{
    "phone": "5511999999999",
    "mediaType": "IMAGE",
    "fileName": "comprovante.jpg",
    "caption": "pagamento do mercado"
  }'
```

### 6. `GET /v1/context/:phone` | `PUT /v1/context/:phone` | `DELETE /v1/context/:phone`
Gerenciamento de contexto conversacional persistido no PostgreSQL.

---

## 🛡️ Estratégia de Fallback e Resiliência

1. **Regras Locais Rápidas:** Comandos como `MENU`, `SAIR`, `AJUDA` ou saudações básicas são interceptados sem gastar tokens ou latência de IA.
2. **Circuit Breaker:** Provedores que falham 3 vezes consecutivas entram em cooldown de 30 segundos, protegendo o tempo de resposta geral.
3. **Fallback Estático:** Se Ollama, Gemini e OpenAI estiverem indisponíveis ou excederem o timeout, o `StaticFallbackProvider` responde de maneira segura e determinística para orientar o usuário.
