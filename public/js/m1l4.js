import { MoonsforestEngine } from './moduleEngine.js';
import { auth, db } from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Lección 1.4: Eco Profundo (Integración de Todo)
const phrases = [
    { word: 'Good morning', displayWord: 'Buenos días' },
    { word: 'My name is Moon', displayWord: 'Mi nombre es Moon' },
    { word: 'I am a student', displayWord: 'Yo soy estudiante' },
    { word: 'You speak English', displayWord: 'Tú hablas inglés' },
    { word: 'Listen to the forest', displayWord: 'Escucha al bosque' }
];

function generateLesson(phraseList) {
    let generatedSteps = [];

    // Esta lección va directo a oraciones sin vocabulario suelto
    generatedSteps.push({
        type: 'echo_chamber',
        prompt: `¡Eco Profundo! En esta lección leerás las oraciones completas.`,
        word: 'Hello Moon',
        successMsg: '¡Esa es la actitud!'
    });

    // Práctica de Traducciones (Memoria Pura)
    const shuffledPhrases = [...phraseList].sort(() => Math.random() - 0.5);

    shuffledPhrases.forEach((item) => {
        generatedSteps.push({
            type: 'echo_chamber',
            prompt: `💡 Piensa en inglés:`,
            word: item.word,
            displayWord: item.displayWord,
            successMsg: '¡Oración perfecta!'
        });
    });
    // Mezcla de Dictados con Drag and Drop para probar la lectura y la retención
    generatedSteps.push({
        type: 'drag_and_drop',
        prompt: `¡Hora de ordenar! Forma: "Mi nombre es Moon"`,
        target: 'My name is Moon',
        options: ['name', 'Moon', 'My', 'is']
    });

    generatedSteps.push({
        type: 'drag_and_drop',
        prompt: `Arma la frase: "Tú hablas inglés"`,
        target: 'You speak English',
        // Shuffle manual para options
        options: ['English', 'You', 'speak']
    });

    return generatedSteps;
}

const lessonData = generateLesson(phrases);

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
                        if (!completedLessons.includes('m1l4')) {
                            completedLessons.push('m1l4');
                        }

                        await updateDoc(userRef, {
                            minutesSpokenToday: currentMinutes + minutes,
                            lastSpokenDate: today,
                            completedLessons: completedLessons
                        });
                        console.log(`¡Progreso guardado!: +${minutes} mins, m1l4 completada.`);
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
