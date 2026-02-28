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

### 2. Autenticación, Roles y Onboarding (Completada 🚀)
- [x] Integración real del flujo de Google Sign-In mediante el SDK de Firebase.
- [x] Arquitectura de Header Modular Inteligente (Inyectado en DOM según estado de sesión).
- [x] Creación de perfiles en Firestore con arquitectura de "Rol Base" (Todos son estudiantes por defecto).
- [x] Vista de Perfil con opción "Convertirme en Maestro" (Perfiles Duales activables interactivamente).

### 3. Experiencia del Alumno (The Peak / The Forest)
- **Lore y Estética (Influencia Virgilio-Dante):** El alumno es un viajero (Dante) escalando "English Peak". Para subir de altitud, debe aprender a comunicarse con los habitantes del ecosistema probando su dominio del nivel. 
- **Selección de Personaje:** Al registrarse o iniciar, el alumno escoge un avatar que es un **animalito del bosque**.
- **Moon (IA Companion):** Asistente virtual educativo interactivo (una osita sabia). Actúa como la guía de la montaña (Virgilio). Moon habla directamente con el animalito del alumno.
  - **Interacción:** Web Speech API para TTS y STT en navegador gratuito.
  - **Respuestas:** Gemini 1.5 Flash usando prompts contextuales en Firestore.
- **Flujo de Aprendizaje y Módulos:**
  - **Inicio Directo:** Todos aterrizan en el Mapa de Módulos (empiezan en el Módulo 1 que es gratuito).
  - **Fast-Track (Evaluación Inicial Opcional):** Si el alumno siente que el Módulo 1 es muy básico, puede pagar **$60 MXN** para una evaluación con un Maestro. El maestro decide en qué Módulo colocarlo. Esto le desbloquea su nuevo nivel de inmediato para "probarlo".
  - **Estructura de Lecciones:** Actividades de micro-learning con vocabulario interactivo, estructuras guiadas, lecturas, Drag & Drop y, sobre todo, **mucha práctica conversacional oral guiada por Moon**.
  - **Suscripción Premium:** Para avanzar tan rápido como deseen a través de todos los módulos del mapa, los alumnos deben tener su pago activo de **$300 MXN mensuales**.
  - **Aprobación Obligatoria (El Boss Fight):** Para que un alumno demuestre que realmente conquistó el módulo y avance formalmente al siguiente, **debe solicitar, pagar o usar sus créditos y aprobar una evaluación con un maestro humano real**.

### 4. Portal del Maestro (MVP Completado 🚀)
- [x] **Perfil Profesional Público:** Biografía y Video de presentación opcional (YouTube).
- [x] **Información Operativa:** Enlace fijo para videollamadas (Zoom/Meet).
- [x] **Información Administrativa (Privada):** WhatsApp de contacto, enlace a CV (Google Drive) y datos bancarios (CLABE, Banco) para pagos.
- [x] **Agenda y Evaluaciones:** Generación múltiple de disponibilidad de slots de 20 minutos con validación de solapamiento en Firestore. Dashboard privado con control de citas.

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
