import { auth, db, getEffectiveUser } from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, updateDoc, collection, query, where, getDocs, serverTimestamp, deleteField } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { sendDiscordNotification } from './discord.js';

// DOM Elements
const avatarModal = document.getElementById('avatar-modal');
const dashboardContent = document.getElementById('dashboard-content');
const avatarOptions = document.querySelectorAll('.avatar-option');
const saveAvatarBtn = document.getElementById('save-avatar-btn');
const displayAvatar = document.getElementById('display-avatar');
const userNameDisplay = document.getElementById('user-name');
const moonTrigger = document.getElementById('moon-trigger');
const moonText = document.getElementById('moon-text');

let currentUser = null;
let currentProfile = null;
let selectedAvatar = null;

// Avatar Selection Logic
avatarOptions.forEach(opt => {
    opt.addEventListener('click', () => {
        // Clear previous selection
        avatarOptions.forEach(o => o.classList.remove('selected'));
        // Select new
        opt.classList.add('selected');
        selectedAvatar = opt.getAttribute('data-avatar');

        // Enable button
        saveAvatarBtn.disabled = false;
    });
});

saveAvatarBtn.addEventListener('click', async () => {
    if (!selectedAvatar || !currentUser) return;

    saveAvatarBtn.disabled = true;
    saveAvatarBtn.textContent = 'Guardando...';

    try {
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
            avatar: selectedAvatar
        });

        // Update UI locally
        currentProfile.avatar = selectedAvatar;
        setupDashboardUI();

    } catch (error) {
        console.error("Error guardando avatar:", error);
        Swal.fire({
            title: '¡Ups!',
            text: 'Ocurrió un error al guardar tu avatar. Intenta de nuevo.',
            icon: 'error',
            confirmButtonColor: '#ef4444'
        });
        saveAvatarBtn.disabled = false;
        saveAvatarBtn.textContent = 'Comenzar Aventura';
    }
});

/**
 * 🔥 Calcula la racha de días consecutivos de estudio
 * basada en el weeklyProgress (objeto { 'YYYY-MM-DD': true })
 */
const calculateStreak = (weeklyProgress) => {
    if (!weeklyProgress || Object.keys(weeklyProgress).length === 0) return 0;
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const key = d.toISOString().split('T')[0];
        if (weeklyProgress[key]) {
            streak++;
        } else if (i > 0) {
            break; // Rompió la racha
        }
    }
    return streak;
};

// Setup Initial Dashboard State
const setupDashboardUI = () => {
    // Si no tiene avatar, mostrar Onboarding
    if (!currentProfile.avatar) {
        avatarModal.style.display = 'flex';
        dashboardContent.style.display = 'none';
        return;
    }

    // Ya tiene avatar, preparar el "Peak"
    avatarModal.style.display = 'none';
    dashboardContent.style.display = 'block';

    // Rellenar Datos
    displayAvatar.textContent = currentProfile.avatar;
    const firstName = currentProfile.name.split(' ')[0];
    userNameDisplay.textContent = `¡Hola, ${firstName}!`;

    // Minutos hablados (reset diario)
    const today = new Date().toISOString().split('T')[0];
    let minutesToday = currentProfile.minutesSpokenToday || 0;

    // Si la última fecha de estudio no es hoy, el contador hoy es 0
    if (currentProfile.lastSpokenDate !== today) {
        minutesToday = 0;
    }

    const minutesSpokenDisplay = document.getElementById('minutes-spoken-today');
    if (minutesSpokenDisplay) {
        minutesSpokenDisplay.textContent = minutesToday;
    }

    // Ruta Semanal
    setupWeeklyPath(currentProfile.weeklyProgress || {});

    // Desbloquear Módulos con lógica de Pago/Gratis
    setupModuleUnlocks(currentProfile);

    // Mensaje de Moon con racha
    const streak = calculateStreak(currentProfile.weeklyProgress || {});
    let moonMsg = '';
    if (streak === 0) {
        moonMsg = `¡Hola <strong>${currentProfile.avatar}</strong>! ${firstName}, hoy es un buen día para practicar. ¿Entramos al Campamento?`;
    } else if (streak === 1) {
        moonMsg = `¡${firstName}! Llevas <strong>1 día</strong> de racha. Un pasito más hoy y formamos un hábito 🐻‍❄️`;
    } else if (streak < 5) {
        moonMsg = `🔥 <strong>¡${streak} días seguidos, ${firstName}!</strong> Tu ${currentProfile.avatar} está ganando experiencia. ¡Sigue así!`;
    } else {
        moonMsg = `🏆 <strong>¡RACHA DE ${streak} DÍAS!</strong> Eres una leyenda del bosque, ${firstName}. El 🌲 te espera.`;
    }
    moonText.innerHTML = moonMsg;

    // Cargar Citas
    loadAppointments();
    cleanExpiredAppointments();

    // Verificación de Prueba de Nivelación (Se hace vía el botón de Salto de Nivel en el header)

    // 🎉 Verificar si el alumno acaba de completar su módulo gratuito
    const freeMod = currentProfile.freeModuleId || 'm1';
    const modJustDone = completedLessons.includes(`${freeMod}l20`);
    const celebrationKey = `${freeMod}_celebration_shown`;
    const celebrationShown = sessionStorage.getItem(celebrationKey);
    
    if (modJustDone && !celebrationShown) {
        sessionStorage.setItem(celebrationKey, 'true');
        setTimeout(() => showModuleCompletionCelebration(freeMod), 1500);
    }

    // 📍 Botón flotante "Continuar" — lleva a la siguiente lección pendiente
    setupContinueButton(completedLessons);

    // 👨‍🏫 Sistema de Evaluación Semanal Integrado
    setupWeeklyEvaluationButton(currentProfile);
};

/**
 * Sistema de Evaluación Semanal
 * Aparece si el alumno ha practicado al menos 3 días esta semana.
 */
function setupWeeklyEvaluationButton(profile) {
    const moonBox = document.querySelector('.moon-status');
    if (!moonBox) return;

    // Verificar progreso semanal (días con >0 minutos)
    const weeklyData = profile.weeklyProgress || {};
    const daysActive = Object.values(weeklyData).filter(v => v > 0).length;

    // Si ha practicado 3 o más días, mostramos el botón de recompensa
    if (daysActive >= 3) {
        const evalContainer = document.createElement('div');
        evalContainer.style.marginTop = '1rem';
        evalContainer.style.padding = '1rem';
        evalContainer.style.background = 'rgba(34, 197, 94, 0.1)';
        evalContainer.style.borderRadius = '12px';
        evalContainer.style.border = '1px dashed var(--forest-glow)';
        evalContainer.style.textAlign = 'center';

        const evalBtn = document.createElement('button');
        evalBtn.className = 'btn-premium';
        evalBtn.style.width = '100%';
        evalBtn.style.padding = '0.8rem';
        evalBtn.style.fontSize = '0.9rem';
        evalBtn.style.fontWeight = 'bold';

        // Verificar si ya solicitó la evaluación esta semana
        const weekKey = `eval_${new Date().getFullYear()}_W${getWeekNumber(new Date())}`;
        const alreadyRequested = profile.requestedEvaluations && profile.requestedEvaluations.includes(weekKey);

        if (alreadyRequested) {
            evalBtn.innerText = "⏳ Evaluación Solicitada";
            evalBtn.style.opacity = '0.7';
            evalBtn.disabled = true;
            evalBtn.style.cursor = 'default';
        } else {
            evalBtn.innerHTML = "🎯 ¡Reto Semanal Listo! Solicitar Evaluación";
            evalBtn.onclick = async () => {
                const result = await Swal.fire({
                    title: '¿Listo para tu Evaluación?',
                    text: 'Moon le avisará a tu maestro que ya terminaste tu práctica de la semana. ¡Prepárate!',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: '¡Sí, avisar!',
                    cancelButtonText: 'Aún no',
                    confirmButtonColor: '#22c55e'
                });

                if (result.isConfirmed) {
                    try {
                        // 1. Guardar en Firestore para que el maestro lo vea
                        const userRef = doc(db, 'users', profile.uid);
                        await updateDoc(userRef, {
                            requestedEvaluations: firebase.firestore.FieldValue.arrayUnion(weekKey),
                            lastEvalRequest: serverTimestamp()
                        });

                        // 2. Notificación Discord (para que Hiram se entere al momento)
                        if (typeof sendDiscordNotification === 'function') {
                            sendDiscordNotification(`🎯 **Solicitud de Evaluación**: ${profile.name} (${profile.avatar}) ha completado su racha de ${daysActive} días y está listo para ser evaluado.`);
                        }

                        Swal.fire('¡Listo!', 'Tu maestro ha sido notificado. Recibirás tus estrellas pronto.', 'success');
                        evalBtn.innerText = "⏳ Evaluación Solicitada";
                        evalBtn.disabled = true;
                        evalBtn.style.opacity = '0.7';

                    } catch (error) {
                        console.error("Error solicitando evaluación:", error);
                    }
                }
            };
        }

        evalContainer.appendChild(evalBtn);
        moonBox.appendChild(evalContainer);
    }
}

// Helper para número de semana
function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
}

const setupModuleUnlocks = (profile) => {
    const unlocked = profile.unlockedModules || ['m1'];
    const freeModuleId = profile.freeModuleId || 'm1';
    const isPremium = profile.isPremium || false;
    const completedLessons = profile.completedLessons || [];

    const nodes = document.querySelectorAll('.module-node');
    nodes.forEach(node => {
        const id = node.getAttribute('data-id');
        
        // Un módulo es accesible si:
        // 1. Eres premium
        // 2. Es tu módulo gratuito asignado (freeModuleId)
        // 3. Estaba desbloqueado por el test (esto incluye módulos previos al salto)
        // 4. Ya lo completaste (para repasar)
        
        const isFree = (id === freeModuleId);
        const wasUnlocked = unlocked.includes(id);
        const isCompleted = completedLessons.includes(`${id}l20`); // Consideramos l20 como fin

        const canAccess = isPremium || isFree || wasUnlocked || isCompleted;

        if (canAccess) {
            node.classList.remove('locked');
            node.classList.add('unlocked');
            node.onclick = () => window.location.href = `module.html?id=${id}`;
        } else {
            node.classList.remove('unlocked');
            node.classList.add('locked');
            // Módulo bloqueado → mostrar modal de suscripción
            node.onclick = () => showSubscriptionModal();
        }
    });
};

/**
 * 🔒 Modal de Suscripción — Se muestra al intentar acceder a módulos bloqueados
 */
const showSubscriptionModal = async () => {
    const result = await Swal.fire({
        title: '🌲 El Bosque Profundo te llama...',
        html: `
            <div style="text-align: left; font-family: 'Outfit', sans-serif;">
                <p style="font-size: 0.95rem; color: #475569; margin-bottom: 1.25rem; line-height: 1.6;">
                    Has cruzado el Campamento Base. 19 módulos y cientos de conversaciones
                    te esperan en lo profundo del bosque.
                </p>
                <div style="background: linear-gradient(135deg, #0f172a, #1e3a5f); border-radius: 16px; padding: 1.5rem; margin-bottom: 1.25rem; text-align: center;">
                    <div style="font-size: 2rem; font-weight: 800; color: #38bdf8; line-height: 1;">$300</div>
                    <div style="font-size: 0.85rem; color: #94a3b8; margin-top: 0.25rem;">MXN al mes — Solo <strong style="color: #7dd3fc;">$10 al día</strong></div>
                </div>
                <ul style="list-style: none; padding: 0; margin: 0 0 1rem; font-size: 0.9rem; color: #475569;">
                    <li style="padding: 0.4rem 0;">🌿 Todos los módulos del bosque desbloqueados</li>
                    <li style="padding: 0.4rem 0;">🎙️ Práctica de voz con Moon todos los días</li>
                    <li style="padding: 0.4rem 0;">🧭 Acceso prioritario a evaluaciones con maestros</li>
                    <li style="padding: 0.4rem 0;">📊 Tu progreso guardado para siempre</li>
                </ul>
                <p style="font-size: 0.8rem; color: #94a3b8; text-align: center;">Cancela cuando quieras. Sin penalizaciones.</p>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: '🚀 Quiero acceso completo',
        cancelButtonText: 'Más tarde',
        confirmButtonColor: '#38bdf8',
        cancelButtonColor: '#64748b',
        customClass: { popup: 'swal-forest-popup' }
    });

    if (result.isConfirmed) {
        // TODO: Reemplazar con el link real de Mercado Pago cuando esté integrado
        Swal.fire({
            title: '¡Gracias por tu interés!',
            html: `<p style="font-size: 0.95rem; color: #475569;">Los pagos estarán disponibles muy pronto. Moon te avisará en cuanto abran las puertas del bosque. 🐻‍❄️</p>`,
            icon: 'info',
            confirmButtonColor: '#38bdf8'
        });
    }
};

/**
 * 🎉 Celebración al completar el Módulo 1 completo (m1l20)
 */
const showModuleCompletionCelebration = async (modId = 'm1') => {
    const modNum = modId.replace('m', '');
    // Usar canvas confetti si está disponible, si no, SweetAlert puro
    await Swal.fire({
        title: `🔥 ¡LEYENDA DEL MÓDULO ${modNum}!`,
        html: `
            <div style="text-align: center; font-family: 'Outfit', sans-serif;">
                <p style="font-size: 3rem; margin: 0.5rem 0;">🏕️⭐🌲</p>
                <p style="font-size: 1rem; color: #475569; margin-bottom: 1.5rem; line-height: 1.6;">
                    Completaste las <strong>20 lecciones</strong> del Módulo ${modNum}.
                    Tu ${currentProfile?.avatar || '🦊'} ya puede hablar inglés con más fluidez.
                </p>
                <div style="background: #f0fdf4; border-radius: 12px; padding: 1rem; margin-bottom: 1.5rem; border: 1px solid #bbf7d0;">
                    <p style="font-size: 0.85rem; color: #166534; margin: 0;">
                        🎙️ El bosque se vuelve más profundo y misterioso...
                    </p>
                </div>
                <div style="background: linear-gradient(135deg, #0f172a, #1e3a5f); border-radius: 16px; padding: 1.5rem;">
                    <div style="font-size: 1.5rem; font-weight: 800; color: #38bdf8; margin-bottom: 0.25rem;">$300 MXN/mes</div>
                    <div style="font-size: 0.8rem; color: #94a3b8;">Sigue explorando — Solo $10 al día</div>
                </div>
            </div>
        `,
        cancelButtonText: 'Seguir explorando',
        confirmButtonText: '🚀 Quiero acceso completo',
        showCancelButton: true,
        confirmButtonColor: '#38bdf8',
        cancelButtonColor: '#64748b',
        allowOutsideClick: false
    }).then(result => {
        if (result.isConfirmed) {
            showSubscriptionModal();
        }
    });
};

/**
 * 📍 Botón flotante "Continuar" — detecta la siguiente lección no completada
 * y la ofrece como acceso rápido desde el mapa.
 */
const setupContinueButton = (completedLessons) => {
    // Eliminar si ya existía (por recarga de UI)
    const existing = document.getElementById('fab-continue');
    if (existing) existing.remove();

    if (!currentProfile) return;

    // Encontrar el último módulo desbloqueado
    const unlocked = currentProfile.unlockedModules || ['m1'];
    
    // Buscar la primera lección no completada en el orden de los módulos
    let nextLesson = null;
    let moduleNum = 0;
    let lessonNum = 0;

    for (const modId of unlocked) {
        const mNum = parseInt(modId.replace('m', ''));
        // Asumimos 20 lecciones por módulo (estándar Moonsforest)
        for (let l = 1; l <= 20; l++) {
            const lId = `${modId}l${l}`;
            if (!completedLessons.includes(lId)) {
                nextLesson = lId;
                moduleNum = mNum;
                lessonNum = l;
                break;
            }
        }
        if (nextLesson) break;
    }

    if (!nextLesson) return; // Todo completado

    // Solo mostrar si llevan al menos 1 lección completada o están en M1L1 pero queremos motivar
    if (completedLessons.length === 0 && nextLesson === 'm1l1') return;

    const fab = document.createElement('button');
    fab.id = 'fab-continue';
    fab.innerHTML = `▶ Continuar <span style="opacity:0.8; font-size:0.8rem;">Lección ${moduleNum}.${lessonNum}</span>`;
    fab.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 1.5rem;
        z-index: 500;
        background: linear-gradient(135deg, #22c55e, #16a34a);
        color: white;
        border: none;
        border-radius: 99px;
        padding: 0.85rem 1.75rem;
        font-family: 'Outfit', sans-serif;
        font-size: 0.95rem;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 8px 24px rgba(34, 197, 94, 0.4);
        display: flex;
        align-items: center;
        gap: 0.6rem;
        transition: all 0.2s;
        animation: fabPulse 2.5s ease-in-out infinite;
    `;

    fab.onmouseenter = () => { fab.style.transform = 'translateY(-2px) scale(1.02)'; fab.style.boxShadow = '0 12px 32px rgba(34,197,94,0.5)'; };
    fab.onmouseleave = () => { fab.style.transform = ''; fab.style.boxShadow = '0 8px 24px rgba(34,197,94,0.4)'; };
    fab.onclick = () => window.location.href = `lesson.html?id=${nextLesson}`;

    // Añadir animación al stylesheet si no existe
    if (!document.getElementById('fab-style')) {
        const style = document.createElement('style');
        style.id = 'fab-style';
        style.textContent = `
            @keyframes fabPulse {
                0%, 100% { box-shadow: 0 8px 24px rgba(34,197,94,0.4); }
                50% { box-shadow: 0 8px 32px rgba(34,197,94,0.6); }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(fab);
};

const triggerPlacementTestPrompt = async () => {
    const { value: accept } = await Swal.fire({
        title: '🐻‍❄️ ¡Evaluación de Diagnóstico!',
        html: `
            <div style="text-align: left; font-size: 0.95rem;">
                <p>¡Hola! Soy Moon. ¿Quieres ver si ya sabes suficiente inglés para saltar algunos niveles?</p>
                <p>Responderemos <b>25 preguntas rápidas</b> para determinar tu lugar en la montaña.</p>
            </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: '¡Hacer el test!',
        cancelButtonText: 'Empezar desde el Módulo 1',
        confirmButtonColor: '#38bdf8',
        cancelButtonColor: '#64748b'
    });

    if (accept) {
        startPlacementTest();
    } else {
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, { placementTestDone: true });
        currentProfile.placementTestDone = true;
    }
};

const startPlacementTest = async () => {
    let score = 0;

    // 25 preguntas de opción múltiple (5 por nivel, 5 niveles)
    const questions = [
        // --- Nivel 1 (M1): Saludos, pronombres y emociones básicas ---
        { q: '¿Cómo se dice "Hola"?',              opts: ['Hello', 'Goodbye', 'Thank you', 'Yes'],         a: 'Hello' },
        { q: 'I ___ happy.',                        opts: ['am', 'is', 'are', 'be'],                       a: 'am' },
        { q: '¿Cómo se dice "Niña"?',               opts: ['Girl', 'Boy', 'Student', 'Happy'],             a: 'Girl' },
        { q: 'You ___ my student.',                 opts: ['are', 'is', 'am', 'be'],                       a: 'are' },
        { q: '¿Cómo se dice "Adiós"?',              opts: ['Goodbye', 'Hello', 'Good night', 'Ready'],     a: 'Goodbye' },
        // --- Nivel 2 (M2): Animales, colores y descripciones básicas ---
        { q: 'It ___ a big bear.',                  opts: ['is', 'are', 'am', 'be'],                       a: 'is' },
        { q: '¿Cuál es el opuesto de "Big"?',       opts: ['Small', 'Tall', 'Fast', 'Old'],                a: 'Small' },
        { q: 'They ___ birds.',                     opts: ['are', 'is', 'am', 'was'],                      a: 'are' },
        { q: '¿De qué color es un "Blue bird"?',    opts: ['Blue', 'Red', 'Green', 'Yellow'],              a: 'Blue' },
        { q: 'The forest ___ big and green.',       opts: ['is', 'are', 'am', 'be'],                       a: 'is' },
        // --- Nivel 3 (M3): Posesivos, have/has y preposiciones ---
        { q: 'He ___ a brother.',                   opts: ['has', 'have', 'is', 'are'],                    a: 'has' },
        { q: 'Where ___ you from?',                 opts: ['are', 'is', 'am', 'were'],                     a: 'are' },
        { q: 'I ___ have a car. (No tengo)',        opts: ["don't", "doesn't", "isn't", "aren't"],         a: "don't" },
        { q: 'The cat is ___ the table.',           opts: ['on', 'in', 'at', 'of'],                        a: 'on' },
        { q: 'My name ___ Moon.',                   opts: ['is', 'are', 'am', 'be'],                       a: 'is' },
        // --- Nivel 4 (M4): Pasado simple, progresivo y vocabulario ---
        { q: 'Yesterday I ___ to the park.',        opts: ['went', 'go', 'goes', 'gone'],                  a: 'went' },
        { q: 'I ___ eating right now.',             opts: ['am', 'is', 'are', 'be'],                       a: 'am' },
        { q: '"Mañana" en inglés es:',              opts: ['Tomorrow', 'Yesterday', 'Today', 'Later'],     a: 'Tomorrow' },
        { q: 'Can you ___ me? (ayudar)',            opts: ['help', 'helps', 'helped', 'helping'],          a: 'help' },
        { q: 'This is ___ book.',                   opts: ['my', 'me', 'I', 'mine'],                       a: 'my' },
        // --- Nivel 5 (M5): Verbos modales, cláusulas y estructura avanzada ---
        { q: 'I want ___ sleep.',                   opts: ['to', 'for', 'at', 'on'],                       a: 'to' },
        { q: 'How ___ is this?',                    opts: ['much', 'many', 'more', 'most'],                a: 'much' },
        { q: 'You ___ be careful.',                 opts: ['should', 'shall', 'would', 'going'],           a: 'should' },
        { q: 'I think ___ it is raining.',          opts: ['that', 'which', 'what', 'who'],                a: 'that' },
        { q: 'There ___ many people here.',         opts: ['are', 'is', 'am', 'be'],                       a: 'are' },
    ];

    // Pantalla de inicio
    await Swal.fire({
        title: '🐻‍❄️ ¡Test de Nivelación!',
        html: `<p style="font-size:0.95rem; color:#475569; line-height:1.6;">
            25 preguntas para encontrar tu lugar en el bosque.<br>
            <strong>Toca la respuesta correcta.</strong> ¡No hay trampas!
        </p>`,
        footer: '⏱ Solo tarda unos minutos',
        confirmButtonText: '¡Comenzar! ▶',
        confirmButtonColor: '#38bdf8',
        allowOutsideClick: false
    });

    for (let i = 0; i < questions.length; i++) {
        const item = questions[i];
        // Mezclar opciones
        const shuffled = [...item.opts].sort(() => Math.random() - 0.5);

        const answered = await new Promise(resolve => {
            Swal.fire({
                title: `Pregunta ${i + 1} / ${questions.length}`,
                html: `
                    <div style="font-family:'Outfit',sans-serif;">
                        <div style="background:#f8fafc; border-radius:12px; padding:1rem 1.25rem; margin-bottom:1.25rem; border-left:4px solid #38bdf8;">
                            <p style="font-size:1.05rem; font-weight:600; color:#1e293b; margin:0;">${item.q}</p>
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;" id="opts-grid">
                            ${shuffled.map(opt => `
                                <button
                                    class="swal-opt-btn"
                                    onclick="window.__placementAnswer('${opt}')"
                                    style="
                                        background: white;
                                        border: 2px solid #e2e8f0;
                                        border-radius: 12px;
                                        padding: 0.85rem 0.5rem;
                                        font-size: 1rem;
                                        font-weight: 600;
                                        color: #334155;
                                        cursor: pointer;
                                        transition: all 0.15s;
                                        font-family: 'Outfit', sans-serif;
                                    "
                                    onmouseover="this.style.borderColor='#38bdf8'; this.style.background='#f0f9ff'"
                                    onmouseout="this.style.borderColor='#e2e8f0'; this.style.background='white'"
                                >${opt}</button>
                            `).join('')}
                        </div>
                        <p style="font-size:0.75rem; color:#94a3b8; margin-top:1rem; text-align:center;">
                            🐻‍❄️ Progreso: ${i}/${questions.length} — ${Math.round((i/questions.length)*100)}%
                        </p>
                    </div>
                `,
                showConfirmButton: false,
                showCancelButton: false,
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => {
                    window.__placementAnswer = (chosen) => resolve(chosen);
                }
            });
        });

        const correct = answered === item.a;
        if (correct) score++;

        // Feedback rápido (800ms)
        await Swal.fire({
            html: correct
                ? `<div style="font-size:2.5rem;">✅</div><p style="color:#059669; font-weight:700; font-size:1.1rem; margin:0.5rem 0 0;">¡Correcto!</p>`
                : `<div style="font-size:2.5rem;">❌</div><p style="color:#ef4444; font-weight:700; font-size:1.1rem; margin:0.5rem 0 0;">Era: <strong>${item.a}</strong></p>`,
            timer: 900,
            showConfirmButton: false,
            allowOutsideClick: false,
            width: 200,
            padding: '1.5rem'
        });
    }

    // Limpiar función global
    delete window.__placementAnswer;


    // Calcular nivel (puntaje sobre 25)
    // Umbrales: ~88% = M5, ~68% = M4, ~48% = M3, ~28% = M2
    let unlocked = ['m1'];
    let freeModuleId = 'm1';

    if (score >= 22) { 
        unlocked = ['m1', 'm2', 'm3', 'm4', 'm5']; 
        freeModuleId = 'm5'; 
    }
    else if (score >= 17) { 
        unlocked = ['m1', 'm2', 'm3', 'm4']; 
        freeModuleId = 'm4'; 
    }
    else if (score >= 12) { 
        unlocked = ['m1', 'm2', 'm3']; 
        freeModuleId = 'm3'; 
    }
    else if (score >= 7)  { 
        unlocked = ['m1', 'm2']; 
        freeModuleId = 'm2'; 
    }

    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, {
        unlockedModules: unlocked,
        freeModuleId: freeModuleId,
        placementTestDone: true,
        placementScore: score
    });

    currentProfile.unlockedModules = unlocked;
    currentProfile.freeModuleId = freeModuleId;
    currentProfile.placementTestDone = true;

    await Swal.fire({
        title: '¡Prueba Terminada!',
        html: `
            <div style="text-align: center;">
                <p style="font-size: 3rem;">🏔️</p>
                <p>Puntaje: <b>${score}/25</b></p>
                <p>Has desbloqueado hasta el: <b>Módulo ${unlocked.length}</b></p>
                <p>¡Disfruta tu aventura!</p>
            </div>
        `,
        icon: 'success',
        confirmButtonColor: '#38bdf8'
    });

    setupModuleUnlocks(unlocked);
};

const cleanExpiredAppointments = async () => {
    if (!currentUser) return;
    try {
        const q = query(collection(db, "slots"), where("studentId", "==", currentUser.uid), where("status", "in", ["booked", "needs_sub"]));
        const snap = await getDocs(q);
        const now = new Date();

        for (const d of snap.docs) {
            const data = d.data();
            const slotEndTime = new Date(`${data.date}T${data.startTime}`);
            slotEndTime.setMinutes(slotEndTime.getMinutes() + 25);

            if (slotEndTime < now) {
                // Si la sesión pasó y no fue marcada como completada (ya que aquí status es booked/needs_sub)
                // Liberamos el slot y devolvemos crédito si era needs_sub (nadie llegó)
                const slotRef = doc(db, 'slots', d.id);
                await updateDoc(slotRef, {
                    status: 'available',
                    studentId: deleteField(),
                    studentName: deleteField(),
                    studentEmail: deleteField(),
                    studentAvatar: deleteField(),
                    evaluationType: deleteField(),
                    bookedAt: deleteField()
                });

                if (data.status === 'needs_sub') {
                    const userRef = doc(db, 'users', currentUser.uid);
                    await updateDoc(userRef, {
                        evalCredits: (currentProfile.evalCredits || 0) + 1
                    });
                    currentProfile.evalCredits = (currentProfile.evalCredits || 0) + 1;
                }
            }
        }
    } catch (e) {
        console.error("Error limpiando citas expiradas:", e);
    }
};

window.startAutomatedJumpEval = async () => {
    if (!currentProfile) return;

    // Si nunca ha hecho el test de diagnóstico, lo iniciamos
    if (!currentProfile.placementTestDone) {
        await triggerPlacementTestPrompt();
    } else {
        // Si ya lo hizo, le informamos que su nivel ya fue asignado
        Swal.fire({
            title: '¡Nivel Asignado!',
            text: 'Ya realizaste tu evaluación de diagnóstico y encontraste tu lugar en el bosque. ¡Sigue explorando para avanzar!',
            icon: 'info',
            confirmButtonColor: '#38bdf8'
        });
    }
};

const loadAppointments = async () => {

    const widget = document.getElementById('appointment-widget');
    const details = document.getElementById('appointment-details');
    const actions = document.getElementById('appointment-actions');

    if (!currentUser || !widget) return;

    try {
        const q = query(collection(db, "slots"), where("studentId", "==", currentUser.uid), where("status", "in", ["booked", "needs_sub"]));
        const querySnapshot = await getDocs(q);

        const now = new Date();
        // Filtrar citas cuya hora de finalización (hora inicio + 25 mins de holgura) ya pasó
        const validDocs = querySnapshot.docs.filter(doc => {
            const data = doc.data();
            const slotEndTime = new Date(`${data.date}T${data.startTime}`);
            slotEndTime.setMinutes(slotEndTime.getMinutes() + 25);
            return slotEndTime > now;
        });

        if (validDocs.length === 0) {
            widget.style.display = 'none';
            return;
        }

        // Ordenar para tomar la cita más próxima
        validDocs.sort((a, b) => {
            const dateA = new Date(`${a.data().date}T${a.data().startTime}`);
            const dateB = new Date(`${b.data().date}T${b.data().startTime}`);
            return dateA - dateB;
        });

        // Tomar la cita más cercana
        const appointmentDoc = validDocs[0];
        const appointment = appointmentDoc.data();
        const appointmentId = appointmentDoc.id;

        // Usamos 'teachers' para que el alumno tenga permiso de ver el Zoom link
        const teacherRef = doc(db, 'teachers', appointment.teacherId);
        const teacherSnap = await getDoc(teacherRef);
        const teacherData = teacherSnap.exists() ? teacherSnap.data() : null;

        widget.style.display = 'flex';
        details.innerHTML = `
            Evaluación: <strong>${appointment.evaluationType || 'General'}</strong><br>
            Con: <strong>Prof. ${appointment.teacherName || 'Guardián'}</strong><br>
            Fecha: <strong>${appointment.date} a las ${appointment.startTime} hrs</strong>
        `;

        actions.innerHTML = '';
        actions.style.display = 'flex';
        actions.style.flexDirection = 'column';
        actions.style.alignItems = 'flex-start';
        actions.style.gap = '0.5rem';

        // Timer Container
        const timerContainer = document.createElement('div');
        timerContainer.id = 'zoom-timer-container';
        timerContainer.style.fontSize = '0.85rem';
        timerContainer.style.color = '#cbd5e1';
        actions.appendChild(timerContainer);

        let intervalId = null;

        const updateTimer = () => {
            const targetTime = new Date(`${appointment.date}T${appointment.startTime}`);
            const now = new Date();
            const diffMs = targetTime - now;

            if (diffMs <= 60000) { // 1 min o menos (o ya es hora)
                if (intervalId) clearInterval(intervalId);
                timerContainer.innerHTML = '';

                if (appointment.status === 'needs_sub') {
                    // Maestro suplente no encontrado y ya es hora
                    if (!window.notifiedMissingTeacher) {
                        window.notifiedMissingTeacher = true;

                        Swal.fire({
                            title: 'Buscando sala...',
                            allowOutsideClick: false,
                            didOpen: () => { Swal.showLoading(); }
                        });

                        const slotRef = doc(db, 'slots', appointmentId);
                        updateDoc(slotRef, {
                            status: 'available',
                            studentId: deleteField(),
                            studentName: deleteField(),
                            studentEmail: deleteField(),
                            studentAvatar: deleteField(),
                            evaluationType: deleteField(),
                            bookedAt: deleteField()
                        }).then(async () => {
                            const userRef = doc(db, 'users', currentUser.uid);
                            const currentCredits = currentProfile.evalCredits || 0;
                            await updateDoc(userRef, {
                                evalCredits: currentCredits + 1
                            });
                            currentProfile.evalCredits = currentCredits + 1;

                            await Swal.fire({
                                title: 'Profesor No Disponible',
                                text: 'Lamentablemente tu Guardián tuvo una emergencia de último minuto y no pudimos encontrar un suplente a tiempo. Tu clase ha sido cancelada y se ha devuelto 1 crédito a tu cuenta automáticamente. Disculpa las molestias.',
                                icon: 'warning',
                                confirmButtonColor: '#f97316',
                                borderRadius: '24px'
                            });
                            loadAppointments();
                        });
                    }
                } else {
                    // Mostrar botón de Zoom
                    let existingLink = actions.querySelector('#zoom-link-btn');
                    if (!existingLink && teacherData?.zoomLink) {
                        const link = document.createElement('a');
                        link.id = 'zoom-link-btn';
                        link.href = teacherData.zoomLink;
                        link.target = '_blank';
                        link.className = 'btn';
                        link.style.background = '#f97316';
                        link.style.color = 'white';
                        link.style.fontSize = '0.85rem';
                        link.style.padding = '0.6rem 1.2rem';
                        link.textContent = '➡️ Entrar a la Sala';
                        // Lo insertamos siempre al principio del contenedor actions
                        actions.insertBefore(link, actions.firstChild);
                    }
                }
            } else {
                // Faltan más de 1 min, mostrar cuenta regresiva
                const totalSeconds = Math.floor(diffMs / 1000);
                const days = Math.floor(totalSeconds / 86400);
                const hours = Math.floor((totalSeconds % 86400) / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);

                let timeString = '';
                if (days > 0) timeString += `${days}d `;
                if (hours > 0) timeString += `${hours}h `;
                timeString += `${minutes}m`;

                timerContainer.innerHTML = `⏳ Disponible en: <strong>${timeString}</strong>`;
            }
        };

        if (teacherData?.zoomLink) {
            updateTimer();
            intervalId = setInterval(updateTimer, 60000); // Act. cada minuto
        }

        // Botón de Cancelar
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn';
        cancelBtn.style.background = 'transparent';
        cancelBtn.style.border = '1px solid #ef4444';
        cancelBtn.style.color = '#ef4444';
        cancelBtn.style.fontSize = '0.75rem';
        cancelBtn.style.padding = '0.4rem 0.8rem';
        cancelBtn.textContent = 'Cancelar Evaluación';

        cancelBtn.onclick = async () => {
            const result = await Swal.fire({
                title: '¿Seguro que deseas cancelar?',
                html: `
                    <p style="font-size:0.9rem; margin-bottom:1rem;">Tu lugar será liberado para que otro alumno pueda agendarlo.</p>
                    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 1rem; border-radius: 12px; text-align: left;">
                        <span style="font-weight: 700; color: #166534; display:block; margin-bottom:0.25rem;">💰 Reembolso Automático</span>
                        <span style="font-size: 0.85rem; color: #15803d;">Tu dinero será regresado en forma de <strong>1 Crédito de Evaluación</strong>, el cual podrás usar después para agendar otra evaluación.</span>
                    </div>
                `,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'Sí, cancelar cita',
                cancelButtonText: 'Mantener cita',
                borderRadius: '24px'
            });

            if (result.isConfirmed) {
                try {
                    Swal.fire({
                        title: 'Cancelando...',
                        allowOutsideClick: false,
                        didOpen: () => { Swal.showLoading(); }
                    });

                    // 1. Liberar Slot
                    const slotRef = doc(db, 'slots', appointmentId);
                    await updateDoc(slotRef, {
                        status: 'available',
                        studentId: deleteField(),
                        studentName: deleteField(),
                        studentEmail: deleteField(),
                        studentAvatar: deleteField(),
                        evaluationType: deleteField(),
                        bookedAt: deleteField()
                    });

                        // 2. Dar crédito al estudiante
                        const userRef = doc(db, 'users', currentUser.uid);
                        const currentCredits = currentProfile.evalCredits || 0;
                        await updateDoc(userRef, {
                            evalCredits: currentCredits + 1
                        });
                        currentProfile.evalCredits = currentCredits + 1; // update local

                        // 3. Notificar al maestro
                        const { sendDiscordNotification } = await import('./discord.js');
                        const displayName = currentUser.displayName || 'Un alumno';
                        await sendDiscordNotification(
                            "❌ Sesión Cancelada",
                            `¡Atención Prof. ${appointment.teacherName}!\n\n**${displayName}** ha cancelado su sesión agendada para el **${appointment.date} a las ${appointment.startTime} hrs**.\n\nEse horario ha sido liberado en el Marketplace nuevamente.`,
                            15548997 // Rojo
                        );

                        if (intervalId) clearInterval(intervalId);

                        await Swal.fire({
                            title: 'Cita Cancelada',
                            text: 'El espacio fue liberado y 1 crédito fue añadido a tu cuenta.',
                            icon: 'success',
                            confirmButtonColor: '#059669',
                            borderRadius: '24px'
                        });

                        loadAppointments(); // Recargar widget

                } catch (error) {
                    console.error("Error al cancelar cita:", error);
                    Swal.fire('Error', 'No pudimos cancelar esta cita. Intenta de nuevo.', 'error');
                }
            }
        };
        actions.appendChild(cancelBtn);

    } catch (error) {
        console.error("Error cargando citas:", error);
    }
};

const setupWeeklyPath = (progress) => {
    const today = new Date();
    const currentDayIndex = today.getDay(); // 0 (Domingo) a 6 (Sábado)
    const dayCircles = document.querySelectorAll('.day-circle');

    // Obtener las fechas de la semana actual (Domingo a Sábado)
    const weekDates = [];
    const firstDayOfWeek = new Date(today);
    firstDayOfWeek.setDate(today.getDate() - currentDayIndex);

    for (let i = 0; i < 7; i++) {
        const d = new Date(firstDayOfWeek);
        d.setDate(firstDayOfWeek.getDate() + i);
        weekDates.push(d.toISOString().split('T')[0]);
    }

    dayCircles.forEach(circle => {
        const dayIdx = parseInt(circle.dataset.day);
        const dateKey = weekDates[dayIdx];

        // Limpiar estados previos
        circle.classList.remove('active', 'today');

        // Marcar hoy
        if (dayIdx === currentDayIndex) {
            circle.classList.add('today');
        }

        // Marcar si hubo progreso ese día (basado en YYYY-MM-DD)
        if (progress && progress[dateKey] && progress[dateKey] > 0) {
            circle.classList.add('active');
        }
    });

    // Si hoy hay minutos hablados pero no está en el progreso, marcarlo activo visualmente
    const minsToday = parseInt(document.getElementById('minutes-spoken-today')?.textContent || '0');
    if (minsToday > 0) {
        const todayCircle = document.querySelector(`.day-circle[data-day="${currentDayIndex}"]`);
        if (todayCircle) todayCircle.classList.add('active');
    }
};

// Auth and DB Check
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        // Obtener usuario efectivo (soporta impersonate)
        const effectiveUser = await getEffectiveUser();
        currentUser = effectiveUser;

        try {
            const docRef = doc(db, 'users', currentUser.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                currentProfile = docSnap.data();
                setupDashboardUI();
            } else {
                console.warn("Perfil de usuario no encontrado en Firestore.");
            }

        } catch (error) {
            console.error("Error cargando perfil del dashboard:", error);
        }
    });

    // Moon Interaction
    const moonPhrases = [
        "¿Sabías que English Peak es la montaña más alta?",
        "Tómate tu tiempo en el Campamento Base.",
        "Si sientes que esto es muy fácil, pide una evaluación con un humano. 🚁",
        "Ese avatar te queda increíble, por cierto."
    ];

    moonTrigger.addEventListener('click', () => {
        const randomPhrase = moonPhrases[Math.floor(Math.random() * moonPhrases.length)];
        moonText.innerHTML = randomPhrase;
        moonText.style.opacity = 1;
        moonText.style.transform = 'translateY(0) scale(1)';

        // Hide after 4 seconds
        setTimeout(() => {
            moonText.style.opacity = 0;
            moonText.style.transform = 'translateY(10px) scale(0.9)';
        }, 4000);
    });
});
