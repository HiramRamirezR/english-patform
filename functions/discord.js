// functions/discord.js
// Netlify function to handle Discord Webhooks securely

exports.handler = async function (event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // Leemos la URL del webhook del entorno, o usamos la proporcionada por defecto
    const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || "https://discord.com/api/webhooks/1477497684272091270/ACBTOvXXUgscSm6OKL3plgCbsrWwSeS75wMXAwwzM5WYQMZf9n2oTiPzALolY3AuXZ03";

    try {
        const payload = JSON.parse(event.body);

        // Usamos el fetch nativo de Node (disponible en Node 18+)
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Discord API error: ${response.statusText}`);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Notificación enviada con éxito' })
        };
    } catch (error) {
        console.error("Error en Webhook Function:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
