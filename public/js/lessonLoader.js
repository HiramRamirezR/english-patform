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
    const isReview = urlParams.get('review') === 'true';

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
            if (l.vocab_new) allVocab.push(...l.vocab_new.map(v => v.trim()));
            if (l.vocab_review) allVocab.push(...l.vocab_review.map(v => v.trim()));
        });
        
        // Deduplicar e ignorar palabras muy cortas para evitar ruido en voz
        allVocab = [...new Set(allVocab)].filter(w => w.length > 2);

        // Pick 4 random words (1/3 of before)
        allVocab.sort(() => Math.random() - 0.5);
        const selectedVocab = allVocab.slice(0, 4);

        lessonConfig = {
            id: "daily_practice",
            title: "Práctica Diaria",
            desc: "Repaso Rápido",
            vocab_new: selectedVocab,
            vocab_review: [],
            story: {
                en: "Time for a quick review! Let's play.",
                es: "¡Es hora de un repaso rápido! Vamos a jugar."
            },
            flow: [
                "story_moment",
                "listen_click",
                "echo_chamber",
                "picture_it",
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

    // 3. Verificar compatibilidad de SpeechRecognition antes de arrancar
    const hasSpeechSupport = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    if (!hasSpeechSupport && !isReview) {
        document.getElementById('skeleton-loader').style.display = 'none';
        const container = document.getElementById('learning-container');
        container.innerHTML = `
            <div style="text-align:center; padding:3rem 1.5rem; font-family:'Outfit',sans-serif; max-width:480px; margin:4rem auto;">
                <div style="font-size:4rem; margin-bottom:1rem;">🌲</div>
                <h2 style="color:white; font-size:1.3rem; margin-bottom:1rem;">Tu navegador no es compatible</h2>
                <p style="color:#94a3b8; font-size:0.95rem; line-height:1.6; margin-bottom:1.5rem;">
                    Moonsforest necesita <strong style="color:#7dd3fc;">Chrome</strong> o <strong style="color:#7dd3fc;">Edge</strong>
                    en tu computadora, o <strong style="color:#7dd3fc;">Chrome para Android</strong> en tu celular.
                </p>
                <div style="background:#1e293b; border-radius:16px; padding:1rem; margin-bottom:1.5rem; text-align:left;">
                    <p style="color:#cbd5e1; font-size:0.85rem; margin:0;">
                        📱 <strong>¿Cómo habilitarlo?</strong><br><br>
                        1. Abre este enlace en <strong>Chrome</strong><br>
                        2. Acepta el permiso de micrófono<br>
                        3. ¡El bosque te espera! 🌲
                    </p>
                </div>
                <button onclick="window.location.href='index.html'"
                    style="padding:0.8rem 2rem; background:linear-gradient(135deg,#22c55e,#16a34a); color:white; border:none; border-radius:99px; font-size:1rem; font-weight:700; cursor:pointer; font-family:'Outfit',sans-serif;">
                    ← Volver al inicio
                </button>
            </div>
        `;
        return;
    }

    // 4. Pintar en el HTML
    document.title = `${lessonConfig.title} | Moonsforest`;
    document.getElementById('lesson-title').innerText = lessonConfig.title;

    // Confirmación de salida (evita perder progreso)
    if (!isReview) {
        const confirmExit = (e) => {
            e.preventDefault();
            e.returnValue = '¿Seguro que quieres salir? Perderás tu progreso en esta lección.';
            return e.returnValue;
        };
        window.addEventListener('beforeunload', confirmExit);

        document.addEventListener('lessonCompleted', () => {
            window.removeEventListener('beforeunload', confirmExit);
        }, { once: true });
    }

    // Configurar Botón de Volver
    const btnBack = document.getElementById('btn-back');
    btnBack.addEventListener('click', (e) => {
        if (isReview || confirm('¿Seguro que quieres salir? Perderás tu progreso en esta lección.')) {
            window.location.href = `module.html?id=${moduleId}`;
        }
    });

    // 4. Arrancar Autenticación y Motor
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        const effectiveUser = await getEffectiveUser();
        const effectiveUid = effectiveUser.uid;

        // Listener de progresión (no guarda en modo repaso)
        document.addEventListener('lessonCompleted', async (e) => {
            if (isReview) return;
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

                        if (starsEarned > currentStars) {
                            moduleStars[lessonId] = starsEarned;
                        }

                        let weeklyProgress = data.weeklyProgress || {};
                        weeklyProgress[today] = (weeklyProgress[today] || 0) + minutes;

                        await updateDoc(userRef, {
                            minutesSpokenToday: currentMinutes + minutes,
                            lastSpokenDate: today,
                            completedLessons: completedLessons,
                            moduleStars: moduleStars,
                            weeklyProgress: weeklyProgress
                        });
                        window.devLog(`Progreso guardado: +${minutes} mins, ${lessonId} completada.`);

                        if (!effectiveUser.isImpersonated) {
                            const userName = data.name || "Un viajero anónimo";
                            await sendDiscordNotification(
                                "🎓 Lección Completada",
                                `**${userName}** acaba de completar la lección **${lessonConfig.title}** y acumuló +**${minutes}** minutos hablados.`,
                                5763719
                            );
                        }
                    }
                } catch (error) {
                    console.error("Error actualizando base de datos:", error);
                }
            }
        });

        // Determinar si es premium y datos de evaluación
        let isPremium = false;
        let userName = 'Estudiante';
        try {
            const userSnap = await getDoc(doc(db, 'users', effectiveUid));
            if (userSnap.exists()) {
                const data = userSnap.data();
                isPremium = data.isPremium === true;
                userName = data.name || 'Estudiante';
            }
        } catch (e) {
            console.warn("No se pudo verificar premium:", e);
        }

        // 5. Iniciar la clase de aprendizaje
        new MoonsforestEngine('learning-container', finalSteps, {
            returnUrl: `module.html?id=${moduleId}`,
            resources: mergedResources,
            userId: effectiveUid,
            userName: userName,
            lessonId: lessonId,
            moduleId: moduleId,
            evaluations: configModule.evaluations || [],
            isPremium: isPremium,
            isReview: isReview
        });
    });
});
