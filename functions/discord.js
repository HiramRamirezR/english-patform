// functions/discord.js
// Netlify function to handle Discord (Webhooks or Bot DMs) securely

exports.handler = async function (event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
    const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

    console.log("--- Inicio Proceso Discord ---");
    console.log("Token Detectado:", DISCORD_BOT_TOKEN ? "SÍ (longitud: " + DISCORD_BOT_TOKEN.length + ")" : "NO");

    try {
        const payload = JSON.parse(event.body);
        const { recipient_id, ...embedData } = payload;
        let results = [];

        console.log("Recipient ID:", recipient_id || "Ninguno (Solo Webhook)");

        // --- PASO 1: ENVIAR SIEMPRE AL WEBHOOK ---
        try {
            const webhookResponse = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(embedData)
            });
            if (webhookResponse.ok) {
                results.push('Webhook OK');
                console.log("✅ Webhook enviado correctamente.");
            } else {
                console.error("❌ Error Webhook Status:", webhookResponse.status);
            }
        } catch (webhookErr) {
            console.error("Fallo crítico Webhook:", webhookErr);
        }

        // --- PASO 2: ENVIAR DM SI HAY UN ID ---
        if (recipient_id && DISCORD_BOT_TOKEN) {
            console.log("🚀 Iniciando flujo de DM para:", recipient_id);
            try {
                const dmChannelResponse = await fetch("https://discord.com/api/v10/users/@me/channels", {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bot ${DISCORD_BOT_TOKEN.trim()}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ recipient_id })
                });

                console.log("Status Canal DM:", dmChannelResponse.status);

                if (dmChannelResponse.ok) {
                    const dmChannel = await dmChannelResponse.json();
                    const channelId = dmChannel.id;

                    const messageResponse = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bot ${DISCORD_BOT_TOKEN.trim()}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(embedData)
                    });

                    console.log("Status Mensaje DM:", messageResponse.status);

                    if (messageResponse.ok) {
                        results.push('DM OK');
                        console.log("✅ DM enviado correctamente.");
                    } else {
                        console.error("❌ Error Mensaje DM:", await messageResponse.text());
                    }
                } else {
                    console.error("❌ Error Canal DM:", await dmChannelResponse.text());
                }
            } catch (dmError) {
                console.error("Error crítico DM:", dmError);
            }
        } else {
            if (!recipient_id) console.log("ℹ️ No hay recipient_id en el payload.");
            if (!DISCORD_BOT_TOKEN) console.log("ℹ️ No hay DISCORD_BOT_TOKEN en variables de entorno.");
        }

        console.log("--- Fin Proceso Discord ---\n");

        return {
            statusCode: 200,
            body: JSON.stringify({ message: results.join(' y ') || 'Procesado' })
        };

    } catch (error) {
        console.error("Error General:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
