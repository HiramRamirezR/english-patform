import { MoonsforestEngine } from './moduleEngine.js';
import { auth, db } from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Diccionario base para la Lección 1.3: Construcción
const vocabulary = [
    { word: 'Speak', translation: 'Hablar' },
    { word: 'Listen', translation: 'Escuchar' },
    { word: 'English', translation: 'Inglés' },
    { word: 'To', translation: 'A / Hacia' }
];

function generateLesson(vocabList) {
    let generatedSteps = [];

    // Paso Inicial
    generatedSteps.push({
        type: 'listen_click',
        prompt: '1. Reconoce estos verbos de acción. ¡Tócalos y repítelos fuerte!',
        cards: vocabList
    });

    // Fase 1: Práctica Aislada
    vocabList.forEach((item) => {
        generatedSteps.push({
            type: 'echo_chamber',
            prompt: `¡Dale voz al verbo!`,
            word: item.word,
            successMsg: '¡Esa pronunciación es perfecta!'
        });
    });

    // Fase 2: Traducción Inversa
    const shuffledTranslations = [...vocabList].sort(() => Math.random() - 0.5);
    shuffledTranslations.forEach((item) => {
        generatedSteps.push({
            type: 'echo_chamber',
            prompt: `💡 Piensa rápido: ¿Cómo lo dices en inglés?`,
            word: item.word,
            displayWord: item.translation,
            successMsg: '¡Traducción exacta!'
        });
    });

    // Fase 3: Práctica de Oraciones (Drag & Drop)
    generatedSteps.push({
        type: 'drag_and_drop',
        prompt: `¡Reto Final! Ordena las palabras para formar la frase en inglés: "Yo hablo inglés."`,
        target: 'I speak English',
        // Podemos añadir palabras que lo confundan o simplemente dejar que el motor las construya barajando target
        options: ['English', 'speak', 'I', 'listen']
    });

    generatedSteps.push({
        type: 'drag_and_drop',
        prompt: `Otra más: "Escúchame a mí."`,
        target: 'Listen to me',
        options: ['to', 'me', 'Listen', 'speak']
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
                        if (!completedLessons.includes('m1l3')) {
                            completedLessons.push('m1l3');
                        }

                        await updateDoc(userRef, {
                            minutesSpokenToday: currentMinutes + minutes,
                            lastSpokenDate: today,
                            completedLessons: completedLessons
                        });
                        console.log(`¡Progreso guardado!: +${minutes} mins, m1l3 completada.`);
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
