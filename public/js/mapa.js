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

const loadAppointments = async () => {
    const widget = document.getElementById('appointment-widget');
    const details = document.getElementById('appointment-details');
    const actions = document.getElementById('appointment-actions');

    if (!currentUser || !widget) return;

    try {
        const q = query(collection(db, "slots"), where("studentId", "==", currentUser.uid), where("status", "==", "booked"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            widget.style.display = 'none';
            return;
        }

        // Tomar la cita más cercana (por ahora la primera)
        const appointment = querySnapshot.docs[0].data();
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
        if (teacherData?.zoomLink) {
            const link = document.createElement('a');
            link.href = teacherData.zoomLink;
            link.target = '_blank';
            link.className = 'btn';
            link.style.background = '#f97316';
            link.style.color = 'white';
            link.style.fontSize = '0.85rem';
            link.style.padding = '0.6rem 1.2rem';
            link.textContent = '➡️ Entrar a la Sala';
            actions.appendChild(link);
        }

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
