import { MoonsforestEngine } from './moduleEngine.js';
import { auth, db } from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { sendDiscordNotification } from './discord.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Extraer ID de la lección de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const lessonId = urlParams.get('id');

    if (!lessonId) {
        alert("No se especificó ninguna lección. Regresando...");
        window.location.href = "mapa.html";
        return;
    }

    const moduleId = lessonId.substring(0, 2); // ie 'm1'
    let configModule;
    try {
        const response = await fetch(`/data/${moduleId}.json`);
        if (!response.ok) throw new Error("Módulo no encontrado");
        configModule = await response.json();
    } catch (error) {
        alert("La base de datos de este módulo no está lista aún.");
        window.location.href = `module.html?id=${moduleId}`;
        return;
    }

    const lessonConfig = configModule.lessons.find(l => l.id === lessonId);

    if (!lessonConfig || !lessonConfig.steps || lessonConfig.steps.length === 0) {
        alert("Esta lección aún está en construcción.");
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
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        // Listener de progresión
        document.addEventListener('lessonCompleted', async (e) => {
            const minutes = e.detail.minutes;
            if (minutes > 0) {
                try {
                    const userRef = doc(db, 'users', user.uid);
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

                        await updateDoc(userRef, {
                            minutesSpokenToday: currentMinutes + minutes,
                            lastSpokenDate: today,
                            completedLessons: completedLessons
                        });
                        console.log(`¡Progreso guardado!: +${minutes} mins, ${lessonId} completada.`);

                        // Notificar a Discord
                        const userName = data.name || "Un viajero anónimo";
                        await sendDiscordNotification(
                            "🎓 Lección Completada",
                            `**${userName}** acaba de completar la lección **${lessonConfig.title}** y acumuló +**${minutes}** minutos hablados.`,
                            5763719 // Verde
                        );
                    }
                } catch (error) {
                    console.error("Error actualizando base de datos:", error);
                }
            }
        });

        // 5. Iniciar la clase de aprendizaje
        new MoonsforestEngine('learning-container', lessonConfig.steps, {
            returnUrl: `module.html?id=${moduleId}`
        });
    });
});
