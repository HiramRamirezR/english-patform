import { auth, db } from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, collection, addDoc, query, where, getDocs, deleteDoc, serverTimestamp, setDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
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

// Centro de Evaluación
const evalModal = document.getElementById('eval-center-modal');
const closeEvalBtn = document.getElementById('close-eval-modal');
const evalStudentName = document.getElementById('eval-student-name');
const evalModuleTitle = document.getElementById('eval-module-title');
const evalVocabList = document.getElementById('eval-vocab-list');
const evalConvList = document.getElementById('eval-conv-list');
const evalForm = document.getElementById('eval-submission-form');
const evalComments = document.getElementById('eval-comments');
const btnPass = document.getElementById('btn-eval-pass');
const btnFail = document.getElementById('btn-eval-fail');
const submitEvalBtn = document.getElementById('submit-eval-btn');

let currentEvalSlot = null;
let evalResult = null; // 'pass' or 'fail'

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
            Swal.fire({
                title: 'Agenda Actualizada',
                html: `✅ Se crearon <b>${savedCount}</b> horarios.<br>⚠️ Se omitieron <b>${skippedCount}</b> porque ya tenías disponibilidad en esos rangos.`,
                icon: 'info',
                confirmButtonColor: '#2563eb'
            });
        } else if (savedCount > 0) {
            Swal.fire({
                title: '¡Éxito!',
                text: `Se han abierto ${savedCount} bloques de evaluación correctamente.`,
                icon: 'success',
                confirmButtonColor: '#059669'
            });
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
        Swal.fire('Error', 'Ocurrió un error al guardar tu disponibilidad comercial.', 'error');
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

                const isBooked = slot.status === 'booked';
                const badge = !isBooked
                    ? `<span class="badge-pending" style="background: white; border: 1px solid #fcd34d;">Libre</span>`
                    : `<span class="badge-booked" style="background: #10b981; color: white;">Ocupado</span>`;

                const studentDetails = isBooked ? `
                    <div style="margin-top: 0.6rem; display: flex; align-items: center; gap: 0.6rem; background: rgba(255,255,255,0.6); padding: 0.5rem; border-radius: 10px; border: 1px solid rgba(16, 185, 129, 0.2);">
                        <span style="font-size: 1.4rem;">${slot.studentAvatar || '👤'}</span>
                        <div style="line-height: 1.2;">
                            <p style="font-size: 0.85rem; font-weight: 700; color: var(--slate-900);">${slot.studentName || 'Estudiante'}</p>
                            <p style="font-size: 0.7rem; color: var(--slate-500);">${slot.studentEmail || ''}</p>
                            <p style="font-size: 0.75rem; color: #065f46; font-weight: 700; margin-top: 0.2rem;">🎯 ${slot.evaluationType || 'Evaluación General'}</p>
                        </div>
                    </div>
                    <button class="btn btn-primary" onclick="window.enterEvaluation('${slot.id}')" style="width: 100%; margin-top: 0.5rem; font-size: 0.8rem; padding: 0.5rem;">Evaluar Alumno</button>
                ` : `<p style="margin-top: 0.25rem; font-size: 0.85rem; color: var(--slate-500);">Evaluación Módulo (20 min)</p>`;

                let deleteBtn = !isBooked
                    ? `<button class="btn btn-delete-slot" data-id="${slot.id}" style="border: 1px solid rgba(225, 29, 72, 0.3); color: #e11d48; padding: 0.4rem 0.8rem; font-size: 0.8rem; background: white; cursor: pointer; transition: all 0.2s; border-radius: 8px;">✖</button>`
                    : ``;

                li.innerHTML = `
                    <div class="slot-info" style="flex: 1;">
                        <h4 style="font-size: 1.05rem;"><span style="color: var(--slate-500); font-weight: 500;">${formatearFechaCorta(slot.date)} |</span> ${slot.startTime} - ${endTimeStr} hrs</h4>
                        ${studentDetails}
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
                    const slotId = e.currentTarget.getAttribute('data-id');

                    const result = await Swal.fire({
                        title: '¿Eliminar horario?',
                        text: "Esta acción no se puede deshacer.",
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#ef4444',
                        cancelButtonColor: '#64748b',
                        confirmButtonText: 'Sí, eliminar',
                        cancelButtonText: 'Cancelar'
                    });

                    if (result.isConfirmed) {
                        try {
                            await deleteDoc(doc(db, "slots", slotId));
                            loadSlots();
                        } catch (error) {
                            Swal.fire('Error', 'No se pudo eliminar el slot.', 'error');
                        }
                    }
                });
            });
        }
    } catch (error) {
        console.error("Error al cargar slots:", error);
    }
};

// Función para cargar los estudiantes referidos
const loadReferredStudents = async (refCode) => {
    if (!refCode) return;

    try {
        const usersCol = collection(db, "users");
        const qUsers = query(usersCol, where("referredBy", "==", refCode));

        const querySnapshot = await getDocs(qUsers);
        const referredListEl = document.getElementById('referred-list');
        const emptyMsgEl = document.getElementById('empty-referred-msg');

        if (querySnapshot.empty) {
            emptyMsgEl.style.display = 'block';
            referredListEl.style.display = 'none';
        } else {
            emptyMsgEl.style.display = 'none';
            referredListEl.style.display = 'block';
            referredListEl.innerHTML = '';

            querySnapshot.forEach((doc) => {
                const userData = doc.data();
                const li = document.createElement('li');
                li.className = 'slot-item';
                li.style.borderLeft = '5px solid #10b981'; // Verde distintivo
                li.style.backgroundColor = '#ecfdf5';

                // Formatear fecha de registro
                let dateStr = 'Fecha desconocida';
                if (userData.createdAt && userData.createdAt.toDate) {
                    dateStr = userData.createdAt.toDate().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
                }

                li.innerHTML = `
                    <div class="slot-info">
                        <h4 style="font-size: 1.05rem;">
                            <span style="font-size: 1.2rem; margin-right: 0.5rem;">${userData.photoURL ? `<img src="${userData.photoURL}" style="width:24px; border-radius:50%; vertical-align:middle;">` : '👤'}</span>
                            ${userData.name || 'Estudiante'}
                        </h4>
                        <p style="margin-top: 0.25rem;">Registrado el: ${dateStr}</p>
                        ${userData.email ? `<p style="font-size: 0.75rem; margin-top: 0.2rem; color: var(--slate-400);">${userData.email}</p>` : ''}
                    </div>
                    <div style="text-align: right;">
                        <span class="badge-booked" style="background:#10b981; color:white;">Activo</span>
                    </div>
                `;
                referredListEl.appendChild(li);
            });
        }

        // Actualizar UI de Ganancias
        const refCount = querySnapshot.size;
        const refEarning = refCount * 50;

        const refCountEl = document.getElementById('ref-count');
        const refEarningsEl = document.getElementById('ref-earnings');
        const totalEarningsEl = document.getElementById('total-earnings');

        if (refCountEl) refCountEl.textContent = refCount;
        if (refEarningsEl) refEarningsEl.textContent = refEarning.toFixed(2);

        // Mock de evaluaciones por el momento en 0
        const evalEarnings = 0 * 50;

        if (totalEarningsEl) {
            totalEarningsEl.textContent = (refEarning + evalEarnings).toFixed(2);
        }

    } catch (error) {
        console.error("Error al cargar referidos:", error);
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

                // Crear código de referido si no lo tiene configurado (Backward compatibility)
                if (userData.teacherProfile && !userData.teacherProfile.refCode) {
                    const base = userData.name ? userData.name.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '') : 'MF';
                    const fallbackRefCode = base + Math.floor(1000 + Math.random() * 9000);

                    await setDoc(docRef, {
                        teacherProfile: {
                            ...userData.teacherProfile,
                            refCode: fallbackRefCode
                        }
                    }, { merge: true });

                    userData.teacherProfile.refCode = fallbackRefCode;
                }

                // Cargar UI
                document.getElementById('teacher-name').textContent = `Prof. ${userData.name.split(' ')[0]}`;

                const zoomBtn = document.getElementById('zoom-link-display');
                if (userData.teacherProfile && userData.teacherProfile.zoomLink) {
                    zoomBtn.href = userData.teacherProfile.zoomLink;
                    zoomBtn.style.display = 'inline-block';
                }

                // Referidos UI
                const refLinkDisplay = document.getElementById('ref-link-display');
                const copyRefBtn = document.getElementById('copy-ref-btn');
                if (refLinkDisplay && userData.teacherProfile && userData.teacherProfile.refCode) {
                    const uniqueLink = `${window.location.origin}/index.html?ref=${userData.teacherProfile.refCode}`;
                    refLinkDisplay.value = uniqueLink;

                    copyRefBtn.addEventListener('click', () => {
                        navigator.clipboard.writeText(uniqueLink).then(() => {
                            copyRefBtn.textContent = '¡Enlace copiado!';
                            copyRefBtn.style.background = '#059669'; // Verde success
                            setTimeout(() => {
                                copyRefBtn.textContent = 'Copiar mi enlace único';
                                copyRefBtn.style.background = '#fbbf24';
                            }, 3000);
                        });
                    });
                }

                // Inicializar Agenda
                await loadSlots();

                // Cargar referidos
                if (userData.teacherProfile && userData.teacherProfile.refCode) {
                    await loadReferredStudents(userData.teacherProfile.refCode);
                }

            } else {
                window.location.href = 'mapa.html';
            }
        } catch (error) {
            console.error("Error comprobando portal de maestros:", error);
            window.location.href = 'mapa.html';
        }
    });
});
// --- Lógica del Centro de Evaluación ---

window.enterEvaluation = async (slotId) => {
    try {
        Swal.fire({ title: 'Cargando datos...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        const slotSnap = await getDoc(doc(db, 'slots', slotId));
        if (!slotSnap.exists()) return;
        currentEvalSlot = { id: slotSnap.id, ...slotSnap.data() };

        // 1. Preparar UI básica
        evalStudentName.textContent = `Estudiante: ${currentEvalSlot.studentName || 'Cargando...'}`;
        evalModal.style.display = 'flex';
        evalVocabList.innerHTML = 'Cargando...';
        evalConvList.innerHTML = 'Cargando...';
        evalComments.value = '';
        evalResult = null;
        updateEvalButtons();

        // 2. Determinar Módulo (Basado en el tipo de evaluación)
        let moduleId = 'm1'; // Default
        if (currentEvalSlot.evaluationType?.includes('2')) moduleId = 'm2';

        // 3. Cargar Datos del Módulo
        const response = await fetch(`/data/${moduleId}.json`);
        const moduleData = await response.json();

        evalModuleTitle.textContent = moduleData.title || `Guía del Módulo ${moduleId.toUpperCase()}`;

        // 4. Extraer Vocabulario (Cards de listen_click)
        const vocab = new Set();
        moduleData.lessons.forEach(lesson => {
            lesson.steps.forEach(step => {
                if (step.type === 'listen_click' && step.cards) {
                    step.cards.forEach(c => vocab.add(`${c.word} (${c.translation})`));
                }
            });
        });

        evalVocabList.innerHTML = Array.from(vocab).slice(0, 15).map(v => `
            <span style="background: white; border: 1px solid var(--slate-200); padding: 4px 10px; border-radius: 99px; font-size: 0.8rem; color: var(--slate-700);">${v}</span>
        `).join('');

        // 5. Extraer Conversaciones (Drag & Drop targets)
        const convs = [];
        moduleData.lessons.forEach(lesson => {
            lesson.steps.forEach(step => {
                if (step.type === 'drag_and_drop' && step.target) {
                    convs.push({ target: step.target, prompt: step.prompt });
                }
            });
        });

        evalConvList.innerHTML = convs.slice(0, 6).map(c => `
            <div style="background: white; border: 1px solid var(--slate-100); padding: 0.8rem; border-radius: 12px;">
                <p style="font-size: 0.75rem; color: var(--slate-500); margin-bottom: 0.25rem;">Contexto: ${c.prompt}</p>
                <p style="font-size: 0.95rem; font-weight: 600; color: var(--slate-800);">"${c.target}"</p>
            </div>
        `).join('');

        Swal.close();
    } catch (error) {
        console.error("Error al abrir centro de evaluación:", error);
        Swal.fire('Error', 'No pudimos cargar los datos de la evaluación.', 'error');
    }
};

const updateEvalButtons = () => {
    btnPass.style.background = evalResult === 'pass' ? '#059669' : 'white';
    btnPass.style.color = evalResult === 'pass' ? 'white' : '#059669';

    btnFail.style.background = evalResult === 'fail' ? '#ef4444' : 'white';
    btnFail.style.color = evalResult === 'fail' ? 'white' : '#ef4444';

    submitEvalBtn.disabled = !evalResult;
};

btnPass.onclick = () => { evalResult = 'pass'; updateEvalButtons(); };
btnFail.onclick = () => { evalResult = 'fail'; updateEvalButtons(); };

evalForm.onsubmit = async (e) => {
    e.preventDefault();
    if (!evalResult || !currentEvalSlot) return;

    try {
        submitEvalBtn.disabled = true;
        submitEvalBtn.textContent = 'Enviando...';

        const rubric = Array.from(document.querySelectorAll('input[name="rubric"]:checked')).map(i => i.value);
        const comments = evalComments.value;
        const moduleId = currentEvalSlot.evaluationType?.includes('2') ? 'm2' : 'm1';
        const nextModule = moduleId === 'm1' ? 'm2' : (moduleId === 'm2' ? 'm3' : null);

        // 1. Actualizar Slot
        const slotRef = doc(db, 'slots', currentEvalSlot.id);
        await updateDoc(slotRef, {
            status: 'completed',
            evaluationResult: {
                result: evalResult,
                rubric,
                comments,
                evaluatedAt: serverTimestamp()
            }
        });

        // 2. Actualizar Estudiante
        const studentRef = doc(db, 'users', currentEvalSlot.studentId);
        const updateData = {
            evaluations: arrayUnion({
                moduleId,
                result: evalResult,
                comments,
                date: new Date()
            })
        };

        if (evalResult === 'pass' && nextModule) {
            updateData.unlockedModules = arrayUnion(nextModule);
        }

        await updateDoc(studentRef, updateData);

        // 3. Notificar Discord
        sendDiscordNotification(
            evalResult === 'pass' ? "🎉 Evaluación APROBADA" : "⚠️ Evaluación - Refuerzo Necesario",
            `**Alumno:** ${currentEvalSlot.studentName}\n**Módulo:** ${moduleId}\n**Resultado:** ${evalResult.toUpperCase()}\n**Comentarios:** ${comments}`,
            evalResult === 'pass' ? 3066993 : 15158332
        );

        await Swal.fire('¡Éxito!', 'El resultado ha sido guardado y el alumno ha sido notificado.', 'success');
        evalModal.style.display = 'none';
        loadSlots(); // Recargar agenda

    } catch (error) {
        console.error("Error al enviar evaluación:", error);
        Swal.fire('Error', 'No se pudo guardar el resultado.', 'error');
        submitEvalBtn.disabled = false;
        submitEvalBtn.textContent = 'Enviar Resultado';
    }
};

closeEvalBtn.onclick = () => {
    evalModal.style.display = 'none';
};

// Cerrar al hacer clic fuera
window.onclick = (event) => {
    if (event.target === evalModal) {
        evalModal.style.display = 'none';
    }
};
