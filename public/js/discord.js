// Helper for sending Discord Webhooks from frontend via Netlify Function

/**
 * Envia un mensaje rico (Embed) a Discord
 * @param {string} title Titulo de la notificación
 * @param {string} description Texto explicativo corto
 * @param {number} color Código de color base 10 (ej. Verde = 5763719, Azul = 3447003, Rojo = 15548997)
 */
export async function sendDiscordNotification(title, description, color = 3447003) {
    try {
        const payload = {
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
            console.error("Fallo al enviar notificación al server", await response.text());
        }
    } catch (e) {
        console.error("Error conectando con Netlify/Discord:", e);
    }
}
