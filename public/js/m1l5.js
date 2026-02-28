import { MoonsforestEngine } from './moduleEngine.js';
import { auth, db } from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Lección 1.5: La Fogata (El Reto Final del Nivel)
const finalChallenge = [
    { word: 'Hello good morning', displayWord: 'Hola, buenos días' },
    { word: 'My name is Moon', displayWord: 'Mi nombre es Moon' },
    { word: 'I speak English', displayWord: 'Yo hablo inglés' },
    { word: 'I am a good student', displayWord: 'Yo soy un buen estudiante' },
    { word: 'Listen to the forest', displayWord: 'Escucha al bosque' },
    { word: 'Goodbye good night', displayWord: 'Adiós, buenas noches' }
];

function generateLesson(phraseList) {
    let generatedSteps = [];

    generatedSteps.push({
        type: 'echo_chamber',
        prompt: `🔥 ¡Bienvenido a La Fogata, el jefe de este nivel! Demuestra lo que sabes.`,
        word: 'I am ready',
        displayWord: 'Estoy listo',
        successMsg: '¡Que empiece la prueba!'
    });

    // Práctica de Traducciones Exigentes (Al azar)
    const shuffledPhrases = [...phraseList].sort(() => Math.random() - 0.5);

    shuffledPhrases.forEach((item) => {
        generatedSteps.push({
            type: 'echo_chamber',
            prompt: `💡 Piensa y dilo fuerte para que todos en la fogata te escuchen:`,
            word: item.word,
            displayWord: item.displayWord,
            successMsg: '¡Esa oración fue brillante!'
        });
    });

    generatedSteps.push({
        type: 'echo_chamber',
        prompt: `🎉 ¡Último aliento! Grita de felicidad.`,
        word: 'I am the champion',
        displayWord: 'Yo soy el campeón',
        successMsg: '¡Felicidades! Superaste el Módulo 1.'
    });

    return generatedSteps;
}

const lessonData = generateLesson(finalChallenge);

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

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
                        if (!completedLessons.includes('m1l5')) {
                            completedLessons.push('m1l5');
                            // Aquí podrías agregar lógica para desbloquear el Módulo 2
                            // ej: data.completedModules.push('m1')
                        }

                        await updateDoc(userRef, {
                            minutesSpokenToday: currentMinutes + minutes,
                            lastSpokenDate: today,
                            completedLessons: completedLessons
                        });
                        console.log(`¡Progreso guardado!: +${minutes} mins, m1l5 completada!`);
                    }
                } catch (error) {
                    console.error("Error actualizando minutos hablados:", error);
                }
            }
        });

        // Este engine podría retornar directo a mappa principal en lugar de module1
        new MoonsforestEngine('learning-container', lessonData, {
            returnUrl: 'mapa.html'
        });
    });
});
