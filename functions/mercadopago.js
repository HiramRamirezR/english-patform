// functions/mercadopago.js
// Netlify Function: Mercado Pago subscription + webhook handler

const { MercadoPagoConfig, PreApproval } = require('mercadopago');
const MERCADO_PAGO_API = 'https://api.mercadopago.com';

// Firebase lazy init
let firebaseApp = null;
function getFirestoreDB() {
    if (firebaseApp) return require('firebase-admin/firestore').getFirestore();
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    const { initializeApp, cert } = require('firebase-admin/app');
    firebaseApp = initializeApp({ credential: cert(serviceAccount) });
    return require('firebase-admin/firestore').getFirestore();
}

exports.handler = async function (event, context) {
    const path = event.path.replace('/.netlify/functions/mercadopago', '');
    const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;

    if (!MP_ACCESS_TOKEN) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Mercado Pago no configurado. Falta MERCADO_PAGO_ACCESS_TOKEN' })
        };
    }

    // DEBUG: identificar la cuenta propietaria del Access Token
    const meResp = await fetch(`${MERCADO_PAGO_API}/users/me`, {
        headers: {
            'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
        }
    });

    const meData = await meResp.json();

    console.log("🔎 MERCADO PAGO USER:", JSON.stringify({
        id: meData.id,
        nickname: meData.nickname,
        email: meData.email,
        site_id: meData.site_id
    }, null, 2));

    try {
        // --- VALIDAR PREMIUM (server-side) ---
        if (path === '/validate-premium' && event.httpMethod === 'POST') {
            const { userId } = JSON.parse(event.body);
            if (!userId) {
                return { statusCode: 400, body: JSON.stringify({ valid: false, error: 'userId requerido' }) };
            }

            const db = getFirestoreDB();
            const userDoc = await db.collection('users').doc(userId).get();
            if (!userDoc.exists) {
                return { statusCode: 404, body: JSON.stringify({ valid: false, error: 'Usuario no encontrado' }) };
            }

            const data = userDoc.data();
            const now = new Date();
            const premiumUntil = data.premiumUntil ? new Date(data.premiumUntil) : null;
            const isValid = data.isPremium === true && premiumUntil && premiumUntil > now;

            return {
                statusCode: 200,
                body: JSON.stringify({ valid: isValid, premiumUntil: premiumUntil?.toISOString() || null })
            };
        }

        // --- WEBHOOK: Recibir notificaciones de pago ---
        if (path === '/webhook' && event.httpMethod === 'POST') {
            const body = JSON.parse(event.body);

            // Verificar firma HMAC-SHA256
            const webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
            if (webhookSecret) {
                const signature = event.headers['x-signature'];
                if (!signature) {
                    console.warn("⚠️ Webhook MP sin firma — rechazado");
                    return { statusCode: 401, body: JSON.stringify({ error: 'Firma requerida' }) };
                }
                const parts = Object.fromEntries(
                    signature.split(',').map(p => p.split('='))
                );
                const dataId = body.data?.id || body.resource?.id || '';
                const manifest = `id:${dataId};request-id:${event.headers['x-request-id'] || ''};ts:${parts.ts || ''};`;
                const crypto = require('crypto');
                const expected = crypto.createHmac('sha256', webhookSecret).update(manifest).digest('hex');
                if (parts.v1 !== expected) {
                    console.warn("⚠️ Firma MP inválida — rechazado");
                    return { statusCode: 401, body: JSON.stringify({ error: 'Firma inválida' }) };
                }
            }

            console.log("📡 Webhook MP recibido:", JSON.stringify(body, null, 2));

            const topic = body.topic || body.type;
            const resourceId = body.resource?.id || body.data?.id;

            if (!resourceId) {
                return { statusCode: 200, body: 'OK' };
            }

            // Obtener datos del pago/aprobación
            let paymentData = null;

            // Crear cliente MP con SDK
            const client = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });
            const preApproval = new PreApproval(client);

            if (topic === 'preapproval' || topic === 'subscription') {
                paymentData = await preApproval.get({ id: resourceId });
            } else if (topic === 'payment') {
                const resp = await fetch(`${MERCADO_PAGO_API}/v1/payments/${resourceId}`, {
                    headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
                });
                const payment = await resp.json();
                paymentData = await preApproval.get({ id: payment.preapproval_id });
            }

            if (paymentData && paymentData.status === 'authorized') {
                const externalRef = paymentData.external_reference;
                if (externalRef) {
                    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
                        console.error("No FIREBASE_SERVICE_ACCOUNT configured");
                        return { statusCode: 200, body: 'OK' };
                    }

                    const db = getFirestoreDB();
                    const userRef = db.collection('users').doc(externalRef);

                    const premiumUntil = new Date();
                    premiumUntil.setMonth(premiumUntil.getMonth() + 1);

                    await userRef.update({
                        isPremium: true,
                        premiumUntil: premiumUntil.toISOString(),
                        mpSubscriptionId: resourceId,
                        updatedAt: new Date().toISOString()
                    });

                    console.log(`✅ Premium activado para usuario: ${externalRef} hasta ${premiumUntil.toISOString()}`);
                }
            }

            return { statusCode: 200, body: 'OK' };
        }

        // --- CREAR SUSCRIPCIÓN ---
        if (path === '/create-subscription' && event.httpMethod === 'POST') {
            const { userId, userName, email, returnUrl } = JSON.parse(event.body);

            if (!userId || !email) {
                return { statusCode: 400, body: JSON.stringify({ error: 'userId y email requeridos' }) };
            }

            // En modo TEST, usar email de test buyer para evitar error 145
            const isTestMode = MP_ACCESS_TOKEN.startsWith('TEST-');
            const testBuyerEmail = 'test_user_6973565152757274950@testuser.com';
            const payerEmail = isTestMode ? testBuyerEmail : email;

            console.log(`📧 Modo: ${isTestMode ? 'TEST' : 'PRODUCCION'} | Payer: ${payerEmail}`);

            // Crear cliente MP con SDK
            const client = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });
            const preApproval = new PreApproval(client);

            const body = {
                reason: 'Suscripcion Mensual Moonsforest',
                external_reference: userId,
                payer_email: payerEmail,
                status: 'pending',
                auto_recurring: {
                    frequency: 1,
                    frequency_type: 'months',
                    transaction_amount: 100,
                    currency_id: 'MXN'
                },
                back_url: `${process.env.SITE_URL}/mapa.html`
            };

            console.log("Payload MP:", JSON.stringify(body, null, 2));

            const result = await preApproval.create({ body });

            console.log("✅ Suscripción creada:", result.id);

            return {
                statusCode: 200,
                body: JSON.stringify({
                    init_point: result.init_point,
                    preapproval_id: result.id
                })
            };
        }

        return { statusCode: 404, body: 'Not found' };

    } catch (error) {
        console.error("Mercado Pago function error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
