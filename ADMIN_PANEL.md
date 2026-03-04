# Hoja de Ruta: Admin Panel Moonsforest 🌲

Este documento detalla la estructura, KPIs y funcionalidades necesarias para el panel administrativo de la plataforma de aprendizaje de inglés.

## 1. Tablero de Salud del Ecosistema (KPIs de Negocio)
- **Tasa de Retención por Cohorte:** Seguimiento de alumnos que permanecen activos mes a mes.
- **Churn Rate (Cancelaciones):** Análisis de abandonos y detección de módulos "críticos".
- **LTV (Lifetime Value):** Ingreso promedio generado por cada alumno durante su vida en la plataforma.
- **Ingresos Totales:** Histórico y semanal (desglosado por suscripciones y evaluaciones de $60).

## 2. Gestión de Alumnos y Maestros
### Panel de Alumnos:
- **Estado Individual:** Minutos hablados (día/semana), días desde registro, módulo y lección actual.
- **Historial Financiero:** Pagos realizados y evaluaciones pagadas/pendientes.
- **Referidos:** Lista de referidos activos y descuentos aplicados.
- **Impersonate:** Botón para visualizar la plataforma como el alumno (auditoría/soporte).

### Panel de Maestros:
- **Disponibilidad:** Slots abiertos, reservados y completados.
- **Desempeño:** Ganancias históricas y de la semana.
- **Rating:** Calificación promedio de los alumnos tras las evaluaciones.
- **Referidos:** Seguimiento de los $50 mensuales por cada alumno referido activo.

## 3. Calidad Educativa y Contenido (Moonsforest CMS)
- **Bottlenecks (Cuellos de Botella):** Reporte de lecciones donde los alumnos fallan o tardan más tiempo (optimización de Web Speech API).
- **Fluidez Global:** Promedio de minutos hablados por toda la comunidad.
- **Editor de Recursos:** Modificación en tiempo real de `globals.json` (prompts de Moon y mensajes de éxito).
- **Global Alerts:** Sistema para publicar avisos o banners en el mapa de todos los usuarios.

## 4. Operación y Finanzas
- **Liquidación de Pagos:** Panel para cortes de los lunes (umbral de $300 para maestros).
- **Registro de Pagos:** Botón "Marcar como Pagado" con carga de comprobantes.
- **Cupones:** Tracking de uso de códigos de descuento y efectividad de campañas.

## 5. Auditoría Técnica y Soporte
- **Logs de Voz:** Registro de fallos técnicos en el motor de reconocimiento de voz.
- **Atención al Cliente:** Acceso rápido a datos de contacto (WhatsApp/Email) de usuarios con problemas.

## 6. Gamificación e Inteligencia de Producto
- **Censo de Animales:** Reporte de los avatars más populares para guiar nuevas creaciones visuales.
- **Leaderboards (Top Exploradores):** Ranking de los alumnos con más minutos hablados para incentivos.

---
**Progreso Actual (V1.1 - The Watchtower 🔭):**
- [x] **Dashboard:** KPIs en tiempo real (Ingresos, Estudiantes, Minutos, Evals).
- [x] **Analíticas PRO:** LTV Promedio y Churn Rate simplificado integrado.
- [x] **Inteligencia:** Top Referidores (Ranking de embajadores).
- [x] **Reportes Críticos:** Heatmap de lecciones problemáticas (Filtro de Frustración).
- [x] **Soporte:** Función "Impersonate" (Investigar como usuario) 🕵️.
- [x] **Gestión Alumnos:** Buscador, seguimiento de progreso (M/L) y estado de suscripción.
- [x] **Gestión Maestros:** Reporte de slots, referidos y ganancias estimadas.
- [x] **Finanzas V1:** Reporte de nómina con umbral de $300 y cálculo de comisión MF.
- [x] **UX/UI:** Diseño premium responsivo con sidebar móvil.

**Pendiente (Fase 2 - CMS y Escalamiento):**
- [ ] **CMS:** Editor de lecciones y mensajes globales (sustitución de `globals.json`).
- [ ] **Feedback:** Sistema de ratings para maestros tras las evaluaciones.
- [ ] **Gamificación:** Censo de animales populares y Leaderboard global.
- [ ] **Operación:** Carga de archivos de comprobantes de pago en nómina.

**Estado del Proyecto:** ✅ Sistema Administrativo V1.1 Operativo.

**Sugerencias Futuras:**
1. Exportación de nómina a CSV/Excel.
2. Botón de "Banear Usuario" en la lista de alumnos.
3. Notificaciones push para maestros cuando se reserva un slot.
