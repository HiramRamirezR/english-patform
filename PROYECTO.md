# Proyecto: English Peak 🏔️ (Antes English Forest)

## Visión General
Plataforma de aprendizaje de inglés en línea, interactiva y gamificada con una estética de montaña (minimalista, en tonos fríos/azules, generada con CSS puro). Los alumnos exploran paisajes, completan módulos interactivos guiados por "Moon" (una IA personal) y los maestros pueden monetizar evaluando a los alumnos.

## Stack Tecnológico
- **Frontend:** HTML5, CSS3 (Vanilla), JavaScript (ES6+). Diseño 100% responsivo y dependiente de CSS para gráficos complejos (ej. montañas y pinos asimétricos).
- **Recursos Multimedia:** Cloudinary para almacenamiento y distribución de imágenes de los módulos de aprendizaje para evitar peso en el repositorio.
- **Backend/Hosting:** Entorno local con `netlify dev` y despliegue en Netlify (Hosting + Netlify Functions para lógica de servidor y APIs).
- **Base de Datos & Auth:** Firebase (Firestore para base de datos + Google Auth para inicio de sesión).
- **Pagos:** Integración con Mercado Pago API (suscripciones mensuales y pagos únicos por evaluaciones).
- **IA:** Integración con LLMs (ej. Gemini/OpenAI) gestionada a través de Netlify Functions.

## Fases y Módulos del Sistema

### 1. Landing Page (Completada 🚀)
- **Tema Visual:** Estética "Mountain", minimalista, utilizando una paleta de colores azul (`#eff6ff`, `#dbeafe`, `#bfdbfe`, `#93c5fd`, `#60a5fa`, `#3b82f6`, `#334155`).
- **Hero Section:** Paisaje inmersivo generado completamente con `clip-path` y `position` en CSS, con múltiples capas de montañas y un denso bosque de pinos escalados y desalineados aleatoriamente. CTAs principales: "¡Módulo 1 GRATIS!" y "Explorar plataforma".
- **Sección Maestros:** Invitación directa y concisa: "¿Eres maestro de inglés? Trabaja con nosotros". (Los detalles de compensación se reservan para el portal interno).

### 2. Autenticación y Onboarding (Próximos Pasos)
- Integración real del flujo de Google Sign-In mediante el SDK de Firebase.
- Creación de perfiles en Firestore (roles: `student` o `teacher`).

### 3. Experiencia del Alumno (The Peak / The Forest)
- **Moon (IA Companion):** Asistente virtual educativo.
  - **Interacción:** Web Speech API para TTS (Text-to-Speech) y STT (Speech-to-Text) gratuito en navegador, optimizando el costo.
  - **Respuestas:** Generación dinámica con Gemini 1.5 Flash (por velocidad y costo), utilizando prompts contextuales guardados en Firestore.
- **Dashboard de Aprendizaje:**
  - Mapa de progreso visualizando los 20 módulos disponibles.
  - El primer módulo es de acceso libre.
  - Ejercicios interactivos (Drag & Drop, pronunciación, tests).

### 4. Portal del Maestro
- **Perfil Profesional:** Biografía, fotografía y enlace personal para videollamadas (Zoom/Meet).
- **Agenda y Evaluaciones:** Gestión de disponibilidad en slots de 20 minutos para sesiones 1 a 1 de evaluación pagada.

### 5. Economía, Pagos y Referidos
- **Alumnos:**
  - Suscripción Mensual: $300 MXN (Acceso completo a la plataforma y conversación con IA).
  - Programa de Referidos: Descuento de $50 MXN por amigo activo. El alumno tiene un tope mínimo a pagar de $100 MXN mensuales (hasta 4 referidos efectivos).
  - Evaluaciones uno a uno: Sesiones de 20 min con un maestro por $60 MXN (pago único).
- **Maestros:**
  - Ganancias Residuales: $50 MXN mensuales de forma pasiva por cada alumno referido que mantenga su suscripción activa.
  - Pagos de sesiones de evaluación.
  - Sistema de cobro: Cortes semanales (Lunes) con un umbral mínimo de retiro de $300 MXN.

## Definiciones Finales y Acuerdos
- [x] Detalle de recompensas por referidos estructurado.
- [x] Modelo de pago a maestros definido: Semanal (Lunes), umbral de $300.
- [x] Estrategia de IA y voz decidida: Gemini 1.5 Flash + Web Speech API en el cliente.
- [x] Estilo Visual y UI: Migración completa de "Bosque" a "English Peak" con montañas CSS inmersivas, bosque asimétrico y tipografía moderna.
- [x] Infraestructura Base: Repositorio configurado, Firebase configurado (lado cliente), Netlify CLI funcionando para funciones locales.
