/**
 * 🚨 errorTracker.js — Monitor Global de Errores Moonsforest
 * Captura excepciones JS no manejadas y las reporta a Discord automáticamente.
 * Importar este módulo en cada página protegida (mapa, teacher, profile, evaluacion).
 */

import { auth } from './auth.js';

// ─── Configuración ────────────────────────────────────────────────────────────
const THROTTLE_MS = 10_000;    // Mínimo 10s entre envíos del mismo error
const MAX_ERRORS_PER_SESSION = 15; // Tope por sesión para no spamear
const IGNORED_PATTERNS = [     // Errores conocidos / sin valor de diagnóstico
    'ResizeObserver loop',
    'Script error.',
    'cancelled-popup-request',
    'popup-closed-by-user',
    'Non-Error promise rejection', // Cancels de Firebase Auth
];

// ─── Estado interno ───────────────────────────────────────────────────────────
const _sent = new Map();        // message → timestamp último envío
let _sessionCount = 0;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Devuelve la página actual limpia (sin el path completo del servidor local) */
const getPage = () => {
    const path = window.location.pathname;
    return path.split('/').pop() || 'index.html';
};

/** Resumen corto del navegador del usuario */
const getBrowser = () => {
    const ua = navigator.userAgent;
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Edg')) return 'Edge';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari')) return 'Safari';
    return ua.slice(0, 40);
};

/** ¿Este mensaje ya fue enviado hace poco? */
const isThrottled = (key) => {
    const last = _sent.get(key);
    return last && (Date.now() - last) < THROTTLE_MS;
};

/** ¿Debemos ignorar este mensaje? */
const isIgnored = (message = '') =>
    IGNORED_PATTERNS.some(p => message.includes(p));

// ─── Núcleo: enviar a Discord ─────────────────────────────────────────────────
const reportError = async ({ message, source, lineno, colno, stack }) => {
    if (!message || isIgnored(message)) return;
    if (_sessionCount >= MAX_ERRORS_PER_SESSION) return; // Tope de sesión
    if (isThrottled(message)) return;                    // Throttle

    _sessionCount++;
    _sent.set(message, Date.now());

    // Obtener info del usuario si hay sesión activa
    const user = auth.currentUser;
    const userInfo = user
        ? `**${user.displayName || 'Nombre desconocido'}** (${user.email})\nUID: \`${user.uid}\``
        : '🔓 Sin sesión activa';

    const location = source
        ? `${source}${lineno ? `:${lineno}` : ''}${colno ? `:${colno}` : ''}`
        : getPage();

    const stackShort = stack
        ? stack.split('\n').slice(0, 4).join('\n')
        : 'Sin stack disponible';

    const description = [
        `**Página:** \`${getPage()}\``,
        `**Navegador:** ${getBrowser()}`,
        `**Usuario:** ${userInfo}`,
        `**Fuente:** \`${location}\``,
        `\`\`\`\n${message}\n\`\`\``,
        `**Stack (primeras 4 líneas):**\n\`\`\`\n${stackShort}\n\`\`\``
    ].join('\n');

    try {
        await fetch('/.netlify/functions/discord', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                channel: 'errores',
                embeds: [{
                    title: '🚨 Error en Producción',
                    description,
                    color: 15158332, // Rojo
                    timestamp: new Date().toISOString(),
                    footer: { text: `Moonsforest Error Tracker 🌲 • Sesión #${_sessionCount}` }
                }]
            })
        });
    } catch (_) {
        // Si el reporte falla, no hacemos nada (evitar recursión)
    }
};

// ─── Listeners globales ───────────────────────────────────────────────────────

/** Errores síncronos de JS no capturados */
window.addEventListener('error', (event) => {
    reportError({
        message: event.message,
        source: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
    });
});

/** Promesas rechazadas sin .catch() */
window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason?.message || String(reason);
    const stack = reason?.stack;
    reportError({ message, stack, source: getPage() });
});

console.log('🌲 Moonsforest Error Tracker activo.');
