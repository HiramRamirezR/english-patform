import { MoonsforestEngine } from './moduleEngine.js';
import { auth, db, getEffectiveUser } from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { sendDiscordNotification } from './discord.js';
import { generateStepsFromFlow } from './stepGenerator.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Extraer ID de la lección de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const lessonId = urlParams.get('id');

    if (!lessonId) {
        alert("No se especificó ninguna lección. Regresando...");
        window.location.href = "mapa.html";
        return;
    }

    let moduleId;
    if (lessonId === 'daily_practice') {
        moduleId = urlParams.get('module') || 'm1'; // fallback a m1
    } else {
        moduleId = lessonId.substring(0, 2); // ie 'm1'
    }
    let configModule;
    let globals;
    let dictionary = {};
    try {
        const [moduleRes, globalsRes, dictRes] = await Promise.all([
            fetch(`/data/${moduleId}.json`),
            fetch(`/data/globals.json`),
            fetch(`/data/dictionary.json`)
        ]);

        if (!moduleRes.ok) throw new Error("Módulo no encontrado");
        configModule = await moduleRes.json();

        if (globalsRes.ok) {
            globals = await globalsRes.json();
        }

        if (dictRes.ok) {
            dictionary = await dictRes.json();
        }
    } catch (error) {
        console.error("Error cargando el módulo:", error);
        alert("La base de datos de este módulo no está lista aún.");
        window.location.href = `module.html?id=${moduleId}`;
        return;
    }

    // Mezclar recursos (los del módulo tienen prioridad)
    const mergedResources = {
        prompts: { ...(globals?.prompts || {}), ...(configModule.resources?.prompts || {}) },
        successMessages: { ...(globals?.successMessages || {}), ...(configModule.resources?.successMessages || {}) }
    };

    let lessonConfig;

    if (lessonId === 'daily_practice') {
        // Generar Práctica Infinita Aleatoria
        let allVocab = [];
        configModule.lessons.forEach(l => {
            if (l.vocab_new) allVocab.push(...l.vocab_new);
            if (l.vocab_review) allVocab.push(...l.vocab_review);
        });
        // Deduplicar e ignorar frases demasiado largas si queremos
        allVocab = [...new Set(allVocab)];

        // Pick 6-8 random words
        allVocab.sort(() => Math.random() - 0.5);
        const selectedVocab = allVocab.slice(0, 8);

        lessonConfig = {
            id: "daily_practice",
            title: "Práctica Infinita",
            desc: "Repaso Aleatorio",
            vocab_new: selectedVocab.slice(0, 4),
            vocab_review: selectedVocab.slice(4, 8),
            story: {
                en: "Welcome to your infinite daily practice! Let's mix things up.",
                es: "¡Bienvenido a tu práctica diaria infinita!"
            },
            flow: [
                "story_moment",
                "echo_chamber",
                "picture_it",
                "echo_chamber_translation",
                "speed_speak",
                "memory_flip",
                "matching",
                "boss_battle"
            ]
        };
    } else {
        lessonConfig = configModule.lessons.find(l => l.id === lessonId);
    }

    if (!lessonConfig || (!lessonConfig.steps && !lessonConfig.flow)) {
        alert("Esta lección aún está en construcción.");
        window.location.href = `module.html?id=${moduleId}`;
        return;
    }

    // Generar dynamic steps usando el Nivel 1 si 'flow' y 'vocab_new' existen
    let finalSteps = lessonConfig.steps || [];
    if (lessonConfig.flow) {
        finalSteps = generateStepsFromFlow(lessonConfig, dictionary);
    }

    if (finalSteps.length === 0) {
        alert("Error generando pasos para la lección.");
        window.location.href = `module.html?id=${moduleId}`;
        return;
    }

    // 3. Pintar en el HTML
    document.title = `${lessonConfig.title} | Moonsforest`;
    document.getElementById('lesson-title').innerText = lessonConfig.title;

    // Configurar Botón de Volver
    const btnBack = document.getElementById('btn-back');
    btnBack.addEventListener('click', () => {
        window.location.href = `module.html?id=${moduleId}`;
    });

    // 4. Arrancar Autenticación y Motor
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        const effectiveUser = await getEffectiveUser();
        const effectiveUid = effectiveUser.uid;

        // Listener de progresión
        document.addEventListener('lessonCompleted', async (e) => {
            const minutes = e.detail.minutes;
            if (minutes > 0) {
                try {
                    const userRef = doc(db, 'users', effectiveUid);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        const data = userSnap.data();
                        const today = new Date().toISOString().split('T')[0];

                        let currentMinutes = data.minutesSpokenToday || 0;
                        if (data.lastSpokenDate !== today) {
                            currentMinutes = 0;
                        }

                        let completedLessons = data.completedLessons || [];
                        if (!completedLessons.includes(lessonId)) {
                            completedLessons.push(lessonId);
                        }

                        let moduleStars = data.moduleStars || {};
                        const starsEarned = e.detail.stars || 0;
                        const currentStars = moduleStars[lessonId] || 0;

                        // Solo guardar si ganaron más estrellas que su récord previo
                        if (starsEarned > currentStars) {
                            moduleStars[lessonId] = starsEarned;
                        }

                        await updateDoc(userRef, {
                            minutesSpokenToday: currentMinutes + minutes,
                            lastSpokenDate: today,
                            completedLessons: completedLessons,
                            moduleStars: moduleStars
                        });
                        console.log(`¡Progreso guardado!: +${minutes} mins, ${lessonId} completada.`);

                        // Notificar a Discord (Opcional: No notificar si es impersonated)
                        if (!effectiveUser.isImpersonated) {
                            const userName = data.name || "Un viajero anónimo";
                            await sendDiscordNotification(
                                "🎓 Lección Completada",
                                `**${userName}** acaba de completar la lección **${lessonConfig.title}** y acumuló +**${minutes}** minutos hablados.`,
                                5763719 // Verde
                            );
                        }
                    }
                } catch (error) {
                    console.error("Error actualizando base de datos:", error);
                }
            }
        });

        // 5. Iniciar la clase de aprendizaje
        new MoonsforestEngine('learning-container', finalSteps, {
            returnUrl: `module.html?id=${moduleId}`,
            resources: mergedResources,
            userId: effectiveUid,
            lessonId: lessonId,
            moduleId: moduleId
        });
    });
});
