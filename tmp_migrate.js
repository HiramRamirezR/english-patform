const fs = require('fs');
const path = require('path');

try {
    const m1 = JSON.parse(fs.readFileSync('public/data/m1.json', 'utf8'));
    const dict = JSON.parse(fs.readFileSync('public/data/dictionary.json', 'utf8'));

    const lessons = m1.lessons;
    let changed = false;

    for (let i = 9; i < 19; i++) { // m1l10 to m1l19
        const lesson = lessons[i];
        if (lesson.steps) {
            const words = new Set();
            lesson.steps.forEach(step => {
                if (step.word && typeof step.word === 'string') words.add(step.word);
                if (step.target && typeof step.target === 'string') words.add(step.target);
                if (step.pairs) {
                    Object.keys(step.pairs).forEach(k => words.add(k));
                }
            });

            const vocab_new = Array.from(words).filter(w => w.split(' ').length <= 4 && w !== 'p_speak_fast');

            vocab_new.forEach(w => {
                if (!dict[w]) {
                    const step1 = lesson.steps.find(s => s.word === w);
                    const step2 = lesson.steps.find(s => s.target === w);
                    const esMatch = (step1 && step1.displayWord) ? step1.displayWord : ((step2 && step2.prompt) ? step2.prompt : w);
                    dict[w] = { es: esMatch, emoji: '✨', aliases: [] };
                }
            });

            lesson.vocab_new = vocab_new.slice(0, 4);
            lesson.vocab_review = vocab_new.slice(4, 8);
            lesson.story = { en: 'Let us practice some phrases!', es: '¡Vamos a practicar frases!' };
            lesson.flow = [
                'story_moment',
                'listen_click',
                'echo_chamber',
                'picture_it',
                'echo_chamber_translation',
                'speed_speak',
                'memory_flip',
                'matching',
                'boss_battle'
            ];
            delete lesson.steps;
            changed = true;
        }
    }

    if (changed) {
        fs.writeFileSync('public/data/m1.json', JSON.stringify(m1, null, 2));
        fs.writeFileSync('public/data/dictionary.json', JSON.stringify(dict, null, 4));
        console.log('Migración automatizada completada.');
    } else {
        console.log('Ya estaban migradas.');
    }
} catch (e) {
    console.error(e);
}
