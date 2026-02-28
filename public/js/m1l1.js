import { MoonsforestEngine } from './moduleEngine.js';
import { auth, db } from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Diccionario base para la Lección 1.1: Los Primeros Sonidos
const vocabulary = [
    { word: 'Hello', translation: 'Hola' },
    { word: 'Hi', translation: 'Hola (Informal)' },
    { word: 'Goodbye', translation: 'Adiós' },
    { word: 'Bye', translation: 'Adiós (Corto)' },
    { word: 'Good morning', translation: 'Buenos días' },
    { word: 'Good night', translation: 'Buenas noches' }
];

// Generador de Repetición Espaciada para crear lecciones largas automáticamente
function generateLesson(vocabList) {
    let generatedSteps = [];

    // Paso Inicial: Presentar todo el vocabulario de golpe (Listen & Click)
    generatedSteps.push({
        type: 'listen_click',
        prompt: '1. Toca cada tarjeta y escucha con atención. ¡Repite la palabra en voz alta para aprendértela!',
        cards: vocabList
    });

    // Fase 1: Práctica Aislada (Echo Chamber x 2 veces por palabra)
    // El niño repite sin distracciones cada palabra nueva
    vocabList.forEach((item, index) => {
        generatedSteps.push({
            type: 'echo_chamber',
            prompt: `¡Tu turno! Presiona el micrófono y lee la palabra en voz alta.`,
            word: item.word,
            successMsg: '¡Excelente! Sigamos con la próxima.'
        });
    });

    // Fase 2: Repaso de Traducciones Inversas (Memoria Pura)
    // Mostramos español, pedimos que diga el inglés
    const shuffledTranslations = [...vocabList].sort(() => Math.random() - 0.5);

    shuffledTranslations.forEach((item, index) => {
        generatedSteps.push({
            type: 'echo_chamber',
            prompt: `💡 Pensemos en inglés: ¿Cómo dirías esto?`,
            word: item.word,               // La validación interna es en Inglés (Target)
            displayWord: item.translation, // Pero la pantalla muestra el español
            successMsg: '¡Esa es la traducción perfecta!'
        });
    });

    // Fase 3: Práctica de Pares (Hablar 2 cosas sin ayuda)
    generatedSteps.push({
        type: 'echo_chamber',
        prompt: `¡Reto Final! Une estos dos saludos (dilos en inglés).`,
        word: 'Hello Good morning',
        displayWord: 'Hola, Buenos días.',
        successMsg: '¡Increíble! Ya estás uniendo oraciones.'
    });

    generatedSteps.push({
        type: 'echo_chamber',
        prompt: `Última prueba del día. Despídete para ir a dormir.`,
        word: 'Goodbye Good night',
        displayWord: 'Adiós, Buenas noches.',
        successMsg: '¡Perfecto! Has dominado The Clearing.'
    });

    return generatedSteps;
}

const lessonData = generateLesson(vocabulary);

// Iniciar aplicación cuando cargue la página 
document.addEventListener('DOMContentLoaded', () => {
    // Requerir autenticación básica (Opcional, pero buena práctica)
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        // Event listener para cuando la lección se complete
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
                            currentMinutes = 0; // reset for a new day
                        }

                        let completedLessons = data.completedLessons || [];
                        if (!completedLessons.includes('m1l1')) {
                            completedLessons.push('m1l1');
                        }

                        await updateDoc(userRef, {
                            minutesSpokenToday: currentMinutes + minutes,
                            lastSpokenDate: today,
                            completedLessons: completedLessons
                        });
                        console.log(`¡Progreso guardado!: +${minutes} mins, m1l1 completada.`);
                    }
                } catch (error) {
                    console.error("Error actualizando minutos hablados:", error);
                }
            }
        });

        // Inicializar Motor apuntando de regreso al mapa del módulo
        new MoonsforestEngine('learning-container', lessonData, {
            returnUrl: 'module1.html'
        });
    });
});
