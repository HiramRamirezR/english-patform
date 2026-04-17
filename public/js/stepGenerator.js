export function generateStepsFromFlow(lessonConfig, dictionary) {
    const steps = [];
    const vocabNew = lessonConfig.vocab_new || [];
    const vocabReview = lessonConfig.vocab_review || [];
    const allWords = [...vocabNew, ...vocabReview];

    if (!lessonConfig.flow) return lessonConfig.steps || [];

    // Distractors come from the module's own vocab (words with emojis preferred)
    // Falls back to dictionary words with emojis if module vocab is too small
    const getOptions = (correctWord, count = 4) => {
        let opts = new Set([correctWord]);

        // 1. Prioritize other words from this lesson's vocab that have emojis
        const moduleWordsWithEmoji = allWords.filter(
            w => w !== correctWord && dictionary[w]?.emoji
        );
        moduleWordsWithEmoji.sort(() => Math.random() - 0.5);
        for (const w of moduleWordsWithEmoji) {
            if (opts.size >= count) break;
            opts.add(w);
        }

        // 2. If still not enough, pull from whole dictionary (emojis only)
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

        // 3. Last resort: any word
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

    lessonConfig.flow.forEach(activity => {
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
            // Un simple drag_and_drop con la combinacion de las primeras 2 palabras
            if (vocabNew.length >= 2) {
                const targetStr = `${vocabNew[0]} ${vocabNew[1]}`;
                steps.push({
                    type: 'drag_and_drop',
                    prompt: `Une la frase: / Build the phrase: "${dictionary[vocabNew[0]]?.es} ${dictionary[vocabNew[1]]?.es}"`,
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

    return steps;
}
