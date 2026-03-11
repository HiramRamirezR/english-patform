# Documento de Auditoría UX - Portal de Maestros (Teacher Journey)

Este documento registra las áreas de oportunidad, fallas de flujo y deuda técnica identificada en la experiencia de un Maestro (`teacher.html` y `teacher.js`).

## 1. 💰 Gestión de Ganancias y Pagos
- [x] **Claridad en Cobro:** La interfaz de pagos se actualizó para indicar que las transferencias maestras son automáticas al final del mes. No se necesita botón de cashout manual.
- [x] **Ganancias por Evaluaciones Conectadas:** Se modificó `teacher.js` para consultar dinámicamente el historial de "slots" completados de Firebase y reflejar los $50 de ganancia de cada sesión en el balance real.

## 2. 📅 Sistema de Agenda y Horarios
- [x] **Agendado Tedioso (Fricción Alta):** Se agregaron botones de "Todo Mañana", "Todo Tarde" y "Limpiar" para seleccionar múltiples bloques de evaluaciones con un solo clic.
- [x] **Puntos Ciegos en "Misiones de Rescate":** Si un maestro pide suplente ("Gestionar Inconveniente -> Pedir un Suplente"), la clase queda flotando en el marketplace de maestros. Si otro maestro no toma el rescate **antes de la hora de inicio**, el estudiante ahora verá un mensaje amigable, se bloquea la sala de espera y se le devuelve su crédito automáticamente.

## 3. 📝 Gestión de Identidad y Perfil
- [x] **Redirección a Perfil:** Como se descubrió, el botón y formulario de "Editar Información Profesional" *sí existe* en `profile.html`. Lo que faltaba era un puente directo desde el dashboard. Se añadió el botón **"Modificar link o perfil"** justo debajo de su panel de Zoom en `teacher.html` para conectarlos a dicho formulario rápidamente.

## 4. 🎓 Centro de Evaluación y Finalización
- [x] **Métrica Estática en el UX de Evaluación:** El modal para evaluar alumnos obtiene algo de vocabulario mediante `m1.json`, pero la sección de Rúbrica ("Pronunciación", "Gramática") son simples checkboxes "tontos" de HTML. Ahora son botones de radio de 1 a 5. Las "Guías de Evaluación" en la barra lateral ahora también leen los JSON de los módulos en tiempo real en lugar de estar hardcodeadas.
- [x] **Las Evaluaciones Fantasma (Falta Historial):** Cuando un maestro marca una clase como `completed` enviando el resultado, la cita desaparece completamente de "Mis Slots". No hay una sección de "Historial de Clases" donde el maestro pueda releer qué consejos le dio a X estudiante en el pasado. Se agregó una tabla con los detalles debajo del calendario.

---
*Nota: Iremos marcando con `[x]` a medida que solucionemos cada apartado de la experiencia de los profesores.*
