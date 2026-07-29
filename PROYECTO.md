# Proyecto: Moonsforest 🌲

## Visión General
Plataforma de aprendizaje de inglés en línea, interactiva y gamificada con una estética de bosque misterioso y encantador (migrada a "English Peak" con montañas). La premisa principal es clara: **A Moonsforest se viene a hablar, no solo a hacer clics.** Los alumnos exploran el bosque y completan módulos guiados por "Moon" (una osita sabia con TTS/STT vía Web Speech API). Para avanzar, las evaluaciones se realizan con maestros reales que evalúan la capacidad de construir conversaciones en vivo con el vocabulario de la lección.

## Stack Tecnológico
- **Frontend:** HTML5, CSS3 (Vanilla), JavaScript (ES6+). Diseño 100% responsivo y dependiente de CSS para gráficos complejos (ej. montañas lejanas y pinos asimétricos).
- **Recursos Multimedia:** Cloudinary para almacenamiento y distribución de imágenes de los módulos de aprendizaje.
- **Backend/Hosting:** Entorno local con `netlify dev` y despliegue en Netlify (Hosting + Netlify Functions para lógica de servidor y APIs).
- **Base de Datos & Auth:** Firebase (Firestore + Google Auth). Proyecto: `english-platform-5c49b`.
- **IA de Voz:** Web Speech API nativa del navegador (SpeechSynthesis TTS + SpeechRecognition STT) — sin costo, sin APIs externas. Moon no usa LLM actualmente; sus respuestas son mensajes predefinidos desde `globals.json` y los archivos de módulo.
- **Pagos:** ❌ **No integrado aún.** Mercado Pago está planificado pero sin implementación. La plataforma actualmente usa un sistema de "crédito Moonsforest" manual.
- **Notificaciones:** Discord Webhooks + Bot DM vía Discord API v10 (Netlify Function `functions/discord.js`).
- **Recordatorios Automáticos:** Netlify Scheduled Function (cron `*/10 * * * *`) para recordatorios de clases vía `functions/scheduled-reminders.js`.

## Documentación Anexa del Proyecto
| Archivo | Propósito |
|---------|-----------|
| `KNOWLEDGE.md` | Currículo completo: filosofía pedagógica, estructura de módulos (20 lecciones c/u), desglose de Módulos 1–10 |
| `ADMIN_PANEL.md` | Hoja de ruta del Admin Panel V1.1 "The Watchtower" — KPIs, gestión, finanzas, pendientes |
| `DISCORD_BOT.md` | Plan de implementación del bot de Discord por fases (1–6) con estado actual |
| `NOTIFICACIONES.md` | Auditoría de todas las notificaciones automáticas de Discord (canales, colores, disparadores) |
| `USERS/TEACHER.md` | Auditoría UX del Portal de Maestros — incidencias resueltas y deuda técnica |
| `USERS/STUDENT.md` | Auditoría UX del estudiante — pendiente de completar |

## Fases y Módulos del Sistema

### 1. Landing Page (Completada 🚀)
- **Tema Visual:** Estética "Forest" / "English Peak", inmersiva, con paleta de tonos bosque y noche.
- **Hero Section:** Paisaje generado completamente con CSS con múltiples capas de montañas y árboles asimétricos. CTAs principales: "¡Módulo 1 GRATIS!" y "Explorar plataforma".
- **Sección Maestros:** Invitación directa y concisa: "¿Eres maestro de inglés? Trabaja con nosotros".

### 2. Autenticación, Roles y Onboarding (Completada 🚀)
- [x] Integración real del flujo de Google Sign-In mediante el SDK de Firebase.
- [x] Arquitectura de Header Modular Inteligente (Inyectado en DOM según estado de sesión).
- [x] Creación de perfiles en Firestore con arquitectura de "Rol Base" (Todos son estudiantes por defecto).
- [x] Vista de Perfil con opción "Convertirme en Maestro".
- [x] Auto-sanación silenciosa de registros incompletos en Firestore.
- [x] Notificación a Discord al registrarse un nuevo usuario (con detección de referidos).

### 3. Experiencia del Alumno (The Forest)
- **Validación Estricta:** El alumno no avanza si no lo pronuncia correctamente (usando Web Speech API local).
- **Moon como Coach:** Uso de mensajes de aliento y prompts estandarizados mediante `globals.json` + mensajes locales en cada módulo. Moon usa **TTS (SpeechSynthesis)** con voz femenina aguda y **STT (SpeechRecognition)** para validar pronunciación. No hay LLM — las respuestas son pregrabadas/definidas en JSON.
- **Lore y Estética:** El alumno es un viajero adentrándose en el inmenso Moonsforest. Para avanzar, debe aprender a comunicarse con el ecosistema.
- **Selección de Personaje:** Al registrarse, el alumno escoge un avatar que es un **animalito del bosque**.
- **Moon (Compañera de IA):** Asistente virtual educativo (una osita sabia).
  - **Interacción:** Web Speech API para TTS y STT en navegador gratuito — sin costos de API.
  - **Respuestas:** Mensajes predefinidos en `globals.json` y archivos de módulo (`m1.json`, `m2.json`). Gemini 1.5 Flash está en `/.env.example` como intención futura.
- **Flujo de Aprendizaje y Módulos:**
  - **Macro-Mapa (El Bosque):** Diseño con scroll horizontal (tipo carrusel fluido) mostrando los módulos disponibles. El Módulo 1 está abierto por defecto.
  - **Currículo:** 10 módulos definidos en `KNOWLEDGE.md`. **Completados con datos JSON:** Módulo 1 (`public/data/m1.json`, 861 líneas, 20 lecciones) y Módulo 2 (`m2.json`). Módulos 3–10 pendientes de crear.
  - **Micro-Mapa (Las Lecciones):** Al entrar a un módulo, se muestran las lecciones en un camino interno. **Desbloqueo estricto y lineal impulsado por Firestore.** Se guarda `completedLessons` (ej., `m1l1` desbloquea `m1l2`) y se registran `minutesSpokenToday`.
  - **Fast-Track / Evaluación:** Botón "Evalúate ($60)" en el Header. Lleva a `evaluacion.html` — marketplace donde el alumno agenda con un maestro real.
  - **Estructura de Lecciones (20 por módulo):** Vocabulario → Expansores → Drag & Drop → Diálogos Dirigidos → Jefe Final (simulación de conversación).
  - **Arquitectura de Lecciones (Modular):** `moduleEngine.js` (~2100 líneas) con 11 tipos de actividad: `listen_click`, `echo_chamber`, `picture_it`, `drag_and_drop`, `matching`, `fill_in_blank`, `speed_speak`, `memory_flip`, `story_moment`, `interstitial_moon`, `boss_battle`.
  - **Sistema de Recursos Globales:** `globals.json` centraliza prompts y mensajes de éxito.
  - **Alias de Pronunciación:** `patchAliases.js` inyecta aliases fonéticos (ej. "ur" → "you are") en los pasos `echo_chamber` de los JSON.
  - **Suscripción Premium:** Planificado a **$300 MXN mensuales** — pendiente de integración de pagos.

### 4. Portal del Maestro (MVP Completado 🚀)
- [x] **Perfil Profesional Público:** Biografía y Video de presentación opcional (YouTube).
- [x] **Información Operativa:** Enlace fijo para videollamadas.
- [x] **Información Administrativa (Privada):** WhatsApp, CV y datos bancarios.
- [x] **Agenda y Evaluaciones:** Generación múltiple de slots de 20 min con botones "Todo Mañana", "Todo Tarde", "Limpiar".
- [x] **Centro de Evaluación:** Rúbrica con radio-botones 1–5, guías que leen JSON de módulos en tiempo real, historial de clases.
- [x] **Misiones de Rescate (Suplentes):** Si otro maestro no toma el slot, se libera y se devuelve el crédito al alumno automáticamente.
- [x] **Notificaciones Discord:** Evaluaciones nuevas, cancelaciones, horarios especiales, rescates, resultados.

### 5. Panel de Administración (V1.1 Completado 🚀)
- [x] **Dashboard:** KPIs en tiempo real (Ingresos, Estudiantes, Minutos Hablados, Evaluaciones).
- [x] **Analíticas PRO:** LTV Promedio y Churn Rate simplificado.
- [x] **Top Referidores:** Ranking de embajadores.
- [x] **Heatmap de Frustración:** Lecciones con más fallos.
- [x] **Impersonate:** Visualizar plataforma como un alumno específico.
- [x] **Gestión de Alumnos:** Buscador, progreso (módulo/lección), estado de suscripción.
- [x] **Gestión de Maestros:** Slots, referidos, ganancias estimadas.
- [x] **Finanzas V1:** Reporte de nómina con umbral de $300 y comisión Moonsforest.
- [x] **Notificaciones Discord:** Envío manual de pagos desde el panel.

**Pendiente (Fase 2):** CMS editor de lecciones, ratings de maestros, gamificación (censo de animales, leaderboard), comprobantes de pago.

### 6. Sistema de Notificaciones (Completado 🚀)
- **Webhooks:** 4 canales configurados — Admin, Maestros, Test, Errores.
- **Bot DM:** Envío de mensajes directos a maestros vía Discord API v10 usando `discordId` en su perfil de Firestore.
- **Eventos Notificados:**
  | Disparador | Canal |
  |---|---|
  | Nueva reserva de evaluación | Maestros |
  | Cancelación de evaluación | Maestros |
  | Solicitud de horario especial | Maestros |
  | Apertura de horario solicitado | Maestros |
  | Misión de Rescate (suplente) | Maestros |
  | Resultado de evaluación (aprobado/reprobado) | Admin |
  | Nuevo registro de usuario | Admin |
  | Solicitud de certificación de maestro | Admin |
- **Recordatorios Automáticos:** Netlify Scheduled Function cada 10 min — envía DM al maestro 15 min antes de su clase.

### 7. Economía, Pagos y Referidos
- **Alumnos:**
  - Suscripción Mensual: ~~$300 MXN~~ ⏳ Pendiente de integración de pagos.
  - Programa de Referidos: Descuento de $50 MXN por amigo activo (lógica en Firestore implementada).
  - Evaluaciones uno a uno: $60 MXN — sistema de crédito manual (sin pasarela de pago real).
- **Maestros:**
  - Ganancias Residuales: $50 MXN mensuales por alumno referido.
  - Pagos de sesiones de evaluación (procesados manualmente desde Admin Panel).
  - Cortes semanales (Lunes), umbral de $300.
- **Estado:** ⚠️ **Mercado Pago no está integrado.** No hay `checkout.js`, webhooks de MP, ni lógica de suscripciones. La economía opera con crédito interno y pagos manuales.

### 8. Corrección de Errores (Global)
- [x] `errorTracker.js` — Monitor global de errores JS no capturados con notificación a Discord vía webhook de errores.

## Definiciones Finales y Acuerdos
- [x] Detalle de recompensas por referidos estructurado.
- [x] Modelo de pago a maestros definido: Semanal (Lunes), umbral de $300.
- [x] Estrategia de voz decidida: Web Speech API (TTS + STT) en el cliente. Gemini 1.5 Flash en lista de deseos.
- [x] Estilo Visual y UI: Migración a "English Peak" con montañas CSS inmersivas, bosque asimétrico y tipografía moderna.
- [x] Infraestructura Base: Repositorio configurado, Firebase configurado (lado cliente), Netlify CLI funcionando.
- [x] Sistema de notificaciones Discord: Webhooks + Bot DM + Scheduled reminders implementados.
- [x] Panel Administrativo: V1.1 operativo con KPIs, gestión de usuarios y finanzas.
- [x] Currículo: 10 módulos definidos en `KNOWLEDGE.md`; datos JSON completos para Módulos 1 y 2.
