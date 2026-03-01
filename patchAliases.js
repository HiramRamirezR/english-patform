import fs from 'fs';
import path from 'path';

const aliasesDict = {
    "i": ["eye", "hi", "aye", "ai", "hay", "a", "ay"],
    "am": ["m", "um", "an", "and", "em", "aim", "ham"],
    "i am": ["im", "i'm", "hi am", "eye am", "high am"],
    "hello": ["halo", "jello", "yellow", "hell low"],
    "boy": ["boil", "void", "voy", "buoy"],
    "girl": ["curl", "grill", "earl", "gryl"],
    "student": ["stu dent", "stew dent"],
    "you": ["u", "jew", "yoo", "hue", "ew", "youth"],
    "you are": ["ur", "your", "you're", "ure", "you r"],
    "ready": ["reddy", "reading", "red"],
    "tired": ["tire red", "tie red", "tyre"],
    "bear": ["bare", "beer", "pear"],
    "bird": ["beard", "board", "bert"],
    "tree": ["three", "tea", "free"],
    "they are": ["there", "their", "they're", "day are"],
    "it is": ["eat is", "id is", "it's"]
};

const dataDir = './public/data';

fs.readdirSync(dataDir).forEach(file => {
    if (file.endsWith('.json')) {
        const filePath = path.join(dataDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        data.lessons.forEach(lesson => {
            if (lesson.steps) {
                lesson.steps.forEach(step => {
                    if (step.type === 'echo_chamber' && step.word) {
                        const wordLower = step.word.toLowerCase();

                        // Añadir alias si encontramos una coincidencia exacta
                        if (aliasesDict[wordLower]) {
                            step.aliases = aliasesDict[wordLower];
                        }

                        // También buscar combinaciones (muy útil para frases)
                        let combinedAliases = [];
                        if (!aliasesDict[wordLower]) {
                            // Este es un acercamiento básico. Para frases enteras, es mejor 
                            // definir la frase en el diccionario, pero podemos usar el "startswith" 
                            // original de nuestro moduleEngine.
                        }
                    }
                });
            }
        });

        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`Aliases inyectados en ${file}`);
    }
});
