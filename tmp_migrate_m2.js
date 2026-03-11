const fs = require('fs');
const path = require('path');

try {
    const m2Path = 'public/data/m2.json';
    const dictPath = 'public/data/dictionary.json';

    let m2 = JSON.parse(fs.readFileSync(m2Path, 'utf8'));
    let dict = JSON.parse(fs.readFileSync(dictPath, 'utf8'));

    const lessons = m2.lessons;
    let changed = false;

    for (let i = 0; i < lessons.length; i++) {
        const lesson = lessons[i];
        if (lesson.steps) {
            const words = new Set();
            const aliasesMap = {};
            const translationsMap = {};

            lesson.steps.forEach(step => {
                if (step.word && typeof step.word === 'string') words.add(step.word);
                if (step.target && typeof step.target === 'string') words.add(step.target);
                if (step.pairs) {
                    Object.keys(step.pairs).forEach(k => {
                        words.add(k);
                        translationsMap[k] = step.pairs[k];
                    });
                }
                if (step.cards) {
                    step.cards.forEach(c => {
                        if (c.word) {
                            words.add(c.word);
                            translationsMap[c.word] = c.translation;
                        }
                    });
                }

                if (step.word && step.aliases) {
                    if (!aliasesMap[step.word]) aliasesMap[step.word] = [];
                    aliasesMap[step.word].push(...step.aliases);
                }

                if (step.word && step.displayWord) {
                    translationsMap[step.word] = step.displayWord;
                }
            });

            const allWords = Array.from(words).filter(w => w !== 'p_speak_fast');

            allWords.forEach(w => {
                if (!dict[w]) {
                    const esMatch = translationsMap[w] || w;
                    let aliases = [...new Set(aliasesMap[w] || [])];
                    dict[w] = { es: esMatch, emoji: '✨', aliases: aliases };
                } else {
                    // merge aliases
                    if (aliasesMap[w]) {
                        dict[w].aliases = [...new Set([...(dict[w].aliases || []), ...aliasesMap[w]])];
                    }
                }
            });

            // Generate vocab new
            // the logic is: in old steps, new vocab is usually the first 4 distinct words.
            const shortWords = allWords.filter(w => w.split(' ').length <= 4);
            const vocab = shortWords.length > 0 ? shortWords : allWords;

            lesson.vocab_new = vocab.slice(0, 4);
            lesson.vocab_review = vocab.slice(4, 9);

            if (!lesson.story) {
                lesson.story = { en: "Let's explore the forest!", es: "¡Exploremos el bosque!" };
            }

            // set flow based on lesson index to introduce variety, boss at 20
            if (i === lessons.length - 1) {
                lesson.flow = [
                    "story_moment",
                    "listen_click",
                    "echo_chamber",
                    "memory_flip",
                    "matching",
                    "boss_battle"
                ];
            } else {
                lesson.flow = [
                    "story_moment",
                    "listen_click",
                    "echo_chamber",
                    "picture_it",
                    "echo_chamber_translation",
                    "speed_speak",
                    "memory_flip",
                    "matching"
                ];
            }
            delete lesson.steps;
            changed = true;
        }
    }

    if (changed) {
        fs.writeFileSync(m2Path, JSON.stringify(m2, null, 2));
        fs.writeFileSync(dictPath, JSON.stringify(dict, null, 4));
        console.log('M2 Migración automatizada completada.');
    } else {
        console.log('M2 Ya estaban migradas.');
    }
} catch (e) {
    console.error(e);
}
