# Existing System Contracts Summary

**Status:** Technical Contract Specification for WuzMind Integration  
**Ecosystem Components:** WhatsApp ↔ Wuzapi ↔ Wuzbot Engine ↔ WuzMind ↔ Typebot ↔ n8n ↔ PostgreSQL

---

## 1. Visão Geral da Arquitetura do Ecossistema

O ecossistema opera de forma modular e desacoplada:

```text
WhatsApp ──(Webhook)──► Wuzapi ──► Wuzbot Engine ──(Análise Cognitiva)──► WuzMind
                                         │                                      ▲
                                         ▼                                      │
                               Decisão Estruturada ─────────────────────────────┘
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   ▼                                           ▼
             Typebot Flow                               n8n Workflows
      (Máquina de Estados/Menu)                 (OCR, PDFs, Banco Financeiro)
                   │                                           │
                   └─────────────────────┬─────────────────────┘
                                         ▼
                                   Wuzbot Engine
                                         │
                                         ▼
                                       Wuzapi
                                         │
                                         ▼
                                      WhatsApp
```

---

## 2. Contratos do GastoApp (PostgreSQL / Prisma)

O banco relacional financeiro principal contém as seguintes entidades essenciais mapeadas via Prisma:

- **`usuarios`**: Contas autorizadas com `telefone`, `perfil` (`USER` / `ADMIN`), permissões e status ativo.
- **`bancos`**: Cadastro de instituições (ex: `NUBANK`, `ITAU`, `BRADESCO`, `INTER`, `SANTANDER`, etc.).
- **`categorias`**: Categorias de despesas e receitas.
- **`gastos2026`**: Registro individual de despesas contendo valor, data, descrição, parcelamento, banco associado e usuário.
- **`entradas2026`**: Registro de rendimentos, salários e depósitos recebidos.
- **`compras`** e **`parcelas`**: Gestão de transações parceladas no cartão de crédito.
- **`entrada_validacoes`**: Validação de comprovantes com campos de análise por IA (`ia_status`, `ia_confianca`, `ia_analise`).

> **Regra WuzMind:** O WuzMind **NUNCA** grava ou altera transações financeiras diretamente nessas tabelas. Essa atribuição é exclusiva do n8n / GastoApp.

---

## 3. Contratos do Wuzbot Engine

### 3.1. Tipos Canônicos (`canonical.types.ts`)
O Engine normaliza todas as mensagens recebidas em contratos padronizados:

```typescript
export enum CanonicalInputType {
  TEXT = 'TEXT',
  BUTTON_REPLY = 'BUTTON_REPLY',
  LIST_REPLY = 'LIST_REPLY',
  IMAGE = 'IMAGE',
  DOCUMENT = 'DOCUMENT',
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
  STICKER = 'STICKER',
}

export interface CanonicalUserInput {
  phone: string;
  externalMessageId: string;
  type: CanonicalInputType;
  text?: string;
  selection?: { id: string; label: string; value: string };
  media?: {
    mediaId?: string;
    mimeType?: string;
    fileName?: string;
    size?: number;
    url?: string;
    caption?: string;
    checksum?: string;
  };
  receivedAt: Date;
  metadata?: Record<string, unknown>;
}
```

### 3.2. Estrutura de Contexto do Wuzbot (`wuzbot_contexts`)
Tabela gerenciada pelo Wuzbot Engine no PostgreSQL:
- `phone` (unique)
- `current_state`
- `last_intent`
- `last_typebot_group`
- `waiting_for`
- `last_bank`
- `last_month`
- `session_status`
- `context_data` (jsonb)

---

## 4. Contratos do Typebot em Runtime

- **Versão validada:** Typebot API v6.1 (`/api/v1/typebots/:publicId/startChat` e `/continueChat`).
- **Respostas de Escolha (Choice Input):**
  - Retorna `id` e `content` (label visível).
  - Aceita resposta via texto correspondente ao `content` da opção.
- **Transição de Estados:** Determinada pelo fluxo gráfico desenhado no Typebot. O Wuzbot apenas repassa o input do usuário ou direciona para o grupo inicial adequado.

---

## 5. Contratos do Wuzapi em Runtime

- **Autenticação:** Header `token: <WUZAPI_USER_TOKEN>`.
- **Formato de Destinatário:** Telefone sem `+` (ex: `5511999999999`).
- **Envios Comprovados em Runtime:**
  - Texto: `POST /chat/send/text` com `{ "Phone": "...", "Body": "..." }`
  - Lista: `POST /chat/send/list` com `{ "Phone": "...", "ButtonText": "...", "Desc": "...", "TopText": "...", "List": [...] }`
  - Imagem: `POST /chat/send/image` com Base64 PNG/JPEG no campo `Image`.

---

## 6. Papel Exclusivo do WuzMind

O WuzMind atua como a inteligência cognitiva pura:
1. **Classificação de Intenção:** Identifica o objetivo do usuário e extrai entidades financeiras (banco, mês, valor).
2. **Detecção de Comportamento Humano:** Responde a saudações, agradecimentos e interações breves com regras ultrarrápidas.
3. **Recuperação de Conversa Fora do Fluxo:** Ajuda usuários perdidos sem quebrar a máquina de estados.
4. **Classificação Preliminar de Mídia:** Avalia metadados para indicar envio ao n8n (OCR / transcrição).
