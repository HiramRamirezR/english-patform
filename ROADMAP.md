# 🗺️ Moonsforest — Roadmap de 4 Semanas a $20K/mes

## Modelo de Negocio
- **$300/mes** por alumno (todo incluido: acceso a módulos + evaluaciones)
- 1 evaluación por semana (máximo 4 al mes)
- Evaluación asíncrona: conversación grabada con Moon → revisión del maestro → feedback
- Meta: ~67 alumnos suscriptos = $20,100/mes

---

## Semana 1 — Infraestructura de Ingresos (Completada ✅)

### Placement Test Progresivo ✅
- [x] Preguntas por niveles progresivos (M1→M5)
- [x] Se detiene al primer error y asigna módulo gratuito
- [x] Guarda `freeModuleId` y `unlockedModules` en Firestore
- **Archivos:** `public/js/mapa.js`

### Gating de Evaluaciones (Premium Required) ✅
- [x] Botón "Solicitar Evaluación" verifica `isPremium`
- [x] Si no es premium → muestra modal de suscripción
- [x] Si es premium → permite solicitar evaluación
- **Archivos:** `public/js/mapa.js`

### Mercado Pago — Suscripción $300/mes ✅
- [x] Netlify Function: crea suscripción vía API de Mercado Pago
- [x] Webhook MP → Firestore: activa `isPremium: true` + `premiumUntil`
- [x] Frontend: modal de suscripción conectado a MP Checkout
- [x] Manejo de retorno (success/failure)
- **Archivos:** `functions/mercadopago.js`, `public/js/payment.js`, `.env.example`

### Free Pass en Admin Panel ✅
- [x] Botón "🎁 Free Pass" en tabla de alumnos (Admin)
- [x] Otorga `isPremium: true` por 1 mes a beta testers
- [x] Columna de estado visual (⭐ Premium / Gratis)
- **Archivos:** `public/js/admin.js`, `public/admin.html`

### Oculta Portal de Maestros ✅
- [x] Link a teacher.html visible solo para admin
- [x] Ruta directa sigue funcionando para el dueño
- **Archivos:** `public/js/components/header.js`

---

## Semana 2 — Evaluación Automática + Contenido (Siguiente)

### Sistema de Evaluación Conversacional ✅
- [x] Preview del script (EN + ES lado a lado) para estudiar
- [x] Round 1: Moon habla rol A → alumno responde rol B → se graba audio
- [x] Round 2: Cambian roles → alumno lee A → Moon responde B
- [x] Subida de audio a Firebase Storage (MediaRecorder API)
- [x] Creación de documento en colección `evaluations` en Firestore
- [x] Notificación a Discord con enlace de audio
- [x] Botón de evaluación en pantalla de finalización de lección (l20)
- [x] Gate: solo usuarios premium pueden evaluarse
- **Archivos:** `public/js/moduleEngine.js`, `public/js/lessonLoader.js`, `public/data/m1.json`

### Panel de Revisión en Admin ✅
- [x] Pestaña "Evaluaciones" en admin.html
- [x] Lista de evaluaciones pendientes (alumno, módulo, fecha, estado)
- [x] Reproductor de audio + transcripción visible
- [x] Botones: ✅ Aprobar (desbloquea siguiente módulo) / ❌ Rechazar (con comentario)
- [x] Al aprobar: agrega el siguiente módulo a `unlockedModules` del alumno
- [x] Firestore rules actualizadas para permitir creación de evaluaciones
- **Archivos:** `public/admin.html`, `public/js/admin.js`, `firestore.rules`

### Contenido: Módulo 3 ✅
- [x] Datos del Módulo 3 (La Cabaña — he/she, possessives, 20 lecciones)
- [x] Vocabulario: mother, father, brother, sister, friend, baby, family, my, your, his, her
- [x] Adjetivos: tall, short, young, old, kind, funny, strong
- [x] Evaluación conversacional M3 (14 líneas: presentar la familia)
- [x] Entradas agregadas a `dictionary.json`
- **Archivos:** `public/data/m3.json`, `public/data/dictionary.json`

---

## Semana 3 — Contenido + Beta Testers

### Contenido: Módulo 4 ✅
- [x] Datos del Módulo 4 (El Mercado — like/don't like)
- [x] Conversaciones de evaluación para M4
- **Archivos:** `public/data/m4.json`, `public/data/dictionary.json`

### Flujo de Resultados para el Alumno ✅
- [x] Vista de resultados de evaluación en el mapa/perfil (tarjeta con historial)
- [x] Notificación visual (SweetAlert) cuando el feedback está listo
- [x] Desbloqueo automático del siguiente módulo al aprobar (refresca perfil)
- **Archivos:** `public/js/mapa.js`

### Onboarding de Beta Testers (8 alumnos)
- [ ] Dar free pass desde Admin a los 8 beta testers
- [ ] Probar flujo completo: estudiar → pedir evaluación → grabación → notificación → revisión → feedback → desbloqueo
- [ ] Corregir bugs de uso real
- [ ] Ajustar copy y mensajes de Moon según feedback

---

## Semana 4 — Rampa a $20K

### Contenido: Módulo 5 ✅
- [x] Datos del Módulo 5 (En Movimiento — present continuous)
- [x] Conversaciones de evaluación para M5
- **Archivos:** `public/data/m5.json`, `public/data/dictionary.json`

### Marketing y Crecimiento
- [x] Sistema de referidos funcional (código ya existe en auth.js, profile.js, admin.js, teacher.js)
- [x] Landing page limpia sin CTAs de reclutamiento de maestros
- [ ] Publicación orgánica en redes sociales
- [ ] Campaña de WhatsApp a contactos
- [ ] Flyer digital

### Optimización y Cierre
- [x] Métricas en Admin Panel (Overview: KPIs, top referrers, desglose minutos; Finanzas: pagos maestros)
- [x] Sección de reclutamiento de maestros eliminada del perfil de alumno
- [ ] Ajuste de precio si es necesario
- [ ] Preparar materiales para escalar a más alumnos

---

## Definiciones del Producto

### Flujo del Alumno
```
1. Landing → Registro (Google Auth)
2. Placement Test Progresivo → Asignación de módulo gratuito
3. Estudio del módulo gratis (sin límite de tiempo)
4. Solicitud de Evaluación (requiere $300/mes)
5. Conversación grabada con Moon (roleplay)
6. Revisión asíncrona por el maestro
7. Feedback + Desbloqueo del siguiente módulo
8. Repetir (hasta 4 módulos por mes)
```

### Stack Tecnológico
| Componente | Tecnología |
|------------|------------|
| Frontend | HTML5, CSS3 (Vanilla), JavaScript ES6+ |
| Backend | Netlify Functions (Node.js) |
| Base de Datos | Firebase Firestore |
| Auth | Firebase Auth (Google Sign-In) |
| Pagos | Mercado Pago API (Checkout Pro) |
| Voz | Web Speech API (TTS + STT) — sin costo |
| Almacenamiento | Firebase Storage (audios de evaluación) |
| Notificaciones | Discord Webhooks + Bot DM |
| Recordatorios | Netlify Scheduled Function (cron) |

---

## Auditoría Completa — Mejoras Priorizadas (Post-Semana 4)

### 🔴 Críticas (Seguridad/Infraestructura) ✅ Implementado

#### Validación Premium Server-Side ✅
- **Problema:** La verificación `isPremium` al crear evaluación es solo cliente (`moduleEngine.js:970`). Un usuario malicioso puede modificar `localStorage` o interceptar.
- **Solución:** Nueva endpoint `/validate-premium` en `functions/mercadopago.js` que valida `premiumUntil` en Firestore.
- **Archivos:** `functions/mercadopago.js`

#### Verificación Firma Webhook MP ✅
- **Problema:** `functions/mercadopago.js` acepta POST sin verificar firma HMAC-SHA256. Cualquiera que descubra la URL puede activar `isPremium: true`.
- **Solución:** Validación HMAC-SHA256 del header `X-Signature` usando `MERCADO_PAGO_WEBHOOK_SECRET`.

#### Discord Function Sin Auth ✅
- **Problema:** `functions/discord.js` es invocable por cualquiera en `/api/discord`.
- **Solución:** Validación de header `x-auth-secret` contra `DISCORD_FUNCTION_SECRET`. Frontend envía el secret desde localStorage.

#### Rate Limiting en Evaluaciones ✅
- **Problema:** No hay límite de frecuencia en frontend para `requestEvaluation`. Un niño puede spamear.
- **Solución:** Throttle client-side en `moduleEngine.js:startEvaluationFlow` — máximo 1 evaluación cada 5 minutos. Guarda timestamp en localStorage.

#### `await` Sin try-catch ✅
- **Problema:** Varios módulos tienen `await` sin manejo de errores. Fallos silenciosos.
- **Solución:** Envueltos en try-catch: `getEffectiveUser` (`auth.js`), `triggerPlacementTestPrompt`/`startPlacementTest` (`mapa.js`), `getUserMedia` en evaluación (`moduleEngine.js`).

---

### 🟠 Alta Prioridad (Experiencia de Uso) ✅ Implementado

#### Audio Feedback en Interacciones ✅
- **Problema:** Sin sonidos de éxito/error/fin de lección. Todo es visual.
- **Solución:** Ya existía `playSound()` con Web Audio API. Se expandió su uso en timeout/error handlers.

#### Skeleton Loaders ✅
- **Problema:** Todas las páginas muestran blank screen mientras cargan datos de Firestore.
- **Solución:** Placeholders animados (CSS `shimmer`) en `mapa.html` y `module.html`. Se ocultan cuando JS carga los datos.

#### Confirmación de Salida de Lección ✅
- **Problema:** Si el niño cierra la pestaña o navega atrás, pierde progreso de la lección actual.
- **Solución:** `beforeunload` event en `lessonLoader.js` + confirm dialog en botón "Back". Se limpia al completar lección.

#### Indicador Visual de "Grabando..." ✅
- **Problema:** Mientras el SpeechRecognizer escucha, no hay indicador visual.
- **Solución:** LED pulsante rojo + texto "Grabando..." con animación CSS `recPulse`. Se muestra/oculta en `echo_chamber`.

#### Retry Mechanism en Subida de Audio ✅
- **Problema:** Si `uploadBytes` falla (red, timeout), el usuario pierde la grabación y empieza de nuevo.
- **Solución:** Loop de 3 intentos con backoff exponencial (2s, 4s) en `uploadEvaluation`. Si falla, limpia el rate limit para reintentar.

#### Reproductor de Audio en Vista Alumno ✅
- **Problema:** El alumno no puede escuchar su propia grabación después de la evaluación.
- **Solución:** Agregado `<audio controls>` con estilo hover-expand en la tarjeta de historial de evaluaciones en `mapa.js`.

#### Feedback Sonoro y Visual en Timeout de Speech ✅
- **Problema:** Si el recognizer termina por timeout, no hay diferencia visual entre "no detectó voz" y "respondiste mal".
- **Solución:** Mensajes específicos en `echo_chamber`: "😕 No te escuché. ¿Hablaste más fuerte?" con Moon confundida. Además detecta `not-allowed`/`permission-denied` para guiar al usuario sobre el permiso de micrófono.

---

### 🟡 Media Prioridad (Reconocimiento de Voz)

#### `verifySpeechSupport()` y Fallback
- **Problema:** `window.SpeechRecognition` se usa sin verificar. En Firefox/Safari falla silenciosamente.
- **Solución:** Detectar soporte al cargar `moduleEngine.js`. Si no hay, mostrar mensaje amigable: "Tu navegador no soporta hablar con Moon. Usa Chrome en tu computadora."

#### Feedback en Vivo con `interimResults`
- **Problema:** `continuous: false, interimResults: false` → sin feedback hasta que el niño termina de hablar.
- **Solución:** Activar `interimResults: true` y mostrar texto parcial en pantalla mientras habla.

#### Contador de Tiempo Restante
- **Problema:** `echo_chamber` tiene timeout dinámico (2s + 700ms/palabra) pero el niño no sabe cuánto tiempo le queda.
- **Solución:** Barra de progreso circular que se vacía en el tiempo asignado.

#### Visualización de Nivel de Audio Real
- **Problema:** El termómetro de pronunciación es una animación CSS que no se correlaciona con el audio real. No responde al volumen de la voz.
- **Solución:** Usar `AnalyserNode` de Web Audio API para medir volumen en tiempo real. Mostrar barras que se mueven con la voz.

#### MinutesSpoken Persistente Cross-Page
- **Problema:** `minutesSpoken` se actualiza en `lessonLoader.js` al completar lección, pero no persiste si el usuario sale sin terminar.
- **Solución:** Guardar en Firestore cada 30 segundos durante la lección vía `setInterval`.

#### Variedad de Ejercicios Conversacionales
- **Problema:** Solo 3 tipos de step (`listen_click`, `echo_chamber`, `boss_battle`). Ninguno es conversación libre con Moon.
- **Solución:** Nuevos tipos de step:
  - `moon_asks`: Moon hace una pregunta → alumno responde hablando → Moon reacciona
  - `fill_dialogue`: Alumno completa frase faltante en un mini-diálogo oralmente
  - `describe_image`: Moon muestra emoji/escena → alumno describe oralmente

#### Soporte Multidialecto (en-GB, etc.)
- **Problema:** `lang: 'en-US'` fijo. Sin opción para inglés británico.
- **Solución:** Detectar preferencia del alumno o permitir elegir entre en-US/en-GB.

---

### 🟡 Media Prioridad (Evaluaciones)

#### Vista de Transcripción para el Alumno
- **Problema:** Solo el admin ve la transcripción en el panel de revisión. El alumno nunca sabe qué dijo textualmente.
- **Solución:** Mostrar transcripción (si existe) en la tarjeta de historial de evaluaciones.

#### Refresco Automático de Perfil al Aprobar
- **Problema:** Cuando admin aprueba, el perrito del alumno no se refresca automáticamente. Debe recargar la página.
- **Solución:** Agregar listener en tiempo real (`onSnapshot`) al documento del usuario en `mapa.js`.

#### Preview del Script Durante la Grabación
- **Problema:** El script se muestra en modal SweetAlert antes de grabar, pero desaparece al empezar a hablar.
- **Solución:** Mostrar el script en un panel lateral o superior durante la grabación para que el niño pueda consultarlo.

#### Reintento de Evaluación Fallida
- **Problema:** `requestedEvaluations` usa `weekKey`. Si falla la subida de audio, no se puede reintentar en la misma semana.
- **Solución:** Si falla, eliminar el weekKey y permitir reintentar.

#### Verificación de Permiso de Micrófono Antes de Empezar
- **Problema:** No hay try-catch en `getUserMedia`. Si el niño deniega micrófono, la evaluación se cae sin mensaje claro.
- **Solución:** Verificar permiso antes de empezar el roleplay. Si denegado, mostrar tutorial de cómo habilitar micrófono en Chrome.

---

### 🟡 Media Prioridad (Gamificación y Retención)

#### Arreglar Recordatorios Diarios
- **Problema:** `functions/reminders.js` tiene error de referencia: `admin.credential.cert` debería ser `admin.credential.certificate`.
- **Solución:** Corregir la función y verificar deploy.

#### Sistema de Logros / Insignias
- **Problema:** Las estrellas son el único feedback. No hay badges por hitos (primer módulo, 100% en evaluación, 5 lecciones seguidas).
- **Solución:** Colección `achievements` en Firestore. Mostrar en perfil con emojis y animación al obtenerlos.

#### Personalización de Mascota Moon
- **Problema:** Moon solo dice frases aleatorias al hacer clic. No hay personalización (nombre, nivel de amistad, accesorios).
- **Solución:** 
  - El alumno puede nombrar a Moon
  - Barra de "amistad" que sube con cada lección completada
  - Moon evoluciona visualmente al subir de nivel (más grande, con accesorios)

#### Onboarding Interactivo
- **Problema:** No hay tutorial guiado. El niño elige avatar y cae directo al mapa sin explicación.
- **Solución:** Tour de 3 pasos al primer ingreso: "Este es tu mapa → Aquí estudias → Aquí te evalúan".

#### Historial de Palabras Dominadas
- **Problema:** No hay vista de progreso por vocabulario. El niño no sabe qué palabras ha aprendido vs. cuáles le faltan.
- **Solución:** Página "Mis Palabras" que muestra dictionary entries con estado: ✅ dominada, 🔄 en progreso, ⏳ pendiente.

#### Animaciones de Celebración
- **Problema:** Completar módulo solo muestra un texto. No hay celebración visual.
- **Solución:** Confeti CSS + Moon saltando + sonido de logro al completar un módulo.

#### Scoreboard / Ranking
- **Problema:** No hay forma de ver progreso comparado con otros alumnos (motivación social).
- **Solución:** Tabla de posiciones semanal por minutos de práctica (solo para alumnos premium).

---

### 🔵 Baja Prioridad (Técnico/Calidad)

#### Service Worker y Soporte Offline
- **Problema:** Sin PWA. Sin acceso a lecciones sin internet.
- **Solución:** Cachear JSON de módulos y dictionary con service worker. Mostrar mensaje "Sin conexión" con datos cacheados.

#### Pruebas Automatizadas
- **Problema:** Cero tests en todo el proyecto.
- **Solución:** Jest + Puppeteer para tests end-to-end del flujo crítico: registro → placement test → estudiar → evaluación.

#### Limpiar console.logs de Producción
- **Problema:** Múltiples `console.log`, `console.warn` en `moduleEngine.js`, `mapa.js`, `admin.js` que exponen datos internos.
- **Solución:** Reemplazar por `ErrorTracker.log()` condicional según entorno.

#### ErrorTracker en index.html
- **Problema:** `errorTracker.js` cubre 6/7 páginas. Falta `index.html`.
- **Solución:** Agregar `<script src="js/errorTracker.js"></script>` en index.html.

#### Modales Infantiles (SweetAlert)
- **Problema:** Los modales usan texto denso sin emojis ni diseño lúdico. No son atractivos para niños.
- **Solución:** Custom CSS para SweetAlert con tema bosque, emojis grandes, botones redondeados y coloridos.

#### Mejora Accesibilidad (Alt Text)
- **Problema:** Iconos e imágenes sin `alt` text. Lector de pantalla no describe nada.
- **Solución:** Agregar `alt` descriptivo a todos los `<img>` y `aria-label` a botones icono.

---

### 📦 Contenido y Currículo

#### Evaluación para Módulo 2
- **Problema:** M2 (El Bosque) no tiene evaluación. Los alumnos no pueden obtener feedback del maestro en M2.
- **Solución:** Crear script de conversación para M2.

#### Alineación Placement Test con M4/M5
- **Problema:** Las preguntas del placement test para M4/M5 evalúan gramática B1 general, no el contenido específico del módulo (like/don't like, present continuous).
- **Solución:** Actualizar preguntas para alinearlas con el vocabulario y estructuras de cada módulo.

#### Modo Repaso
- **Problema:** No hay forma de repasar lecciones completadas.
- **Solución:** Botón "Repasar" en módulos completados que muestra las lecciones en modo lectura (sin grabación).

#### Más Pasos por Lección
- **Problema:** Las lecciones tienen ~4 pasos. Se sienten cortas. El niño las completa en 2-3 minutos.
- **Solución:** Agregar 2 pasos adicionales por lección: uno de práctica escrita (drag-drop de palabras) y uno de speaking libre guiado.

---

### Documentación del Proyecto
| Archivo | Propósito |
|---------|-----------|
| `PROYECTO.md` | Visión general del proyecto |
| `ROADMAP.md` | Plan de 4 semanas a $20K/mes (este archivo) |
| `KNOWLEDGE.md` | Currículo completo (10 módulos) |
| `ADMIN_PANEL.md` | Hoja de ruta del Admin Panel |
| `DISCORD_BOT.md` | Plan del bot de Discord |
| `NOTIFICACIONES.md` | Auditoría de notificaciones |
| `USERS/TEACHER.md` | Auditoría UX del portal de maestros |
| `USERS/STUDENT.md` | Auditoría UX del estudiante |
