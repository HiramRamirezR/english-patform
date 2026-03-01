/**
 * Module Learning Engine 🌲
 * Combina TTS y STT usando Web APIs nativas, sin requerir APIs de pago.
 */

export class MoonsforestEngine {
    constructor(containerId, data, options = {}) {
        this.container = document.getElementById(containerId);
        this.data = data;
        this.options = options;
        this.currentStep = 0;
        this.startTime = Date.now();

        // UI Elements
        this.progressBar = document.getElementById('progress-bar');
        this.moonSupport = document.getElementById('moon-support');
        this.moonMessage = document.getElementById('moon-message');

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

        if (stepData.type === 'listen_click') {
            this.renderListenClick(stepData);
        } else if (stepData.type === 'echo_chamber') {
            this.renderEchoChamber(stepData);
        } else {
            this.container.innerHTML = `<p>Actividad no soportada: ${stepData.type}</p>`;
        }
    }

    nextStep() {
        this.currentStep++;
        this.renderStep();
    }

    /* -------------------------------------------------------------------------- */
    /* ACTIVITIES RENDERERS                                                       */
    /* -------------------------------------------------------------------------- */

    renderListenClick(data) {
        // Wrapper
        const box = document.createElement('div');
        box.className = 'activity-box';

        const prompt = document.createElement('div');
        prompt.className = 'activity-prompt';
        prompt.innerText = data.prompt || 'Escucha y repite mentalmente.';
        box.appendChild(prompt);

        const grid = document.createElement('div');
        grid.className = 'cards-grid';

        let solvedCount = 0;

        data.cards.forEach(card => {
            const cardEl = document.createElement('div');
            cardEl.className = 'flashcard';

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
                    this.speak(card.word); // Speak again if they want
                    return;
                }

                // First click: Reveal and Speak
                cardEl.classList.add('flipped');
                this.speak(card.word);

                // If the activity requires clicking all to proceed
                cardEl.classList.add('solved');
                solvedCount++;

                if (solvedCount === data.cards.length) {
                    this.showNextButton(box);
                    this.showMoon("Pudiste leerlas todas. ¡Súper!");
                }
            });

            grid.appendChild(cardEl);
        });

        box.appendChild(grid);
        this.container.appendChild(box);
    }

    renderEchoChamber(data) {
        const box = document.createElement('div');
        box.className = 'activity-box';

        const prompt = document.createElement('div');
        prompt.className = 'activity-prompt';
        prompt.innerText = data.prompt || 'Haz clic y habla.';

        // Big Word
        const echoWord = document.createElement('div');
        echoWord.className = 'echo-word';
        // Si hay una palabra para mostrar (ej. su traducción para forzar memoria), úsala. Si no, usa el inglés directo.
        echoWord.innerText = data.displayWord || data.word;

        // Mic Button
        const micBtn = document.createElement('button');
        micBtn.className = 'mic-btn';
        micBtn.innerHTML = '🎤';

        // Feedback Text
        const feedback = document.createElement('div');
        feedback.className = 'speech-feedback';
        feedback.innerText = 'Presiona el micrófono para hablar';

        box.appendChild(prompt);
        box.appendChild(echoWord);
        box.appendChild(micBtn);
        box.appendChild(feedback);
        this.container.appendChild(box);

        micBtn.addEventListener('click', () => {
            if (!this.recognition) {
                alert("Tu navegador no soporta el reconocimiento de voz. Usa Chrome.");
                return;
            }

            // Si ya está escuchando, no hacemos nada para no trabar la API
            if (micBtn.classList.contains('listening')) {
                return;
            }

            micBtn.classList.add('listening');
            feedback.innerText = 'Listening... Habla ahora.';

            try {
                this.recognition.start();
            } catch (err) {
                console.error("No se pudo iniciar el reconocimiento:", err);
                micBtn.classList.remove('listening');
                return;
            }

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript.toLowerCase().trim();
                const target = data.word.toLowerCase().replace(/[^a-z0-9 ]/gi, '').trim();
                const cleanTranscript = transcript.replace(/[^a-z0-9 ]/gi, '').trim();

                feedback.innerHTML = `Escuché: "<strong>${transcript}</strong>"`;

                // TOLERANCIA ESTRICTA:
                const isExactMatch = cleanTranscript === target;
                const startsWithMatch = cleanTranscript.startsWith(target) && (cleanTranscript.length <= target.length + 5);

                if (isExactMatch || startsWithMatch) {
                    echoWord.classList.add('success');
                    echoWord.innerText = data.word; // Revelar inglés si estaba oculto en español
                    micBtn.style.display = 'none'; // ocultar micro
                    this.showMoon(data.successMsg || "¡Ese es el sonido perfecto!");
                    this.showNextButton(box);
                } else {
                    this.showMoon("¡Casi! Intenta pronunciarlo un par de veces más.");
                }
            };

            this.recognition.onnomatch = () => {
                feedback.innerText = 'No pude escucharte bien. Intenta otra vez.';
                this.showMoon("Habla un poquito más fuerte.");
            };

            this.recognition.onerror = (event) => {
                console.error("Recognition Error:", event.error);
                if (event.error === 'no-speech') {
                    feedback.innerText = 'No detecté voz. ¿Podrías repetirlo?';
                    this.showMoon("No escuché nada. Intenta hablar más cerca del micro.");
                } else {
                    feedback.innerText = 'Hubo un problema. Intenta otra vez.';
                    this.showMoon("Revisa el permiso de tu micrófono.");
                }
            };

            // Asegurar siempre que quitamos la clase listening cuando termine, sin importar por qué terminó
            this.recognition.onend = () => {
                micBtn.classList.remove('listening');
            };
        });
    }

    renderCompletion() {
        this.progressBar.style.width = '100%';
        this.container.innerHTML = ''; // Limpiar el contenedor anterior

        // Calcular minutos y lanzar evento
        const endTime = Date.now();
        const minutesSpent = Math.max(1, Math.round((endTime - this.startTime) / 60000));
        document.dispatchEvent(new CustomEvent('lessonCompleted', { detail: { minutes: minutesSpent } }));

        const targetUrl = this.options.returnUrl || 'mapa.html';
        const box = document.createElement('div');
        box.className = 'activity-box';
        box.innerHTML = `
            <div style="font-size: 5rem; margin-bottom: 1rem;">🏞️</div>
            <h2 style="font-size: 2.5rem; color: var(--primary-deep); margin-bottom: 2rem;">¡Lección Completada!</h2>
            <p style="font-size: 1.2rem; margin-bottom: 3rem; color: var(--slate-600);">Tu desempeño oral ha mejorado bastante.</p>
            <button class="btn btn-primary" style="padding: 1rem 3rem;" onclick="window.location.href='${targetUrl}'">Volver al Bosque</button>
        `;
        this.container.appendChild(box);
        this.showMoon("¡Terminaste tu primer entrenamiento! Eres valiente.");
    }

    /* -------------------------------------------------------------------------- */
    /* UTILS                                                                      */
    /* -------------------------------------------------------------------------- */

    speak(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = 0.85; // Un poco más lento para principiantes
            // Try to find a friendly native voice if possible
            const preferredVoice = this.voices.find(v => v.lang === 'en-US' && v.name.includes('Google'));
            if (preferredVoice) utterance.voice = preferredVoice;

            window.speechSynthesis.speak(utterance);
        }
    }

    showNextButton(parentBox) {
        // Avoid duplicate buttons
        if (parentBox.querySelector('.btn-next-step')) return;

        const nextBtn = document.createElement('button');
        nextBtn.className = 'btn btn-primary btn-next-step visible';
        nextBtn.innerText = 'Siguiente Actividad →';
        nextBtn.onclick = () => this.nextStep();
        parentBox.appendChild(nextBtn);
    }

    showMoon(message) {
        if (!this.moonSupport) return;
        this.moonMessage.innerText = message;
        this.moonSupport.classList.remove('hidden');
    }

    hideMoon() {
        if (!this.moonSupport) return;
        this.moonSupport.classList.add('hidden');
    }
}
