import { db } from './auth.js';
import { collection, addDoc, serverTimestamp, doc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { sendDiscordNotification } from './discord.js';

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
        this.isReview = options.isReview === true;
        this.currentStep = 0;
        this.startTime = Date.now();
        this.sessionHistory = []; // Almacenará { type: 'moon'|'child', content: text|blobUrl }
        this.errors = 0; // Para calcular estrellas
        this.evalAudioChunks = []; // Para grabación de evaluación
        this.mediaRecorder = null;
        this.mediaStream = null;


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
            this.recognition.interimResults = true;
            this.recognition.maxAlternatives = 1;
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

        if (this.isReview && ['echo_chamber', 'speed_speak', 'boss_battle', 'interstitial_moon', 'story_moment'].includes(stepData.type)) {
            this.renderReviewStep(stepData);
        } else if (stepData.type === 'listen_click') {
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

    renderReviewStep(stepData) {
        const box = document.createElement('div');
        box.className = 'activity-box';
        box.style.textAlign = 'center';
        box.style.padding = '2rem';

        const icon = document.createElement('div');
        icon.style.fontSize = '3rem';
        icon.style.marginBottom = '1rem';

        if (stepData.type === 'echo_chamber') {
            icon.innerText = '🗣️';
            const word = document.createElement('div');
            word.style.cssText = 'font-size: 2rem; font-weight: 700; color: white; margin-bottom: 1rem;';
            word.innerText = stepData.word || '';
            box.appendChild(icon);
            box.appendChild(word);
            if (stepData.displayWord) {
                const translation = document.createElement('div');
                translation.style.cssText = 'color: #94a3b8; font-size: 1rem; margin-bottom: 1rem;';
                translation.innerText = `"${stepData.displayWord}"`;
                box.appendChild(translation);
            }
            const hint = document.createElement('div');
            hint.style.cssText = 'color: #64748b; font-size: 0.85rem; margin-bottom: 1rem;';
            hint.innerText = 'Modo repaso — practica diciendo la palabra en voz alta';
            box.appendChild(hint);
            this.speak(stepData.word);
            setTimeout(() => {
                this.showNextButton(box);
            }, 500 + (stepData.word ? stepData.word.length * 100 : 500));
        } else if (stepData.type === 'speed_speak' || stepData.type === 'boss_battle') {
            icon.innerText = stepData.type === 'boss_battle' ? '⚔️' : '⚡';
            const label = document.createElement('div');
            label.style.cssText = 'color: white; font-size: 1.2rem; font-weight: 600; margin-bottom: 0.5rem;';
            label.innerText = stepData.type === 'boss_battle' ? 'Jefe Final (vista previa)' : 'Reto de Velocidad (vista previa)';
            const words = document.createElement('div');
            words.style.cssText = 'color: #94a3b8; font-size: 1rem; margin-bottom: 1rem;';
            words.innerText = (stepData.words || []).join('  ·  ');
            box.appendChild(icon);
            box.appendChild(label);
            box.appendChild(words);
            const hint = document.createElement('div');
            hint.style.cssText = 'color: #64748b; font-size: 0.85rem;';
            hint.innerText = 'Modo repaso — practica diciendo las palabras';
            box.appendChild(hint);
            setTimeout(() => this.showNextButton(box), 1000);
        } else if (stepData.type === 'story_moment' || stepData.type === 'interstitial_moon') {
            icon.innerText = '📖';
            const text = stepData.en || stepData.message?.en || '';
            const textEl = document.createElement('div');
            textEl.style.cssText = 'color: #cbd5e1; font-size: 1.1rem; line-height: 1.5;';
            textEl.innerText = text;
            box.appendChild(icon);
            box.appendChild(textEl);
            this.speak(text);
            setTimeout(() => this.showNextButton(box), 1500);
        }

        this.container.appendChild(box);
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

        // Recording indicator (LED animado)
        const recordingIndicator = document.createElement('div');
        recordingIndicator.className = 'recording-indicator';
        recordingIndicator.style.display = 'none';
        recordingIndicator.innerHTML = `
            <div class="rec-led"></div>
            <span>Grabando...</span>
        `;

        const listenBtn = document.createElement('button');
        listenBtn.className = 'listen-btn-echo';
        listenBtn.innerHTML = '🔊';
        listenBtn.title = 'Escuchar de nuevo';

        const feedback = document.createElement('div');
        feedback.className = 'speech-feedback';
        feedback.innerText = 'Presiona el micrófono para hablar';

        const skipBtn = document.createElement('button');
        skipBtn.innerText = "Saltar reto";
        skipBtn.style.display = 'none';
        skipBtn.style.margin = '1.5rem auto 0';
        skipBtn.style.background = 'transparent';
        skipBtn.style.color = 'rgba(255,255,255,0.3)';
        skipBtn.style.border = 'none';
        skipBtn.style.fontSize = '0.75rem';
        skipBtn.style.textDecoration = 'underline';
        skipBtn.style.cursor = 'pointer';
        skipBtn.onclick = () => forcePass({ 
            en: "Got it! Let's move to the next step.", 
            es: "¡Entendido! Vamos al siguiente paso." 
        });

        box.appendChild(prompt);
        box.appendChild(echoWord);
        box.appendChild(listenBtn);
        box.appendChild(metricsContainer);
        box.appendChild(recordingIndicator);
        box.appendChild(micBtn);
        box.appendChild(feedback);
        box.appendChild(skipBtn);
        this.container.appendChild(box);

        // Logic to show skipBtn
        const originalFeedback = feedback.innerText;
        micBtn.addEventListener('click', () => {
             if (attempts >= 2) skipBtn.style.display = 'inline-block';
        });

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
            skipBtn.style.display = 'none'; // Hide skip button when passing
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
                Swal.fire({
                    title: '🌲 Navegador no compatible',
                    html: `
                        <div style="text-align:center; font-family:'Outfit',sans-serif;">
                            <p style="font-size:0.95rem; color:#475569; line-height:1.5;">
                                Para hablar con Moon necesitas <strong>Chrome</strong> o <strong>Edge</strong>.<br>
                                Abre esta página en Chrome y acepta el permiso de micrófono. 🎤
                            </p>
                        </div>
                    `,
                    icon: 'warning',
                    confirmButtonColor: '#22c55e',
                    confirmButtonText: 'Entendido'
                });
                return;
            }

            if (micBtn.classList.contains('listening') || micBtn.disabled) return;

            attempts++;
            micBtn.classList.add('listening');
            listenBtn.disabled = true;
            feedback.innerText = 'Listening... Habla ahora.';
            recordingIndicator.style.display = 'flex'; // Show recording LED

            // Start CSS pulse animation instead of AudioContext analysis
            thermoFill.classList.add('pulse-animation-active');
            thermoFill.style.background = '#38bdf8';
            thermoLabel.innerText = "¡Te estoy escuchando! ⚡";

            let recognitionTimeout = setTimeout(() => {
                if (micBtn.classList.contains('listening')) {
                    this.recognition.stop();
                    handleNoResult();
                }
            }, 6000);

            const handleNoResult = () => {
                stopVisualPulse();
                recordingIndicator.style.display = 'none';
                micBtn.classList.remove('listening');
                listenBtn.disabled = false;
                
                if (attempts >= 3) {
                    forcePass({ 
                        en: "Moon heard you in his heart! Let's keep exploring.", 
                        es: "¡Moon te escuchó en su corazón! Sigamos adelante." 
                    });
                } else {
                    feedback.innerText = "😕 No te escuché. ¿Hablaste? ¡Intenta más fuerte!";
                    this.showMoon({ 
                        en: "I didn't hear anything. Speak a bit louder and closer to the mic! 🎤", 
                        es: "No escuché nada. ¡Habla un poco más fuerte y cerca del micrófono!" 
                    });
                }
            };

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
                // Show live interim results while speaking
                let liveTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    liveTranscript += event.results[i][0].transcript;
                }
                const liveClean = liveTranscript.toLowerCase().trim();
                if (liveClean) {
                    feedback.innerHTML = `🎤 Dijiste: "<strong>${liveClean}</strong>"`;
                }

                // Only process final results for validation
                const lastResult = event.results[event.results.length - 1];
                if (!lastResult.isFinal) return;

                clearTimeout(recognitionTimeout);
                stopVisualPulse();
                recordingIndicator.style.display = 'none';

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

                micBtn.classList.remove('listening');
                listenBtn.disabled = false;

                let transcript = lastResult[0].transcript.toLowerCase().trim();
                let confidence = lastResult[0].confidence || 0.8;

                thermoLabel.innerText = "Claridad de tu pronunciación 🎯";
                let fillPercentage = Math.round(confidence * 100);
                thermoFill.style.width = `${fillPercentage}%`;

                if (fillPercentage < 40) thermoFill.style.background = '#ef4444';
                else if (fillPercentage < 75) thermoFill.style.background = '#f59e0b';
                else thermoFill.style.background = '#10b981';

                const corrections = {
                    "eye": "i", "aye": "i", "hi": "i", "ai": "i", "hay": "i", "ay": "i", " a ": " i ", "ah": "i", "high": "i",
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
                    skipBtn.style.display = 'none'; // Hide skip button when passing
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
                recordingIndicator.style.display = 'none';
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
                    feedback.innerText = "😕 No te escuché. ¿Hablaste más fuerte?";
                    this.showMoon({ en: "I didn't hear anything. Try speaking louder and closer to the mic! 🎤", es: "No escuché nada. ¡Habla más fuerte y cerca del micrófono!" });
                } else if (errorType === 'not-allowed' || errorType === 'permission-denied') {
                    feedback.innerText = "🚫 Micrófono bloqueado. Permítenos usarlo en la configuración del navegador.";
                    this.showMoon({ en: "I can't access your microphone. Please allow microphone access in your browser settings.", es: "No puedo acceder a tu micrófono. Permite el acceso en la configuración de tu navegador." });
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
        btn.innerText = "Preparando... 🌲";
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'wait';

        btn.onclick = () => {
            overlay.classList.add('fade-out');
            setTimeout(() => {
                overlay.remove();
                this.nextStep();
            }, 600);
        };

        card.appendChild(label);
        card.appendChild(avatar);
        card.appendChild(msgText);
        card.appendChild(btn);
        overlay.appendChild(card);
        this.container.appendChild(overlay);

        // TTS
        this.speak(enMsg);

        // Habilitar tras delay de carga
        setTimeout(() => {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
            btn.innerText = "Let's Go! →";
            btn.style.pointerEvents = 'auto';
        }, 1500);
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

            // Fallback: si el emoji es genérico, mostrar el texto en español para que sea un reto de traducción
            const showWordStatus = (emoji === '✨' || emoji === '❓' || emoji === '🌲') 
                ? (data.translationsMap ? data.translationsMap[opt] : opt) 
                : '???';

            card.innerHTML = `
                <div class="pi-emoji">${emoji}</div>
                <div class="pi-word">${showWordStatus}</div>
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

        let stars = 3;
        if (this.errors > 0 && this.errors <= 3) stars = 2;
        if (this.errors > 3) stars = 1;

        if (!this.isReview) {
            document.dispatchEvent(new CustomEvent('lessonCompleted', { detail: { minutes: minutesSpent, stars: stars } }));
        }

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
        title.innerHTML = this.isReview ? `Review <span>Complete!</span>` : `Lesson <span>Complete!</span>`;

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

        let msgEn, msgEs;

        if (this.isReview) {
            msgEn = "Great review! Keep practicing and you'll master it!";
            msgEs = "¡Buen repaso! Sigue practicando y lo dominarás.";
        } else if (stars === 3) {
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

        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.display = 'flex';
        buttonsContainer.style.flexDirection = 'column';
        buttonsContainer.style.gap = '0.75rem';
        buttonsContainer.style.marginTop = '1rem';
        buttonsContainer.style.width = '100%';

        if (!this.isReview) {
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
            box.appendChild(stats);

            const isLastLesson = this.options.lessonId && this.options.lessonId.endsWith('l20');
            const evals = this.options.evaluations;
            if (isLastLesson && evals && evals.length > 0) {
                const evalBtn = document.createElement('button');
                evalBtn.className = 'btn-continue-forest';
                evalBtn.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
                evalBtn.style.color = '#052e16';
                evalBtn.style.border = 'none';
                evalBtn.style.fontWeight = '800';
                evalBtn.style.boxShadow = '0 4px 16px rgba(245, 158, 11, 0.4)';
                evalBtn.innerText = '🎙️ Solicitar Evaluación para Avanzar';
                evalBtn.onclick = async () => {
                    if (this.options.isPremium) {
                        evalBtn.disabled = true;
                        evalBtn.innerText = 'Iniciando evaluación...';
                        await this.startEvaluationFlow(evals);
                    } else {
                        if (typeof window.showSubscriptionModal === 'function') {
                            window.showSubscriptionModal();
                        }
                    }
                };
                buttonsContainer.appendChild(evalBtn);
            }
        }

        const btnRepeat = document.createElement('button');
        btnRepeat.className = 'btn-continue-forest';
        btnRepeat.style.background = 'transparent';
        btnRepeat.style.border = '2px solid rgba(255, 255, 255, 0.2)';
        btnRepeat.style.color = 'white';
        btnRepeat.innerText = '🔄 Volver a Intentar';
        btnRepeat.onclick = () => window.location.reload();

        const btn = document.createElement('button');
        btn.className = 'btn-continue-forest';
        btn.innerText = this.isReview ? 'Salir al Mapa →' : 'Salir al Mapa →';
        btn.onclick = () => window.location.href = targetUrl;

        buttonsContainer.appendChild(btnRepeat);
        buttonsContainer.appendChild(btn);

        box.appendChild(avatar);
        box.appendChild(title);
        box.appendChild(starsContainer);
        box.appendChild(msg);
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
    /* EVALUACIÓN CONVERSACIONAL                                                  */
    /* -------------------------------------------------------------------------- */

    async startEvaluationFlow(evals) {
        const evalData = evals[0];
        if (!evalData || !evalData.lines || evalData.lines.length === 0) {
            Swal.fire('Error', 'No hay conversaciones de evaluación disponibles.', 'error');
            return;
        }

        // Rate limiting: max 1 evaluación cada 5 minutos
        const lastEvalKey = `last_eval_${this.options.userId}`;
        const lastEvalTime = parseInt(localStorage.getItem(lastEvalKey) || '0');
        if (Date.now() - lastEvalTime < 300000) {
            const remaining = Math.ceil((300000 - (Date.now() - lastEvalTime)) / 60000);
            Swal.fire('⏳ Espera un momento', `Puedes solicitar una nueva evaluación en ${remaining} minuto(s).`, 'info');
            return;
        }

        try {
            // 1. Mostrar preview del script
            await this.showEvalPreview(evalData);

            // 2. Solicitar acceso al micrófono con verificación
            try {
                this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch (micErr) {
                if (micErr.name === 'NotAllowedError' || micErr.name === 'PermissionDeniedError') {
                    Swal.fire({
                        title: '🎤 Micrófono necesario',
                        html: `
                            <div style="text-align:center; font-family:'Outfit',sans-serif;">
                                <p style="font-size:1rem; color:#475569;">
                                    Para la evaluación necesitamos acceso a tu micrófono.
                                </p>
                                <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:12px; padding:1rem; margin-top:1rem; text-align:left;">
                                    <p style="font-size:0.85rem; color:#991b1b; font-weight:600;">📱 ¿Cómo habilitarlo?</p>
                                    <p style="font-size:0.8rem; color:#7f1d1d; margin-top:0.25rem;">
                                        Chrome: 🔒 icono en la barra de direcciones → Micrófono → Permitir<br>
                                        Luego recarga la página y vuelve a intentar.
                                    </p>
                                </div>
                            </div>
                        `,
                        icon: 'warning',
                        confirmButtonColor: '#3b82f6',
                        confirmButtonText: 'Entendido'
                    });
                } else {
                    Swal.fire('Error de micrófono', 'No pudimos acceder a tu micrófono: ' + micErr.message, 'error');
                }
                return;
            }

            // 3. Round 1: Moon habla rol A, alumno responde rol B
            const round1Blobs = await this.runEvalLines(evalData, 'moon', 'student', 1);

            // 4. Round 2: Alumno lee rol A, Moon responde rol B
            const round2Blobs = await this.runEvalLines(evalData, 'student', 'moon', 2);

            // 5. Liberar recursos de micrófono
            if (this.mediaStream) {
                this.mediaStream.getTracks().forEach(t => t.stop());
                this.mediaStream = null;
            }

            // 6. Subir todo
            const allBlobs = [...round1Blobs, ...round2Blobs];
            await this.uploadEvaluation(allBlobs, evalData);

        } catch (err) {
            console.error("Error en evaluación:", err);
            if (this.mediaStream) {
                this.mediaStream.getTracks().forEach(t => t.stop());
                this.mediaStream = null;
            }
            Swal.fire({
                title: 'Error en la evaluación',
                text: err.message || 'Ocurrió un error. Intenta de nuevo.',
                icon: 'error',
                confirmButtonColor: '#ef4444'
            });
        }
    }

    async showEvalPreview(evalData) {
        const previewLines = evalData.lines.map(line => {
            const speaker = line.role === 'moon' ? '🐻‍❄️ Moon' : '🧑 Tú';
            return `<div style="display:flex; gap:0.5rem; padding:0.4rem 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                <span style="font-weight:700; color:${line.role === 'moon' ? '#22c55e' : '#38bdf8'}; min-width:80px;">${speaker}:</span>
                <div>
                    <div style="color:white;">${line.en}</div>
                    <div style="color:#94a3b8; font-size:0.8rem;">${line.es}</div>
                </div>
            </div>`;
        }).join('');

        await Swal.fire({
            title: '🎙️ Evaluación del Módulo',
            html: `
                <div style="text-align:left; font-family:'Outfit',sans-serif; max-height:400px; overflow-y:auto;">
                    <p style="font-size:0.9rem; color:#475569; margin-bottom:1rem;">
                        ${evalData.preview?.en || 'Conversación en inglés'}<br>
                        <span style="color:#94a3b8;">${evalData.preview?.es || ''}</span>
                    </p>
                    <div style="background:#1e293b; border-radius:12px; padding:1rem; margin-bottom:1rem;">
                        <p style="color:#94a3b8; font-size:0.75rem; margin:0 0 0.5rem;">📖 CONVERSACIÓN — ESTÚDIALA ANTES DE COMENZAR</p>
                        ${previewLines}
                    </div>
                    <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:12px; padding:0.75rem; font-size:0.85rem; color:#166534;">
                        🎙️ Al presionar "Comenzar", se grabará tu voz. Moon guiará la conversación.
                    </div>
                </div>
            `,
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: '🎬 Comenzar Evaluación',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#22c55e',
            cancelButtonColor: '#64748b',
            allowOutsideClick: false
        });
    }

    async runEvalLines(evalData, roleA, roleB, roundNum) {
        const blobs = [];

        await Swal.fire({
            title: `🎯 Ronda ${roundNum} de 2`,
            html: `
                <div style="text-align:center; font-family:'Outfit',sans-serif;">
                    <p style="font-size:1rem; color:#1e293b; font-weight:600;">
                        ${roundNum === 1
                            ? '🐻‍❄️ Moon comienza la conversación'
                            : '🧑 Ahora tú empiezas la conversación'
                        }
                    </p>
                    <p style="font-size:0.85rem; color:#475569;">
                        ${roundNum === 1
                            ? 'Escucha a Moon y responde cuando sea tu turno.'
                            : 'Lee tu línea en voz alta y Moon te responderá.'
                        }
                    </p>
                </div>
            `,
            confirmButtonText: '¡Entendido!',
            confirmButtonColor: '#38bdf8',
            allowOutsideClick: false
        });

        const container = document.createElement('div');
        container.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:linear-gradient(135deg, #0f172a, #1e3a5f); z-index:99999; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:2rem; font-family:Outfit, sans-serif;';
        document.body.appendChild(container);

        for (let i = 0; i < evalData.lines.length; i++) {
            const line = evalData.lines[i];
            const isMoonTurn = line.role === 'moon';
            const isStudentTurn = line.role === 'student';

            container.innerHTML = `
                <div style="max-width:500px; width:100%; text-align:center;">
                    <div style="font-size:3rem; margin-bottom:1rem;">${isMoonTurn ? '🐻‍❄️' : '🎤'}</div>
                    <div style="color:#94a3b8; font-size:0.8rem; margin-bottom:0.25rem;">
                        ${isMoonTurn ? 'Moon dice:' : 'Tu turno — Lee en voz alta:'}
                    </div>
                    <div style="background:rgba(255,255,255,0.1); border-radius:16px; padding:1.5rem; margin-bottom:1rem;">
                        <p style="color:white; font-size:1.2rem; font-weight:600; margin:0;">${line.en}</p>
                        ${isStudentTurn ? `<p style="color:#94a3b8; font-size:0.85rem; margin-top:0.5rem;">${line.es}</p>` : ''}
                    </div>
                    <div style="color:#64748b; font-size:0.75rem;">Ronda ${roundNum}/2 — Línea ${i + 1}/${evalData.lines.length}</div>
                </div>
            `;

            if (isMoonTurn) {
                await new Promise(resolve => {
                    this.speakMoon(line.en, resolve);
                });
                await new Promise(r => setTimeout(r, 800));
            }

            if (isStudentTurn) {
                const blob = await this.recordStudentAudio(container);
                if (blob) blobs.push(blob);
            }
        }

        container.remove();
        return blobs;
    }

    recordStudentAudio(container) {
        return new Promise((resolve) => {
            const recordBtn = document.createElement('button');
            recordBtn.style.cssText = 'margin-top:1rem; padding:0.8rem 2rem; border-radius:99px; border:none; font-size:1rem; font-weight:700; cursor:pointer; font-family:Outfit,sans-serif; transition:all 0.2s;';
            recordBtn.innerText = '🎤 Grabar respuesta';
            recordBtn.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';
            recordBtn.style.color = 'white';
            container.appendChild(recordBtn);

            let recorder = null;
            let chunks = [];
            let isRecording = false;

            recordBtn.onclick = async () => {
                if (!isRecording) {
                    chunks = [];
                    try {
                        recorder = new MediaRecorder(this.mediaStream);
                        recorder.ondataavailable = (e) => {
                            if (e.data.size > 0) chunks.push(e.data);
                        };
                        recorder.onstop = () => {
                            const blob = new Blob(chunks, { type: 'audio/webm' });
                            recordBtn.innerText = '✅ Grabado';
                            recordBtn.style.background = '#64748b';
                            recordBtn.style.cursor = 'default';
                            recordBtn.disabled = true;
                            setTimeout(() => resolve(blob), 500);
                        };
                        recorder.start();
                        isRecording = true;
                        recordBtn.innerText = '🔴 Grabando... (toca para detener)';
                        recordBtn.style.background = '#ef4444';
                    } catch (e) {
                        console.error("Error al iniciar grabación:", e);
                        resolve(null);
                    }
                } else {
                    if (recorder && recorder.state === 'recording') {
                        recorder.stop();
                        isRecording = false;
                    }
                }
            };
        });
    }

    async uploadEvaluation(blobs, evalData) {
        const moduleId = this.options.moduleId || 'unknown';
        const lessonId = this.options.lessonId || 'unknown';
        const userId = this.options.userId || 'unknown';
        const timestamp = Date.now();
        const storage = getStorage();

        // Combinar todos los blobs en uno solo
        const combinedBlob = new Blob(blobs, { type: 'audio/webm' });
        const fileName = `evaluations/${userId}/${moduleId}/${timestamp}.webm`;
        const storageRef = ref(storage, fileName);

        // Subir a Firebase Storage con retry (3 intentos)
        let audioUrl = null;
        let lastError = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                await uploadBytes(storageRef, combinedBlob);
                audioUrl = await getDownloadURL(storageRef);
                break; // éxito
            } catch (err) {
                lastError = err;
                console.warn(`⚠️ Intento ${attempt}/3 de subida falló:`, err.message);
                if (attempt < 3) {
                    await new Promise(r => setTimeout(r, attempt * 2000)); // backoff: 2s, 4s
                }
            }
        }

        if (!audioUrl) {
            console.error("No se pudo subir el audio tras 3 intentos:", lastError);
            Swal.fire({
                title: 'Error de conexión',
                text: 'No pudimos subir tu grabación. Revisa tu conexión e intenta de nuevo.',
                icon: 'error',
                confirmButtonColor: '#ef4444',
                confirmButtonText: 'Entendido'
            });
            // Limpiar weekKey para permitir reintento
            if (this.options.userId) {
                const lastEvalKey = `last_eval_${this.options.userId}`;
                localStorage.removeItem(lastEvalKey);
            }
            return;
        }

        // Guardar timestamp para rate limiting
        const lastEvalKey = `last_eval_${this.options.userId}`;
        localStorage.setItem(lastEvalKey, String(Date.now()));

        // Crear documento en Firestore
        const evalDoc = {
            userId,
            moduleId,
            lessonId,
            status: 'pending',
            audioUrl,
            fileName,
            transcript: evalData.lines
                .filter(l => l.role === 'student')
                .map(l => ({ en: l.en, es: l.es })),
            createdAt: serverTimestamp(),
            premium: true
        };

        await addDoc(collection(db, 'evaluations'), evalDoc);

        // Notificar Discord
        try {
            const userName = this.options.userName || 'Un alumno';
            await sendDiscordNotification(
                "🎙️ Nueva Evaluación Recibida",
                `**${userName}** ha completado su evaluación del **${moduleId.toUpperCase()}**.\n\n🔗 Escuchar audio: ${audioUrl}\n📝 Módulo: ${moduleId}`,
                15844367
            );
        } catch (e) {
            console.warn("Error notificando Discord:", e);
        }

        // Mostrar confirmación
        await Swal.fire({
            title: '🎉 ¡Evaluación Enviada!',
            html: `
                <div style="text-align:center; font-family:'Outfit',sans-serif;">
                    <p style="font-size:3rem; margin:0.5rem 0;">📤</p>
                    <p style="font-size:1rem; color:#475569;">
                        Tu conversación fue grabada y enviada para revisión.
                    </p>
                    <p style="font-size:0.85rem; color:#94a3b8;">
                        Recibirás feedback pronto. Moon te avisará cuando esté listo.
                    </p>
                </div>
            `,
            icon: 'success',
            confirmButtonColor: '#22c55e',
            confirmButtonText: '🌲 Entendido'
        });

        // Recargar al mapa
        window.location.href = this.options.returnUrl || 'mapa.html';
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
