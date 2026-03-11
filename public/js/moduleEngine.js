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
        this.errors = 0; // Para calcular estrellas


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
        this.femaleVoice = null;
        window.speechSynthesis.onvoiceschanged = () => {
            this.voices = window.speechSynthesis.getVoices();
            this.setFemaleVoice();
        };
        // Intento inicial por si ya estaban cargadas
        this.voices = window.speechSynthesis.getVoices();
        this.setFemaleVoice();

        this.init();
    }

    setFemaleVoice() {
        if (!this.voices || this.voices.length === 0) return;
        const preferredNames = [
            'Google US English', 'Zira', 'Samantha', 'Karen', 'Victoria',
            'Moira', 'Monica', 'Fiona', 'Grace', 'Jenny', 'Microsoft Zira'
        ];

        for (let name of preferredNames) {
            const voice = this.voices.find(v => v.lang.startsWith('en') && v.name.includes(name));
            if (voice) {
                this.femaleVoice = voice;
                return voice;
            }
        }

        const fallback = this.voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female'));
        if (fallback) {
            this.femaleVoice = fallback;
            return fallback;
        }

        this.femaleVoice = this.voices.find(v => v.lang.startsWith('en')) || this.voices[0];
        return this.femaleVoice;
    }

    getFemaleVoice() {
        if (this.femaleVoice) return this.femaleVoice;
        this.voices = window.speechSynthesis.getVoices();
        return this.setFemaleVoice();
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
            this.renderLessonCompleteMoon();
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
        } else if (stepData.type === 'story_moment') {
            this.renderStoryMoment(stepData);
        } else if (stepData.type === 'interstitial_moon') {
            this.renderInterstitialMoon(stepData);
        } else if (stepData.type === 'speed_speak') {
            this.renderSpeedSpeak(stepData);
        } else if (stepData.type === 'picture_it') {
            this.renderPictureIt(stepData);
        } else if (stepData.type === 'memory_flip') {
            this.renderMemoryFlip(stepData);
        } else if (stepData.type === 'boss_battle') {
            this.renderBossBattle(stepData);
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
                cardEl.classList.add('solved');
                solvedCount++;

                if (solvedCount === data.cards.length) {
                    this.playSound('success');
                    this.triggerSuccessBurst();
                    this.showNextButton(box);
                    // Reproduce el sonido de la palabra y cuando termine, el de Moon
                    this.speak(card.word, () => {
                        this.showMoon({ en: "You heard them all. Super!", es: "¡Las escuchaste todas!" });
                    });
                } else {
                    this.speak(card.word);
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
                        this.errors++; // Max attempts reached
                    } else if (attempts > 1) {
                        this.errors++; // Needed multiple attempts
                    }

                    let msg = (attempts >= 3 && !matches)
                        ? { en: "That phrase is a big challenge! Moon's magic helps you move forward.", es: "¡Difícil! Sigamos explorando." }
                        : (attempts === 2 && !matches)
                            ? { en: "So close! I heard your great effort. Let's go!", es: "¡Casi perfecto! ¡Avancemos!" }
                            : null;

                    forcePass(msg);
                } else {
                    this.playSound('error');
                    this.errors++;
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
                    this.errors++;
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
                    this.errors++;
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
                        this.errors++;
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

    // --- NUEVOS MÉTODOS DE MOON Y ACTIVIDADES ---

    renderStoryMoment(data) {
        const overlay = document.createElement('div');
        overlay.className = 'story-intro-overlay';

        const card = document.createElement('div');
        card.className = 'story-intro-card';

        const label = document.createElement('div');
        label.className = 'story-intro-label';
        label.innerText = '🌲 Story Moment';

        const avatar = document.createElement('div');
        avatar.className = 'story-intro-avatar';
        avatar.innerText = '🐻‍❄️';

        const enMsg = data.en || "Moon is thinking...";
        const esMsg = data.es || "";

        const msgText = document.createElement('div');
        msgText.innerHTML = `
            <div class="story-intro-text-en">${enMsg}</div>
            ${esMsg ? `<div class="story-intro-text-es">${esMsg}</div>` : ''}
        `;

        const btn = document.createElement('button');
        btn.className = 'story-intro-btn';
        btn.innerText = "Let's Go! →";
        btn.style.opacity = '0';
        btn.style.pointerEvents = 'none';

        btn.onclick = () => {
            overlay.classList.add('closing');
            setTimeout(() => {
                overlay.remove();
                this.nextStep();
            }, 500);
        };

        card.appendChild(label);
        card.appendChild(avatar);
        card.appendChild(msgText);
        card.appendChild(btn);
        overlay.appendChild(card);
        document.body.appendChild(overlay);

        // Narrar la historia
        this.speakMoon(enMsg, () => {
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
        });

        // Show button anyway after a while to avoid lock
        setTimeout(() => {
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
        }, 5000);
    }

    renderInterstitialMoon(data) {
        const overlay = document.createElement('div');
        overlay.className = 'moon-interstitial-overlay';

        const card = document.createElement('div');
        card.className = 'moon-interstitial-card';

        const avatar = document.createElement('div');
        avatar.className = 'moon-interstitial-avatar';
        avatar.innerText = '🐻‍❄️';

        const msgBox = document.createElement('div');
        msgBox.className = 'moon-interstitial-message';

        const enMsg = data.message?.en || "Great job!";
        const esMsg = data.message?.es || "";

        msgBox.innerHTML = `
            <div class="moon-interstitial-en">${enMsg}</div>
            ${esMsg ? `<span class="moon-interstitial-es">${esMsg}</span>` : ''}
        `;

        const contHint = document.createElement('div');
        contHint.className = 'moon-interstitial-continue';
        contHint.innerText = 'Loading next activity...';

        card.appendChild(avatar);
        card.appendChild(msgBox);
        card.appendChild(contHint);
        overlay.appendChild(card);
        document.body.appendChild(overlay);

        this.speakMoon(enMsg, () => {
            contHint.innerText = 'Tap anywhere to continue →';
            // Al terminar de hablar, permitir avanzar haciendo click en cualquier lado
            overlay.onclick = () => {
                overlay.classList.add('closing');
                setTimeout(() => {
                    overlay.remove();
                    this.nextStep();
                }, 400);
            };
        });

        // Auto-advance after 5s max if no action
        setTimeout(() => {
            if (document.body.contains(overlay)) {
                contHint.innerText = 'Tap anywhere to continue →';
                overlay.onclick = () => {
                    overlay.classList.add('closing');
                    setTimeout(() => {
                        overlay.remove();
                        this.nextStep();
                    }, 400);
                };
            }
        }, 5000);
    }

    renderSpeedSpeak(data) {
        const box = document.createElement('div');
        box.className = 'activity-box speed-speak-box';

        const prompt = document.createElement('div');
        prompt.className = 'activity-prompt';
        prompt.innerText = data.prompt || 'Say it fast before time runs out!';
        box.appendChild(prompt);

        const targetWords = [...data.words];
        // randomize if required
        targetWords.sort(() => Math.random() - 0.5);

        let currentIndex = 0;
        let timerId = null;
        let isListeningWord = false;

        const timerTrack = document.createElement('div');
        timerTrack.className = 'speed-timer-track';
        const timerFill = document.createElement('div');
        timerFill.className = 'speed-timer-fill';
        timerTrack.appendChild(timerFill);

        const scoreTrack = document.createElement('div');
        scoreTrack.className = 'speed-score-track';
        for (let i = 0; i < targetWords.length; i++) {
            const dot = document.createElement('div');
            dot.className = 'speed-dot';
            dot.id = `speed-dot-${i}`;
            scoreTrack.appendChild(dot);
        }

        const displayArea = document.createElement('div');
        displayArea.style.margin = '2rem 0';
        displayArea.style.minHeight = '150px';

        const targetDisplay = document.createElement('div');
        targetDisplay.className = 'speed-target-display';
        targetDisplay.innerText = targetWords[0];

        displayArea.appendChild(targetDisplay);

        const feedback = document.createElement('div');
        feedback.className = 'speed-feedback';
        feedback.innerText = 'Press the mic to start!';

        const micBtn = document.createElement('button');
        micBtn.className = 'speed-speak-mic';
        micBtn.innerHTML = '🎤';

        box.appendChild(scoreTrack);
        box.appendChild(displayArea);
        box.appendChild(timerTrack);
        box.appendChild(micBtn);
        box.appendChild(feedback);

        this.container.appendChild(box);

        const secPerWord = data.seconds_per_word || 4;

        const nextWord = () => {
            if (currentIndex >= targetWords.length) {
                // Done
                micBtn.style.display = 'none';
                timerTrack.style.display = 'none';
                targetDisplay.innerText = "Challenge Complete!";
                targetDisplay.className = 'speed-target-display success-word';
                feedback.innerText = "";
                this.playSound('success');
                this.triggerSuccessBurst();
                this.showMoon({ en: "Wow! You speak so fast! Beautiful.", es: "¡Wow! ¡Hablas muy rápido! Hermoso." });
                this.showNextButton(box);

                if (this.recognition && isListeningWord) {
                    try { this.recognition.stop(); } catch (e) { }
                }
                return;
            }

            // Setup current word
            targetDisplay.className = 'speed-target-display';
            targetDisplay.innerText = targetWords[currentIndex];
            timerFill.style.transition = 'none';
            timerFill.style.width = '100%';
            timerFill.style.background = 'linear-gradient(90deg, var(--forest-glow), #4ade80)';

            // Wait a tiny bit and animate timer
            setTimeout(() => {
                timerFill.style.transition = `width ${secPerWord}s linear, background-color ${secPerWord}s ease`;
                timerFill.style.width = '0%';
                timerFill.style.background = '#ef4444'; // goes red at the end
            }, 50);

            // Timer fail logic
            timerId = setTimeout(() => {
                if (isListeningWord) {
                    this.errors++;
                    this.playSound('error');
                    targetDisplay.classList.add('fail-word');
                    document.getElementById(`speed-dot-${currentIndex}`).classList.add('miss');
                    currentIndex++;
                    setTimeout(() => nextWord(), 1000); // 1s wait before next
                }
            }, secPerWord * 1000);
        };

        micBtn.addEventListener('click', () => {
            if (!this.recognition || isListeningWord) return;

            isListeningWord = true;
            micBtn.classList.add('active');
            feedback.innerText = "Listening continuously... Say the words!";

            try {
                this.recognition.continuous = true;
                this.recognition.interimResults = true;
                this.recognition.start();
            } catch (e) { console.error(e); }

            nextWord();
        });

        if (this.recognition) {
            this.recognition.onresult = (event) => {
                if (!isListeningWord || currentIndex >= targetWords.length) return;

                // Check latest transcript
                let currentTranscript = "";
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    currentTranscript += event.results[i][0].transcript.toLowerCase();
                }

                const target = targetWords[currentIndex].toLowerCase();

                if (currentTranscript.includes(target) || currentTranscript.replace(/\s/g, '').includes(target.replace(/\s/g, ''))) {
                    // Success for this word
                    clearTimeout(timerId);
                    this.playSound('success');
                    targetDisplay.classList.add('success-word');
                    document.getElementById(`speed-dot-${currentIndex}`).classList.add('hit');

                    currentIndex++;
                    setTimeout(() => nextWord(), 600); // short delay for visual confirmation
                }
            };

            this.recognition.onerror = () => {
                if (isListeningWord && currentIndex < targetWords.length) {
                    // Try resetting recognition
                    try { this.recognition.stop(); setTimeout(() => this.recognition.start(), 300); } catch (e) { }
                }
            };

            this.recognition.onend = () => {
                if (isListeningWord && currentIndex < targetWords.length) {
                    // Try to keep it active
                    try { this.recognition.start(); } catch (e) { }
                }
            };
        }
    }

    renderBossBattle(data) {
        const box = document.createElement('div');
        box.className = 'activity-box boss-battle-box';

        const prompt = document.createElement('div');
        prompt.className = 'activity-prompt';
        prompt.innerText = data.prompt || 'Defeat the Boss by speaking clearly!';
        box.appendChild(prompt);

        const targetWords = [...data.words];
        targetWords.sort(() => Math.random() - 0.5); // Randomize boss challenges

        let currentIndex = 0;
        let hp = 4; // 4 lives
        let isListeningWord = false;

        const hpTrack = document.createElement('div');
        hpTrack.className = 'boss-hp-track';
        hpTrack.style.display = 'flex';
        hpTrack.style.justifyContent = 'center';
        hpTrack.style.gap = '10px';
        hpTrack.style.marginBottom = '20px';
        hpTrack.style.fontSize = '2rem';

        const updateHP = () => {
            hpTrack.innerHTML = '';
            for (let i = 0; i < hp; i++) {
                hpTrack.innerHTML += '❤️';
            }
            if (hp === 0) {
                hpTrack.innerHTML = '💔';
            }
        };
        updateHP();
        box.appendChild(hpTrack);

        const scoreTrack = document.createElement('div');
        scoreTrack.className = 'speed-score-track';
        for (let i = 0; i < targetWords.length; i++) {
            const dot = document.createElement('div');
            dot.className = 'speed-dot';
            dot.id = `boss-dot-${i}`;
            scoreTrack.appendChild(dot);
        }

        const displayArea = document.createElement('div');
        displayArea.style.margin = '2rem 0';
        displayArea.style.minHeight = '150px';

        const targetDisplay = document.createElement('div');
        targetDisplay.className = 'speed-target-display';
        targetDisplay.innerText = targetWords[0];

        displayArea.appendChild(targetDisplay);

        const feedback = document.createElement('div');
        feedback.className = 'speed-feedback';
        feedback.innerText = 'Presiona el micrófono para iniciar la batalla!';

        const micBtn = document.createElement('button');
        micBtn.className = 'speed-speak-mic';
        micBtn.innerHTML = '🎤';

        box.appendChild(scoreTrack);
        box.appendChild(displayArea);
        box.appendChild(micBtn);
        box.appendChild(feedback);

        this.container.appendChild(box);

        const nextWord = () => {
            if (hp <= 0) {
                // Game Over logic
                micBtn.style.display = 'none';
                targetDisplay.innerText = "Game Over!";
                targetDisplay.className = 'speed-target-display';
                targetDisplay.style.color = '#ef4444';
                feedback.innerText = "Te quedaste sin corazones...";
                this.playSound('error');
                this.showMoon({ en: "Oh no... you lost all your hearts. Let's try again tomorrow.", es: "Oh no... perdiste todos tus corazones. Vuelve a intentarlo." });
                this.showNextButton(box);
                if (this.recognition && isListeningWord) {
                    try { this.recognition.stop(); } catch (e) { }
                }
                return;
            }

            if (currentIndex >= targetWords.length) {
                // Boss Defeated
                micBtn.style.display = 'none';
                targetDisplay.innerText = "¡Jefe Derrotado!";
                targetDisplay.className = 'speed-target-display success-word';
                feedback.innerText = "¡Ganaste!";
                this.playSound('success');
                this.triggerSuccessBurst(true);
                setTimeout(() => this.triggerSuccessBurst(), 500);
                this.showMoon({ en: "Incredible! You defeated the boss!", es: "¡Increíble! ¡Acabas de derrotar al jefe final!" });
                this.showNextButton(box);

                if (this.recognition && isListeningWord) {
                    try { this.recognition.stop(); } catch (e) { }
                }
                return;
            }

            // Setup current word
            targetDisplay.className = 'speed-target-display';
            let currentTargetWord = targetWords[currentIndex];
            targetDisplay.innerText = currentTargetWord;
            targetDisplay.style.color = '';
            timerFill.style.width = '100%';
            timerFill.style.background = 'linear-gradient(90deg, var(--forest-glow), #4ade80)';
        };

        const timerTrack = document.createElement('div');
        timerTrack.className = 'speed-timer-track';
        const timerFill = document.createElement('div');
        timerFill.className = 'speed-timer-fill';
        timerTrack.appendChild(timerFill);
        displayArea.after(timerTrack);

        let timerId = null;
        let secPerWord = 5;

        const startTimer = () => {
            timerFill.style.transition = 'none';
            timerFill.style.width = '100%';
            timerFill.style.background = 'linear-gradient(90deg, var(--forest-glow), #4ade80)';

            setTimeout(() => {
                timerFill.style.transition = `width ${secPerWord}s linear, background-color ${secPerWord}s ease`;
                timerFill.style.width = '0%';
                timerFill.style.background = '#ef4444';
            }, 50);

            timerId = setTimeout(() => {
                if (isListeningWord) {
                    // Timeout!
                    hp--;
                    updateHP();
                    this.errors++;
                    this.playSound('error');
                    targetDisplay.classList.add('fail-word');
                    document.getElementById(`boss-dot-${currentIndex}`).classList.add('miss');
                    currentIndex++;
                    setTimeout(() => {
                        targetDisplay.classList.remove('fail-word');
                        nextWord();
                        if (hp > 0 && currentIndex < targetWords.length) startTimer();
                    }, 1000);
                }
            }, secPerWord * 1000);
        };

        micBtn.addEventListener('click', () => {
            if (!this.recognition || isListeningWord) return;

            isListeningWord = true;
            micBtn.classList.add('active');
            feedback.innerText = "¡La batalla ha comenzado! Habla ahora...";

            try {
                this.recognition.continuous = true;
                this.recognition.interimResults = true;
                this.recognition.start();
            } catch (e) { console.error(e); }

            nextWord();
            startTimer();
        });

        if (this.recognition) {
            this.recognition.onresult = (event) => {
                if (!isListeningWord || currentIndex >= targetWords.length || hp <= 0) return;

                let currentTranscript = "";
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    currentTranscript += event.results[i][0].transcript.toLowerCase();
                }

                const targetRegexStr = targetWords[currentIndex].toLowerCase().replace(/\s/g, '');
                const cleanTranscript = currentTranscript.replace(/\s/g, '');

                // Allow aliases from dictionary if available in data
                let possibleMatches = [targetWords[currentIndex].toLowerCase()];
                if (data.aliasesMap && data.aliasesMap[targetWords[currentIndex]]) {
                    possibleMatches = possibleMatches.concat(data.aliasesMap[targetWords[currentIndex]]);
                }

                let isMatch = false;
                for (let match of possibleMatches) {
                    let cleanMatch = match.toLowerCase().replace(/\s/g, '');
                    if (cleanTranscript.includes(cleanMatch)) {
                        isMatch = true;
                        break;
                    }
                }

                if (isMatch) {
                    clearTimeout(timerId);
                    this.playSound('success');
                    targetDisplay.classList.add('success-word');
                    document.getElementById(`boss-dot-${currentIndex}`).classList.add('hit');

                    currentIndex++;
                    setTimeout(() => {
                        targetDisplay.classList.remove('success-word');
                        nextWord();
                        if (hp > 0 && currentIndex < targetWords.length) startTimer();
                    }, 600);
                }
            };

            this.recognition.onerror = () => {
                if (isListeningWord && currentIndex < targetWords.length && hp > 0) {
                    try { this.recognition.stop(); setTimeout(() => this.recognition.start(), 300); } catch (e) { }
                }
            };

            this.recognition.onend = () => {
                if (isListeningWord && currentIndex < targetWords.length) {
                    // Try restarting if it stopped mid-game
                    try { this.recognition.start(); } catch (e) { }
                } else {
                    micBtn.classList.remove('active');
                }
            };
        }
    }

    renderPictureIt(data) {
        const box = document.createElement('div');
        box.className = 'activity-box';

        const prompt = document.createElement('div');
        prompt.className = 'activity-prompt';
        prompt.innerText = data.prompt || 'Tap the picture of the word Moon says!';
        box.appendChild(prompt);

        const options = [...data.options];
        options.sort(() => Math.random() - 0.5);

        const grid = document.createElement('div');
        grid.className = 'picture-it-grid';

        const listenBtn = document.createElement('button');
        listenBtn.className = 'pi-listen-btn';
        listenBtn.innerHTML = '🔊 Susurrar palabra otra vez';

        let answered = false;

        options.forEach(opt => {
            const card = document.createElement('div');
            card.className = 'picture-it-card';

            let emoji = '🌲'; // fallback
            // Determine emoji: you might have to pass emojis map in data
            if (data.emojisMap && data.emojisMap[opt]) {
                emoji = data.emojisMap[opt];
            } else if (opt.includes('Happy')) emoji = '😊';
            else if (opt.includes('Sad')) emoji = '😢';
            else if (opt.includes('Tired')) emoji = '😴';
            else if (opt.includes('Ready')) emoji = '💥';

            card.innerHTML = `
                <div class="pi-emoji">${emoji}</div>
                <div class="pi-word">???</div>
            `;

            card.onclick = () => {
                if (answered || card.classList.contains('pi-locked')) return;
                answered = true;

                if (opt === data.word_to_find) {
                    // Correcto
                    this.playSound('success');
                    this.triggerSuccessBurst();
                    card.classList.add('pi-correct');
                    card.querySelector('.pi-word').innerText = opt;

                    // lock other cards
                    Array.from(grid.children).forEach(c => c.classList.add('pi-locked'));

                    this.showMoon({ en: "Spot on! That's the one.", es: "¡Exacto! Ese es." });
                    this.showNextButton(box);
                } else {
                    // Incorrecto
                    this.errors++;
                    this.playSound('error');
                    card.classList.add('pi-wrong', 'pi-locked');
                    card.querySelector('.pi-word').innerText = opt; // reveal it

                    this.showMoon({ en: `Oops! That's ${opt}. Listen again...`, es: `¡Ups! Eso es ${opt}. Escucha de nuevo...` }, () => {
                        this.speak(data.word_to_find);
                    });

                    setTimeout(() => {
                        card.classList.remove('pi-wrong');
                        answered = false;
                    }, 1500);
                }
            };

            grid.appendChild(card);
        });

        listenBtn.onclick = () => {
            this.speak(data.word_to_find);
        };

        box.appendChild(grid);
        box.appendChild(document.createElement('br'));
        box.appendChild(listenBtn);
        this.container.appendChild(box);

        // Auto-play the target word after a brief delay
        setTimeout(() => {
            this.speak(data.word_to_find);
        }, 800);
    }

    renderMemoryFlip(data) {
        const box = document.createElement('div');
        box.className = 'activity-box';

        const prompt = document.createElement('div');
        prompt.className = 'activity-prompt';
        prompt.innerText = data.prompt || 'Find the matching pairs! Listen closely.';
        box.appendChild(prompt);

        const items = [];
        // data.pairs format {"Word": "Emoji"}
        for (let [word, emoji] of Object.entries(data.pairs)) {
            items.push({ id: word, type: 'word', content: word });
            items.push({ id: word, type: 'emoji', content: emoji });
        }

        items.sort(() => Math.random() - 0.5);

        const grid = document.createElement('div');
        grid.className = 'memory-grid';
        // adjust columns based on count
        const total = items.length;
        const cols = total <= 4 ? 2 : total <= 8 ? 4 : 4;
        grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

        let firstCard = null;
        let secondCard = null;
        let lockBoard = false;
        let pairsFound = 0;
        const totalPairs = Object.keys(data.pairs).length;

        items.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'memory-card';
            card.dataset.id = item.id;

            card.innerHTML = `
                <div class="memory-card-inner">
                    <div class="memory-card-front">❓</div>
                    <div class="memory-card-back">${item.content}</div>
                </div>
            `;

            card.onclick = () => {
                if (lockBoard) return;
                if (card === firstCard) return;
                if (card.classList.contains('matched')) return;

                card.classList.add('flipped');

                // TTS on flip if it's a word card
                if (item.type === 'word') {
                    this.speak(item.content);
                }

                if (!firstCard) {
                    firstCard = card;
                    return;
                }

                secondCard = card;
                lockBoard = true;

                if (firstCard.dataset.id === secondCard.dataset.id) {
                    // Match
                    this.playSound('success');
                    firstCard.classList.add('matched');
                    secondCard.classList.add('matched');
                    firstCard = null;
                    secondCard = null;
                    lockBoard = false;
                    pairsFound++;

                    if (pairsFound === totalPairs) {
                        setTimeout(() => {
                            this.triggerSuccessBurst();
                            this.showMoon({ en: "You have a great memory!", es: "¡Tienes una memoria genial!" });
                            this.showNextButton(box);
                        }, 500);
                    }
                } else {
                    // No match
                    this.errors++;
                    this.playSound('error');
                    firstCard.querySelector('.memory-card-front').classList.add('memory-wrong-flash');
                    secondCard.querySelector('.memory-card-front').classList.add('memory-wrong-flash');

                    setTimeout(() => {
                        firstCard.classList.remove('flipped');
                        secondCard.classList.remove('flipped');
                        firstCard.querySelector('.memory-card-front').classList.remove('memory-wrong-flash');
                        secondCard.querySelector('.memory-card-front').classList.remove('memory-wrong-flash');
                        firstCard = null;
                        secondCard = null;
                        lockBoard = false;
                    }, 1200);
                }
            };

            grid.appendChild(card);
        });

        box.appendChild(grid);
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

    renderLessonCompleteMoon() {
        this.progressBar.style.width = '100%';
        this.container.innerHTML = '';

        const endTime = Date.now();
        const minutesSpent = Math.max(1, Math.round((endTime - this.startTime) / 60000));
        const totalSteps = this.data.length;

        // Calcular estrellas (Max 3. Perfeccion = 3, 1-3 errores = 2, 4+ = 1)
        let stars = 3;
        if (this.errors > 0 && this.errors <= 3) stars = 2;
        if (this.errors > 3) stars = 1;

        document.dispatchEvent(new CustomEvent('lessonCompleted', { detail: { minutes: minutesSpent, stars: stars } }));

        const targetUrl = this.options.returnUrl || 'mapa.html';

        const overlay = document.createElement('div');
        overlay.className = 'lesson-complete-overlay';

        const box = document.createElement('div');
        box.className = 'lesson-complete-card';

        const avatar = document.createElement('div');
        avatar.className = 'lesson-complete-avatar';
        avatar.innerText = '🐻‍❄️';

        const title = document.createElement('h2');
        title.className = 'lesson-complete-title';
        title.innerHTML = `Lesson <span>Complete!</span>`;

        const starsContainer = document.createElement('div');
        starsContainer.className = 'lesson-complete-stars';
        for (let i = 0; i < 3; i++) {
            const star = document.createElement('div');
            star.className = `lc-star ${i < stars ? 'active' : 'dim'}`;
            star.innerText = '⭐';
            star.style.transitionDelay = `${i * 0.15 + 0.5}s`;
            starsContainer.appendChild(star);
        }

        const msg = document.createElement('div');
        msg.className = 'lesson-complete-moon-msg';

        let msgEn = "Amazing! The forest is happy.";
        let msgEs = "¡Asombroso! El bosque está feliz.";

        if (stars === 3) {
            msgEn = "Perfect score! You are a true explorer!";
            msgEs = "¡Puntaje perfecto! Eres un explorador verdadero.";
        } else if (stars === 2) {
            msgEn = "Great job! A few bumps, but you made it.";
            msgEs = "¡Buen trabajo! Algunos tropiezos, pero lo lograste.";
        } else {
            msgEn = "You finished! Practice makes perfect.";
            msgEs = "¡Terminaste! La práctica hace al maestro.";
        }

        msg.innerHTML = `"${msgEn}" <span>${msgEs}</span>`;

        const stats = document.createElement('div');
        stats.className = 'lesson-complete-stats';

        const xpEarned = stars * 10;
        stats.innerHTML = `
            <div class="lc-stat">
                <div class="lc-stat-val">${minutesSpent}</div>
                <div class="lc-stat-label">MINUTES</div>
            </div>
            <div class="lc-stat">
                <div class="lc-stat-val">+${xpEarned}</div>
                <div class="lc-stat-label">EXP</div>
            </div>
        `;

        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.display = 'flex';
        buttonsContainer.style.flexDirection = 'column';
        buttonsContainer.style.gap = '0.75rem';
        buttonsContainer.style.marginTop = '1rem';
        buttonsContainer.style.width = '100%';

        const btnRepeat = document.createElement('button');
        btnRepeat.className = 'btn-continue-forest';
        btnRepeat.style.background = 'transparent';
        btnRepeat.style.border = '2px solid rgba(255, 255, 255, 0.2)';
        btnRepeat.style.color = 'white';
        btnRepeat.innerText = '🔄 Volver a Intentar';
        btnRepeat.onclick = () => window.location.reload();

        const btn = document.createElement('button');
        btn.className = 'btn-continue-forest';
        btn.innerText = 'Salir al Mapa →';
        btn.onclick = () => window.location.href = targetUrl;

        buttonsContainer.appendChild(btnRepeat);
        buttonsContainer.appendChild(btn);

        box.appendChild(avatar);
        box.appendChild(title);
        box.appendChild(starsContainer);
        box.appendChild(msg);
        box.appendChild(stats);
        box.appendChild(buttonsContainer);

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        // Sound & Confetti
        setTimeout(() => {
            this.playSound('success');
            this.triggerSuccessBurst(true);
            setTimeout(() => { this.triggerSuccessBurst(); }, 300);
        }, 300);

        // Moon TTS
        setTimeout(() => {
            this.speakMoon(msgEn);
        }, 800);
    }

    /* -------------------------------------------------------------------------- */
    /* UTILS                                                                      */
    /* -------------------------------------------------------------------------- */

    speak(text, onEndCallback = null) {
        if (!('speechSynthesis' in window)) {
            if (onEndCallback) onEndCallback();
            return;
        }

        const play = () => {
            window.speechSynthesis.cancel(); // Cancel ongoing speech

            // Guardar en el historial para el final (solo si no estamos en reproducción final)
            if (!onEndCallback) {
                this.sessionHistory.push({ type: 'moon', content: text });
            }

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = 0.85;

            const voice = this.getFemaleVoice();
            if (voice) utterance.voice = voice;

            if (onEndCallback) {
                utterance.onend = () => onEndCallback();
            }

            window.speechSynthesis.speak(utterance);
        };

        if (window.speechSynthesis.getVoices().length === 0) {
            // Wait up to 1s for voices to load (especially Safari/Chrome initial load)
            let attempts = 0;
            const timer = setInterval(() => {
                if (window.speechSynthesis.getVoices().length > 0 || attempts > 10) {
                    clearInterval(timer);
                    play();
                }
                attempts++;
            }, 100);
        } else {
            play();
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

    showMoon(message, onEndCallback = null) {
        if (!this.moonSupport) {
            if (onEndCallback) onEndCallback();
            return;
        }

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
        this.speakMoon(enText, onEndCallback);
    }

    speakMoon(text, onEndCallback = null) {
        if (!('speechSynthesis' in window)) return;

        const play = () => {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = 0.9;
            utterance.pitch = 1.1; // slightly warmer voice for Moon

            const voice = this.getFemaleVoice();
            if (voice) utterance.voice = voice;

            if (onEndCallback) {
                utterance.onend = () => onEndCallback();
            }

            window.speechSynthesis.speak(utterance);
        };

        if (window.speechSynthesis.getVoices().length === 0) {
            let attempts = 0;
            const timer = setInterval(() => {
                if (window.speechSynthesis.getVoices().length > 0 || attempts > 10) {
                    clearInterval(timer);
                    play();
                }
                attempts++;
            }, 100);
        } else {
            play();
        }
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
