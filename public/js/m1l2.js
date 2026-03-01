import { MoonsforestEngine } from './moduleEngine.js';
import { auth, db } from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Diccionario base para la Lección 1.2: Presentaciones
const vocabulary = [
    { word: 'I am', translation: 'Yo soy / Yo estoy' },
    { word: 'You are', translation: 'Tú eres / Tú estás' },
    { word: 'My name is', translation: 'Mi nombre es' },
    { word: 'Boy', translation: 'Niño' },
    { word: 'Girl', translation: 'Niña' },
    { word: 'Student', translation: 'Estudiante' }
];

// Generador de Repetición Espaciada para crear lecciones
function generateLesson(vocabList) {
    let generatedSteps = [];

    // Paso Inicial: Presentar vocabulario
    generatedSteps.push({
        type: 'listen_click',
        prompt: '1. Aprende a presentarte. Toca y escucha. ¡Repite en voz alta!',
        cards: vocabList
    });

    // Fase 1: Práctica Aislada
    vocabList.forEach((item) => {
        generatedSteps.push({
            type: 'echo_chamber',
            prompt: `¡Tu turno! Lee la palabra en voz alta y claro.`,
            word: item.word,
            successMsg: '¡Muy bien pronunciado!'
        });
    });

    // Fase 2: Traducción Inversa
    const shuffledTranslations = [...vocabList].sort(() => Math.random() - 0.5);
    shuffledTranslations.forEach((item) => {
        generatedSteps.push({
            type: 'echo_chamber',
            prompt: `💡 Pensemos en inglés: ¿Cómo dices esto?`,
            word: item.word,
            displayWord: item.translation,
            successMsg: '¡Esa es la traducción perfecta!'
        });
    });

    // Fase 3: Práctica Estructural (Drag & Drop)
    generatedSteps.push({
        type: 'drag_and_drop',
        prompt: `¡Reto Final! Une las frases: "Yo soy estudiante".`,
        target: 'I am student',
        options: ['student', 'I', 'am', 'Girl']
    });

    generatedSteps.push({
        type: 'drag_and_drop',
        prompt: `Otra más: "Tú eres niño".`,
        target: 'You are Boy',
        options: ['Boy', 'are', 'You', 'am']
    });

    return generatedSteps;
}

const lessonData = generateLesson(vocabulary);

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
                        if (!completedLessons.includes('m1l2')) {
                            completedLessons.push('m1l2');
                        }

                        await updateDoc(userRef, {
                            minutesSpokenToday: currentMinutes + minutes,
                            lastSpokenDate: today,
                            completedLessons: completedLessons
                        });
                        console.log(`¡Progreso guardado!: +${minutes} mins, m1l2 completada.`);
                    }
                } catch (error) {
                    console.error("Error actualizando minutos hablados:", error);
                }
            }
        });

        new MoonsforestEngine('learning-container', lessonData, {
            returnUrl: 'module1.html'
        });
    });
});
