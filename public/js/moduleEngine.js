import { db } from './auth.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * Module Learning Engine 🌲
 * Combina TTS y STT usando Web APIs nativas, sin requerir APIs de pago.
 */

export class MoonsforestEngine {
    constructor(containerId, data, options = {}) {
        this.container = document.getElementById(containerId);
        this.data = data;
        this.options = options;
        this.resources = options.resources || {};
        this.currentStep = 0;
        this.startTime = Date.now();
        this.sessionHistory = []; // Almacenará { type: 'moon'|'child', content: text|blobUrl }

        // UI Elements
        this.progressBar = document.getElementById('progress-bar');
        this.moonSupport = document.getElementById('moon-support');
        this.moonMessage = document.getElementById('moon-message');

        // Add Report Button to UI
        this.addReportButton();

        // Mobile detection to selectively disable recording-based features
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        // Speech Recognition Setup (soporte cross-browser)
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.lang = 'en-US';
            this.recognition.interimResults = false;
            this.recognition.maxAlternatives = 1;
        } else {
            console.warn("Speech Recognition API no soportada en este navegador.");
        }

        // Voice Setup
        this.voices = [];
        window.speechSynthesis.onvoiceschanged = () => {
            this.voices = window.speechSynthesis.getVoices();
        };

        this.init();
    }

    init() {
        if (!this.data || this.data.length === 0) return;
        this.renderStep();
    }

    updateProgress() {
        const percentage = ((this.currentStep) / this.data.length) * 100;
        if (this.progressBar) {
            this.progressBar.style.width = `${percentage}%`;
        }
    }

    renderStep() {
        this.container.innerHTML = '';
        this.updateProgress();
        this.hideMoon();

        if (this.currentStep >= this.data.length) {
            this.renderCompletion();
            return;
        }

        const stepData = this.data[this.currentStep];

        // Resolver textos si son llaves de recursos
        if (stepData.prompt) stepData.prompt = this.resolveText(stepData.prompt);
        if (stepData.successMsg) stepData.successMsg = this.resolveText(stepData.successMsg);

        if (stepData.type === 'listen_click') {
            this.renderListenClick(stepData);
        } else if (stepData.type === 'echo_chamber') {
            this.renderEchoChamber(stepData);
        } else if (stepData.type === 'drag_and_drop') {
            this.renderDragAndDrop(stepData);
        } else if (stepData.type === 'matching') {
            this.renderMatching(stepData);
        } else if (stepData.type === 'fill_in_blank') {
            this.renderFillInBlank(stepData);
        } else {
            this.container.innerHTML = `<p>Unsupported activity: ${stepData.type}</p>`;
        }
    }

    resolveText(text) {
        if (typeof text !== 'string') return text;
        // Si empieza con p_ buscar en prompts, si es s_ buscar en successMessages
        if (text.startsWith('p_') && this.resources.prompts) {
            return this.resources.prompts[text] || text;
        }
        if (text.startsWith('s_') && this.resources.successMessages) {
            return this.resources.successMessages[text] || text;
        }
        return text;
    }

    nextStep() {
        this.currentStep++;
        this.renderStep();
    }

    /* -------------------------------------------------------------------------- */
    /* ACTIVITIES RENDERERS                                                       */
    /* -------------------------------------------------------------------------- */

    renderListenClick(data) {
        const box = document.createElement('div');
        box.className = 'activity-box';

        const prompt = document.createElement('div');
        prompt.className = 'activity-prompt';
        prompt.innerText = data.prompt || 'Tap each card and listen!';
        box.appendChild(prompt);

        const grid = document.createElement('div');
        grid.className = 'cards-grid';

        let solvedCount = 0;

        data.cards.forEach(card => {
            const cardEl = document.createElement('div');
            cardEl.className = 'flashcard';

            // Optional emoji
            if (card.emoji) {
                const emojiEl = document.createElement('div');
                emojiEl.className = 'flashcard-emoji';
                emojiEl.innerText = card.emoji;
                cardEl.appendChild(emojiEl);
            }

            const content = document.createElement('div');
            content.className = 'flashcard-content';
            content.innerText = card.word;

            const translation = document.createElement('div');
            translation.className = 'flashcard-translation';
            translation.innerText = card.translation;

            cardEl.appendChild(content);
            cardEl.appendChild(translation);

            // Logic
            cardEl.addEventListener('click', () => {
                if (cardEl.classList.contains('solved')) {
                    this.speak(card.word);
                    return;
                }

                cardEl.classList.add('flipped');
                this.speak(card.word);
                cardEl.classList.add('solved');
                solvedCount++;

                if (solvedCount === data.cards.length) {
                    this.playSound('success');
                    this.triggerSuccessBurst();
                    this.showNextButton(box);
                    this.showMoon({ en: "You heard them all. Super!", es: "¡Las escuchaste todas!" });
                }
            });

            grid.appendChild(cardEl);
        });

        box.appendChild(grid);
        this.container.appendChild(box);
    }

    renderEchoChamber(data) {
        let attempts = 0;
        const box = document.createElement('div');
        box.className = 'activity-box';

        const prompt = document.createElement('div');
        prompt.className = 'activity-prompt';
        prompt.innerText = data.prompt || 'Haz clic y habla.';

        const echoWord = document.createElement('div');
        echoWord.className = 'echo-word';
        echoWord.innerText = data.displayWord || data.word;

        const metricsContainer = document.createElement('div');
        metricsContainer.style.margin = '1rem auto';
        metricsContainer.style.width = '100%';
        metricsContainer.style.maxWidth = '250px';

        const thermoLabel = document.createElement('div');
        thermoLabel.innerText = "Energía de tu voz ⚡";
        thermoLabel.style.fontSize = '0.75rem';
        thermoLabel.style.color = 'var(--slate-500)';
        thermoLabel.style.marginBottom = '0.4rem';
        thermoLabel.style.textAlign = 'left';
        thermoLabel.style.fontWeight = '600';
        metricsContainer.appendChild(thermoLabel);

        const thermoContainer = document.createElement('div');
        thermoContainer.style.width = '100%';
        thermoContainer.style.height = '14px';
        thermoContainer.style.background = '#e2e8f0';
        thermoContainer.style.borderRadius = '99px';
        thermoContainer.style.overflow = 'hidden';
        thermoContainer.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.1)';

        const thermoFill = document.createElement('div');
        thermoFill.style.height = '100%';
        thermoFill.style.width = '0%';
        thermoFill.style.background = '#cbd5e1';
        thermoFill.style.transition = 'width 0.1s linear, background-color 0.4s ease';
        thermoContainer.appendChild(thermoFill);
        metricsContainer.appendChild(thermoContainer);

        const micBtn = document.createElement('button');
        micBtn.className = 'mic-btn';
        micBtn.innerHTML = '🎤';

        const listenBtn = document.createElement('button');
        listenBtn.className = 'listen-btn-echo';
        listenBtn.innerHTML = '🔊';
        listenBtn.title = 'Escuchar de nuevo';

        const feedback = document.createElement('div');
        feedback.className = 'speech-feedback';
        feedback.innerText = 'Presiona el micrófono para hablar';

        box.appendChild(prompt);
        box.appendChild(echoWord);
        box.appendChild(listenBtn); // Insert before metrics
        box.appendChild(metricsContainer);
        box.appendChild(micBtn);
        box.appendChild(feedback);
        this.container.appendChild(box);

        // Logic for listening to the word
        listenBtn.addEventListener('click', () => {
            if (listenBtn.disabled) return;
            micBtn.disabled = true;
            listenBtn.disabled = true;
            feedback.innerText = 'Escuchando a Moon...';
            this.speak(data.word, () => {
                micBtn.disabled = false;
                listenBtn.disabled = false;
                feedback.innerText = 'Presiona el micrófono para hablar';
            });
        });

        const stopVisualPulse = () => {
            thermoFill.classList.remove('pulse-animation-active');
            thermoFill.style.transition = 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.6s ease';
        };

        const forcePass = (msg) => {
            this.playSound('success');
            this.triggerSuccessBurst();
            echoWord.classList.add('success');
            echoWord.innerText = data.word;
            micBtn.style.display = 'none';
            listenBtn.style.display = 'none';
            feedback.innerHTML = `I heard: "<strong>${data.word.toLowerCase()}</strong>" ✓`;
            const moonMsg = msg || data.successMsg || { en: "Well done!", es: "¡Muy bien!" };
            this.showMoon(moonMsg);
            this.showNextButton(box);
        };

        let mediaRecorder;
        let audioChunks = [];

        micBtn.addEventListener('click', async () => {
            if (!this.recognition) {
                alert("Tu navegador no soporta el reconocimiento de voz. Usa Chrome en Android o Safari en iOS.");
                return;
            }

            if (micBtn.classList.contains('listening') || micBtn.disabled) return;

            attempts++;
            micBtn.classList.add('listening');
            listenBtn.disabled = true;
            feedback.innerText = 'Listening... Habla ahora.';

            // Start CSS pulse animation instead of AudioContext analysis
            thermoFill.classList.add('pulse-animation-active');
            thermoFill.style.background = '#38bdf8';
            thermoLabel.innerText = "¡Te estoy escuchando! ⚡";

            try {
                this.recognition.start();

                // Intentar grabar el audio SOLO en Desktop (evita conflictos en mobile)
                if (!this.isMobile) {
                    try {
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        audioChunks = [];
                        mediaRecorder = new MediaRecorder(stream);
                        mediaRecorder.ondataavailable = (e) => {
                            if (e.data.size > 0) audioChunks.push(e.data);
                        };
                        mediaRecorder.start();
                    } catch (recErr) {
                        console.warn("No se pudo iniciar la grabación:", recErr);
                    }
                }
            } catch (err) {
                console.error("Error al iniciar reconocimiento:", err);
                micBtn.classList.remove('listening');
                stopVisualPulse();

                if (attempts >= 3) {
                    forcePass("¡Parece que tu micrófono tiene sueño! No te preocupes, Moon te ayuda a seguir adelante.");
                } else {
                    this.showMoon("Ocurrió un error con el micro. Inténtalo de nuevo.");
                }
            }

            this.recognition.onresult = async (event) => {
                stopVisualPulse();

                // Detener grabación en desktop
                let audioUrl = null;
                if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                    audioUrl = await new Promise(resolve => {
                        mediaRecorder.onstop = () => {
                            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                            resolve(URL.createObjectURL(audioBlob));
                        };
                        mediaRecorder.stop();
                        mediaRecorder.stream.getTracks().forEach(track => track.stop());
                    });
                }

                let transcript = event.results[0][0].transcript.toLowerCase().trim();
                let confidence = event.results[0][0].confidence || 0.8;

                thermoLabel.innerText = "Claridad de tu pronunciación 🎯";
                let fillPercentage = Math.round(confidence * 100);
                thermoFill.style.width = `${fillPercentage}%`;

                if (fillPercentage < 50) thermoFill.style.background = '#ef4444';
                else if (fillPercentage < 80) thermoFill.style.background = '#f59e0b';
                else thermoFill.style.background = '#10b981';

                const corrections = {
                    "eye": "i", "aye": "i", "hi ": "i ", "ai": "i", "hay": "i", "ay": "i", " a ": " i ",
                    "am": "am", "um": "am", "em": "am", "aim": "am", "ham": "am", "an ": "am ",
                    "im": "i am", "i'm": "i am",
                    "halo": "hello", "jello": "hello", "yellow": "hello",
                    "boil": "boy", "void": "boy", "voy": "boy",
                    "curl": "girl", "grill": "girl", "earl": "girl",
                    "jew": "you", "yoo": "you", "hue": "you", "ew": "you",
                    "ur": "you are", "your": "you are", "you're": "you are",
                    "reddy": "ready", "reading": "ready", "red": "ready",
                    "tire red": "tired", "tie red": "tired", "tyre": "tired",
                    "bare": "bear", "beer": "bear", "pear": "bear",
                    "beard": "bird", "board": "bird", "bert": "bird",
                    "three": "tree", "tea": "tree", "free": "tree"
                };

                for (let [wrong, right] of Object.entries(corrections)) {
                    const regex = new RegExp(`\\b${wrong}\\b`, 'g');
                    transcript = transcript.replace(regex, right);
                }

                const cleanTranscript = transcript.replace(/[^a-z0-9 ]/gi, '').trim();
                const target = data.word.toLowerCase().replace(/[^a-z0-9 ]/gi, '').trim();

                feedback.innerHTML = `Escuché y entendí: "<strong>${cleanTranscript}</strong>"`;

                const aliases = data.aliases ? data.aliases.map(a => a.toLowerCase().replace(/[^a-z0-9 ]/gi, '').trim()) : [];
                const targets = [target, ...aliases];

                const matches = targets.some(t => cleanTranscript === t || cleanTranscript.startsWith(t) || (attempts >= 2 && cleanTranscript.includes(t)));

                if (matches || attempts >= 3) {
                    // Guardar audio en el historial (desktop)
                    if (audioUrl) this.sessionHistory.push({ type: 'child', content: audioUrl });

                    if (attempts >= 3 && !matches) {
                        this.logFrustration('frustration_auto', {
                            attempts: attempts,
                            lastTranscript: transcript
                        });
                    }

                    let msg = (attempts >= 3 && !matches)
                        ? { en: "That phrase is a big challenge! Moon's magic helps you move forward.", es: "¡Difícil! Sigamos explorando." }
                        : (attempts === 2 && !matches)
                            ? { en: "So close! I heard your great effort. Let's go!", es: "¡Casi perfecto! ¡Avancemos!" }
                            : null;

                    forcePass(msg);
                } else {
                    this.playSound('error');
                    let hints = [
                        { en: "Almost! Try saying it again.", es: "¡Casi! Inténtalo de nuevo." },
                        { en: "Open your mouth wide and speak loud!", es: "¡Abre la boca y habla fuerte!" },
                        { en: "One more try! You can do it!", es: "¡Un intento más! Tú puedes." }
                    ];
                    this.showMoon(hints[(attempts - 1) % hints.length]);
                }
            };

            const handleError = (errorType) => {
                stopVisualPulse();
                if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                    mediaRecorder.stop();
                    mediaRecorder.stream.getTracks().forEach(track => track.stop());
                }

                if (attempts >= 3) {
                    forcePass({ en: "Moon hears you with her heart! Let's keep exploring.", es: "¡Sigamos la aventura!" });
                    return;
                }

                this.playSound('error');
                thermoFill.style.width = '0%';
                if (errorType === 'no-speech') {
                    feedback.innerText = "I didn't hear you. Could you say it again?";
                    this.showMoon({ en: "I didn't hear anything. Try speaking louder!", es: "No escuché nada. ¡Habla más fuerte!" });
                } else {
                    feedback.innerText = 'Microphone issue. Please try again.';
                    this.showMoon({ en: "Check your microphone permissions.", es: "Revisa el permiso de tu micrófono." });
                }
            };

            this.recognition.onnomatch = () => handleError('no-match');
            this.recognition.onerror = (event) => handleError(event.error);

            this.recognition.onend = () => {
                stopVisualPulse();
                if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                    mediaRecorder.stop();
                    mediaRecorder.stream.getTracks().forEach(track => track.stop());
                }
                micBtn.classList.remove('listening');
                listenBtn.disabled = false;
            };
        });
    }


    renderDragAndDrop(data) {
        const box = document.createElement('div');
        box.className = 'activity-box';

        const prompt = document.createElement('div');
        prompt.className = 'activity-prompt';
        prompt.innerText = data.prompt || 'Ordena las palabras para formar la frase correcta.';
        box.appendChild(prompt);

        // Container for dropzones
        const dropZoneContainer = document.createElement('div');
        dropZoneContainer.className = 'drop-zone-container';

        // Target phrase logic
        const targetWords = data.target.split(' ');

        const dropZones = [];
        targetWords.forEach((word, index) => {
            const dz = document.createElement('div');
            dz.className = 'drop-zone';
            dz.dataset.index = index;
            dropZones.push(dz);
            dropZoneContainer.appendChild(dz);
        });
        box.appendChild(dropZoneContainer);

        // Desafío de Velocidad
        if (data.timer) {
            const seconds = typeof data.timer === 'number' ? data.timer : 15;
            this.startTimer(box, seconds, () => {
                this.showMoon("¡El tiempo voló! Sigue intentándolo hasta lograrlo.");
            });
        }

        // Container for draggable words
        const wordsContainer = document.createElement('div');
        wordsContainer.className = 'draggable-words';

        // words
        // We use data.options if provided (useful for adding distractors), or just shuffle the target words
        const allWords = data.options || targetWords.slice().sort(() => Math.random() - 0.5);

        let draggedElement = null;

        allWords.forEach(word => {
            const wordEl = document.createElement('div');
            wordEl.className = 'draggable-word';
            wordEl.draggable = true;
            wordEl.innerText = word;

            // Touch / Drag events
            wordEl.addEventListener('dragstart', (e) => {
                draggedElement = wordEl;
                setTimeout(() => wordEl.classList.add('dragging'), 0);
            });

            wordEl.addEventListener('dragend', () => {
                wordEl.classList.remove('dragging');
                draggedElement = null;
                checkCompletion();
            });

            // Tap/Click support for mobile/tablets
            wordEl.addEventListener('click', () => {
                // If it's already in a dropzone, we let the dropzone click handler manage taking it out
                if (wordEl.parentElement.classList.contains('drop-zone')) {
                    return;
                }

                // Find first empty dropzone
                const emptyZone = dropZones.find(dz => !dz.hasChildNodes());
                if (emptyZone) {
                    emptyZone.appendChild(wordEl);
                    checkCompletion();
                }
            });

            wordsContainer.appendChild(wordEl);
        });
        box.appendChild(wordsContainer);

        // dropZone listeners
        dropZones.forEach(dz => {
            dz.addEventListener('dragover', e => {
                e.preventDefault();
                dz.classList.add('drag-over');
            });

            dz.addEventListener('dragleave', () => {
                dz.classList.remove('drag-over');
            });

            dz.addEventListener('drop', e => {
                e.preventDefault();
                dz.classList.remove('drag-over');
                if (draggedElement && !dz.hasChildNodes()) {
                    dz.appendChild(draggedElement);
                }
            });

            // Allow returning to wordsContainer with a simple click
            dz.addEventListener('click', () => {
                if (dz.firstChild) {
                    wordsContainer.appendChild(dz.firstChild);
                    checkCompletion();
                }
            });
        });

        // Allow dropping back to the main container
        wordsContainer.addEventListener('dragover', e => e.preventDefault());
        wordsContainer.addEventListener('drop', e => {
            if (draggedElement) wordsContainer.appendChild(draggedElement);
        });

        const checkCompletion = () => {
            let currentSentence = [];
            let allFilled = true;
            dropZones.forEach(dz => {
                if (dz.firstChild) {
                    currentSentence.push(dz.firstChild.innerText);
                } else {
                    allFilled = false;
                }
            });

            if (allFilled) {
                if (currentSentence.join(' ') === data.target) {
                    this.playSound('success');
                    this.triggerSuccessBurst();
                    this.showMoon({ en: "Exactly! That's how you build the sentence.", es: "¡Exacto! Así se construye." });

                    // Style them inside the box to show success
                    dropZones.forEach(dz => dz.firstChild.classList.add('success'));

                    this.showNextButton(box);
                } else {
                    this.playSound('error');
                    this.showMoon({ en: "Hmm... that's not quite right. Swap them around!", es: "Cámbialas de lugar." });
                }
            }
        };

        this.container.appendChild(box);
    }

    /**
     * Fill in the Blank activity
     * JSON shape: { type: "fill_in_blank", sentence: "I ___ happy.", answer: "am", options: ["am","is","are"], prompt: "..." }
     * Use ___ (three underscores) to mark the blank in the sentence.
     */
    renderFillInBlank(data) {
        const box = document.createElement('div');
        box.className = 'activity-box';

        const prompt = document.createElement('div');
        prompt.className = 'activity-prompt';
        prompt.innerText = data.prompt || 'Choose the correct word to complete the sentence.';
        box.appendChild(prompt);

        // Sentence display with blank highlighted
        const sentenceEl = document.createElement('div');
        sentenceEl.className = 'fib-sentence';
        const parts = data.sentence.split('___');
        const blankSpan = `<span class="fib-blank" id="fib-blank">___</span>`;
        sentenceEl.innerHTML = parts.join(blankSpan);
        box.appendChild(sentenceEl);

        // Shuffle options
        const options = [...data.options].sort(() => Math.random() - 0.5);

        const optionsGrid = document.createElement('div');
        optionsGrid.className = 'fib-options';
        box.appendChild(optionsGrid);

        const feedback = document.createElement('div');
        feedback.className = 'speech-feedback';
        box.appendChild(feedback);

        let answered = false;

        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'fib-option-btn';
            btn.innerText = opt;

            btn.addEventListener('click', () => {
                if (answered) return;
                answered = true;

                // Update blank text
                const blankEl = document.getElementById('fib-blank');

                if (opt === data.answer) {
                    // ✅ Correct
                    this.playSound('success');
                    this.triggerSuccessBurst();

                    btn.classList.add('fib-correct');
                    if (blankEl) {
                        blankEl.textContent = opt;
                        blankEl.classList.add('fib-blank-solved');
                    }
                    // Speak the full completed sentence
                    const fullSentence = data.sentence.replace('___', opt);
                    this.speak(fullSentence);

                    feedback.innerHTML = `✓ <strong>${opt}</strong> — correct!`;
                    feedback.style.color = '#86efac';

                    const msg = data.successMsg || { en: "Exactly right! Well done.", es: "¡Exacto! Muy bien." };
                    setTimeout(() => {
                        this.showMoon(msg);
                        this.showNextButton(box);
                    }, 600);
                } else {
                    // ❌ Wrong
                    this.playSound('error');
                    btn.classList.add('fib-wrong');
                    btn.disabled = true;

                    feedback.innerHTML = `✗ Try again — that's not it.`;
                    feedback.style.color = '#fca5a5';

                    this.showMoon({ en: "Not quite! Look at the other options.", es: "¡Piénsalo bien! Mira las otras opciones." });

                    // Re-allow trying
                    answered = false;
                    setTimeout(() => {
                        btn.classList.remove('fib-wrong');
                        btn.disabled = true; // keep wrong option disabled
                        feedback.innerHTML = '';
                    }, 800);
                }
            });

            optionsGrid.appendChild(btn);
        });

        this.container.appendChild(box);
    }

    renderMatching(data) {

        const box = document.createElement('div');
        box.className = 'activity-box';

        const prompt = document.createElement('div');
        prompt.className = 'activity-prompt';
        prompt.innerText = data.prompt || 'Match each word with its meaning.';
        box.appendChild(prompt);

        // Speed timer
        if (data.timer) {
            const seconds = typeof data.timer === 'number' ? data.timer : 20;
            this.startTimer(box, seconds, () => {
                this.showMoon({ en: "Time's up! No worries, keep going.", es: "Sin presión, termina a tu ritmo." });
            });
        }

        // Build a single flat pool: all terms + all definitions, shuffled TOGETHER
        let allItems = [];
        for (let [en, es] of Object.entries(data.pairs)) {
            allItems.push({ text: en, type: 'term', pairId: en });
            allItems.push({ text: es, type: 'def', pairId: en });
        }
        // Fisher-Yates shuffle for true randomness
        for (let i = allItems.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allItems[i], allItems[j]] = [allItems[j], allItems[i]];
        }

        // Dynamic grid columns
        const total = allItems.length;
        const cols = total <= 4 ? 2 : total <= 6 ? 3 : 4;

        const grid = document.createElement('div');
        grid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(${cols}, 1fr);
            gap: 0.75rem;
            margin-top: 1.5rem;
            width: 100%;
            max-width: 580px;
            margin-left: auto;
            margin-right: auto;
        `;
        box.appendChild(grid);

        let selectedItem = null;
        let matchedPairs = 0;
        const totalPairs = Object.keys(data.pairs).length;

        // Unique accent per pair
        const pairAccents = [
            { border: '#22c55e', bg: 'rgba(34,197,94,0.18)', text: '#bbf7d0' },
            { border: '#38bdf8', bg: 'rgba(56,189,248,0.18)', text: '#bae6fd' },
            { border: '#f59e0b', bg: 'rgba(245,158,11,0.18)', text: '#fde68a' },
            { border: '#a78bfa', bg: 'rgba(167,139,250,0.18)', text: '#ddd6fe' },
            { border: '#f472b6', bg: 'rgba(244,114,182,0.18)', text: '#fbcfe8' },
            { border: '#34d399', bg: 'rgba(52,211,153,0.18)', text: '#a7f3d0' },
        ];
        const accentMap = {};
        Object.keys(data.pairs).forEach((key, i) => {
            accentMap[key] = pairAccents[i % pairAccents.length];
        });

        const resetStyle = (btn) => {
            btn.style.borderColor = 'rgba(255,255,255,0.15)';
            btn.style.background = 'rgba(255,255,255,0.05)';
            btn.style.color = 'rgba(255,255,255,0.85)';
            btn.style.transform = 'scale(1)';
            btn.style.boxShadow = 'none';
        };

        const selectStyle = (btn) => {
            btn.style.borderColor = '#22c55e';
            btn.style.background = 'rgba(34,197,94,0.2)';
            btn.style.color = '#bbf7d0';
            btn.style.transform = 'scale(1.05)';
            btn.style.boxShadow = '0 0 16px rgba(34,197,94,0.35)';
        };

        allItems.forEach(item => {
            const btn = document.createElement('button');
            btn.className = 'match-btn';
            btn.innerText = item.text;
            btn.dataset.id = item.pairId;
            btn.dataset.type = item.type;

            btn.style.cssText = `
                padding: 0.9rem 0.6rem;
                border: 1.5px solid rgba(255,255,255,0.15);
                background: rgba(255,255,255,0.05);
                border-radius: 14px;
                cursor: pointer;
                font-size: 1rem;
                font-weight: 600;
                color: rgba(255,255,255,0.85);
                transition: all 0.2s cubic-bezier(0.4,0,0.2,1);
                font-family: 'Outfit', sans-serif;
                backdrop-filter: blur(4px);
                min-height: 58px;
                word-break: break-word;
                text-align: center;
                line-height: 1.3;
            `;

            btn.addEventListener('click', () => {
                if (btn.classList.contains('solved')) return;

                // Deselect self
                if (selectedItem === btn) {
                    btn.classList.remove('selected');
                    resetStyle(btn);
                    selectedItem = null;
                    return;
                }

                if (!selectedItem) {
                    selectedItem = btn;
                    btn.classList.add('selected');
                    selectStyle(btn);
                } else {
                    // Same type → swap selection
                    if (selectedItem.dataset.type === btn.dataset.type) {
                        selectedItem.classList.remove('selected');
                        resetStyle(selectedItem);
                        selectedItem = btn;
                        btn.classList.add('selected');
                        selectStyle(btn);
                        return;
                    }

                    if (selectedItem.dataset.id === btn.dataset.id) {
                        // ✅ Correct match
                        this.playSound('success');
                        const accent = accentMap[btn.dataset.id];

                        [btn, selectedItem].forEach(b => {
                            b.classList.add('solved');
                            b.classList.remove('selected');
                            b.style.borderColor = accent.border;
                            b.style.background = accent.bg;
                            b.style.color = accent.text;
                            b.style.boxShadow = `0 0 12px ${accent.border}55`;
                            b.style.cursor = 'default';
                            b.style.animation = 'matchPop 0.4s cubic-bezier(0.175,0.885,0.32,1.275)';
                        });

                        selectedItem = null;
                        matchedPairs++;

                        if (matchedPairs === totalPairs) {
                            setTimeout(() => {
                                this.triggerSuccessBurst();
                                const msg = data.successMsg || { en: "You matched all pairs perfectly!", es: "¡Todos los pares correctos!" };
                                this.showMoon(msg);
                                this.showNextButton(box);
                            }, 350);
                        }
                    } else {
                        // ❌ Wrong
                        this.playSound('error');
                        const w1 = selectedItem;
                        const w2 = btn;

                        [w1, w2].forEach(b => {
                            b.classList.remove('selected');
                            b.style.borderColor = '#ef4444';
                            b.style.background = 'rgba(239,68,68,0.15)';
                            b.style.color = '#fca5a5';
                            b.style.animation = 'matchShake 0.35s ease';
                        });

                        setTimeout(() => {
                            [w1, w2].forEach(b => {
                                b.style.animation = '';
                                resetStyle(b);
                            });
                        }, 500);

                        selectedItem = null;
                    }
                }
            });

            grid.appendChild(btn);
        });

        this.container.appendChild(box);
    }


    // --- SOUND EFFECTS ENGINE (Web Audio API) ---
    playSound(type) {
        // Usa la API nativa de audio del navegador sin necesitar archivos MP3
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        try {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            if (type === 'success') {
                // Sonido feliz: Dos notas ascendentes (Arpegio rápido)
                osc.type = 'sine';
                osc.frequency.setValueAtTime(523.25, ctx.currentTime); // Do (C5)
                osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // Mi (E5)

                gain.gain.setValueAtTime(0, ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
                gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);

                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.3);
            } else if (type === 'error') {
                // Sonido de fallo: Tono grave descendente
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(300, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.2);

                gain.gain.setValueAtTime(0, ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
                gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);

                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.3);
            }
        } catch (e) {
            console.error("Error reproduciendo sonido:", e);
        }
    }

    renderCompletion() {
        this.progressBar.style.width = '100%';
        this.container.innerHTML = '';

        // Calcular minutos y lanzar evento
        const endTime = Date.now();
        const minutesSpent = Math.max(1, Math.round((endTime - this.startTime) / 60000));
        const totalSteps = this.data.length;
        document.dispatchEvent(new CustomEvent('lessonCompleted', { detail: { minutes: minutesSpent } }));

        const targetUrl = this.options.returnUrl || 'mapa.html';

        // Epic confetti burst on load
        setTimeout(() => this.triggerSuccessBurst(true), 300);
        setTimeout(() => this.triggerSuccessBurst(true), 700);

        const box = document.createElement('div');
        box.className = 'completion-box';

        // Story player (desktop only)
        const hasHistory = this.sessionHistory.length > 0 && !this.isMobile;
        const storyPlayerHTML = hasHistory ? `
            <div class="story-player-card">
                <div class="story-player-title">🎙️ Today's Adventure</div>
                <div class="story-player-sub">Listen to your complete conversation with Moon.</div>
                <button id="play-story-btn" class="btn-play-story">▶️ Play My Session</button>
            </div>
        ` : '';

        box.innerHTML = `
            <div class="completion-trophy">🏆</div>
            <h2 class="completion-title">Lesson <span>Complete!</span></h2>
            <p class="completion-subtitle">You just leveled up your English. Keep exploring the forest!</p>

            <div class="completion-stats">
                <div class="stat-pill">
                    <div class="stat-pill-value">${minutesSpent}</div>
                    <div class="stat-pill-label">Minutes<br>Speaking</div>
                </div>
                <div class="stat-pill">
                    <div class="stat-pill-value">${totalSteps}</div>
                    <div class="stat-pill-label">Activities<br>Completed</div>
                </div>
                <div class="stat-pill">
                    <div class="stat-pill-value">🌟</div>
                    <div class="stat-pill-label">XP<br>Earned</div>
                </div>
            </div>

            ${storyPlayerHTML}

            <button class="btn-return-forest" onclick="window.location.href='${targetUrl}'">
                🌲 Back to the Forest
            </button>
        `;

        this.container.appendChild(box);

        // Story player logic
        if (hasHistory) {
            const playBtn = document.getElementById('play-story-btn');
            if (playBtn) {
                playBtn.addEventListener('click', async () => {
                    playBtn.disabled = true;
                    playBtn.innerText = '🎬 Playing...';

                    for (const item of this.sessionHistory) {
                        if (item.type === 'moon') {
                            await new Promise(resolve => this.speak(item.content, () => resolve()));
                        } else if (item.type === 'child') {
                            await new Promise(resolve => {
                                const audio = new Audio(item.content);
                                audio.onended = resolve;
                                audio.play().catch(() => resolve());
                            });
                        }
                    }

                    playBtn.disabled = false;
                    playBtn.innerText = '▶️ Play Again';
                });
            }
        }

        this.showMoon({ en: "You finished your training! You're brave.", es: "¡Terminaste! Eres valiente." });
    }

    /* -------------------------------------------------------------------------- */
    /* UTILS                                                                      */
    /* -------------------------------------------------------------------------- */

    speak(text, onEndCallback = null) {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel(); // Cancel ongoing speech

            // Guardar en el historial para el final (solo si no estamos en reproducción final)
            if (!onEndCallback) {
                this.sessionHistory.push({ type: 'moon', content: text });
            }

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = 0.85;
            const preferredVoice = this.voices.find(v => v.lang === 'en-US' && v.name.includes('Google'));
            if (preferredVoice) utterance.voice = preferredVoice;

            if (onEndCallback) {
                utterance.onend = () => onEndCallback();
            }

            window.speechSynthesis.speak(utterance);
        } else if (onEndCallback) {
            onEndCallback(); // Fallback
        }
    }

    showNextButton(parentBox) {
        if (this.currentTimerId) {
            clearTimeout(this.currentTimerId);
            this.currentTimerId = null;

            if (this.currentTimerBar) {
                const currentWidth = window.getComputedStyle(this.currentTimerBar).width;
                this.currentTimerBar.style.transition = 'none';
                this.currentTimerBar.style.width = currentWidth;
                this.currentTimerBar.style.background = 'linear-gradient(90deg, #22c55e, #4ade80)';
                this.currentTimerBar = null;
            }
        }

        if (parentBox.querySelector('.btn-next-step')) return;

        const nextBtn = document.createElement('button');
        nextBtn.className = 'btn-next-step visible';
        const isLast = this.currentStep >= this.data.length - 1;
        nextBtn.innerText = isLast ? '🏁 Finish Lesson!' : 'Next Activity →';
        nextBtn.onclick = () => this.nextStep();
        parentBox.appendChild(nextBtn);
    }

    startTimer(parentBox, seconds, onTimeUp) {
        const timerContainer = document.createElement('div');
        timerContainer.style.width = '100%';
        timerContainer.style.height = '6px';
        timerContainer.style.background = '#e2e8f0';
        timerContainer.style.borderRadius = '99px';
        timerContainer.style.marginTop = '1.5rem';
        timerContainer.style.marginBottom = '1.5rem';
        timerContainer.style.overflow = 'hidden';
        timerContainer.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.1)';

        const timerBar = document.createElement('div');
        timerBar.style.height = '100%';
        timerBar.style.width = '100%';
        timerBar.style.background = 'linear-gradient(90deg, #3b82f6, #60a5fa)';
        timerBar.style.borderRadius = '99px';
        timerBar.style.transition = `width ${seconds}s linear`;
        timerContainer.appendChild(timerBar);

        // Insertar después del prompt
        const prompt = parentBox.querySelector('.activity-prompt');
        if (prompt) {
            prompt.after(timerContainer);
        } else {
            parentBox.prepend(timerContainer);
        }

        // Iniciar animación
        setTimeout(() => {
            timerBar.style.width = '0%';
        }, 50);

        const timeoutId = setTimeout(() => {
            if (onTimeUp) onTimeUp();
            timerBar.style.background = '#f87171'; // Rojo al fallar
        }, seconds * 1000);

        // Guardar referencia para limpiar si terminan antes
        this.currentTimerId = timeoutId;
        this.currentTimerBar = timerBar;
    }

    showMoon(message) {
        if (!this.moonSupport) return;

        // message can be a string or { en: '...', es: '...' }
        let enText, esText;
        if (typeof message === 'object' && message !== null && message.en) {
            enText = message.en;
            esText = message.es || '';
        } else {
            // Legacy plain string — treat as English
            enText = String(message);
            esText = '';
        }

        this.moonMessage.innerHTML = `
            <span class="moon-msg-en">${enText}</span>
            ${esText ? `<span class="moon-msg-es">${esText}</span>` : ''}
        `;
        this.moonSupport.classList.remove('hidden');

        // Speak Moon's message in English using TTS
        this.speakMoon(enText);
    }

    speakMoon(text) {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        utterance.pitch = 1.1; // slightly warmer voice for Moon
        const preferredVoice = this.voices.find(v => v.lang === 'en-US' && v.name.includes('Google'));
        if (preferredVoice) utterance.voice = preferredVoice;
        window.speechSynthesis.speak(utterance);
    }

    hideMoon() {
        if (!this.moonSupport) return;
        this.moonSupport.classList.add('hidden');
    }

    triggerSuccessBurst(big = false) {
        const burst = document.createElement('div');
        burst.className = 'success-burst';
        document.body.appendChild(burst);

        const colors = ['#22c55e', '#f59e0b', '#3b82f6', '#a855f7', '#ec4899', '#fbbf24'];
        const count = big ? 40 : 18;
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;

        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            p.className = 'burst-particle';
            const angle = (i / count) * 360 * (Math.PI / 180);
            const dist = (big ? 200 : 120) + Math.random() * (big ? 200 : 80);
            const dx = Math.cos(angle) * dist;
            const dy = Math.sin(angle) * dist - (big ? 100 : 50);
            p.style.cssText = `
                left: ${cx}px; top: ${cy}px;
                background: ${colors[i % colors.length]};
                --dx: ${dx}px; --dy: ${dy}px;
                width: ${Math.random() * 10 + 6}px;
                height: ${Math.random() * 10 + 6}px;
                border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
                animation-duration: ${0.7 + Math.random() * 0.5}s;
                animation-delay: ${Math.random() * 0.15}s;
            `;
            burst.appendChild(p);
        }

        setTimeout(() => burst.remove(), 1200);
    }

    addReportButton() {
        const reportBtn = document.createElement('button');
        reportBtn.id = 'report-issue-btn';
        reportBtn.innerHTML = '🚩 Report issue';
        reportBtn.title = "Something not working? Let Moon know!";
        reportBtn.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            padding: 8px 14px;
            border-radius: 99px;
            font-size: 0.75rem;
            cursor: pointer;
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s;
            font-family: 'Outfit', sans-serif;
            font-weight: 600;
        `;

        reportBtn.onclick = () => {
            const reason = prompt("What happened? (e.g. Voice not recognized, wrong translation, didn't load)");
            if (reason) {
                this.logFrustration('manual_report', { reason });
                alert("Thank you! Moon is already reviewing your report. 🌲✨");
            }
        };

        document.body.appendChild(reportBtn);
    }

    async logFrustration(type, extra = {}) {
        try {
            const stepData = this.data[this.currentStep] || {};
            const report = {
                type: type, // 'frustration_auto' or 'manual_report'
                lessonId: this.options.lessonId || 'unknown',
                moduleId: this.options.moduleId || 'unknown',
                stepIndex: this.currentStep,
                targetWord: stepData.word || stepData.target || 'N/A',
                userId: this.options.userId || 'anonymous',
                timestamp: serverTimestamp(),
                viewport: `${window.innerWidth}x${window.innerHeight}`,
                userAgent: navigator.userAgent,
                ...extra
            };

            await addDoc(collection(db, 'reports'), report);
            console.log("Frustration logged:", type);
        } catch (err) {
            console.error("Error logging frustration:", err);
        }
    }
}
