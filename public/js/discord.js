// Helper for sending Discord Webhooks from frontend via Netlify Function

/**
 * Envia un mensaje rico (Embed) a Discord
 * @param {string} title Titulo de la notificación
 * @param {string} description Texto explicativo corto
 * @param {number} color Código de color base 10 (ej. Verde = 5763719, Azul = 3447003, Rojo = 15548997, Dorado = 15844367)
 * @param {string} recipientId Opcional: ID de usuario para enviar por DM (vía Bot)
 */
export async function sendDiscordNotification(title, description, color = 3447003, recipientId = null) {
    try {
        const payload = {
            recipient_id: recipientId, // Si es null, la función usará el Webhook por defecto
            embeds: [
                {
                    title: title,
                    description: description,
                    color: color,
                    timestamp: new Date().toISOString(),
                    footer: { text: "Moonsforest Bot 🌲" }
                }
            ]
        };

        const response = await fetch('/.netlify/functions/discord', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error("Fallo al enviar notificación a Discord", await response.text());
        }
    } catch (e) {
        console.error("Error conectando con Netlify/Discord:", e);
    }
}
