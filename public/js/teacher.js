import { auth, db } from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, collection, addDoc, query, where, getDocs, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { sendDiscordNotification } from './discord.js';

// Elementos del DOM para la agenda
const toggleFormBtn = document.getElementById('toggle-slot-form-btn');
const formContainer = document.getElementById('new-slot-container');
const predefinedSlotsForm = document.getElementById('predefined-slots-form');
const dateSelect = document.getElementById('slot-date-select');
const timeGrid = document.getElementById('time-grid');
const selectedCountIndicator = document.getElementById('selected-count');
const saveBtn = document.getElementById('save-slot-btn');
const slotsContainer = document.getElementById('slots-container');
const emptyMsg = document.getElementById('empty-agenda-msg');

let currentUser = null;
let currentTeacherProfile = null;
let selectedTimes = new Set(); // Guardará los horarios seleccionados

// Helper para generar formato YYYY-MM-DD
const formatDate = (dateObj) => {
    return dateObj.toISOString().split('T')[0];
};

// Generar últimos 3 días en el select
const populateDateSelect = () => {
    dateSelect.innerHTML = '';
    const today = new Date();

    for (let i = 0; i < 4; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);

        const option = document.createElement('option');
        option.value = formatDate(d);

        if (i === 0) option.text = "Hoy (" + d.toLocaleDateString() + ")";
        else if (i === 1) option.text = "Mañana (" + d.toLocaleDateString() + ")";
        else option.text = d.toLocaleDateString();

        dateSelect.appendChild(option);
    }
};

// Generar botones de hora de 8am a 8pm en bloques de 20 / 30 mins
const populateTimeGrid = () => {
    timeGrid.innerHTML = '';
    selectedTimes.clear();
    updateUI();

    // Permitiendo densidad máxima: 3 slots por hora (cada 20 mins sin descanso entre ellos)
    for (let h = 8; h <= 20; h++) {
        ['00', '20', '40'].forEach(m => {
            const timeStr = `${String(h).padStart(2, '0')}:${m}`;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn time-btn';
            btn.innerText = timeStr;
            btn.style.padding = '0.5rem';
            btn.style.fontSize = '0.8rem';
            btn.style.border = '1px solid var(--slate-300)';
            btn.style.background = 'white';
            btn.style.color = 'var(--slate-700)';
            btn.style.cursor = 'pointer';
            btn.style.borderRadius = '6px';
            btn.style.transition = 'all 0.2s';

            btn.addEventListener('click', () => {
                if (selectedTimes.has(timeStr)) {
                    selectedTimes.delete(timeStr);
                    btn.style.background = 'white';
                    btn.style.color = 'var(--slate-700)';
                    btn.style.borderColor = 'var(--slate-300)';
                } else {
                    selectedTimes.add(timeStr);
                    btn.style.background = 'var(--primary-medium)';
                    btn.style.color = 'white';
                    btn.style.borderColor = 'var(--primary-medium)';
                }
                updateUI();
            });

            timeGrid.appendChild(btn);
        });
    }
};

const updateUI = () => {
    const count = selectedTimes.size;
    if (count > 0) {
        selectedCountIndicator.style.display = 'inline';
        selectedCountIndicator.innerText = `${count} seleccionado${count > 1 ? 's' : ''}`;
        saveBtn.disabled = false;
    } else {
        selectedCountIndicator.style.display = 'none';
        saveBtn.disabled = true;
    }
};

// Mostrar / Ocultar formulario
toggleFormBtn.addEventListener('click', () => {
    if (formContainer.style.display === 'none') {
        formContainer.style.display = 'block';
        toggleFormBtn.textContent = 'Cerrar Panel';
        populateDateSelect();
        populateTimeGrid();
    } else {
        formContainer.style.display = 'none';
        toggleFormBtn.textContent = '+ Abrir Horarios';
    }
});

// Al cambiar el día, reiniciar selección por seguridad
dateSelect.addEventListener('change', () => {
    populateTimeGrid();
});

// Guardar múltiples Slots
predefinedSlotsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser || selectedTimes.size === 0) return;

    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando...';

    const slotDate = dateSelect.value;
    let savedCount = 0;
    let skippedCount = 0;

    try {
        // Traer slots actuales del día para validación
        const slotsCol = collection(db, "slots");
        const qSlots = query(slotsCol, where("teacherId", "==", currentUser.uid), where("date", "==", slotDate));
        const snapshot = await getDocs(qSlots);

        const existingMinutes = [];
        snapshot.forEach(doc => {
            const [h, m] = doc.data().startTime.split(':').map(Number);
            existingMinutes.push(h * 60 + m);
        });

        // Procesar cada hora seleccionada
        for (const timeStr of selectedTimes) {
            const [newH, newM] = timeStr.split(':').map(Number);
            const newMinutes = newH * 60 + newM;

            // Revisar cruces (Tienen que estar a 20 mins de distancia)
            let isOverlapping = false;
            for (const oldMins of existingMinutes) {
                if (Math.abs(newMinutes - oldMins) < 20) {
                    isOverlapping = true;
                    break;
                }
            }

            if (isOverlapping) {
                skippedCount++;
            } else {
                await addDoc(collection(db, "slots"), {
                    teacherId: currentUser.uid,
                    teacherName: currentTeacherProfile.name || 'Maestro',
                    date: slotDate,
                    startTime: timeStr,
                    status: 'available',
                    createdAt: serverTimestamp()
                });
                savedCount++;
                // Añadirlo temporalmente a la lista local para que el siguiente loop lo considere ocupado
                existingMinutes.push(newMinutes);
            }
        }

        // Feedback
        if (skippedCount > 0) {
            alert(`✅ Se crearon ${savedCount} horarios.\n⚠️ Se omitieron ${skippedCount} horarios porque chocaban con disponibilidad existente.`);
        } else if (savedCount > 0) {
            console.log(`Todos los slots (${savedCount}) guardados exitosamente.`);
        }

        if (savedCount > 0) {
            sendDiscordNotification(
                "📆 Nuevos Horarios de Evaluación",
                `**${currentTeacherProfile.name || currentUser.displayName}** acaba de abrir **${savedCount}** bloques nuevos para el día ${slotDate}.`,
                3447003 // Azul
            );
        }

        // Limpieza y recarga
        populateTimeGrid();
        formContainer.style.display = 'none';
        toggleFormBtn.textContent = '+ Abrir Horarios';
        await loadSlots();

    } catch (error) {
        console.error("Error al guardar múltiples slots:", error);
        alert("Ocurrió un error general guardando la agenda.");
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Abrir Horarios Seleccionados';
    }
});

// Función para cargar los slots del profesor
const loadSlots = async () => {
    if (!currentUser) return;

    try {
        const slotsCol = collection(db, "slots");
        const qSlots = query(slotsCol, where("teacherId", "==", currentUser.uid));

        const querySnapshot = await getDocs(qSlots);
        slotsContainer.innerHTML = '';
        const slotsArray = [];

        querySnapshot.forEach((doc) => {
            slotsArray.push({ id: doc.id, ...doc.data() });
        });

        // Ordenar en cliente para no requerir index compuesto
        slotsArray.sort((a, b) => {
            if (a.date === b.date) {
                return a.startTime.localeCompare(b.startTime);
            }
            return a.date.localeCompare(b.date);
        });

        if (slotsArray.length === 0) {
            emptyMsg.style.display = 'block';
            slotsContainer.style.display = 'none';
        } else {
            emptyMsg.style.display = 'none';
            slotsContainer.style.display = 'block';

            // Generar paleta de colores más distintivos para diferenciar los días de un vistazo
            const colorPalette = ['#e0f2fe', '#f3e8ff', '#fef9c3', '#dcfce7', '#ffe4e6'];
            const dateColors = {};
            let colorIndex = 0;

            // Helper local para formato corto de fecha
            const formatearFechaCorta = (dateStr) => {
                const [y, m, d] = dateStr.split('-');
                const dateObj = new Date(y, m - 1, d);
                return dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', '');
            };

            slotsArray.forEach(slot => {
                const li = document.createElement('li');
                li.className = 'slot-item';

                // Asignar color por fecha
                if (!dateColors[slot.date]) {
                    dateColors[slot.date] = colorPalette[colorIndex % colorPalette.length];
                    colorIndex++;
                }
                li.style.backgroundColor = dateColors[slot.date];

                // Color de borde más intenso basado en el fondo
                const borderColor = dateColors[slot.date]
                    .replace('#e0f2fe', '#0ea5e9') // blue
                    .replace('#f3e8ff', '#a855f7') // purple
                    .replace('#fef9c3', '#eab308') // yellow
                    .replace('#dcfce7', '#22c55e') // green
                    .replace('#ffe4e6', '#f43f5e'); // rose

                li.style.borderLeft = `5px solid ${borderColor}`;

                // Calcular hora fin (+20 min)
                const [h, m] = slot.startTime.split(':').map(Number);
                const endDate = new Date();
                endDate.setHours(h, m + 20);
                const endTimeStr = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

                const badge = slot.status === 'available'
                    ? `<span class="badge-pending" style="background: white; border: 1px solid #fcd34d;">Libre</span>`
                    : `<span class="badge-booked">Ocupado</span>`;

                let deleteBtn = slot.status === 'available'
                    ? `<button class="btn btn-delete-slot" data-id="${slot.id}" style="border: 1px solid rgba(225, 29, 72, 0.3); color: #e11d48; padding: 0.4rem 0.8rem; font-size: 0.8rem; background: white; cursor: pointer; transition: all 0.2s;">✖</button>`
                    : ``;

                li.innerHTML = `
                    <div class="slot-info">
                        <h4 style="font-size: 1.05rem;"><span style="color: var(--slate-500); font-weight: 500;">${formatearFechaCorta(slot.date)} |</span> ${slot.startTime} - ${endTimeStr} hrs</h4>
                        <p style="margin-top: 0.25rem;">Evaluación Módulo (20 min)</p>
                    </div>
                    <div style="display: flex; gap: 1rem; align-items: center;">
                        ${badge}
                        ${deleteBtn}
                    </div>
                `;
                slotsContainer.appendChild(li);
            });

            // Asignar eliminación
            document.querySelectorAll('.btn-delete-slot').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const slotId = e.target.getAttribute('data-id');
                    if (confirm("¿Estás seguro de que quieres eliminar este horario libre?")) {
                        await deleteDoc(doc(db, "slots", slotId));
                        loadSlots();
                    }
                });
            });
        }
    } catch (error) {
        console.error("Error al cargar slots:", error);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        try {
            const docRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const userData = docSnap.data();

                if (!userData.isTeacher) {
                    alert("Acceso denegado. No tienes permisos de maestro.");
                    window.location.href = 'mapa.html';
                    return;
                }

                // Setup de data global
                currentUser = user;
                currentTeacherProfile = userData;

                // Cargar UI
                document.getElementById('teacher-name').textContent = `Prof. ${userData.name.split(' ')[0]}`;

                const zoomBtn = document.getElementById('zoom-link-display');
                if (userData.teacherProfile && userData.teacherProfile.zoomLink) {
                    zoomBtn.href = userData.teacherProfile.zoomLink;
                    zoomBtn.style.display = 'inline-block';
                }

                // Inicializar Agenda
                await loadSlots();

            } else {
                window.location.href = 'mapa.html';
            }
        } catch (error) {
            console.error("Error comprobando portal de maestros:", error);
            window.location.href = 'mapa.html';
        }
    });
});
