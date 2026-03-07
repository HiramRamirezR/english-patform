import { auth, db } from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
        // 1. Cargar Maestros certificados (approved by admin only)
        const qTeachers = query(collection(db, "users"), where("isTeacher", "==", true), where("certified", "==", true));
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
        teachersGrid.innerHTML = `
            <div class="no-slots-cta">
                <div style="font-size: 3rem;">🕵️‍♂️</div>
                <h3>¿No encuentras el horario que buscas?</h3>
                <p>Nuestros guardianes están listos para guiarte. Cuéntanos qué día y hora necesitas y Moon les avisará de inmediato para ver quién puede abrir un espacio para ti.</p>
                <button class="btn-request" onclick="window.requestCustomSlot()">Solicitar Horario Especial</button>
            </div>
        `;
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

    // Añadir CTA al final también si hay resultados pero quizá ninguno le convence
    const finalCta = document.createElement('div');
    finalCta.className = 'no-slots-cta';
    finalCta.style.marginTop = '2rem';
    finalCta.style.padding = '2rem';
    finalCta.innerHTML = `
        <h4 style="color: #9a3412; margin-bottom: 0.5rem;">¿Ninguno te acomoda?</h4>
        <p style="font-size: 0.85rem;">Pide un horario personalizado y Moon buscará a un guardián disponible.</p>
        <button class="btn-request" style="padding: 0.5rem 1.5rem; margin-top: 1rem; font-size: 0.85rem;" onclick="window.requestCustomSlot()">Pedir otro horario</button>
    `;
    teachersGrid.appendChild(finalCta);
};

// Solicitar Horario Especial
window.requestCustomSlot = async () => {
    const { value: formValues } = await Swal.fire({
        title: 'Solicitar Horario Especial',
        html: `
            <div style="text-align: left; overflow: hidden;">
                <label style="display: block; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.5rem;">Día deseado:</label>
                <input type="date" id="swal-date" class="swal2-input" style="margin: 0; width: 100%; box-sizing: border-box; font-family: inherit; padding: 0.625em 1em;">
                
                <label style="display: block; font-size: 0.85rem; font-weight: 700; margin-top: 1.5rem; margin-bottom: 0.5rem;">Hora aproximada (Ej: 15:30):</label>
                <input type="time" id="swal-time" class="swal2-input" style="margin: 0; width: 100%; box-sizing: border-box; font-family: inherit;">
                
                <p style="font-size: 0.75rem; color: #64748b; margin-top: 1.25rem; line-height: 1.4;">
                    Moon enviará tu solicitud a los maestros en Discord. Si alguien puede, te avisaremos o abrirá el espacio.
                </p>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Enviar a Moon 🐻‍❄️',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#f97316',
        preConfirm: () => {
            const date = document.getElementById('swal-date').value;
            const time = document.getElementById('swal-time').value;
            if (!date || !time) {
                Swal.showValidationMessage('Por favor llena ambos campos');
            }
            return { date, time };
        }
    });

    if (formValues) {
        try {
            const { date, time } = formValues;

            // 1. Verificar si por casualidad ya existe un slot que coincida
            const match = allSlots.find(s => s.date === date && s.startTime === time);

            if (match) {
                const teacher = allTeachers.find(t => t.id === match.teacherId);
                Swal.fire({
                    title: '¡Encontramos uno!',
                    text: `El Prof. ${teacher.name} ya tiene ese horario disponible. ¿Quieres agendarlo?`,
                    icon: 'info',
                    showCancelButton: true,
                    confirmButtonText: 'Ver horario',
                }).then((res) => {
                    if (res.isConfirmed) {
                        filterDay.value = date;
                        filterName.value = teacher.name;
                        renderMarketplace();
                    }
                });
                return;
            }

            // 2. Guardar solicitud en Firestore
            const { addDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
            await addDoc(collection(db, "availabilityRequests"), {
                studentId: currentUser.uid,
                studentName: currentUser.displayName || 'Estudiante',
                requestedDate: date,
                requestedTime: time,
                status: 'open',
                createdAt: serverTimestamp()
            });

            // 3. Notificar a Discord (Canal General de Maestros con @everyone)
            const { sendDiscordNotification } = await import('./discord.js');
            const teacherUrl = `${window.location.origin}/teacher.html`;

            await sendDiscordNotification(
                "🌲 ¡Bosque Vacío! - Nueva Solicitud",
                `Un alumno está buscando un horario que no encontró:\n\n**Alumno:** ${currentUser.displayName}\n**Día:** ${date}\n**Hora:** ${time} hrs\n\n¿Algún maestro puede abrir este espacio? 🎒✨\n\n[👉 Abrir Horario en mi Agenda](${teacherUrl})`,
                16744448, // Naranja Moonsforest
                null,     // No es DM
                'teachers', // Canal de maestros
                '@everyone' // Tagging
            );

            Swal.fire({
                title: '¡Solicitud Enviada!',
                text: 'Moon ya les avisó a los maestros en Discord. Mantente atento a la plataforma.',
                icon: 'success',
                confirmButtonColor: '#f97316'
            });

        } catch (error) {
            console.error("Error al enviar solicitud:", error);
            Swal.fire('Error', 'No pudimos enviar tu solicitud. Intenta de nuevo.', 'error');
        }
    }
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

window.payForSlot = async (slotId, teacherId, date, time) => {
    const teacher = allTeachers.find(t => t.id === teacherId);

    const hasCredit = userData && userData.evalCredits > 0;

    const result = await Swal.fire({
        title: '¿Confirmar Evaluación?',
        html: `
            <div style="text-align: left; background: #f8fafc; padding: 1.5rem; border-radius: 16px; margin-top: 1rem; border: 1px solid var(--slate-200);">
                <p style="margin-bottom: 0.5rem;"><strong>Guardián:</strong> Prof. ${teacher.name.split(' ')[0]}</p>
                <p style="margin-bottom: 0.5rem;"><strong>Fecha:</strong> ${date}</p>
                <p style="margin-bottom: 0.5rem;"><strong>Hora:</strong> ${time} hrs</p>
                <p style="margin-top: 1rem; font-weight: 800; color: ${hasCredit ? '#059669' : 'var(--success-deep)'}; font-size: 1.1rem;">
                    ${hasCredit ? '🎫 Usar mi Crédito (Gratis)' : 'Inversión: $60 MXN'}
                </p>
                ${hasCredit ? `<p style="font-size: 0.75rem; color: var(--slate-500); margin-top: 0.25rem;">Te quedan ${userData.evalCredits} créditos.</p>` : ''}
            </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, agendar ahora',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#2563eb',
        cancelButtonColor: '#64748b',
        borderRadius: '24px'
    });

    if (result.isConfirmed) {
        try {
            // Mostrar estado de carga
            Swal.fire({
                title: 'Procesando reserva...',
                text: 'Estamos asegurando tu lugar en el bosque.',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            // 0. Obtener tipo de evaluación (Goal)
            const activeGoal = document.querySelector('.goal-card.active h3')?.textContent || 'Evaluación';

            // 1. Actualizar el Slot en Firestore
            const slotRef = doc(db, 'slots', slotId);
            await updateDoc(slotRef, {
                status: 'booked',
                studentId: currentUser.uid,
                studentName: currentUser.displayName || 'Estudiante',
                studentEmail: currentUser.email,
                studentAvatar: userData?.avatar || '👤',
                evaluationType: activeGoal,
                bookedAt: new Date()
            });

            // 1.5 Descontar crédito si se usó
            if (hasCredit) {
                const studentRef = doc(db, 'users', currentUser.uid);
                await updateDoc(studentRef, { evalCredits: userData.evalCredits - 1 });
                userData.evalCredits -= 1; // Update local state
            }

            // 2. Notificación Discord
            const { sendDiscordNotification } = await import('./discord.js');
            const displayName = currentUser ? (currentUser.displayName || currentUser.email) : 'Alguien';
            const teacherDiscordId = teacher.teacherProfile?.discordId || null;

            sendDiscordNotification(
                "💰 Sesión Reservada Contigo",
                `¡Hola Prof. ${teacher.name.split(' ')[0]}!\n\n**${displayName}** ha reservado una evaluación:\n\n**Fecha:** ${date}\n**Hora:** ${time} hrs\n**Misión:** ${activeGoal}`,
                3066993, // Verde
                teacherDiscordId // Enviamos DM si el maestro tiene Discord ID
            );

            // 3. Éxito
            await Swal.fire({
                title: '¡Reserva Exitosa!',
                text: 'Tu evaluación ha sido agendada correctamente. Los detalles han sido enviados a tu guía.',
                icon: 'success',
                confirmButtonColor: '#059669',
                borderRadius: '24px'
            });

            // Recargar datos para que el slot desaparezca
            loadMarketplaceData();

        } catch (error) {
            console.error("Error al procesar reserva:", error);
            Swal.fire({
                title: '¡Ups!',
                text: 'No pudimos completar la reserva. Por favor intenta de nuevo.',
                icon: 'error',
                confirmButtonColor: '#ef4444'
            });
        }
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

// Lógica de selección de Misión (Goal)
const setupGoalSelection = () => {
    [goalCertify, goalJump].forEach(card => {
        card.addEventListener('click', () => {
            if (card.classList.contains('locked')) return;

            // Remover active de los otros
            goalCertify.classList.remove('active');
            goalJump.classList.remove('active');

            // Añadir active al clickeado
            card.classList.add('active');
        });
    });
};

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
            setupGoalSelection();
        }

        loadMarketplaceData();
    });
});
