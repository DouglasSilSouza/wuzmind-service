# Wuzbot Engine ↔ WuzMind Integration Guide

Este documento detalha como o **Wuzbot Engine** deve se integrar ao serviço cognitivo **WuzMind**.

---

## 1. Configuração no Wuzbot Engine

Adicionar as seguintes variáveis ao `.env` e `docker-compose.yml` do Wuzbot Engine:

```env
# Integração WuzMind
WUZMIND_URL=http://wuzmind-service:3000
WUZMIND_API_KEY=sua_chave_secreta_configurada_aqui
WUZMIND_TIMEOUT_MS=8000
```

---

## 2. Política de Decisão e Roteamento no Wuzbot Engine

Quando uma nova mensagem do WhatsApp chega pelo Wuzapi webhook, o Wuzbot Engine deve seguir esta ordem:

```text
1. Comandos Globais Locais (MENU, SAIR, AJUDA, CONTINUAR)
   └─ Se identificado localmente com certeza -> Executa ação sem chamar IA.

2. Mensagem de Mídia Recebida (Imagem, Áudio, Documento)
   └─ Chama POST /v1/media/classify no WuzMind -> Encaminha para n8n OCR/Transcrição se sugerido.

3. Sessão Ativa do Typebot em Curso
   └─ Se a resposta bate com as opções válidas -> Continua no Typebot.
   └─ Se o usuário digitou algo fora do fluxo -> Chama POST /v1/recovery no WuzMind.

4. Nova Interação / Dúvida / Conversa Geral
   └─ Chama POST /v1/intent/classify no WuzMind.
   └─ Avalia a saída estruturada:
      • START_TYPEBOT_FLOW -> Inicia fluxo no Typebot correspondente (ex: GASTOS, ENTRADAS, RELATORIOS).
      • REDISPLAY_MENU -> Reexibe menu principal.
      • ANSWER_AND_KEEP_STATE -> Envia mensagem amigável via Wuzapi mantendo o estado.
      • SEND_TO_N8N_OCR -> Dispara webhook do n8n.
```

---

## 3. Contratos de Chamada da API WuzMind

Todas as requisições autenticadas exigem o cabeçalho:
```http
x-wuzmind-api-key: <WUZMIND_API_KEY>
Content-Type: application/json
```

### 3.1. Classificação de Intenção (`POST /v1/intent/classify`)

**Request:**
```json
{
  "phone": "5511999999999",
  "message": "quanto gastei no nubank esse mês?",
  "currentState": "MAIN_MENU",
  "waitingFor": null,
  "availableOptions": [
    "Registrar gasto",
    "Registrar entrada",
    "Relatórios"
  ],
  "context": {}
}
```

**Response:**
```json
{
  "intent": "CONSULTAR_RELATORIO",
  "confidence": 0.98,
  "entities": {
    "bank": "NUBANK",
    "period": "MES_ATUAL"
  },
  "suggestedAction": "START_TYPEBOT_FLOW",
  "targetFlow": "RELATORIOS",
  "provider": "OLLAMA"
}
```

---

### 3.2. Recuperação de Conversa Fora de Fluxo (`POST /v1/recovery`)

**Request:**
```json
{
  "phone": "5511999999999",
  "message": "como vejo meu saldo?",
  "currentState": "WAITING_MONTH",
  "waitingFor": "RELATORIO_MES",
  "availableOptions": [
    "Mês Atual",
    "Mês Anterior",
    "Mês Seguinte"
  ],
  "context": {}
}
```

**Response:**
```json
{
  "action": "REDISPLAY_MENU",
  "message": "No momento, preciso que você escolha o período do relatório. Se quiser recomeçar, digite MENU.",
  "matchedOption": null,
  "intent": "AJUDA_CONTEXTO",
  "confidence": 0.91,
  "provider": "OLLAMA"
}
```

---

### 3.3. Detecção de Comportamento Humano (`POST /v1/human-behavior/detect`)

**Request:**
```json
{
  "message": "oi, tudo bem?"
}
```

**Response:**
```json
{
  "isHumanBehavior": true,
  "category": "GREETING",
  "suggestedMessage": "Olá! Posso ajudar com gastos, entradas e relatórios."
}
```

---

### 3.4. Classificação de Mídia Preliminar (`POST /v1/media/classify`)

**Request:**
```json
{
  "phone": "5511999999999",
  "mediaType": "IMAGE",
  "mimeType": "image/jpeg",
  "fileName": "comprovante.jpg",
  "caption": "pagamento do mercado",
  "url": "https://..."
}
```

**Response:**
```json
{
  "classification": "COMPROVANTE",
  "confidence": 0.95,
  "suggestedAction": "SEND_TO_N8N_OCR",
  "provider": "LOCAL_HEURISTICS"
}
```
