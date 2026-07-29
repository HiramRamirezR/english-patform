export function generateStepsFromFlow(lessonConfig, dictionary) {
    const steps = [];
    const vocabNew = lessonConfig.vocab_new || [];
    const vocabReview = lessonConfig.vocab_review || [];
    const allWords = [...vocabNew, ...vocabReview];

    if (!lessonConfig.flow) return lessonConfig.steps || [];

    const getOptions = (correctWord, count = 4) => {
        let opts = new Set([correctWord]);

        const moduleWordsWithEmoji = allWords.filter(
            w => w !== correctWord && dictionary[w]?.emoji
        );
        moduleWordsWithEmoji.sort(() => Math.random() - 0.5);
        for (const w of moduleWordsWithEmoji) {
            if (opts.size >= count) break;
            opts.add(w);
        }

        if (opts.size < count) {
            const dictWordsWithEmoji = Object.keys(dictionary).filter(
                w => w !== correctWord && dictionary[w]?.emoji && !opts.has(w)
            );
            dictWordsWithEmoji.sort(() => Math.random() - 0.5);
            for (const w of dictWordsWithEmoji) {
                if (opts.size >= count) break;
                opts.add(w);
            }
        }

        if (opts.size < count) {
            const rest = allWords.filter(w => !opts.has(w));
            rest.sort(() => Math.random() - 0.5);
            for (const w of rest) {
                if (opts.size >= count) break;
                opts.add(w);
            }
        }

        return Array.from(opts);
    };

    const fillInBlankMessages = [
        { en: "Complete the sentence!", es: "¡Completa la oración!" },
        { en: "Choose the right word!", es: "¡Elige la palabra correcta!" },
        { en: "Fill in the blank!", es: "¡Llena el espacio!" },
    ];

    let activityIndex = 0;
    lessonConfig.flow.forEach(activity => {
        activityIndex++;

        if (activity === 'story_moment') {
            steps.push({
                type: 'story_moment',
                en: lessonConfig.story?.en || `Welcome to ${lessonConfig.title}! Let's learn.`,
                es: lessonConfig.story?.es || `¡Bienvenido a ${lessonConfig.title}! Vamos a aprender.`
            });
        }
        else if (activity === 'listen_click') {
            const cards = vocabNew.map(w => ({
                word: w,
                translation: dictionary[w]?.es || "",
                emoji: dictionary[w]?.emoji || "✨"
            }));
            steps.push({
                type: 'listen_click',
                prompt: "Tap and listen. Repeat out loud! / ¡Toca, escucha y repite!",
                cards: cards
            });
        }
        else if (activity === 'echo_chamber') {
            allWords.filter(w => w.length > 2).forEach(w => {
                steps.push({
                    type: 'echo_chamber',
                    prompt: "Listen and repeat! / ¡Escucha y repite!",
                    word: w,
                    aliases: dictionary[w]?.aliases || [],
                    successMsg: "s_pron"
                });
            });
        }
        else if (activity === 'echo_chamber_translation') {
            allWords.filter(w => w.length > 2).forEach(w => {
                steps.push({
                    type: 'echo_chamber',
                    prompt: "How do you say... / ¿Cómo se dice...",
                    word: w,
                    displayWord: dictionary[w]?.es || w,
                    aliases: dictionary[w]?.aliases || [],
                    successMsg: "s_trans"
                });
            });
        }
        else if (activity === 'picture_it') {
            allWords.forEach(w => {
                let opts = getOptions(w, 4);
                let emojisMap = {};
                let translationsMap = {};
                opts.forEach(o => {
                    emojisMap[o] = dictionary[o]?.emoji || "❓";
                    translationsMap[o] = dictionary[o]?.es || o;
                });
                steps.push({
                    type: 'picture_it',
                    prompt: "Tap the picture of the word Moon says! / ¡Toca la imagen de la palabra!",
                    word_to_find: w,
                    options: opts,
                    emojisMap: emojisMap,
                    translationsMap: translationsMap
                });
            });
        }
        else if (activity === 'interstitial_moon') {
            steps.push({
                type: 'interstitial_moon',
                message: {
                    en: "You're doing fantastic! Keep it up.",
                    es: "¡Lo haces fantástico! Sigue así."
                }
            });
        }
        else if (activity === 'speed_speak') {
            let words = [];
            const filteredWords = allWords.filter(w => w.length > 2);
            for (let i = 0; i < 6; i++) {
                words.push(filteredWords[Math.floor(Math.random() * filteredWords.length)]);
            }
            steps.push({
                type: 'speed_speak',
                prompt: "Say the words fast! / ¡Dílas rápido!",
                seconds_per_word: 4,
                words: words
            });
        }
        else if (activity === 'memory_flip') {
            let pairs = {};
            allWords.forEach(w => {
                const emoji = dictionary[w]?.emoji;
                pairs[w] = (emoji && emoji !== "✨") ? emoji : (dictionary[w]?.es || w);
            });
            steps.push({
                type: 'memory_flip',
                prompt: "Find the matching pairs! / ¡Encuentra los pares!",
                pairs: pairs
            });
        }
        else if (activity === 'matching') {
            let pairs = {};
            allWords.forEach(w => {
                const emoji = dictionary[w]?.emoji;
                pairs[w] = (emoji && emoji !== "✨") ? emoji : (dictionary[w]?.es || w);
            });
            steps.push({
                type: 'matching',
                prompt: "🧩 Match the pairs before time runs out! / ¡Reto de Velocidad! Une los pares.",
                timer: 20,
                pairs: pairs,
                successMsg: "s_match"
            });
        }
        else if (activity === 'drag_and_drop') {
            if (vocabNew.length >= 2) {
                const targetStr = `${vocabNew[0]} ${vocabNew[1]}`;
                steps.push({
                    type: 'drag_and_drop',
                    prompt: `Build the phrase: / Arma la frase: "${dictionary[vocabNew[0]]?.es} ${dictionary[vocabNew[1]]?.es}"`,
                    timer: 15,
                    target: targetStr,
                    options: [vocabNew[1], vocabNew[0]]
                });
            }
        }
        else if (activity === 'boss_battle') {
            let words = [...allWords];
            let aliasesMap = {};
            words.forEach(w => {
                aliasesMap[w] = dictionary[w]?.aliases || [];
            });
            steps.push({
                type: 'boss_battle',
                prompt: "Toca el micrófono y dilo en voz alta antes de que se acabe el tiempo! Tienes 4 vidas.",
                words: words,
                aliasesMap: aliasesMap
            });
        }
    });

    const paddedSteps = [];
    let stepCount = 0;
    const MIN_STEPS = 10;

    for (let i = 0; i < steps.length; i++) {
        paddedSteps.push(steps[i]);
        stepCount++;

        const addedMoonBreak = steps[i].type === 'matching' || steps[i].type === 'speed_speak' || steps[i].type === 'memory_flip';
        const notLast = i < steps.length - 1;
        const nextIsNotBreak = notLast && !['interstitial_moon', 'story_moment', 'boss_battle'].includes(steps[i + 1]?.type);

        if (addedMoonBreak && nextIsNotBreak) {
            paddedSteps.push({
                type: 'interstitial_moon',
                message: {
                    en: "You're doing great! Ready for more?",
                    es: "¡Lo estás haciendo genial! ¿Listo para más?"
                }
            });
            stepCount++;
        }
    }

    // If lesson is still too short, add fill-in-the-blank padding
    if (stepCount < MIN_STEPS && vocabNew.length > 0) {
        const wordsForFIB = allWords.filter(w => w.length > 2);
        const fibTargets = [
            { word: wordsForFIB[0] || allWords[0], options: getOptions(wordsForFIB[0] || allWords[0], 3) },
        ];
        if (fibTargets[0]) {
            paddedSteps.push({
                type: 'fill_in_blank',
                prompt: fillInBlankMessages[Math.floor(Math.random() * fillInBlankMessages.length)],
                sentence: `I ___ ${fibTargets[0].word.toLowerCase()}`,
                answer: fibTargets[0].word,
                options: fibTargets[0].options,
                successMsg: { en: "Perfect! Keep going!", es: "¡Perfecto! ¡Sigue así!" }
            });
            stepCount++;
        }
    }

    if (stepCount < MIN_STEPS && vocabNew.length > 1) {
        const wordsForFIB = allWords.filter(w => w.length > 2);
        const fibTarget = wordsForFIB[1] || allWords[1 % allWords.length];
        if (fibTarget) {
            paddedSteps.push({
                type: 'fill_in_blank',
                prompt: fillInBlankMessages[Math.floor(Math.random() * fillInBlankMessages.length)],
                sentence: `I like ___`,
                answer: fibTarget,
                options: getOptions(fibTarget, 4),
                successMsg: { en: "Excellent! You know your words!", es: "¡Excelente! ¡Sabes tus palabras!" }
            });
            stepCount++;
        }
    }

    return paddedSteps;
}
