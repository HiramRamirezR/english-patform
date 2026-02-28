import { MoonsforestEngine } from './moduleEngine.js';
import { auth, db } from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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
        prompt: '1. Toca cada tarjeta para descubrir y escuchar las palabras de hoy.',
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

    // Fase 2: Repaso Intercalado (Mini-Examen)
    // Mezclamos las palabras y le pedimos que las diga de nuevo para reforzar memoria a corto plazo
    const shuffledVocab = [...vocabList].sort(() => Math.random() - 0.5);

    shuffledVocab.forEach((item, index) => {
        generatedSteps.push({
            type: 'echo_chamber',
            prompt: `Repaso rápido: ¿Recuerdas cómo decir esta palabra?`,
            word: item.word,
            successMsg: '¡Todavía lo recuerdas! Muy bien.'
        });
    });

    // Fase 3: Práctica de Pares (Hablar 2 cosas)
    // Empezamos a juntar conceptos simples basándonos en el mismo vocabulario
    generatedSteps.push({
        type: 'echo_chamber',
        prompt: `¡Reto Final! Dilo todo junto.`,
        word: 'Hello, Good morning',
        successMsg: '¡Increíble! Ya estás uniendo palabras.'
    });

    generatedSteps.push({
        type: 'echo_chamber',
        prompt: `Última prueba del día. Despídete.`,
        word: 'Goodbye, Good night',
        successMsg: '¡Perfecto! Has dominado esta lección.'
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

        // Inicializar Motor
        new MoonsforestEngine('learning-container', lessonData);
    });
});
