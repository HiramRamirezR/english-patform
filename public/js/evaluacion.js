import { auth, db } from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, query, where, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// DOM Elements
const goalCertify = document.getElementById('goal-certify');
const goalJump = document.getElementById('goal-jump');
const teachersGrid = document.getElementById('teachers-grid');
const filterName = document.getElementById('filter-name');
const filterDay = document.getElementById('filter-day');
const videoModal = document.getElementById('video-modal');
const closeModal = document.getElementById('close-modal');
const modalVideoContainer = document.getElementById('modal-video-container');
const modalTeacherName = document.getElementById('modal-teacher-name');
const modalTeacherBio = document.getElementById('modal-teacher-bio');

// Variables Globales
let allTeachers = [];
let allSlots = [];
let currentUser = null;
let userData = null;

// Inicialización de filtros de fecha (próximos 4 días)
const initDateFilters = () => {
    const today = new Date();
    for (let i = 0; i < 4; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const option = document.createElement('option');
        option.value = dateStr;

        if (i === 0) option.text = "Hoy (" + d.toLocaleDateString() + ")";
        else if (i === 1) option.text = "Mañana (" + d.toLocaleDateString() + ")";
        else option.text = d.toLocaleDateString();

        filterDay.appendChild(option);
    }
};

// Cargar Datos de Firestore
const loadMarketplaceData = async () => {
    try {
        // 1. Cargar Maestros
        const qTeachers = query(collection(db, "users"), where("isTeacher", "==", true));
        const teacherSnap = await getDocs(qTeachers);
        allTeachers = [];
        teacherSnap.forEach(doc => {
            allTeachers.push({ id: doc.id, ...doc.data() });
        });

        // 2. Cargar Slots disponibles
        const qSlots = query(collection(db, "slots"), where("status", "==", "available"));
        const slotSnap = await getDocs(qSlots);
        allSlots = [];
        slotSnap.forEach(doc => {
            allSlots.push({ id: doc.id, ...doc.data() });
        });

        renderMarketplace();

    } catch (error) {
        console.error("Error cargando marketplace:", error);
        teachersGrid.innerHTML = '<p style="color:red; text-align:center;">Error al cargar maestros. Recarga la página.</p>';
    }
};

// Renderizar Marketplace
const renderMarketplace = () => {
    const nameQuery = filterName.value.toLowerCase();
    const dayQuery = filterDay.value;

    teachersGrid.innerHTML = '';

    // Filtrar maestros si no tienen disponibilidad en el día solicitado (si se selecciona uno)
    const filteredTeachers = allTeachers.filter(teacher => {
        // Filtro por nombre
        const matchesName = !nameQuery || (teacher.name && teacher.name.toLowerCase().includes(nameQuery));
        if (!matchesName) return false;

        // Filtro por día (verificar si el maestro tiene slots ese día)
        if (dayQuery !== 'all') {
            const hasSlotsOnDay = allSlots.some(s => s.teacherId === teacher.id && s.date === dayQuery);
            if (!hasSlotsOnDay) return false;
        }

        return true;
    });

    if (filteredTeachers.length === 0) {
        teachersGrid.innerHTML = '<p style="color: var(--slate-400); text-align:center; grid-column: 1/-1; padding: 3rem;">No se encontraron maestros con estos filtros.</p>';
        return;
    }

    filteredTeachers.forEach(teacher => {
        const profile = teacher.teacherProfile || {};

        // Slots del maestro (filtrados por día si aplica)
        const teacherSlots = allSlots.filter(s => s.teacherId === teacher.id && (dayQuery === 'all' || s.date === dayQuery));

        // Tomar top 4 slots
        const slotsHtml = teacherSlots.slice(0, 4).map(slot => `
            <button class="slot-chip" onclick="window.payForSlot('${slot.id}', '${teacher.id}', '${slot.date}', '${slot.startTime}')">
                ${slot.startTime}
            </button>
        `).join('');

        const moreSlotsText = teacherSlots.length > 4 ? `<span style="font-size: 0.75rem; color: var(--slate-400);">+ ${teacherSlots.length - 4} más</span>` : '';

        const card = document.createElement('div');
        card.className = 'teacher-card';
        card.innerHTML = `
            <div class="teacher-top">
                <div class="teacher-avatar">${teacher.avatar || '👤'}</div>
                <div class="teacher-info">
                    <h4>Prof. ${teacher.name ? teacher.name.split(' ')[0] : 'Guardián'}</h4>
                    <p>${profile.specialties || 'Guardián de Moonsforest'}</p>
                </div>
            </div>
            <div class="teacher-body">
                <p class="teacher-bio">${profile.bio || 'Preparado para guiarte en tu expedición de inglés.'}</p>
                <div class="slots-preview">
                    ${slotsHtml}
                    ${moreSlotsText}
                </div>
                ${teacherSlots.length === 0 ? '<p style="font-size: 0.8rem; color: var(--slate-400); font-style: italic;">Sin horarios para este día.</p>' : ''}
            </div>
            <div class="teacher-footer">
                <button class="video-btn" onclick="window.openVideoModal('${teacher.id}')">
                    <span>▶</span> Ver Video
                </button>
                <div style="font-size: 0.85rem; font-weight: 700; color: var(--success-deep);">$60 MXN</div>
            </div>
        `;
        teachersGrid.appendChild(card);
    });
};

// Lógica de Video Modal
window.openVideoModal = (teacherId) => {
    const teacher = allTeachers.find(t => t.id === teacherId);
    if (!teacher || !teacher.teacherProfile?.video) {
        alert("Este maestro aún no tiene video de presentación.");
        return;
    }

    const videoUrl = teacher.teacherProfile.video;
    // Simple helper para convertir URL YouTube en Embed
    let embedId = '';
    if (videoUrl.includes('v=')) {
        embedId = videoUrl.split('v=')[1].split('&')[0];
    } else if (videoUrl.includes('youtu.be/')) {
        embedId = videoUrl.split('youtu.be/')[1].split('?')[0];
    }

    if (embedId) {
        modalVideoContainer.innerHTML = `<iframe src="https://www.youtube.com/embed/${embedId}?autoplay=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    } else {
        modalVideoContainer.innerHTML = '<p style="padding: 3rem; text-align:center;">Enlace de video no válido.</p>';
    }

    modalTeacherName.textContent = `Prof. ${teacher.name || 'Guardián'}`;
    modalTeacherBio.textContent = teacher.teacherProfile.bio || '';
    videoModal.style.display = 'flex';
};

window.payForSlot = (slotId, teacherId, date, time) => {
    const teacher = allTeachers.find(t => t.id === teacherId);

    const confirmMsg = `¿Quieres agendar tu evaluación con el Prof. ${teacher.name.split(' ')[0]}?\n\nFecha: ${date}\nHora: ${time}\nCosto: $60 MXN`;

    if (confirm(confirmMsg)) {
        alert('🎉 ¡Casi listo! \n\nEstamos generando tu enlace de pago seguro con Mercado Pago...\n\n(En un entorno real, aquí te redirigiríamos a la pasarela).');

        import('./discord.js').then(module => {
            const displayName = currentUser ? (currentUser.displayName || currentUser.email) : 'Alguien';
            module.sendDiscordNotification(
                "💰 Intención de Pago ($60)",
                `**${displayName}** ha intentado agendar una sesión:\n\n**Maestro:** Prof. ${teacher.name}\n**Horario:** ${date} ${time} hrs`,
                3447003 // Azul
            );
        });
    }
};

// Close Modal
closeModal.onclick = () => {
    videoModal.style.display = 'none';
    modalVideoContainer.innerHTML = '';
};

// Event Listeners para Filtros
filterName.oninput = renderMarketplace;
filterDay.onchange = renderMarketplace;

// Verificar Progreso para desbloquear Certificación
const updateGoalStates = () => {
    if (!userData || !userData.completedLessons) return;

    const completed = userData.completedLessons;
    // Si ha terminado la lección 20 de m1 o m2 (por ahora lo más avanzado que tenemos)
    const canCertify = completed.includes('m1l20') || completed.includes('m2l20');

    if (canCertify) {
        goalCertify.classList.remove('locked');
        goalCertify.classList.add('active');
        const badge = goalCertify.querySelector('.status-badge');
        badge.textContent = '¡Listo!';
        badge.className = 'status-badge badge-ready';
    }
};

// Inicio de App
document.addEventListener('DOMContentLoaded', () => {
    initDateFilters();

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        currentUser = user;
        const docRef = doc(db, 'users', user.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            userData = snap.data();
            updateGoalStates();
        }

        loadMarketplaceData();
    });
});
