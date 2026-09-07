# Proyecto: Moonsforest 🌲

## Visión General
Plataforma de aprendizaje de inglés en línea, interactiva y gamificada con una estética de bosque misterioso y encantador. **A Moonsforest se viene a hablar, no solo a hacer clics.** Los alumnos exploran el bosque y completan módulos guiados por "Moon" (una osita sabia con TTS/STT vía Web Speech API). Para avanzar, las evaluaciones se realizan con maestros reales que evalúan la capacidad de construir conversaciones en vivo con el vocabulario de la lección.

## Stack Tecnológico
| Componente | Tecnología |
|------------|------------|
| Frontend | HTML5, CSS3 (Vanilla), JavaScript ES6+ |
| Backend | Netlify Functions (Node.js) |
| Base de Datos | Firebase Firestore |
| Auth | Firebase Auth (Google Sign-In) |
| Pagos | Mercado Pago API (Checkout Pro) — configurado, pendiente credenciales en Netlify |
| Voz | Web Speech API (TTS + STT) — sin costo |
| Almacenamiento | Firebase Storage (audios de evaluación) |
| Notificaciones | Discord Webhooks + Bot DM |
| Recordatorios | Netlify Scheduled Function (cron) |

## Filosofía de Diseño
- **Menos adornos, más foco:** Interfaz limpia con botones grandes y textos legibles.
- **Micro-pasos:** Aprender (1), Repetir (1), Hablar (1). Aprender (2), Hablar (1+2). Aprender (3), Hablar (1+2+3).
- **Validación Estricta:** El niño no avanza si no lo pronuncia correctamente (Web Speech API).
- **Moon como Coach:** Mensajes predefinidos en `globals.json` — sin LLM, sin APIs externas.

---

## Estructura de Currículo

### Módulos Completados (Datos JSON)
| Módulo | Nombre | Lecciones | Evaluación |
|--------|--------|-----------|------------|
| M1 | Campamento Base | 20 ✅ | ✅ |
| M2 | El Bosque de los Animales | 20 ✅ | ✅ |
| M3 | La Cabaña del Campamento | 20 ✅ | ✅ |
| M4 | El Mercado | 20 ✅ | ✅ |
| M5 | En Movimiento | 20 ✅ | ✅ |
| M6 | La Mochila del Explorador | 20 ✅ | ✅ |
| M7 | Las Estaciones y el Clima | 20 ✅ | ✅ |
| M8 | Los Desafíos del Bosque | 20 ✅ | ✅ |
| M9 | La Búsqueda del Tesoro | 20 ✅ | ✅ |
| M10 | Relatos de la Fogata | 20 ✅ | ✅ |

### Desglose: Módulo 1 (Ejemplo de estructura)
Cada módulo sigue esta progresión de 20 lecciones:
1. **Lecciones 1–4:** Presentación de vocabulario principal
2. **Lección 5:** Mini-Reto intermedio
3. **Lecciones 6–10:** Expansores (adjetivos, colores, emociones)
4. **Lecciones 11–15:** Drag & Drop y traducciones inversas
5. **Lecciones 16–19:** Diálogos dirigidos
6. **Lección 20:** El Jefe Final (Fogata) — simulación sin ayuda

**Gramática Central M1:** I am / You are / My name is...
**Vocabulario M1:** Hello, Goodbye, Morning, Night, Boy, Girl, Happy, Sad, Tired, Ready.

---

## Arquitectura del Sistema

### Experiencia del Alumno (The Forest)
- **Macro-Mapa:** Scroll horizontal mostrando módulos. M1 abierto por defecto.
- **Micro-Mapa:** Lecciones en camino interno. Desbloqueo lineal por Firestore.
- **Evaluación:** Botón "Evalúate ($60)" → `evaluacion.html` → marketplace con maestros reales.
- **Arquitectura de Lecciones:** `moduleEngine.js` con 11 tipos de actividad: `listen_click`, `echo_chamber`, `picture_it`, `drag_and_drop`, `matching`, `fill_in_blank`, `speed_speak`, `memory_flip`, `story_moment`, `interstitial_moon`, `boss_battle`.

### Portal del Maestro ✅
- Perfil profesional público (bio + video YouTube)
- Agenda con slots de 20 min (botones "Todo Mañana", "Todo Tarde", "Limpiar")
- Centro de evaluación con rúbrica 1–5
- Misiones de Rescate (sistema de suplentes)
- Notificaciones Discord integradas

### Panel de Administración (V1.1) ✅
- Dashboard con KPIs en tiempo real
- Analíticas PRO (LTV, Churn Rate)
- Top Referidores
- Heatmap de Frustración
- Impersonate de usuarios
- Gestión de alumnos y maestros
- Finanzas V1 (nómina, comisiones)

### Sistema de Notificaciones ✅
- **Webhooks:** 4 canales (Admin, Maestros, Test, Errores)
- **Bot DM:** Mensajes directos a maestros vía Discord API v10
- **Recordatorios:** Scheduled Function cada 10 min (DM 15 min antes de clase)

### Economía y Pagos
- **Precio:** $100 MXN/mes (~$3.33/día)
- **Evaluaciones:** $60 MXN
- **Estado:** ✅ Mercado Pago configurado (función + webhook). Pendiente: configurar credenciales en Netlify y webhook URL en dashboard MP.

### Corrección de Errores ✅
- `errorTracker.js` — Monitor global de errores JS con notificación a Discord

---

## Flujo del Alumno
```
1. Landing → Registro (Google Auth)
2. Placement Test Progresivo → Asignación de módulo gratuito
3. Estudio del módulo gratis (sin límite de tiempo)
4. Solicitud de Evaluación (requiere $100/mes)
5. Conversación grabada con Moon (roleplay)
6. Revisión asíncrona por el maestro
7. Feedback + Desbloqueo del siguiente módulo
8. Repetir (hasta 4 módulos por mes)
```

---

## Estado Actual (Limpieza: Sept 2026)

### Completado ✅
- Landing Page con CSS inmersivo
- Autenticación Google + roles + onboarding
- **10 módulos completos** con datos JSON (200 lecciones totales, 10 evaluaciones)
- Panel Administrativo V1.1
- Sistema de notificaciones Discord
- Sistema de referidos
- Validación premium server-side
- Seguridad: firma webhook, auth en functions, rate limiting
- Precio actualizado a $100 MXN/mes
- Mercado Pago: función + webhook configurados

### Eliminado (Limpieza)
- `public/temp_module1.txt` — HTML temporal obsoleto
- `functions/hello.js` — Función de prueba sin uso
- `patchAliases.js` — Script de aliases sin uso activo

### Pendiente (Próximos Pasos)
- **Infraestructura:** Configurar credenciales MP en Netlify + webhook URL en dashboard
- **Gamificación:** Logros, ranking, personalización de Moon
- **Calidad:** Pruebas automatizadas, PWA, limpieza de console.logs
- **Docs:** Completar `USERS/STUDENT.md`

---

## Documentación del Proyecto
| Archivo | Propósito |
|---------|-----------|
| `PROYECTO.md` | Este archivo — visión unificada del proyecto |
| `ADMIN_PANEL.md` | Hoja de ruta del Admin Panel |
| `DISCORD_BOT.md` | Plan del bot de Discord |
| `NOTIFICACIONES.md` | Auditoría de notificaciones |
| `USERS/TEACHER.md` | Auditoría UX del portal de maestros |
| `USERS/STUDENT.md` | Auditoría UX del estudiante (pendiente completar) |
