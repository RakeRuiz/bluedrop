# Checklist: crear un cliente nuevo a partir de esta plantilla

Este repo (`lucy-mastra`) es la base reutilizable: un agente de WhatsApp (Mastra + OpenAI + Zernio) + un
dashboard de leads (Next.js + Supabase). Para montar la misma solución con un cliente nuevo, sigue estos pasos.

## 1. Crear el repo del cliente

1. En GitHub, entra a `RakeRuiz/lucy-mastra` → botón **"Use this template"** → crea un repo nuevo (sin
   historial compartido).
2. Clónalo localmente.

## 2. Personalidad y background del agente

Edita:
- `src/mastra/instructions/lucy-persona.ts` — tono, reglas de negocio, cuándo usar cada tool.
- `src/mastra/instructions/taller-knowledge.ts` — reemplaza el contenido por la información del negocio del
  cliente (servicios, precios, FAQs, lo que comparta).
- `src/mastra/agents/lucy.agent.ts` — opcionalmente cambia el nombre/id del agente.
- Borra o reemplaza `taller_ia_19sep.txt` en la raíz (era solo el material fuente de este proyecto).

## 3. Branding del dashboard

- `dashboard/public/logo.png` — reemplaza por el logo del cliente (idealmente transparente, cuadrado).
- `dashboard/src/components/site-header.tsx` — cambia el nombre de marca y la descripción bajo el logo.
- `dashboard/src/app/globals.css` — en `:root` y `.dark`, cambia solo estas 3 variables para reteñir todo
  el dashboard:
  ```css
  --brand: #6d28d9;
  --brand-foreground: #ffffff;
  --brand-muted: #ede9fe;
  ```
- `dashboard/src/app/layout.tsx` — título/metadata (`export const metadata`).

## 4. Base de datos (Supabase propio del cliente)

1. Crea un proyecto de Supabase nuevo (o usa el que el cliente ya tenga).
2. Corre `src/db/schema.sql` completo en el SQL Editor.
3. Si el cliente necesita tablas propias (ej. `quotes` para cotizaciones), agrégalas aquí.

## 5. Cuentas externas del cliente

- Zernio: cuenta y número de WhatsApp propios. Obtén `ZERNIO_ACCOUNT_ID`/`ZERNIO_PROFILE_ID` reales vía
  `GET /v1/accounts` (no asumas que son los que aparecen en otro lado — ver Fase 0 del plan original).
- Telegram (u otro canal): bot propio para avisos al equipo del cliente.
- OpenAI: decide si comparte la cuenta de Rake o usa una propia.

## 6. Variables de entorno

- `.env` (raíz, para el agente): copia `.env.example`, llena todos los valores.
- `dashboard/.env.local` (para el dashboard): copia `dashboard/.env.local.example`, llena todos los valores.
  Genera un `DASHBOARD_USER`/`DASHBOARD_PASS` nuevo para este cliente.

## 7. Desplegar

1. Push al repo del cliente.
2. En EasyPanel (o el hosting que uses), crea 2 servicios apuntando a este repo:
   - Agente: build con `docker/agent.Dockerfile`, puerto interno 8080.
   - Dashboard: build con `dashboard/Dockerfile`, puerto interno 3000, ruta de compilación `/dashboard`.
3. Carga las variables de entorno reales en cada servicio.
4. Una vez el agente tenga un dominio público, registra el webhook de Zernio:
   `POST /v1/webhooks/settings` con `url` = `https://<dominio-del-agente>/webhooks/zernio`, un `secret`
   nuevo (guárdalo en `ZERNIO_WEBHOOK_SECRET` del servicio y redeploy), y `events: ["message.received"]`.
5. Manda un mensaje real de WhatsApp de prueba y confirma que Lucy responde y que aparece el lead en el
   dashboard.

## 8. Reglas de negocio específicas del cliente (cotizaciones, avisos al equipo, etc.)

No están cubiertas por esta plantilla — se agregan cuando el cliente las necesite, siguiendo el patrón ya
usado en `src/mastra/tools/handoff-to-rene.tool.ts` (una tool nueva en `src/mastra/tools/`, con su lógica de
datos en `src/server/lib/`). Ver la sección correspondiente en el historial de decisiones del proyecto base
si necesitas contexto de por qué se dejó así.
