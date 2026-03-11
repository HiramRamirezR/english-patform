# Control de Notificaciones de Discord

Este documento es el listado oficial de todas las notificaciones automáticas que genera la plataforma. Nos servirá para auditar quién recibe qué y asegurarnos de no hacer "spam" innecesario en los canales equivocados.

## Canales Destino
- **[Canal de Notificaciones]:** Es el canal maestro (generalmente oculto y privado, solo para ti/administradores). Se usa para notificar acciones globales, métricas, errores o registros de nuevos usuarios.
- **[Canal de Maestros]:** Es el canal donde están todos los tutores/guardianes dados de alta. Se usa para avisar sobre oportunidades de clases, dinero y cancelaciones de la agenda.
- **[Direct Message - DM]:** Mensaje directo privado que el Bot envía a un usuario/maestro en específico.

---

## 📅 Notificaciones de Evaluaciones y Agenda

| Disparador (Acción del Alumno) | Mensaje/Contenido Principal | Canal Destino | Color Embed | Archivo Origen |
| :--- | :--- | :--- | :--- | :--- |
| **Reserva Cita en el Marketplace** | "🌟 ¡Nueva Sesión Agendada!" (Avisa qué alumno compró el slot de hora y día de qué maestro) | Canal de Maestros | 🟨 Amarillo | `evaluacion.js` |
| **Cancela su Evaluación** | "❌ Sesión Cancelada" (Avisa al nombre del maestro que su lugar ha sido liberado en el Marketplace) | Canal de Maestros | 🟥 Rojo | `mapa.js` |
| **Pide un Horario Especial** | "🗓️ Petición de Horario Especial" (Un alumno está pidiendo fecha y hora que no encontró en la lista) | Canal de Maestros | 🟪 Morado | `evaluacion.js` |
| **Abre Horario Solicitado** | "✨ ¡Deseo Cumplido!" (Un maestro abrió una hora que alguien había pedido específicamente) | Canal de Maestros | 🟩 Verde | `teacher.js` |
| **Pide un Suplente (Urgente)** | "🚑 Misión de Rescate" (Un maestro no puede asistir y pide que alguien más tome su lugar) | Canal de Maestros | 🟧 Naranja | `teacher.js` |
| **Califica una Evaluación** | "🎉 Evaluación APROBADA" o "⚠️ Refuerzo Necesario" (Resultado final de la sesión) | Canal de Notificaciones | 🟩/🟥 | `teacher.js` |

## 🧑‍🎓 Notificaciones de Gestión de Usuarios

| Disparador (Acción del Usuario) | Mensaje/Contenido Principal | Canal Destino | Color Embed | Archivo Origen |
| :--- | :--- | :--- | :--- | :--- |
| **Usuario Nuevo se Registra** | "🏕️ Nuevo Guerrero Inicializado" (Avisa del registro y si usó algún código de referido) | Canal de Notificaciones | 🟩 Verde | `auth.js` |
| **Alumno Llena Formulario de Maestro** | "🧑‍🏫 Nueva Solicitud de Maestro — Revisión Pendiente" (El usuario mandó su video de Loom para certificar) | Canal de Notificaciones | 🟪 Morado | `profile.js` |

---
*Nota: Asegúrate de revisar este archivo y agregar la documentación correspondiente cada vez que implementemos un nuevo bloque de código que ejecute `sendDiscordNotification()`.*
