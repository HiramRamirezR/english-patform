import { MoonsforestEngine } from './moduleEngine.js';
import { getLessonConfig } from './courseData.js';
import { auth, db } from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // 1. Extraer ID de la lección de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const lessonId = urlParams.get('id');

    if (!lessonId) {
        alert("No se especificó ninguna lección. Regresando...");
        window.location.href = "mapa.html";
        return;
    }

    // 2. Cargar Configuración desde nuestra "Base de Datos" de lecciones
    const config = getLessonConfig(lessonId);

    if (config.steps.length === 0) {
        alert("Esta lección aún está en construcción.");
        const mid = lessonId ? lessonId.substring(0, 2) : 'm1';
        window.location.href = `module.html?id=${mid}`;
        return;
    }

    // 3. Pintar en el HTML
    document.title = `${config.title} | Moonsforest`;
    document.getElementById('lesson-title').innerText = config.title;

    // Configurar Botón de Volver
    const btnBack = document.getElementById('btn-back');
    btnBack.addEventListener('click', () => {
        window.location.href = config.returnUrl;
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
                    }
                } catch (error) {
                    console.error("Error actualizando base de datos:", error);
                }
            }
        });

        // 5. Iniciar la clase de aprendizaje
        new MoonsforestEngine('learning-container', config.steps, {
            returnUrl: config.returnUrl
        });
    });
});
