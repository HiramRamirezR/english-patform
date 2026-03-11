import { auth, db, getEffectiveUser } from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// DOM Elements
const avatarModal = document.getElementById('avatar-modal');
const dashboardContent = document.getElementById('dashboard-content');
const avatarOptions = document.querySelectorAll('.avatar-option');
const saveAvatarBtn = document.getElementById('save-avatar-btn');
const displayAvatar = document.getElementById('display-avatar');
const userNameDisplay = document.getElementById('user-name');
const moonTrigger = document.getElementById('moon-trigger');
const moonText = document.getElementById('moon-text');

let currentUser = null;
let currentProfile = null;
let selectedAvatar = null;

// Avatar Selection Logic
avatarOptions.forEach(opt => {
    opt.addEventListener('click', () => {
        // Clear previous selection
        avatarOptions.forEach(o => o.classList.remove('selected'));
        // Select new
        opt.classList.add('selected');
        selectedAvatar = opt.getAttribute('data-avatar');

        // Enable button
        saveAvatarBtn.disabled = false;
    });
});

saveAvatarBtn.addEventListener('click', async () => {
    if (!selectedAvatar || !currentUser) return;

    saveAvatarBtn.disabled = true;
    saveAvatarBtn.textContent = 'Guardando...';

    try {
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
            avatar: selectedAvatar
        });

        // Update UI locally
        currentProfile.avatar = selectedAvatar;
        setupDashboardUI();

    } catch (error) {
        console.error("Error guardando avatar:", error);
        Swal.fire({
            title: '¡Ups!',
            text: 'Ocurrió un error al guardar tu avatar. Intenta de nuevo.',
            icon: 'error',
            confirmButtonColor: '#ef4444'
        });
        saveAvatarBtn.disabled = false;
        saveAvatarBtn.textContent = 'Comenzar Aventura';
    }
});

// Setup Initial Dashboard State
const setupDashboardUI = () => {
    // Si no tiene avatar, mostrar Onboarding
    if (!currentProfile.avatar) {
        avatarModal.style.display = 'flex';
        dashboardContent.style.display = 'none';
        return;
    }

    // Ya tiene avatar, preparar el "Peak"
    avatarModal.style.display = 'none';
    dashboardContent.style.display = 'block';

    // Rellenar Datos
    displayAvatar.textContent = currentProfile.avatar;
    const firstName = currentProfile.name.split(' ')[0];
    userNameDisplay.textContent = `¡Hola, ${firstName}!`;

    // Minutos hablados (reset diario)
    const today = new Date().toISOString().split('T')[0];
    let minutesToday = currentProfile.minutesSpokenToday || 0;

    // Si la última fecha de estudio no es hoy, el contador hoy es 0
    if (currentProfile.lastSpokenDate !== today) {
        minutesToday = 0;
    }

    const minutesSpokenDisplay = document.getElementById('minutes-spoken-today');
    if (minutesSpokenDisplay) {
        minutesSpokenDisplay.textContent = minutesToday;
    }

    // Ruta Semanal
    setupWeeklyPath(currentProfile.weeklyProgress || {});

    // Desbloquear Módulos
    setupModuleUnlocks(currentProfile.unlockedModules || ['m1']);

    // Frase inicial
    moonText.innerHTML = `¡Hola viajero! Qué bueno verte, <strong>${currentProfile.avatar}</strong>. Entra al Campamento Base (Módulo 1) para prepararnos.`;

    // Cargar Citas
    loadAppointments();
    cleanExpiredAppointments();

    // Verificación de Prueba de Nivelación (Solo una vez al inicio)
    if (!currentProfile.placementTestDone && (!currentProfile.unlockedModules || currentProfile.unlockedModules.length <= 1)) {
        setTimeout(() => triggerPlacementTestPrompt(), 2000);
    }
};

const setupModuleUnlocks = (unlocked) => {
    const nodes = document.querySelectorAll('.module-node');
    nodes.forEach(node => {
        const id = node.getAttribute('data-id');
        if (unlocked.includes(id)) {
            node.classList.remove('locked');
            node.classList.add('unlocked');
            node.onclick = () => window.location.href = `module.html?id=${id}`;
        } else {
            node.classList.remove('unlocked');
            node.classList.add('locked');
            node.onclick = null;
        }
    });
};

const triggerPlacementTestPrompt = async () => {
    const { value: accept } = await Swal.fire({
        title: '🐻‍❄️ ¡Evaluación de Diagnóstico!',
        html: `
            <div style="text-align: left; font-size: 0.95rem;">
                <p>¡Hola! Soy Moon. ¿Quieres ver si ya sabes suficiente inglés para saltar algunos niveles?</p>
                <p>Responderemos <b>25 preguntas rápidas</b> para determinar tu lugar en la montaña.</p>
                <p style="font-size: 0.8rem; color: #64748b;">* Esta oportunidad es única y no se puede repetir después.</p>
            </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: '¡Hacer el test!',
        cancelButtonText: 'Empezar desde el Módulo 1',
        confirmButtonColor: '#38bdf8',
        cancelButtonColor: '#64748b'
    });

    if (accept) {
        startPlacementTest();
    } else {
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, { placementTestDone: true });
        currentProfile.placementTestDone = true;
    }
};

const startPlacementTest = async () => {
    let score = 0;
    const questions = [
        // M1 Level
        { q: 'How do you say "Hola"?', a: 'hello' },
        { q: 'How do you say "Adiós"?', a: 'goodbye' },
        { q: 'I ____ happy. (am/is/are)', a: 'am' },
        { q: 'What is "Ustedes" in English?', a: 'you' },
        { q: 'They ____ tired. (am/is/are)', a: 'are' },
        // M2 Level
        { q: 'What is the opposite of "Big"?', a: 'small' },
        { q: 'She ____ English. (speak/speaks)', a: 'speaks' },
        { q: 'It ____ a bear. (is/are)', a: 'is' },
        { q: 'They ____ birds. (is/are)', a: 'are' },
        { q: "What color is a 'Blue bird'?", a: 'blue' },
        // M3 Level
        { q: 'The cat is ____ the table. (en/sobre -> in/on)', a: 'on' },
        { q: 'I ____ have a car. (no tengo -> don\'t/doesn\'t)', a: 'don\'t' },
        { q: 'Where ____ you from?', a: 'are' },
        { q: 'My name ____ Moon.', a: 'is' },
        { q: 'He ____ a brother. (has/have)', a: 'has' },
        // M4 Level
        { q: 'Yesterday I ____ to the park. (go/went)', a: 'went' },
        { q: 'I ____ eating now. (am/is/are)', a: 'am' },
        { q: 'What is "Mañana" (tomorrow/yesterday)?', a: 'tomorrow' },
        { q: 'Can you ____ me?', a: 'help' },
        { q: 'This is ____ book. (mi)', a: 'my' },
        // M5 Level
        { q: 'I think ____ it is raining.', a: 'that' },
        { q: 'I want ____ sleep.', a: 'to' },
        { q: 'How ____ is this?', a: 'much' },
        { q: 'There ____ many people.', a: 'are' },
        { q: 'You ____ be careful.', a: 'should' }
    ];

    Swal.fire({
        title: '¡Empezamos!',
        text: 'Responde con una sola palabra o la opción correcta.',
        timer: 2000,
        showConfirmButton: false
    });

    for (let i = 0; i < questions.length; i++) {
        const item = questions[i];
        const { value: answer } = await Swal.fire({
            title: `Pregunta ${i + 1}/25`,
            text: item.q,
            input: 'text',
            allowOutsideClick: false,
            inputPlaceholder: 'Escribe tu respuesta...',
            footer: '🐻‍❄️ Moon está escuchando...'
        });

        if (answer?.toLowerCase().trim() === item.a.toLowerCase()) {
            score++;
        }
    }

    // Calcular nivel
    let unlocked = ['m1'];
    if (score >= 22) unlocked = ['m1', 'm2', 'm3', 'm4', 'm5'];
    else if (score >= 17) unlocked = ['m1', 'm2', 'm3', 'm4'];
    else if (score >= 12) unlocked = ['m1', 'm2', 'm3'];
    else if (score >= 7) unlocked = ['m1', 'm2'];

    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, {
        unlockedModules: unlocked,
        placementTestDone: true,
        placementScore: score
    });

    currentProfile.unlockedModules = unlocked;
    currentProfile.placementTestDone = true;

    await Swal.fire({
        title: '¡Prueba Terminada!',
        html: `
            <div style="text-align: center;">
                <p style="font-size: 3rem;">🏔️</p>
                <p>Puntaje: <b>${score}/25</b></p>
                <p>Has desbloqueado hasta el: <b>Módulo ${unlocked.length}</b></p>
                <p>¡Disfruta tu aventura!</p>
            </div>
        `,
        icon: 'success',
        confirmButtonColor: '#38bdf8'
    });

    setupModuleUnlocks(unlocked);
};

const cleanExpiredAppointments = async () => {
    if (!currentUser) return;
    try {
        const q = query(collection(db, "slots"), where("studentId", "==", currentUser.uid), where("status", "in", ["booked", "needs_sub"]));
        const snap = await getDocs(q);
        const now = new Date();

        for (const d of snap.docs) {
            const data = d.data();
            const slotEndTime = new Date(`${data.date}T${data.startTime}`);
            slotEndTime.setMinutes(slotEndTime.getMinutes() + 25);

            if (slotEndTime < now) {
                // Si la sesión pasó y no fue marcada como completada (ya que aquí status es booked/needs_sub)
                // Liberamos el slot y devolvemos crédito si era needs_sub (nadie llegó)
                import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js").then(async ({ deleteField }) => {
                    const slotRef = doc(db, 'slots', d.id);
                    await updateDoc(slotRef, {
                        status: 'available',
                        studentId: deleteField(),
                        studentName: deleteField(),
                        studentEmail: deleteField(),
                        studentAvatar: deleteField(),
                        evaluationType: deleteField(),
                        bookedAt: deleteField()
                    });

                    if (data.status === 'needs_sub') {
                        const userRef = doc(db, 'users', currentUser.uid);
                        await updateDoc(userRef, {
                            evalCredits: (currentProfile.evalCredits || 0) + 1
                        });
                        currentProfile.evalCredits = (currentProfile.evalCredits || 0) + 1;
                    }
                });
            }
        }
    } catch (e) {
        console.error("Error limpiando citas expiradas:", e);
    }
};

window.startAutomatedJumpEval = async () => {
    const { value: accept } = await Swal.fire({
        title: 'Evaluación de Salto Automática',
        text: '¿Quieres intentar saltar al siguiente módulo? Deberás responder correctamente 5 preguntas de Moon.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: '¡Vamos!',
        cancelButtonText: 'Después'
    });

    if (accept) {
        // Lógica simplificada: 5 preguntas aleatorias
        let score = 0;
        const questions = [
            { q: 'How do you say "Hola"?', a: 'hello' },
            { q: 'I ____ happy. (am/is/are)', a: 'am' },
            { q: 'She ____ English. (speak/speaks)', a: 'speaks' },
            { q: 'What is the opposite of "Big"?', a: 'small' },
            { q: 'Do you ____ English?', a: 'speak' }
        ];

        for (const item of questions) {
            const { value: answer } = await Swal.fire({
                title: 'Pregunta de Moon 🐻‍❄️',
                text: item.q,
                input: 'text',
                allowOutsideClick: false
            });
            if (answer?.toLowerCase().trim() === item.a) score++;
        }

        if (score >= 4) {
            // Desbloquear siguiente módulo
            const currentUnlocked = currentProfile.unlockedModules || ['m1'];
            const nextIdx = currentUnlocked.length + 1;
            const nextModule = `m${nextIdx}`;

            if (!currentUnlocked.includes(nextModule)) {
                const userRef = doc(db, 'users', currentUser.uid);
                await updateDoc(userRef, {
                    unlockedModules: [...currentUnlocked, nextModule]
                });
                currentProfile.unlockedModules.push(nextModule);

                await Swal.fire('¡Felicidades!', `Has desbloqueado el ${nextModule} correctamente.`, 'success');
                setupModuleUnlocks(currentProfile.unlockedModules);
            }
        } else {
            Swal.fire('No pasaste', 'Sigue practicando en tu módulo actual.', 'error');
        }
    }
};

const loadAppointments = async () => {

    const widget = document.getElementById('appointment-widget');
    const details = document.getElementById('appointment-details');
    const actions = document.getElementById('appointment-actions');

    if (!currentUser || !widget) return;

    try {
        const q = query(collection(db, "slots"), where("studentId", "==", currentUser.uid), where("status", "in", ["booked", "needs_sub"]));
        const querySnapshot = await getDocs(q);

        const now = new Date();
        // Filtrar citas cuya hora de finalización (hora inicio + 25 mins de holgura) ya pasó
        const validDocs = querySnapshot.docs.filter(doc => {
            const data = doc.data();
            const slotEndTime = new Date(`${data.date}T${data.startTime}`);
            slotEndTime.setMinutes(slotEndTime.getMinutes() + 25);
            return slotEndTime > now;
        });

        if (validDocs.length === 0) {
            widget.style.display = 'none';
            return;
        }

        // Ordenar para tomar la cita más próxima
        validDocs.sort((a, b) => {
            const dateA = new Date(`${a.data().date}T${a.data().startTime}`);
            const dateB = new Date(`${b.data().date}T${b.data().startTime}`);
            return dateA - dateB;
        });

        // Tomar la cita más cercana
        const appointmentDoc = validDocs[0];
        const appointment = appointmentDoc.data();
        const appointmentId = appointmentDoc.id;

        // Usamos 'teachers' para que el alumno tenga permiso de ver el Zoom link
        const teacherRef = doc(db, 'teachers', appointment.teacherId);
        const teacherSnap = await getDoc(teacherRef);
        const teacherData = teacherSnap.exists() ? teacherSnap.data() : null;

        widget.style.display = 'flex';
        details.innerHTML = `
            Evaluación: <strong>${appointment.evaluationType || 'General'}</strong><br>
            Con: <strong>Prof. ${appointment.teacherName || 'Guardián'}</strong><br>
            Fecha: <strong>${appointment.date} a las ${appointment.startTime} hrs</strong>
        `;

        actions.innerHTML = '';
        actions.style.display = 'flex';
        actions.style.flexDirection = 'column';
        actions.style.alignItems = 'flex-start';
        actions.style.gap = '0.5rem';

        // Timer Container
        const timerContainer = document.createElement('div');
        timerContainer.id = 'zoom-timer-container';
        timerContainer.style.fontSize = '0.85rem';
        timerContainer.style.color = '#cbd5e1';
        actions.appendChild(timerContainer);

        let intervalId = null;

        const updateTimer = () => {
            const targetTime = new Date(`${appointment.date}T${appointment.startTime}`);
            const now = new Date();
            const diffMs = targetTime - now;

            if (diffMs <= 60000) { // 1 min o menos (o ya es hora)
                if (intervalId) clearInterval(intervalId);
                timerContainer.innerHTML = '';

                if (appointment.status === 'needs_sub') {
                    // Maestro suplente no encontrado y ya es hora
                    if (!window.notifiedMissingTeacher) {
                        window.notifiedMissingTeacher = true;

                        import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js").then(async ({ deleteField }) => {
                            Swal.fire({
                                title: 'Buscando sala...',
                                allowOutsideClick: false,
                                didOpen: () => { Swal.showLoading(); }
                            });

                            const slotRef = doc(db, 'slots', appointmentId);
                            await updateDoc(slotRef, {
                                status: 'available',
                                studentId: deleteField(),
                                studentName: deleteField(),
                                studentEmail: deleteField(),
                                studentAvatar: deleteField(),
                                evaluationType: deleteField(),
                                bookedAt: deleteField()
                            });

                            const userRef = doc(db, 'users', currentUser.uid);
                            const currentCredits = currentProfile.evalCredits || 0;
                            await updateDoc(userRef, {
                                evalCredits: currentCredits + 1
                            });
                            currentProfile.evalCredits = currentCredits + 1;

                            await Swal.fire({
                                title: 'Profesor No Disponible',
                                text: 'Lamentablemente tu Guardián tuvo una emergencia de último minuto y no pudimos encontrar un suplente a tiempo. Tu clase ha sido cancelada y se ha devuelto 1 crédito a tu cuenta automáticamente. Disculpa las molestias.',
                                icon: 'warning',
                                confirmButtonColor: '#f97316',
                                borderRadius: '24px'
                            });
                            loadAppointments();
                        });
                    }
                } else {
                    // Mostrar botón de Zoom
                    let existingLink = actions.querySelector('#zoom-link-btn');
                    if (!existingLink && teacherData?.zoomLink) {
                        const link = document.createElement('a');
                        link.id = 'zoom-link-btn';
                        link.href = teacherData.zoomLink;
                        link.target = '_blank';
                        link.className = 'btn';
                        link.style.background = '#f97316';
                        link.style.color = 'white';
                        link.style.fontSize = '0.85rem';
                        link.style.padding = '0.6rem 1.2rem';
                        link.textContent = '➡️ Entrar a la Sala';
                        // Lo insertamos siempre al principio del contenedor actions
                        actions.insertBefore(link, actions.firstChild);
                    }
                }
            } else {
                // Faltan más de 1 min, mostrar cuenta regresiva
                const totalSeconds = Math.floor(diffMs / 1000);
                const days = Math.floor(totalSeconds / 86400);
                const hours = Math.floor((totalSeconds % 86400) / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);

                let timeString = '';
                if (days > 0) timeString += `${days}d `;
                if (hours > 0) timeString += `${hours}h `;
                timeString += `${minutes}m`;

                timerContainer.innerHTML = `⏳ Disponible en: <strong>${timeString}</strong>`;
            }
        };

        if (teacherData?.zoomLink) {
            updateTimer();
            intervalId = setInterval(updateTimer, 60000); // Act. cada minuto
        }

        // Botón de Cancelar
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn';
        cancelBtn.style.background = 'transparent';
        cancelBtn.style.border = '1px solid #ef4444';
        cancelBtn.style.color = '#ef4444';
        cancelBtn.style.fontSize = '0.75rem';
        cancelBtn.style.padding = '0.4rem 0.8rem';
        cancelBtn.textContent = 'Cancelar Evaluación';

        cancelBtn.onclick = async () => {
            const result = await Swal.fire({
                title: '¿Seguro que deseas cancelar?',
                html: `
                    <p style="font-size:0.9rem; margin-bottom:1rem;">Tu lugar será liberado para que otro alumno pueda agendarlo.</p>
                    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 1rem; border-radius: 12px; text-align: left;">
                        <span style="font-weight: 700; color: #166534; display:block; margin-bottom:0.25rem;">💰 Reembolso Automático</span>
                        <span style="font-size: 0.85rem; color: #15803d;">Tu dinero será regresado en forma de <strong>1 Crédito de Evaluación</strong>, el cual podrás usar después para agendar otra evaluación.</span>
                    </div>
                `,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'Sí, cancelar cita',
                cancelButtonText: 'Mantener cita',
                borderRadius: '24px'
            });

            if (result.isConfirmed) {
                try {
                    Swal.fire({
                        title: 'Cancelando...',
                        allowOutsideClick: false,
                        didOpen: () => { Swal.showLoading(); }
                    });

                    import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js").then(async ({ deleteField }) => {
                        // 1. Liberar Slot
                        const slotRef = doc(db, 'slots', appointmentId);
                        await updateDoc(slotRef, {
                            status: 'available',
                            studentId: deleteField(),
                            studentName: deleteField(),
                            studentEmail: deleteField(),
                            studentAvatar: deleteField(),
                            evaluationType: deleteField(),
                            bookedAt: deleteField()
                        });

                        // 2. Dar crédito al estudiante
                        const userRef = doc(db, 'users', currentUser.uid);
                        const currentCredits = currentProfile.evalCredits || 0;
                        await updateDoc(userRef, {
                            evalCredits: currentCredits + 1
                        });
                        currentProfile.evalCredits = currentCredits + 1; // update local

                        // 3. Notificar al maestro
                        const { sendDiscordNotification } = await import('./discord.js');
                        const displayName = currentUser.displayName || 'Un alumno';
                        await sendDiscordNotification(
                            "❌ Sesión Cancelada",
                            `¡Atención Prof. ${appointment.teacherName}!\n\n**${displayName}** ha cancelado su sesión agendada para el **${appointment.date} a las ${appointment.startTime} hrs**.\n\nEse horario ha sido liberado en el Marketplace nuevamente.`,
                            15548997 // Rojo
                        );

                        if (intervalId) clearInterval(intervalId);

                        await Swal.fire({
                            title: 'Cita Cancelada',
                            text: 'El espacio fue liberado y 1 crédito fue añadido a tu cuenta.',
                            icon: 'success',
                            confirmButtonColor: '#059669',
                            borderRadius: '24px'
                        });

                        loadAppointments(); // Recargar widget
                    });

                } catch (error) {
                    console.error("Error al cancelar cita:", error);
                    Swal.fire('Error', 'No pudimos cancelar esta cita. Intenta de nuevo.', 'error');
                }
            }
        };
        actions.appendChild(cancelBtn);

    } catch (error) {
        console.error("Error cargando citas:", error);
    }
};

const setupWeeklyPath = (progress) => {
    const today = new Date();
    const currentDayIndex = today.getDay(); // 0 (Domingo) a 6 (Sábado)
    const dayCircles = document.querySelectorAll('.day-circle');

    dayCircles.forEach(circle => {
        const dayIdx = parseInt(circle.dataset.day);

        // Limpiar estados previos (por si acaso)
        circle.classList.remove('active', 'today');

        // Marcar hoy
        if (dayIdx === currentDayIndex) {
            circle.classList.add('today');
        }

        // Marcar si hubo progreso ese día (basado en Firestore)
        // El campo indexado en progress es el número del día 0-6
        if (progress[dayIdx]) {
            circle.classList.add('active');
        }
    });

    // Si hoy hay minutos hablados pero no está en el progreso, marcarlo activo visualmente
    const minsToday = parseInt(document.getElementById('minutes-spoken-today')?.textContent || '0');
    if (minsToday > 0) {
        const todayCircle = document.querySelector(`.day-circle[data-day="${currentDayIndex}"]`);
        if (todayCircle) todayCircle.classList.add('active');
    }
};

// Auth and DB Check
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        // Obtener usuario efectivo (soporta impersonate)
        const effectiveUser = await getEffectiveUser();
        currentUser = effectiveUser;

        try {
            const docRef = doc(db, 'users', currentUser.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                currentProfile = docSnap.data();
                setupDashboardUI();
            } else {
                console.warn("Perfil de usuario no encontrado en Firestore.");
            }

        } catch (error) {
            console.error("Error cargando perfil del dashboard:", error);
        }
    });

    // Moon Interaction
    const moonPhrases = [
        "¿Sabías que English Peak es la montaña más alta?",
        "Tómate tu tiempo en el Campamento Base.",
        "Si sientes que esto es muy fácil, pide una evaluación con un humano. 🚁",
        "Ese avatar te queda increíble, por cierto."
    ];

    moonTrigger.addEventListener('click', () => {
        const randomPhrase = moonPhrases[Math.floor(Math.random() * moonPhrases.length)];
        moonText.innerHTML = randomPhrase;
        moonText.style.opacity = 1;
        moonText.style.transform = 'translateY(0) scale(1)';

        // Hide after 4 seconds
        setTimeout(() => {
            moonText.style.opacity = 0;
            moonText.style.transform = 'translateY(10px) scale(0.9)';
        }, 4000);
    });
});
