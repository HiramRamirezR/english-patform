// courseData.js - Banco Central de Lecciones

export function getModuleConfig(moduleId) {
    let config = {
        title: "Módulo Desconocido",
        description: "",
        lessons: []
    };

    if (moduleId === 'm1') {
        config.title = "Módulo 1: Campamento Base";
        config.description = "Tus primeras palabras en el bosque.";
        config.lessons = [
            { id: 'm1l1', title: 'Lección 1.1: Los Primeros Sonidos', desc: 'Vocabulario básico y saludos.', icon: '🔊' },
            { id: 'm1l2', title: 'Lección 1.2: Presentaciones', desc: 'Di quién eres.', icon: '✋' },
            { id: 'm1l3', title: 'Lección 1.3: Construcción', desc: 'Estructura tus oraciones.', icon: '🧩' },
            { id: 'm1l4', title: 'Lección 1.4: Eco Profundo', desc: 'Práctica de párrafos cortos.', icon: '🗣️' },
            { id: 'm1l5', title: 'Lección 1.5: La Fogata', desc: 'Reto final del campamento.', icon: '🔥' }
        ];
    }
    // Aquí puedes agregar más módulos (m2, m3, etc.)
    return config;
}
export function getLessonConfig(lessonId) {
    let config = {
        title: "Lección",
        returnUrl: "module.html?id=m1",
        steps: []
    };

    if (lessonId === 'm1l1') {
        config.title = "Lección 1.1: Los Primeros Sonidos";
        const vocab = [
            { word: 'Hello', translation: 'Hola' },
            { word: 'Hi', translation: 'Hola (Informal)' },
            { word: 'Goodbye', translation: 'Adiós' },
            { word: 'Bye', translation: 'Adiós (Corto)' },
            { word: 'Good morning', translation: 'Buenos días' },
            { word: 'Good night', translation: 'Buenas noches' }
        ];

        config.steps.push({
            type: 'listen_click',
            prompt: '1. Toca cada tarjeta y escucha con atención. ¡Repite la palabra en voz alta para aprendértela!',
            cards: vocab
        });

        vocab.forEach((item) => {
            config.steps.push({
                type: 'echo_chamber',
                prompt: `¡Tu turno! Presiona el micrófono y lee la palabra en voz alta.`,
                word: item.word,
                successMsg: '¡Excelente! Sigamos con la próxima.'
            });
        });

        const shuffled = [...vocab].sort(() => Math.random() - 0.5);
        shuffled.forEach((item) => {
            config.steps.push({
                type: 'echo_chamber',
                prompt: `💡 Pensemos en inglés: ¿Cómo dirías esto?`,
                word: item.word,
                displayWord: item.translation,
                successMsg: '¡Esa es la traducción perfecta!'
            });
        });

        config.steps.push({
            type: 'drag_and_drop',
            prompt: `¡Reto Final! Ordena las palabras para formar: "Hola, Buenos días."`,
            target: 'Hello Good morning',
            options: ['Hello', 'morning', 'Good', 'Bye']
        });

        config.steps.push({
            type: 'drag_and_drop',
            prompt: `Última prueba del día. Despídete para ir a dormir: "Adiós, Buenas noches."`,
            target: 'Goodbye Good night',
            options: ['night', 'Goodbye', 'Good', 'Hi']
        });

    } else if (lessonId === 'm1l2') {
        config.title = "Lección 1.2: Presentaciones";
        const vocab = [
            { word: 'I am', translation: 'Yo soy / Yo estoy' },
            { word: 'You are', translation: 'Tú eres / Tú estás' },
            { word: 'My name is', translation: 'Mi nombre es' },
            { word: 'Boy', translation: 'Niño' },
            { word: 'Girl', translation: 'Niña' },
            { word: 'Student', translation: 'Estudiante' }
        ];

        config.steps.push({
            type: 'listen_click',
            prompt: '1. Aprende a presentarte. Toca y escucha. ¡Repite en voz alta!',
            cards: vocab
        });

        vocab.forEach((item) => {
            config.steps.push({
                type: 'echo_chamber',
                prompt: `¡Tu turno! Lee la palabra en voz alta y claro.`,
                word: item.word,
                successMsg: '¡Muy bien pronunciado!'
            });
        });

        const shuffled = [...vocab].sort(() => Math.random() - 0.5);
        shuffled.forEach((item) => {
            config.steps.push({
                type: 'echo_chamber',
                prompt: `💡 Pensemos en inglés: ¿Cómo dices esto?`,
                word: item.word,
                displayWord: item.translation,
                successMsg: '¡Esa es la traducción perfecta!'
            });
        });

        config.steps.push({
            type: 'drag_and_drop',
            prompt: `¡Reto Final! Une las frases: "Yo soy estudiante".`,
            target: 'I am student',
            options: ['student', 'I', 'am', 'Girl']
        });

        config.steps.push({
            type: 'drag_and_drop',
            prompt: `Otra más: "Tú eres niño".`,
            target: 'You are Boy',
            options: ['Boy', 'are', 'You', 'am']
        });

    } else if (lessonId === 'm1l3') {
        config.title = "Lección 1.3: Construcción";
        const vocab = [
            { word: 'Speak', translation: 'Hablar' },
            { word: 'Listen', translation: 'Escuchar' },
            { word: 'English', translation: 'Inglés' },
            { word: 'To', translation: 'A / Hacia', aliases: ['two', 'too', 'do'] }
        ];

        config.steps.push({
            type: 'listen_click',
            prompt: '1. Reconoce estos verbos de acción. ¡Tócalos y repítelos fuerte!',
            cards: vocab
        });

        vocab.forEach((item) => {
            config.steps.push({
                type: 'echo_chamber',
                prompt: `¡Dale voz al verbo!`,
                word: item.word,
                aliases: item.aliases,
                successMsg: '¡Esa pronunciación es perfecta!'
            });
        });

        const shuffled = [...vocab].sort(() => Math.random() - 0.5);
        shuffled.forEach((item) => {
            config.steps.push({
                type: 'echo_chamber',
                prompt: `💡 Piensa rápido: ¿Cómo lo dices en inglés?`,
                word: item.word,
                aliases: item.aliases,
                displayWord: item.translation,
                successMsg: '¡Traducción exacta!'
            });
        });

        config.steps.push({
            type: 'drag_and_drop',
            prompt: `¡Reto Final! Ordena las palabras para formar la frase en inglés: "Yo hablo inglés."`,
            target: 'I speak English',
            options: ['English', 'speak', 'I', 'listen']
        });

        config.steps.push({
            type: 'drag_and_drop',
            prompt: `Otra más: "Escúchame a mí."`,
            target: 'Listen to me',
            options: ['to', 'me', 'Listen', 'speak']
        });

    } else if (lessonId === 'm1l4') {
        config.title = "Lección 1.4: Eco Profundo";
        const phrases = [
            { word: 'Good morning', displayWord: 'Buenos días' },
            { word: 'My name is Moon', displayWord: 'Mi nombre es Moon' },
            { word: 'I am a student', displayWord: 'Yo soy estudiante' },
            { word: 'You speak English', displayWord: 'Tú hablas inglés' },
            { word: 'Listen to the forest', displayWord: 'Escucha al bosque' }
        ];

        config.steps.push({
            type: 'echo_chamber',
            prompt: `¡Eco Profundo! En esta lección leerás las oraciones completas.`,
            word: 'Hello Moon',
            successMsg: '¡Esa es la actitud!'
        });

        const shuffledPhrases = [...phrases].sort(() => Math.random() - 0.5);
        shuffledPhrases.forEach((item) => {
            config.steps.push({
                type: 'echo_chamber',
                prompt: `💡 Piensa en inglés:`,
                word: item.word,
                displayWord: item.displayWord,
                successMsg: '¡Oración perfecta!'
            });
        });

        config.steps.push({
            type: 'drag_and_drop',
            prompt: `¡Hora de ordenar! Forma: "Mi nombre es Moon"`,
            target: 'My name is Moon',
            options: ['name', 'Moon', 'My', 'is']
        });

        config.steps.push({
            type: 'drag_and_drop',
            prompt: `Arma la frase: "Tú hablas inglés"`,
            target: 'You speak English',
            options: ['English', 'You', 'speak']
        });

    } else if (lessonId === 'm1l5') {
        config.title = "🏆 Lección 1.5: La Fogata";
        config.returnUrl = "mapa.html";
        const finalChallenge = [
            { word: 'Hello good morning', displayWord: 'Hola, buenos días' },
            { word: 'My name is Moon', displayWord: 'Mi nombre es Moon' },
            { word: 'I speak English', displayWord: 'Yo hablo inglés' },
            { word: 'I am a good student', displayWord: 'Yo soy un buen estudiante' },
            { word: 'Listen to the forest', displayWord: 'Escucha al bosque' },
            { word: 'Goodbye good night', displayWord: 'Adiós, buenas noches' }
        ];

        config.steps.push({
            type: 'echo_chamber',
            prompt: `🔥 ¡Bienvenido a La Fogata, el jefe de este nivel! Demuestra lo que sabes.`,
            word: 'I am ready',
            displayWord: 'Estoy listo',
            successMsg: '¡Que empiece la prueba!'
        });

        const shuffledPhrases = [...finalChallenge].sort(() => Math.random() - 0.5);
        shuffledPhrases.forEach((item) => {
            config.steps.push({
                type: 'echo_chamber',
                prompt: `💡 Piensa y dilo fuerte para que todos en la fogata te escuchen:`,
                word: item.word,
                displayWord: item.displayWord,
                successMsg: '¡Esa oración fue brillante!'
            });
        });

        config.steps.push({
            type: 'drag_and_drop',
            prompt: `🧩 Organiza antes de irte: "Yo soy un buen estudiante"`,
            target: 'I am a good student',
            options: ['good', 'I', 'student', 'a', 'am']
        });

        config.steps.push({
            type: 'drag_and_drop',
            prompt: `🧩 ¡Último acomodo!: "Escucha al bosque"`,
            target: 'Listen to the forest',
            options: ['the', 'Listen', 'forest', 'to']
        });

        config.steps.push({
            type: 'echo_chamber',
            prompt: `🎉 ¡Último aliento! Grita de felicidad.`,
            word: 'I am the champion',
            displayWord: 'Yo soy el campeón',
            successMsg: '¡Felicidades! Superaste el Módulo 1.'
        });
    }

    return config;
}
