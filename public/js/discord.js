// Helper for sending Discord Webhooks from frontend via Netlify Function

/**
 * Envia un mensaje rico (Embed) a Discord
 * @param {string} title Titulo de la notificación
 * @param {string} description Texto explicativo corto
 * @param {number} color Código de color base 10
 * @param {string} recipientId ID de usuario para DM
 * @param {string} channel 'admin' o 'teachers'
 * @param {string} content Texto fuera del embed (ej: @everyone)
 */
export async function sendDiscordNotification(title, description, color = 3447003, recipientId = null, channel = 'admin', content = null) {
    try {
        const payload = {
            recipient_id: recipientId,
            channel: channel,
            content: content,
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
