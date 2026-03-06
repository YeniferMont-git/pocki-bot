🤖 Pocki Bot — WhatsApp AI Assistant

**C-Pocket · Prueba Técnica Fullstack Junior**

Pocki es un bot de WhatsApp potenciado por IA que recibe mensajes, analiza la intención del usuario y ejecuta herramientas personalizadas con web scraping para responder con información en tiempo real (TRM del dólar, noticias tech, búsqueda web).

---

## 📋 Tabla de Contenidos

- [Demo](#-demo)
- [Stack Tecnológico](#-stack-tecnológico)
- [Arquitectura](#️-arquitectura)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación](#-instalación-paso-a-paso)
- [Configurar Variables de Entorno](#-configurar-variables-de-entorno)
- [Configurar Webhook en Meta](#-configurar-webhook-en-meta)
- [Herramientas Disponibles](#-herramientas-tools)
- [Probar con Postman](#-probar-con-postman)
- [Endpoints](#-endpoints)
- [Modelo de Datos](#️-modelo-de-datos)
- [Decisiones Técnicas](#-decisiones-técnicas)

---

## 🎬 Demo

El bot responde mensajes de WhatsApp con información en tiempo real:

| Usuario pregunta | Bot responde |
|---|---|
| "¿Cuánto está el dólar hoy?" | 💵 TRM actual: $3.767,94 COP por 1 USD |
| "Noticias de tecnología sobre IA" | 📰 Lista de últimas noticias de TechCrunch |
| "¿Qué es NestJS?" | Búsqueda en DuckDuckGo + respuesta sintetizada |

---

## 🛠 Stack Tecnológico

| Tecnología | Uso |
|---|---|
| **NestJS** | Framework backend principal |
| **TypeScript** | Lenguaje de programación |
| **MySQL** | Base de datos relacional |
| **TypeORM** | ORM para manejo de base de datos |
| **Groq API** | Motor de IA (compatible con SDK de OpenAI, gratuito) |
| **Cheerio** | Web scraping de TRM y noticias |
| **Meta WhatsApp Cloud API** | Recepción y envío de mensajes |
| **ngrok** | Túnel para desarrollo local |

---

## 🏗️ Arquitectura

```
src/
├── main.ts                          # Bootstrap NestJS
├── app.module.ts                    # Root module — conecta todos los módulos
├── database/
│   └── entities/
│       └── message.entity.ts        # Entidad TypeORM — tabla messages
├── whatsapp/
│   ├── whatsapp.module.ts           # Módulo WhatsApp
│   ├── whatsapp.controller.ts       # GET /webhook (verificación) + POST /webhook (mensajes)
│   └── whatsapp.service.ts          # Orquestación: recibir → IA → responder
├── openai/
│   ├── openai.module.ts             # Módulo IA
│   └── openai.service.ts            # Loop agéntico con tool calling
└── tools/
    ├── tools.module.ts              # Módulo de herramientas
    └── tools.service.ts             # TRM scraper, News scraper, Web search
```

### Flujo completo de un mensaje

```
Usuario escribe en WhatsApp
         │
         ▼
POST /webhook  ← Meta envía el mensaje
         │
         ▼
WhatsappService.handleTextMessage()
         │  1. Guarda mensaje en MySQL
         │  2. Carga historial de conversación
         ▼
OpenaiService.chat(history)
         │  1ra llamada → modelo decide: ¿responder directo o usar tool?
         │
         ├─── Sin tool → respuesta directa
         │
         └─── Con tool → ToolsService.execute()
                    │  get_dollar_rate → API datos.gov.co + scraping fallback
                    │  get_tech_news   → scraping TechCrunch RSS
                    │  search_web      → scraping DuckDuckGo
                    │
                    ▼
              2da llamada → modelo sintetiza resultado
         │
         ▼
WhatsappService.sendTextMessage()
         │  Guarda respuesta en MySQL
         │  Envía mensaje via Meta API
         ▼
Usuario recibe respuesta en WhatsApp ✅
```

---

## ✅ Requisitos Previos

- **Node.js** 18 o superior → [nodejs.org](https://nodejs.org)
- **MySQL** 8+ → [mysql.com](https://dev.mysql.com/downloads/)
- **Cuenta Meta Developers** → [developers.facebook.com](https://developers.facebook.com)
- **Cuenta Groq** (gratuita) → [console.groq.com](https://console.groq.com)
- **ngrok** (para desarrollo local) → [ngrok.com](https://ngrok.com)

---

## 🚀 Instalación Paso a Paso

### 1. Clonar el repositorio

```bash
git clone https://github.com/TU_USUARIO/pocki-bot.git
cd pocki-bot
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita el archivo `.env` con tus credenciales (ver sección siguiente).

### 4. Crear la base de datos

Conéctate a MySQL y ejecuta:

```sql
CREATE DATABASE pocki_db;
```

> Las tablas se crean automáticamente al iniciar gracias a `DB_SYNCHRONIZE=true`.

### 5. Iniciar el servidor

```bash
npm run start:dev
```

Deberías ver en consola:
```
🚀 Pocki Bot is running on port 3000
```

### 6. Exponer el servidor con ngrok

En una segunda terminal:

```bash
ngrok http 3000
```

Copia la URL pública que aparece:
```
Forwarding  https://abc123.ngrok-free.app -> http://localhost:3000
```

---

## 🔐 Configurar Variables de Entorno

Edita el archivo `.env` con estos valores:

```env
PORT=3000
NODE_ENV=development

# ── Meta WhatsApp Cloud API ──────────────────────────
WHATSAPP_PHONE_NUMBER_ID=      # ID del número en Meta for Developers
WHATSAPP_ACCESS_TOKEN=         # Token de acceso (Meta → Inicio rápido → Generar token)
WHATSAPP_VERIFY_TOKEN=pocki_secret_123
WHATSAPP_API_VERSION=v18.0

# ── Groq (IA gratuita, compatible con SDK de OpenAI) ─
OPENAI_API_KEY=                # API Key de console.groq.com
OPENAI_MODEL=llama-3.3-70b-versatile

# ── Base de datos MySQL ──────────────────────────────
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=
DB_NAME=pocki_db
DB_SYNCHRONIZE=true
```

### ¿Cómo obtener cada credencial?

**WHATSAPP_PHONE_NUMBER_ID y WHATSAPP_ACCESS_TOKEN:**
1. Ve a [developers.facebook.com](https://developers.facebook.com) → tu app → WhatsApp → Inicio rápido
2. El `Phone Number ID` aparece en el paso 2
3. Haz clic en **"Generar identificador de acceso"** para el token

> ⚠️ El token temporal expira cada hora. Para token permanente: Meta → Configuración de la empresa → Usuarios del sistema.

**OPENAI_API_KEY (Groq — gratuito):**
1. Ve a [console.groq.com](https://console.groq.com) y crea una cuenta
2. Ve a **API Keys → Create API Key** y cópiala

---

## 🌐 Configurar Webhook en Meta

1. Ve a [developers.facebook.com](https://developers.facebook.com) → tu app → WhatsApp → Configuración
2. En la sección **Webhooks** llena:
   - **URL de devolución de llamada:** `https://TU-URL-NGROK.ngrok-free.app/webhook`
   - **Identificador de verificación:** `pocki_secret_123`
3. Haz clic en **"Verificar y guardar"**
4. Suscríbete al campo **`messages`**

---

## 🔧 Herramientas (Tools)

El bot decide automáticamente qué herramienta usar según el mensaje:

| Tool | Descripción | Ejemplo de trigger |
|---|---|---|
| `get_dollar_rate` | TRM actual (USD→COP) desde datos.gov.co + fallback scraping | "¿Cuánto está el dólar?" |
| `get_tech_news` | Headlines de TechCrunch RSS con filtro por keyword | "Noticias de IA" |
| `search_web` | Búsqueda en DuckDuckGo para consultas generales | "¿Qué es TypeORM?" |

---

## 🧪 Probar con Postman

### Request 1 — Verificar Webhook

```
GET http://localhost:3000/webhook?hub.mode=subscribe&hub.verify_token=pocki_secret_123&hub.challenge=TEST123
```
Respuesta esperada: `TEST123`

### Request 2 — Simular consulta de TRM

```
POST http://localhost:3000/webhook
Content-Type: application/json
```
```json
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

### Request 3 — Simular consulta de noticias

```
POST http://localhost:3000/webhook
Content-Type: application/json
```
```json
{
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{
          "from": "573001234567",
          "type": "text",
          "text": { "body": "Dame noticias de tecnología sobre inteligencia artificial" }
        }]
      }
    }]
  }]
}
```

> Los logs del servidor mostrarán el flujo completo: recepción → tool ejecutada → respuesta generada.

---

## 📬 Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/webhook` | Verificación del webhook (handshake con Meta) |
| `POST` | `/webhook` | Recibe mensajes entrantes de WhatsApp |

---

## 🗄️ Modelo de Datos

**Tabla `messages`** — persiste el historial de conversación por número de teléfono

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Identificador único |
| `phone_number` | VARCHAR | Número del usuario (ej: 573001234567) |
| `role` | ENUM(user/assistant) | Quién envió el mensaje |
| `content` | TEXT | Contenido del mensaje |
| `tool_used` | VARCHAR (nullable) | Nombre de la tool ejecutada |
| `created_at` | TIMESTAMP | Fecha y hora de creación |

El historial permite **contexto multi-turno** — los últimos 10 mensajes se envían en cada llamada a la IA.

---

## 📐 Decisiones Técnicas

**NestJS como framework backend**
Elegido por su arquitectura modular e inyección de dependencias nativa. Facilita organizar el código en capas bien definidas (controller → service → repository) y escala bien a medida que el proyecto crece.

**Loop agéntico con Tool Calling**
Se implementó el patrón completo: primera llamada al modelo para decidir si necesita una herramienta, ejecución de la herramienta, segunda llamada para sintetizar la respuesta. La IA decide autónomamente cuándo y cómo usar cada tool.

**Groq como proveedor de IA**
Se usa Groq en lugar de OpenAI directamente por su tier gratuito generoso y compatibilidad 100% con el SDK de OpenAI — el cambio solo requirió agregar `baseURL` al cliente sin modificar ninguna otra lógica.

**Cheerio para web scraping**
Librería ligera para parsear HTML/XML del lado del servidor. Permite obtener la TRM desde datos.gov.co (API oficial) con fallback a scraping de la Superfinanciera, headlines de TechCrunch via RSS, y resultados de DuckDuckGo.

**TypeORM + MySQL**
Persistencia del historial de conversación por número de teléfono. Permite que el bot mantenga contexto entre mensajes del mismo usuario para conversaciones coherentes y naturales.
