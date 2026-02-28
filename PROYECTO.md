# Proyecto: Moonsforest 🌲

## Visión General
Plataforma de aprendizaje de inglés en línea, interactiva y gamificada con una estética de bosque misterioso y encantador. La premisa principal es clara: **A Moonsforest se viene a hablar, no solo a hacer clics.** Los alumnos exploran el bosque y completan módulos guiados por "Moon" (una osita sabia de IA). Para avanzar, las evaluaciones se realizan con maestros reales que evalúan la capacidad de construir conversaciones en vivo con el vocabulario de la lección.

## Stack Tecnológico
- **Frontend:** HTML5, CSS3 (Vanilla), JavaScript (ES6+). Diseño 100% responsivo y dependiente de CSS para gráficos complejos (ej. montañas lejanas y pinos asimétricos).
- **Recursos Multimedia:** Cloudinary para almacenamiento y distribución de imágenes de los módulos de aprendizaje.
- **Backend/Hosting:** Entorno local con `netlify dev` y despliegue en Netlify (Hosting + Netlify Functions para lógica de servidor y APIs).
- **Base de Datos & Auth:** Firebase (Firestore para base de datos + Google Auth para inicio de sesión).
- **Pagos:** Integración con Mercado Pago API (suscripciones mensuales y pagos únicos por evaluaciones).
- **IA:** Integración con LLMs (ej. Gemini/OpenAI) gestionada a través de Netlify Functions.

## Fases y Módulos del Sistema

### 1. Landing Page (Completada 🚀)
- **Tema Visual:** Estética "Forest", inmersiva, utilizando una paleta de tonos bosque y noche.
- **Hero Section:** Paisaje generado completamente con CSS con múltiples capas de árboles y un denso bosque. CTAs principales: "¡Módulo 1 GRATIS!" y "Explorar plataforma".
- **Sección Maestros:** Invitación directa y concisa: "¿Eres maestro de inglés? Trabaja con nosotros".

### 2. Autenticación, Roles y Onboarding (Completada 🚀)
- [x] Integración real del flujo de Google Sign-In mediante el SDK de Firebase.
- [x] Arquitectura de Header Modular Inteligente (Inyectado en DOM según estado de sesión).
- [x] Creación de perfiles en Firestore con arquitectura de "Rol Base" (Todos son estudiantes por defecto).
- [x] Vista de Perfil con opción "Convertirme en Maestro".

### 3. Experiencia del Alumno (The Forest)
- **Lore y Estética:** El alumno es un viajero (Dante) adentrándose en el inmenso "Moonsforest". Para avanzar más profundo en el bosque, debe aprender a comunicarse con el ecosistema probando su dominio del nivel. 
- **Selección de Personaje:** Al registrarse, el alumno escoge un avatar que es un **animalito del bosque**.
- **Moon (IA Companion):** Asistente virtual educativo (una osita sabia). Actúa como la guía del bosque (Virgilio). Moon habla directamente con el animalito del alumno.
  - **Interacción:** Web Speech API para TTS y STT en navegador gratuito.
  - **Respuestas:** Gemini 1.5 Flash usando prompts contextuales en Firestore.
- **Flujo de Aprendizaje y Módulos:**
  - **Macro-Mapa (El Bosque):** Un diseño con scroll horizontal (tipo carrusel fluido) mostrando 20 módulos. El Módulo 1 está abierto por defecto, revelando el inicio de la inmensidad del bosque.
  - **Micro-Mapa (Las Lecciones):** Al entrar a un módulo, se muestran las lecciones en un camino interno. **Desbloqueo estricto y lineal:** Las lecciones deben ser superadas cronológicamente (aprobando con el motor STT) para desbloquear el acceso a la siguiente.
  - **Fast-Track / Aprobación con el Guardián:** El botón de "Evalúate ($60)" vivirá siempre fijo a la vista en el **Header**. Un alumno puede pulsarlo en cualquier momento para pedir la evaluación humana.
  - **Estructura de Lecciones:** Actividades de micro-learning organizadas en submódulos (vocabulario, estructuras, lecturas, Drag & Drop, y práctica conversacional guiada por Moon).
  - **Arquitectura de Lecciones (Modular):** Las actividades están creadas con componentes frontend reutilizables (Ej. *Listen & Click Box*, *Echo Chamber Mic*, *Drag & Drop Engine*) para escalar a 20+ módulos rápidamente con pura configuración de JSON u objetos JavaScript.
  - **Suscripción Premium:** Para explorar todo el mapa, se requiere un pago de **$300 MXN mensuales**.

### 4. Portal del Maestro (MVP Completado 🚀)
- [x] **Perfil Profesional Público:** Biografía y Video de presentación opcional (YouTube).
- [x] **Información Operativa:** Enlace fijo para videollamadas.
- [x] **Información Administrativa (Privada):** WhatsApp, CV y datos bancarios.
- [x] **Agenda y Evaluaciones:** Generación múltiple de disponibilidad de slots de 20 min.

### 5. Economía, Pagos y Referidos
- **Alumnos:**
  - Suscripción Mensual: $300 MXN.
  - Programa de Referidos: Descuento de $50 MXN por amigo activo.
  - Evaluaciones uno a uno: $60 MXN (pago único).
- **Maestros:**
  - Ganancias Residuales: $50 MXN mensuales por alumno referido.
  - Pagos de sesiones de evaluación.
  - Cortes semanales (Lunes), umbral de $300.

## Definiciones Finales y Acuerdos
- [x] Detalle de recompensas por referidos estructurado.
- [x] Modelo de pago a maestros definido: Semanal (Lunes), umbral de $300.
- [x] Estrategia de IA y voz decidida: Gemini 1.5 Flash + Web Speech API en el cliente.
- [x] Estilo Visual y UI: Migración completa de "Bosque" a "English Peak" con montañas CSS inmersivas, bosque asimétrico y tipografía moderna.
- [x] Infraestructura Base: Repositorio configurado, Firebase configurado (lado cliente), Netlify CLI funcionando para funciones locales.
