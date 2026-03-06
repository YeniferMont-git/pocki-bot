# 🤖 Pocki Bot — WhatsApp AI Assistant

**C-Pocket · Prueba Técnica Fullstack Junior**

Pocki es un bot de WhatsApp potenciado por OpenAI que recibe mensajes, analiza la intención del usuario y ejecuta herramientas personalizadas (web scraping) para responder con información en tiempo real.

---

## 🏗️ Arquitectura

```
src/
├── main.ts                          # Bootstrap NestJS
├── app.module.ts                    # Root module
├── database/
│   └── entities/
│       └── message.entity.ts        # TypeORM entity (PostgreSQL)
├── whatsapp/
│   ├── whatsapp.module.ts
│   ├── whatsapp.controller.ts       # Webhook handler (GET verify + POST messages)
│   └── whatsapp.service.ts          # Orchestration: receive → AI → reply
├── openai/
│   ├── openai.module.ts
│   └── openai.service.ts            # OpenAI tool-calling loop
└── tools/
    ├── tools.module.ts
    └── tools.service.ts             # Custom tools (TRM, tech news, web search)
```

### Flujo de un mensaje

```
WhatsApp User
     │
     ▼
POST /webhook (WhatsappController)
     │
     ▼
WhatsappService.handleTextMessage()
     │  saves user message to DB
     ▼
OpenaiService.chat(history)
     │  1st call → model decides: answer or use tool
     │  if tool_call → ToolsService.execute()
     │  2nd call → model synthesizes answer
     ▼
WhatsappService.sendTextMessage()
     │  saves assistant reply to DB
     ▼
WhatsApp User ✅
```

---

## ⚙️ Requisitos

- Node.js 18+
- PostgreSQL 14+
- Cuenta de desarrollador Meta (WhatsApp Cloud API)
- API Key de OpenAI

---

## 🚀 Instalación y puesta en marcha

### 1. Clonar e instalar dependencias

```bash
git clone <tu-repo>
cd pocki-bot
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con tus credenciales:

| Variable | Descripción |
|---|---|
| `WHATSAPP_PHONE_NUMBER_ID` | ID del número en Meta for Developers |
| `WHATSAPP_ACCESS_TOKEN` | Token permanente de acceso a la API |
| `WHATSAPP_VERIFY_TOKEN` | Token personalizado para verificar el webhook |
| `OPENAI_API_KEY` | Tu API Key de OpenAI |
| `OPENAI_MODEL` | Modelo a usar (default: `gpt-3.5-turbo`) |
| `DB_HOST` / `DB_PORT` / etc. | Conexión a PostgreSQL |

### 3. Crear la base de datos

```sql
CREATE DATABASE pocki_db;
```

Las tablas se crean automáticamente al iniciar (`DB_SYNCHRONIZE=true`).

### 4. Iniciar el servidor

```bash
# Desarrollo (hot-reload)
npm run start:dev

# Producción
npm run build && npm run start:prod
```

---

## 🌐 Configurar el webhook en Meta

1. Ve a [developers.facebook.com](https://developers.facebook.com) → tu App → WhatsApp → Configuration
2. En **Webhook URL** escribe: `https://tu-dominio.com/webhook`
3. En **Verify Token** escribe el valor de `WHATSAPP_VERIFY_TOKEN`
4. Suscríbete al campo `messages`

> **Local testing:** usa [ngrok](https://ngrok.com) para exponer tu servidor local:
> ```bash
> ngrok http 3000
> ```

---

## 🔧 Herramientas (Tools)

| Tool | Función | Trigger |
|---|---|---|
| `get_dollar_rate` | TRM actual (USD→COP) via API datos.gov.co + scraping fallback | "¿Cuánto está el dólar?" |
| `get_tech_news` | Headlines de TechCrunch RSS | "Noticias de tecnología sobre IA" |
| `search_web` | Búsqueda en DuckDuckGo (scraping) | Consultas generales de información |

---

## 📬 Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/webhook` | Verificación del webhook (Meta handshake) |
| `POST` | `/webhook` | Recibe mensajes entrantes de WhatsApp |

---

## 🗄️ Modelo de datos

**Tabla `messages`**

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Identificador único |
| `phone_number` | VARCHAR | Número del usuario |
| `role` | ENUM(user/assistant) | Quién envió el mensaje |
| `content` | TEXT | Contenido del mensaje |
| `tool_used` | VARCHAR (nullable) | Nombre de la tool ejecutada |
| `created_at` | TIMESTAMP | Fecha de creación |

---

## 🧪 Pruebas con Postman

Importa la siguiente colección:

### Verificar webhook (simular Meta)
```
GET http://localhost:3000/webhook
  ?hub.mode=subscribe
  &hub.verify_token=TU_VERIFY_TOKEN
  &hub.challenge=CHALLENGE_STRING
```

### Simular mensaje entrante
```
POST http://localhost:3000/webhook
Content-Type: application/json

{
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{
          "from": "573001234567",
          "type": "text",
          "text": { "body": "¿Cuánto está el dólar hoy?" }
        }]
      }
    }]
  }]
}
```

---

## 📐 Decisiones Técnicas

- **NestJS**: Framework elegido por su arquitectura modular, inyección de dependencias y soporte nativo para TypeScript.
- **OpenAI Tool Calling**: Se implementó el loop agéntico completo: primera llamada para decidir si usar tool → ejecución → segunda llamada para sintetizar respuesta. Esto permite que el modelo decida autónomamente cuándo usar herramientas.
- **Cheerio (web scraping)**: Librería ligera para parsear HTML/XML en servidor, ideal para los scrapers de TRM y noticias.
- **TypeORM + PostgreSQL**: Persistencia de historial de conversación por número de teléfono, permitiendo contexto multi-turno.
- **HttpModule de NestJS**: Wraps axios con soporte para inyección de dependencias, facilitando testing y mantenimiento.
