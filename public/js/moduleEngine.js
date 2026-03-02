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
        } else {
            this.container.innerHTML = `<p>Actividad no soportada: ${stepData.type}</p>`;
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
                    this.playSound('success');
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
        let attempts = 0; // Añadido para el Filtro de Empatía
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

        // Contenedor principal de métricas visuales
        const metricsContainer = document.createElement('div');
        metricsContainer.style.margin = '1rem auto';
        metricsContainer.style.width = '100%';
        metricsContainer.style.maxWidth = '250px';

        // Etiqueta para que los niños entiendan qué es la barra
        const thermoLabel = document.createElement('div');
        thermoLabel.innerText = "Energía de tu voz ⚡";
        thermoLabel.style.fontSize = '0.75rem';
        thermoLabel.style.color = 'var(--slate-500)';
        thermoLabel.style.marginBottom = '0.4rem';
        thermoLabel.style.textAlign = 'left';
        thermoLabel.style.fontWeight = '600';
        metricsContainer.appendChild(thermoLabel);

        // Termómetro de claridad visual
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
        thermoFill.style.background = '#cbd5e1'; // Gris platinado inactivo
        thermoFill.style.transition = 'width 0.1s linear, background-color 0.4s ease';
        thermoContainer.appendChild(thermoFill);
        metricsContainer.appendChild(thermoContainer);
        thermoContainer.appendChild(thermoFill);

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
        box.appendChild(metricsContainer);
        box.appendChild(micBtn);
        box.appendChild(feedback);
        this.container.appendChild(box);

        // Variables para el análisis de audio en tiempo real
        let audioContext;
        let analyser;
        let microphoneNode;
        let javascriptNode;
        let isRecordingAudio = false;

        const stopAudioAnalysis = () => {
            isRecordingAudio = false;
            if (javascriptNode) javascriptNode.disconnect();
            if (microphoneNode) microphoneNode.disconnect();
            if (analyser) analyser.disconnect();
            if (audioContext && audioContext.state !== 'closed') audioContext.close();

            // Volver la transición suave para el resultado final
            thermoFill.style.transition = 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.6s ease';
        };

        // Variables para grabación de audio del niño
        let mediaRecorder;
        let audioChunks = [];

        micBtn.addEventListener('click', async () => {
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

            // Resetear visual del termómetro 
            thermoFill.style.transition = 'width 0.1s linear, background-color 0.1s linear';
            thermoFill.style.width = '0%';
            thermoFill.style.background = '#38bdf8'; // Azul claro mientras escucha
            thermoLabel.innerText = "¡Te estoy escuchando! ⚡";

            try {
                // 1. Iniciar STT
                this.recognition.start();

                // 2. Iniciar Medidor Volumétrico en tiempo real (Web Audio API)
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                analyser = audioContext.createAnalyser();
                microphoneNode = audioContext.createMediaStreamSource(stream);
                javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);

                analyser.smoothingTimeConstant = 0.8;
                analyser.fftSize = 1024;

                microphoneNode.connect(analyser);
                analyser.connect(javascriptNode);
                javascriptNode.connect(audioContext.destination);

                isRecordingAudio = true;

                // --- INICIO GRABACIÓN PARA EL ECO DE DANTE ---
                audioChunks = [];
                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) audioChunks.push(e.data);
                };
                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    lastAudioUrl = URL.createObjectURL(audioBlob);
                };
                mediaRecorder.start();
                // --------------------------------------------

                javascriptNode.onaudioprocess = () => {
                    if (!isRecordingAudio) return;
                    const array = new Uint8Array(analyser.frequencyBinCount);
                    analyser.getByteFrequencyData(array);
                    let values = 0;
                    const length = array.length;
                    for (let i = 0; i < length; i++) {
                        values += (array[i]);
                    }
                    const average = values / length;
                    // Mapear de 0-100 (un volumen normal hablando de cerca promedia unos 40-60)
                    let volPercent = Math.min(100, average * 2);

                    // Asegurar un nivel basal bajito para que se vea que está vivo
                    if (volPercent < 5) volPercent = 5;

                    thermoFill.style.width = `${volPercent}%`;
                };

            } catch (err) {
                console.error("No se pudo iniciar el reconocimiento o acceso a micro:", err);
                micBtn.classList.remove('listening');
                thermoLabel.innerText = "Error con el micrófono ✗";
                thermoFill.style.background = '#ef4444';
                return;
            }

            this.recognition.onresult = async (event) => {
                attempts++;
                stopAudioAnalysis(); // Detener el medidor dinámico

                let audioUrl = null;
                if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                    // Esperar a que el recorder se detenga y cree el blob
                    audioUrl = await new Promise(resolve => {
                        mediaRecorder.onstop = () => {
                            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                            resolve(URL.createObjectURL(audioBlob));
                        };
                        mediaRecorder.stop();
                    });
                }

                let transcript = event.results[0][0].transcript.toLowerCase().trim();
                let confidence = event.results[0][0].confidence || 0.8; // Fallback confidence

                // Mostrar resultado estático de confianza 
                thermoLabel.innerText = "Claridad de tu pronunciación 🎯";
                let fillPercentage = Math.round(confidence * 100);
                thermoFill.style.width = `${fillPercentage}%`;

                if (fillPercentage < 50) thermoFill.style.background = '#ef4444'; // Rojo oscuro
                else if (fillPercentage < 80) thermoFill.style.background = '#f59e0b'; // Amarillo
                else thermoFill.style.background = '#10b981'; // Verde

                // DICCIONARIO GLOBAL DE CORRECCIONES DE STT (Homófonos)
                // Esto aplica automáticamente a TODAS las lecciones de la plataforma
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

                // Reemplazamos las palabras mal escuchadas por su versión correcta en inglés
                for (let [wrong, right] of Object.entries(corrections)) {
                    // Usamos regex con límites de palabra para no modificar fragmentos internos, 
                    // o simplemente replaces directos para palabras sueltas.
                    const regex = new RegExp(`\\b${wrong}\\b`, 'g');
                    transcript = transcript.replace(regex, right);
                }

                const cleanTranscript = transcript.replace(/[^a-z0-9 ]/gi, '').trim();
                const target = data.word.toLowerCase().replace(/[^a-z0-9 ]/gi, '').trim();

                // Imprimir lo que el sistema "Interpretó"
                feedback.innerHTML = `Escuché y entendí: "<strong>${cleanTranscript}</strong>"`;

                const aliases = data.aliases ? data.aliases.map(a => a.toLowerCase().replace(/[^a-z0-9 ]/gi, '').trim()) : [];
                const targets = [target, ...aliases];

                const isExactMatch = targets.includes(cleanTranscript);
                const startsWithMatch = targets.some(t => cleanTranscript.startsWith(t) && (cleanTranscript.length <= t.length + 5));

                let isAccepted = false;
                let successMessage = data.successMsg || "¡Ese es el sonido perfecto!";

                if (isExactMatch || startsWithMatch) {
                    isAccepted = true;
                    fillPercentage = Math.max(fillPercentage, 95);
                    thermoFill.style.width = `${fillPercentage}%`;
                    thermoFill.style.background = '#10b981'; // Verde Esmeralda
                } else if (attempts >= 2) {
                    // Filtro de Empatía - Intento 2 (tolerancia media)
                    const containsMatch = targets.some(t => cleanTranscript.includes(t) || (t.length >= 3 && t.includes(cleanTranscript)));
                    if (containsMatch) {
                        isAccepted = true;
                        successMessage = "¡Casi perfecto! Escuché tu gran esfuerzo. ¡Avancemos!";
                        thermoFill.style.width = `90%`;
                        thermoFill.style.background = '#10b981';
                        feedback.innerHTML = `Escuché y entendí: "<strong>${data.word.toLowerCase()}</strong>"`;
                    } else if (attempts >= 3) {
                        // Magia de Moon - Intento 3 (Pasa porque pasa para evitar frustración)
                        isAccepted = true;
                        successMessage = "¡Esa frase es un gran reto! Moon te ayuda con su magia para que sigamos explorando.";
                        thermoFill.style.width = `100%`;
                        thermoFill.style.background = '#10b981';
                        feedback.innerHTML = `Escuché y entendí: "<strong>${data.word.toLowerCase()}</strong>"`;
                    }
                }

                if (isAccepted) {
                    // Guardar en el historial de la sesión para el final
                    if (audioUrl) {
                        this.sessionHistory.push({ type: 'child', content: audioUrl });
                    }

                    this.playSound('success');
                    echoWord.classList.add('success');
                    echoWord.innerText = data.word; // Revelar inglés si estaba oculto en español
                    micBtn.style.display = 'none'; // ocultar micro
                    this.showMoon(successMessage);
                    this.showNextButton(box);
                } else {
                    this.playSound('error');
                    let hints = [
                        "¡Casi! Intenta pronunciarlo un par de veces más.",
                        "Abre bien la boca y pronuncia fuerte y claro.",
                        "No te rindas. Recuerda cómo suena y suéltalo fuerte."
                    ];
                    this.showMoon(hints[(attempts - 1) % hints.length]);
                }
            };

            this.recognition.onnomatch = () => {
                stopAudioAnalysis();
                this.playSound('error');
                feedback.innerText = 'No pude escucharte bien. Intenta otra vez.';
                thermoFill.style.width = '0%';
                thermoLabel.innerText = "No se entendió ⚡";
                this.showMoon("Habla un poquito más fuerte.");
            };

            this.recognition.onerror = (event) => {
                stopAudioAnalysis();
                console.error("Recognition Error:", event.error);
                if (event.error === 'no-speech') {
                    feedback.innerText = 'No detecté voz. ¿Podrías repetirlo?';
                    thermoFill.style.width = '0%';
                    thermoLabel.innerText = "Sin sonido ⚡";
                    this.showMoon("No escuché nada. Intenta hablar más cerca del micro.");
                } else {
                    feedback.innerText = 'Hubo un problema. Intenta otra vez.';
                    thermoFill.style.width = '0%';
                    thermoLabel.innerText = "Error ✗";
                    this.showMoon("Revisa el permiso de tu micrófono.");
                }
            };

            // Asegurar siempre que quitamos la clase listening cuando termine
            this.recognition.onend = () => {
                stopAudioAnalysis();
                if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                    mediaRecorder.stop();
                }
                micBtn.classList.remove('listening');
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
                    this.showMoon("¡Exacto! Así se construye la frase.");

                    // Style them inside the box to show success
                    dropZones.forEach(dz => dz.firstChild.classList.add('success'));

                    this.showNextButton(box);
                } else {
                    this.playSound('error');
                    this.showMoon("Hmm... esa no es la estructura correcta. Cámbialas de lugar.");
                }
            }
        };

        this.container.appendChild(box);
    }

    renderMatching(data) {
        const box = document.createElement('div');
        box.className = 'activity-box';

        const prompt = document.createElement('div');
        prompt.className = 'activity-prompt';
        prompt.innerText = data.prompt || 'Une la palabra en inglés con su significado.';
        box.appendChild(prompt);

        // Desestructurar todos los items (inglés vs español)
        let terms = [];
        let definitions = [];
        for (let [en, es] of Object.entries(data.pairs)) {
            terms.push({ text: en, type: 'term', pairId: en });
            definitions.push({ text: es, type: 'def', pairId: en });
        }

        // Shuffle arrays
        terms = terms.sort(() => Math.random() - 0.5);
        definitions = definitions.sort(() => Math.random() - 0.5);

        // Columnas
        const columnsContainer = document.createElement('div');
        columnsContainer.style.display = 'flex';
        columnsContainer.style.gap = '2rem';
        columnsContainer.style.justifyContent = 'center';
        columnsContainer.style.marginTop = '1.5rem';

        const colTerms = document.createElement('div');
        colTerms.style.display = 'flex';
        colTerms.style.flexDirection = 'column';
        colTerms.style.gap = '1rem';
        colTerms.style.flex = 1;

        const colDefs = document.createElement('div');
        colDefs.style.display = 'flex';
        colDefs.style.flexDirection = 'column';
        colDefs.style.gap = '1rem';
        colDefs.style.flex = 1;

        columnsContainer.appendChild(colTerms);
        columnsContainer.appendChild(colDefs);
        box.appendChild(columnsContainer);

        // Desafío de Velocidad
        if (data.timer) {
            const seconds = typeof data.timer === 'number' ? data.timer : 20;
            this.startTimer(box, seconds, () => {
                this.showMoon("¡Se acabó el tiempo! No pasa nada, termina a tu ritmo.");
            });
        }

        // Lógica de Estado
        let selectedItem = null;
        let matchedPairs = 0;
        const totalPairs = Object.keys(data.pairs).length;

        const createMatchBtn = (item, parentCol) => {
            const btn = document.createElement('button');
            btn.className = 'match-btn';
            btn.innerText = item.text;

            // Estilos estáticos limpios
            btn.style.padding = '1rem';
            btn.style.border = '2px solid var(--slate-200)';
            btn.style.background = 'white';
            btn.style.borderRadius = '12px';
            btn.style.cursor = 'pointer';
            btn.style.fontSize = '1.1rem';
            btn.style.fontWeight = '500';
            btn.style.color = 'var(--text-color)';
            btn.style.transition = 'all 0.2s';
            btn.dataset.id = item.pairId;
            btn.dataset.type = item.type;

            btn.addEventListener('click', () => {
                // Ignore clicks if already solved
                if (btn.classList.contains('solved')) return;

                // Clic en sí mismo lo deselecciona
                if (selectedItem === btn) {
                    btn.classList.remove('selected');
                    btn.style.borderColor = 'var(--slate-200)';
                    btn.style.background = 'white';
                    selectedItem = null;
                    return;
                }

                if (!selectedItem) {
                    // Seleccionar primero
                    selectedItem = btn;
                    btn.classList.add('selected');
                    btn.style.borderColor = 'var(--primary-medium)';
                    btn.style.background = '#e0f2fe'; // Azul claro
                } else {
                    // Validar si son del mismo lado (cambia selección)
                    if (selectedItem.dataset.type === btn.dataset.type) {
                        selectedItem.classList.remove('selected');
                        selectedItem.style.borderColor = 'var(--slate-200)';
                        selectedItem.style.background = 'white';
                        selectedItem = btn;
                        btn.classList.add('selected');
                        btn.style.borderColor = 'var(--primary-medium)';
                        btn.style.background = '#e0f2fe';
                        return;
                    }

                    // Evaluar match
                    if (selectedItem.dataset.id === btn.dataset.id) {
                        // Correcto
                        this.playSound('success');
                        btn.classList.add('solved');
                        btn.classList.remove('selected');
                        btn.style.borderColor = 'var(--success)';
                        btn.style.background = '#ecfdf5';
                        btn.style.color = '#065f46';

                        selectedItem.classList.add('solved');
                        selectedItem.classList.remove('selected');
                        selectedItem.style.borderColor = 'var(--success)';
                        selectedItem.style.background = '#ecfdf5';
                        selectedItem.style.color = '#065f46';

                        selectedItem = null;
                        matchedPairs++;

                        // Check Win Condition
                        if (matchedPairs === totalPairs) {
                            setTimeout(() => {
                                this.showMoon(data.successMsg || "¡Uniste todos los pares perfectamente!");
                                this.showNextButton(box);
                            }, 500);
                        }
                    } else {
                        // Incorrecto
                        this.playSound('error');
                        // Parpadeo rojo visual en ambos (btn y selectedItem) sin css animations
                        const wrong1 = selectedItem;
                        const wrong2 = btn;

                        wrong1.style.borderColor = '#ef4444';
                        wrong1.style.background = '#fef2f2';
                        wrong2.style.borderColor = '#ef4444';
                        wrong2.style.background = '#fef2f2';

                        setTimeout(() => {
                            wrong1.classList.remove('selected');
                            wrong1.style.borderColor = 'var(--slate-200)';
                            wrong1.style.background = 'white';
                            wrong2.style.borderColor = 'var(--slate-200)';
                            wrong2.style.background = 'white';
                        }, 500);

                        selectedItem = null;
                    }
                }
            });

            parentCol.appendChild(btn);
        };

        terms.forEach(term => createMatchBtn(term, colTerms));
        definitions.forEach(def => createMatchBtn(def, colDefs));

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
        this.container.innerHTML = ''; // Limpiar el contenedor anterior

        // Calcular minutos y lanzar evento
        const endTime = Date.now();
        const minutesSpent = Math.max(1, Math.round((endTime - this.startTime) / 60000));
        document.dispatchEvent(new CustomEvent('lessonCompleted', { detail: { minutes: minutesSpent } }));

        const targetUrl = this.options.returnUrl || 'mapa.html';
        const box = document.createElement('div');
        box.className = 'activity-box';

        // UI de Felicitación
        box.innerHTML = `
            <div style="font-size: 5rem; margin-bottom: 1rem;">🏞️</div>
            <h2 style="font-size: 2.5rem; color: var(--primary-deep); margin-bottom: 2rem;">¡Lección Completada!</h2>
            
            <div id="story-player" style="background: #f1f5f9; padding: 2rem; border-radius: 20px; margin-bottom: 2rem; border: 2px dashed #cbd5e1;">
                <h3 style="font-size: 1.1rem; color: var(--slate-700); margin-bottom: 1rem;">🎥 Tu aventura del día</h3>
                <p style="font-size: 0.9rem; color: var(--slate-500); margin-bottom: 1.5rem;">Escucha tu conversación completa con Moon.</p>
                <button id="play-story-btn" class="btn btn-accent" style="background: #fbbf24; color: #78350f; padding: 1rem 2.5rem; font-weight: 700;">
                    ▶️ Reproducir mi Conversación
                </button>
            </div>

            <button class="btn btn-primary" style="padding: 1rem 3rem;" onclick="window.location.href='${targetUrl}'">Volver al Bosque</button>
        `;
        this.container.appendChild(box);

        // Lógica del Reproductor de Historia (Intercalado)
        const playBtn = document.getElementById('play-story-btn');
        if (playBtn) {
            playBtn.addEventListener('click', async () => {
                playBtn.disabled = true;
                playBtn.innerText = "🎬 Reproduciendo...";

                for (const item of this.sessionHistory) {
                    if (item.type === 'moon') {
                        await new Promise(resolve => {
                            this.speak(item.content, () => resolve());
                        });
                    } else if (item.type === 'child') {
                        await new Promise(resolve => {
                            const audio = new Audio(item.content);
                            audio.onended = resolve;
                            audio.play().catch(() => resolve()); // Fallback si falla
                        });
                    }
                }

                playBtn.disabled = false;
                playBtn.innerText = "▶️ Volver a escuchar";
            });
        }

        this.showMoon("¡Terminaste tu primer entrenamiento! Eres valiente.");
    }

    /* -------------------------------------------------------------------------- */
    /* UTILS                                                                      */
    /* -------------------------------------------------------------------------- */

    speak(text, onEndCallback = null) {
        if ('speechSynthesis' in window) {
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
        // Congelar y limpiar timer si existe
        if (this.currentTimerId) {
            clearTimeout(this.currentTimerId);
            this.currentTimerId = null;

            if (this.currentTimerBar) {
                const currentWidth = window.getComputedStyle(this.currentTimerBar).width;
                this.currentTimerBar.style.transition = 'none';
                this.currentTimerBar.style.width = currentWidth;
                this.currentTimerBar.style.background = 'linear-gradient(90deg, #10b981, #34d399)'; // Verde éxito
                this.currentTimerBar = null;
            }
        }

        // Avoid duplicate buttons
        if (parentBox.querySelector('.btn-next-step')) return;

        const nextBtn = document.createElement('button');
        nextBtn.className = 'btn btn-primary btn-next-step visible';
        nextBtn.innerText = 'Siguiente Actividad →';
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
        this.moonMessage.innerText = message;
        this.moonSupport.classList.remove('hidden');
    }

    hideMoon() {
        if (!this.moonSupport) return;
        this.moonSupport.classList.add('hidden');
    }
}
