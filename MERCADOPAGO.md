# Integración Mercado Pago — Guía de Configuración

## Estado Actual
- ✅ Función Netlify (`functions/mercadopago.js`) — create-subscription, webhook, validate-premium
- ✅ Frontend (`public/js/payment.js`) — modal de pago + fallback manual
- ✅ Precio: $100 MXN/mes
- ⏳ **Pendiente:** Configurar credenciales y webhook

---

## Paso 1: Variables de Entorno en Netlify

Ir a **Netlify → Site → Environment Variables** y agregar:

| Variable | Valor | Origen |
|----------|-------|--------|
| `MERCADO_PAGO_ACCESS_TOKEN` | `APP_USR-xxxxxxxx...` | MP Dashboard → Credenciales → Access Token |
| `MERCADO_PAGO_WEBHOOK_SECRET` | `xxxxxx...` | MP Dashboard → Webhooks → Tu webhook → Secret |
| `FIREBASE_SERVICE_ACCOUNT` | JSON string completo | Firebase Console → Service Accounts → Generate new private key |
| `URL` | `https://moonsforest.com` | Tu dominio de producción |

### Cómo obtener cada credencial:

**MERCADO_PAGO_ACCESS_TOKEN:**
1. Ir a https://www.mercadopago.com.mx/developers
2. Seleccionar tu aplicación
3. Credenciales → Access Token
4. Copiar el token de producción (empieza con `APP_USR-`)

**MERCADO_PAGO_WEBHOOK_SECRET:**
1. En el mismo panel de desarrollador
2. Webhooks → Tu webhook
3. Copiar el Secret (para verificación HMAC-SHA256)

**FIREBASE_SERVICE_ACCOUNT:**
1. Ir a https://console.firebase.google.com
2. Seleccionar proyecto `english-platform-5c49b`
3. Configuración del proyecto (⚙️) → Cuentas de servicio
4. "Generar nueva clave privada"
5. Se descarga un archivo JSON
6. Copiar el contenido completo del JSON y pegarlo como valor de la variable

---

## Paso 2: Configurar Webhook en Mercado Pago

1. Ir a https://www.mercadopago.com.mx/developers
2. Seleccionar tu aplicación
3. Webhooks → Crear webhook
4. Configurar:

| Campo | Valor |
|-------|-------|
| URL | `https://moonsforest.com/.netlify/functions/mercadopago/webhook` |
| Eventos | `preapproval` y `payment` |

5. Guardar y copiar el **Secret** a la variable `MERCADO_PAGO_WEBHOOK_SECRET` en Netlify

---

## Paso 3: Verificar Deploy

1. Hacer deploy a Netlify (push a main o `netlify deploy --prod`)
2. Verificar que la función exista: `https://moonsforest.com/.netlify/functions/mercadopago/validate-premium`
3. Debería retornar error 400 (falta userId) — eso confirma que la función está activa

---

## Paso 4: Probar Flujo Completo

### 4a. Crear suscripción de prueba
1. Ir a `mapa.html` con una cuenta de usuario
2. Hacer clic en "Desbloquear Evaluación" o el botón de suscripción
3. Confirmar en el modal SweetAlert
4. Debería redirigir a Mercado Pago Checkout

### 4b. Verificar webhook
1. Completar el pago en sandbox de MP
2. Verificar en Netlify → Functions → Logs que el webhook llegó
3. Verificar en Firestore que el usuario tenga `isPremium: true` y `premiumUntil` actualizado

### 4c. Verificar validate-premium
```bash
curl -X POST https://moonsforest.com/.netlify/functions/mercadopago/validate-premium \
  -H "Content-Type: application/json" \
  -d '{"userId": "UID_DEL_USUARIO"}'
```
Respuesta esperada: `{"valid": true, "premiumUntil": "2026-10-07T..."}`

---

## Archivos Relacionados

| Archivo | Función |
|---------|---------|
| `functions/mercadopago.js` | Backend: crear suscripción, webhook, validar premium |
| `public/js/payment.js` | Frontend: modal de pago, manejo de retorno |
| `public/js/mapa.js` | UI: botones de suscripción, gating de módulos |
| `public/js/admin.js` | KPIs: cálculo de revenue (* 100) |
| `.env.example` | Referencia de variables de entorno |

---

## Troubleshooting

| Problema | Causa probable | Solución |
|----------|---------------|----------|
| "Mercado Pago no configurado" | Falta `MERCADO_PAGO_ACCESS_TOKEN` | Agregar variable en Netlify |
| Webhook no activa premium | Falta `FIREBASE_SERVICE_ACCOUNT` | Agregar JSON de service account |
| Redirección falla | Falta `URL` o dominio incorrecto | Verificar variable `URL` en Netlify |
| Firma inválida en webhook | Secret no coincide | Verificar `MERCADO_PAGO_WEBHOOK_SECRET` |
| Precio incorrecto | Cache del navegador | Hard refresh (Ctrl+Shift+R) |
