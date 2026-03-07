import { auth, db } from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
    doc, getDoc, collection, getDocs, query, where, limit, orderBy, getCountFromServer, updateDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { sendDiscordNotification } from './discord.js';

const securityOverlay = document.getElementById('security-overlay');
const adminSidebar = document.getElementById('admin-sidebar');
const mobileToggle = document.getElementById('mobile-toggle');

// 📱 Mobile Toggle Logic
mobileToggle.addEventListener('click', () => {
    document.body.classList.toggle('sidebar-open');
});

// 🔒 Security Check
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().isAdmin) {
            securityOverlay.style.display = 'none';
            initDashboard();
        } else {
            console.warn("Unauthorized access attempt.");
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error("Security verification error:", error);
        window.location.href = 'index.html';
    }
});

/**
 * 📊 Initialize Dashboard with sustainable queries
 */
async function initDashboard() {
    try {
        const usersRef = collection(db, 'users');
        const slotsRef = collection(db, 'slots');

        const [usersSnap, slotsSnap] = await Promise.all([
            getDocs(usersRef),
            getDocs(slotsRef)
        ]);

        const allUsers = [];
        usersSnap.forEach(doc => allUsers.push({ id: doc.id, ...doc.data() }));
        const students = allUsers.filter(u => !u.isAdmin && !u.isTeacher);

        // 1. KPI: Total Alumnos
        document.getElementById('kpi-students-count').textContent = students.length;

        // 2. KPI: Ingresos Reales (Calculados por suscripciones y evaluaciones)
        const subscribedCount = students.filter(s => s.isSubscribed).length;
        const bookedSlots = [];
        slotsSnap.forEach(doc => {
            const data = doc.data();
            if (data.status === 'booked') bookedSlots.push(data);
        });

        // Ingresos = (Suscripciones * 300) + (Evaluaciones * 60)
        const totalRevenue = (subscribedCount * 300) + (bookedSlots.length * 60);
        document.getElementById('kpi-revenue-monthly').textContent = `$ ${totalRevenue.toLocaleString()}`;

        // 3. KPI PRO: LTV (Lifetime Value) y Churn
        const ltv = students.length > 0 ? (totalRevenue / students.length).toFixed(2) : 0;
        // Churn simplificado: alumnos con 0 minutos habiendo pasado el periodo de prueba (ej: 0 mins totales)
        const churned = students.filter(s => (s.totalMinutesSpoken || 0) === 0).length;
        const churnRate = students.length > 0 ? ((churned / students.length) * 100).toFixed(1) : 0;

        // Actualizar tendencias visuales con datos PRO (con guardas de seguridad para evitar errores de null)
        const revenueTrend = document.getElementById('kpi-revenue-monthly')?.parentElement?.querySelector('.kpi-trend');
        const studentsTrend = document.getElementById('kpi-students-count')?.parentElement?.querySelector('.kpi-trend');

        if (revenueTrend) revenueTrend.innerHTML = `LTV Promedio: $${ltv}`;
        if (studentsTrend) studentsTrend.innerHTML = `Churn Rate: ${churnRate}%`;

        // 4. KPI: Minutos hoy
        let totalMinutes = 0;
        students.forEach(s => {
            if (s.minutesSpokenToday) totalMinutes += s.minutesSpokenToday;
        });
        document.getElementById('kpi-minutes-today').textContent = totalMinutes;

        // 5. KPI: Evaluaciones Pendientes (Booked slots)
        document.getElementById('kpi-eval-pending').textContent = bookedSlots.length;

        // 6. Alumnos Recientes
        renderRecentStudents(allUsers, students.slice(-5).reverse());

        // 7. Top Referrers
        renderTopReferrers(allUsers, students);

        // 8. Desglose de Minutos
        renderMinutesBreakdown(students);

    } catch (error) {
        console.error("Error loading dashboard data:", error);
        const list = document.getElementById('recent-subs-list');
        if (list) list.innerHTML = `<p style="color:red">Error de carga: ${error.message}</p>`;
    }
}

function renderRecentStudents(allUsers, students) {
    const list = document.getElementById('recent-subs-list');
    if (!list) return;

    if (!students || students.length === 0) {
        list.innerHTML = "<p>No hay alumnos registrados aún.</p>";
        return;
    }

    let html = '<ul style="list-style: none; padding: 0;">';

    students.forEach(student => {
        html += `
            <li style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid var(--slate-200);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="${student.photoURL || '/assets/avatar-placeholder.png'}" style="width: 32px; height: 32px; border-radius: 50%;">
                    <div>
                        <div style="font-weight: 600; color: var(--slate-900);">${student.name || student.email}</div>
                        <div style="font-size: 0.75rem;">Módulo ${student.module || 1} • Lección ${student.lesson || 1}</div>
                    </div>
                </div>
                <button class="btn" onclick="impersonateUser('${student.id}')" style="font-size: 0.7rem; padding: 4px 8px; border: 1px solid var(--slate-200); background: white;">🕵️ Ver como</button>
            </li>
        `;
    });
    html += '</ul>';
    list.innerHTML = html;
}

function renderMinutesBreakdown(students) {
    const list = document.getElementById('minutes-breakdown-list');
    if (!list) return;

    const contributors = students
        .filter(s => (s.minutesSpokenToday || 0) > 0)
        .sort((a, b) => b.minutesSpokenToday - a.minutesSpokenToday);

    if (contributors.length === 0) {
        list.innerHTML = "<p style='font-size: 0.85rem;'>Aún no hay susurros en el bosque hoy.</p>";
        return;
    }

    list.innerHTML = contributors.map(s => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid var(--slate-100);">
            <div style="display: flex; align-items: center; gap: 8px;">
                <img src="${s.photoURL || '/assets/avatar-placeholder.png'}" style="width: 24px; height: 24px; border-radius: 50%;">
                <span style="font-weight: 500; font-size: 0.85rem;">${s.name || s.email}</span>
            </div>
            <span style="background: var(--sky-blue); color: var(--primary-deep); padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">
                +${s.minutesSpokenToday}m
            </span>
        </div>
    `).join('');
}

/**
 * 🕵️ Impersonate Logic
 */
window.impersonateUser = (userId) => {
    if (confirm("¿Quieres visualizar la plataforma como este alumno? (Para soporte técnico)")) {
        localStorage.setItem('impersonate_id', userId);
        window.location.href = 'mapa.html';
    }
};

/**
 * 🛑 Load Technical Reports (Frustration Heatmap)
 */
async function loadTechnicalReports() {
    const tableBody = document.getElementById('technical-reports-body');
    if (!tableBody) return;

    try {
        const reportsRef = collection(db, 'reports');
        const q = query(reportsRef, orderBy('timestamp', 'desc'), limit(100));
        const snap = await getDocs(q);

        if (snap.empty) {
            tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 2rem;">No hay alarmas en el bosque. Todo fluye. 🌲✨</td></tr>';
            return;
        }

        const aggregation = {};
        snap.forEach(doc => {
            const r = doc.data();
            const key = `${r.lessonId}_${r.targetWord}`;
            if (!aggregation[key]) {
                aggregation[key] = {
                    lessonId: r.lessonId,
                    target: r.targetWord,
                    count: 0,
                    lastError: r.lastTranscript || r.reason || 'N/A'
                };
            }
            aggregation[key].count++;
        });

        const sorted = Object.values(aggregation).sort((a, b) => b.count - a.count);

        tableBody.innerHTML = sorted.map(r => `
            <tr style="border-bottom: 1px solid var(--slate-100);">
                <td style="padding: 1rem; font-weight: 600;">${r.lessonId}</td>
                <td style="padding: 1rem;"><code style="background: var(--slate-100); padding: 4px 8px; border-radius: 6px; font-family: monospace;">${r.target}</code></td>
                <td style="padding: 1rem;"><span class="status-badge" style="background: ${r.count > 3 ? '#fee2e2' : '#fef9c3'}; color: ${r.count > 3 ? '#991b1b' : '#854d0e'};">${r.count} fallos</span></td>
                <td style="padding: 1rem; font-size: 0.8rem; color: var(--slate-500); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">"${r.lastError}"</td>
            </tr>
        `).join('');

    } catch (err) {
        console.error("Error loading reports:", err);
    }
}

function renderTopReferrers(allUsers, students) {
    const list = document.getElementById('top-referrers-list');
    if (!list) return;

    const teachers = allUsers.filter(u => u.isTeacher);
    const rankings = teachers.map(t => {
        const count = students.filter(s => s.referredBy === t.teacherProfile?.refCode).length;
        return { name: t.name, count };
    }).sort((a, b) => b.count - a.count).slice(0, 3);

    if (rankings.every(r => r.count === 0)) {
        list.innerHTML = "<p style='font-size: 0.85rem;'>Aún no hay referidos registrados.</p>";
        return;
    }

    list.innerHTML = rankings.map((r, i) => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid var(--slate-100);">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-weight: 700; color: var(--primary-medium); width: 20px;">${i + 1}.</span>
                <span style="font-weight: 600;">${r.name}</span>
            </div>
            <span style="background: var(--sky-blue); color: var(--primary-deep); padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">
                ${r.count} referidos
            </span>
        </div>
    `).join('');
}

// Sidebar Navigation Logic
function switchSection(targetId) {
    // 1. Hide all views
    document.querySelectorAll('.section-view').forEach(view => view.style.display = 'none');
    // 2. Remove active class from all sidebar items
    document.querySelectorAll('.sidebar-item').forEach(item => item.classList.remove('active'));

    // 3. Show target view and set active item
    const targetSection = document.getElementById(`${targetId}-view`);
    if (targetSection) {
        targetSection.style.display = 'block';
        const sidebarLink = document.querySelector(`.sidebar-item[href="#${targetId}"]`);
        if (sidebarLink) sidebarLink.classList.add('active');
    }

    // 4. Load specific section data
    if (targetId === 'students') {
        loadStudents();
    } else if (targetId === 'teachers') {
        loadTeachers();
    } else if (targetId === 'finances') {
        loadFinances();
    } else if (targetId === 'overview') {
        initDashboard();
    } else if (targetId === 'technical') {
        loadTechnicalReports();
    }

    // 5. Close sidebar on mobile after click
    document.body.classList.remove('sidebar-open');
}

// Button Dashboard Refresh
document.getElementById('refresh-dashboard')?.addEventListener('click', initDashboard);

// Escuchar cambios en la URL (hash)
window.addEventListener('hashchange', () => {
    const target = window.location.hash.substring(1) || 'overview';
    switchSection(target);
});

// Carga inicial basada en el hash
const initialSection = window.location.hash.substring(1) || 'overview';
switchSection(initialSection);

/**
 * 💰 Finances and Payouts Logic
 */
async function loadFinances() {
    const tableBody = document.getElementById('finances-table-body');
    const mfFundsEl = document.getElementById('kpi-mf-funds');
    const pendingPayoutEl = document.getElementById('kpi-pending-payout');
    const teachersReadyEl = document.getElementById('kpi-teachers-ready');

    try {
        const usersRef = collection(db, 'users');
        const slotsRef = collection(db, 'slots');

        const [usersSnap, slotsSnap] = await Promise.all([
            getDocs(usersRef),
            getDocs(slotsRef)
        ]);

        const allUsers = [];
        usersSnap.forEach(doc => allUsers.push({ id: doc.id, ...doc.data() }));
        const teachers = allUsers.filter(u => u.isTeacher);
        const students = allUsers.filter(u => !u.isTeacher && !u.isAdmin);
        const bookedSlots = [];
        slotsSnap.forEach(doc => {
            if (doc.data().status === 'booked') bookedSlots.push(doc.data());
        });

        let totalPending = 0;
        let totalMFFunds = 0;
        let readyCount = 0;

        const rowsHtml = teachers.map(teacher => {
            const teacherRefCode = teacher.teacherProfile?.refCode;
            const tBookedSlots = bookedSlots.filter(s => s.teacherId === teacher.id).length;
            const teacherReferrals = teacherRefCode ? students.filter(s => s.referredBy === teacherRefCode).length : 0;

            // Earnings: $50 per ref + $30 per evaluation
            // MF Commission: (User pays $60 - Teacher gets $30) = $30 per evaluation
            const earned = (teacherReferrals * 50) + (tBookedSlots * 30);
            const mfCommission = tBookedSlots * 30; // 50% de las evaluaciones
            const subscribedMFFunds = students.filter(s => s.isSubscribed).length * 300; // Esto es ingreso bruto MF

            totalPending += earned;
            totalMFFunds += mfCommission;
            if (earned >= 300) readyCount++;

            return `
                <tr style="border-bottom: 1px solid var(--slate-50);">
                    <td style="padding: 1rem;">
                        <div style="font-weight: 600;">${teacher.name || 'Sin nombre'}</div>
                        <div style="font-size: 0.7rem; color: var(--slate-500);">${teacher.email}</div>
                    </td>
                    <td style="padding: 1rem; font-weight: 700;">$${earned.toFixed(2)}</td>
                    <td style="padding: 1rem;">
                        <span class="status-badge ${earned >= 300 ? 'badge-active' : 'badge-pending'}">
                            ${earned >= 300 ? 'Umbral Superado' : 'Mínimo: $300'}
                        </span>
                    </td>
                    <td style="padding: 1rem;">
                        <button class="btn" style="padding: 0.25rem 0.75rem; font-size: 0.75rem; background: ${earned >= 300 ? 'var(--primary-deep)' : 'var(--slate-200)'}; color: ${earned >= 300 ? 'white' : 'var(--slate-500)'}; border: none;" 
                                ${earned < 300 ? 'disabled' : ''} onclick="window.markAsPaid('${teacher.id}', '${teacher.name}', ${earned})">
                            Marcar Pagado
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        tableBody.innerHTML = rowsHtml;
        mfFundsEl.textContent = `$${(totalMFFunds + (students.filter(s => s.isSubscribed).length * 300)).toLocaleString()}`;
        pendingPayoutEl.textContent = `$${totalPending.toLocaleString()}`;
        teachersReadyEl.textContent = readyCount;

    } catch (error) {
        console.error("Error cargando finanzas:", error);
        tableBody.innerHTML = `<tr><td colspan="4" style="color:red; text-align:center;">Error: ${error.message}</td></tr>`;
    }
}

/**
 * 💸 Marcar como pagado y enviar notificación de Moon
 */
window.markAsPaid = async (teacherId, teacherName, amount) => {
    const confirmation = await Swal.fire({
        title: '¿Confirmar Pago?',
        text: `¿Has transferido $${amount.toFixed(2)} a ${teacherName}? Moon le enviará un aviso de inmediato.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, enviar notificación',
        cancelButtonText: 'No todavía',
        confirmButtonColor: '#059669'
    });

    if (confirmation.isConfirmed) {
        try {
            // 1. Obtener Discord ID del maestro
            const teacherRef = doc(db, 'users', teacherId);
            const snap = await getDoc(teacherRef);
            const teacherData = snap.data();
            const discordId = teacherData?.teacherProfile?.discordId;

            if (discordId) {
                await sendDiscordNotification(
                    "💰 ¡Pago Recibido!",
                    `¡Hola Prof. ${teacherName.split(' ')[0]}!\n\nTu pago semanal ha sido procesado por **$${amount.toFixed(2)} MXN**.\n\n¡Gracias por tu gran trabajo en Moonsforest! 🌲✨`,
                    3066993, // Verde
                    discordId
                );

                Swal.fire('¡Éxito!', 'Pago registrado y notificación enviada a Moon.', 'success');
            } else {
                Swal.fire('Aviso', 'Pago simulado con éxito, pero el maestro no tiene Discord ID configurado.', 'info');
            }
        } catch (err) {
            console.error("Error al procesar pago:", err);
            Swal.fire('Error', 'No pudimos procesar el comando.', 'error');
        }
    }
};

/**
 * ✅ Certificar Maestro
 */
window.certifyTeacher = async (teacherId, teacherName, discordId) => {
    const confirmation = await Swal.fire({
        title: `¿Certificar a ${teacherName.split(' ')[0]}?`,
        text: 'Moon le enviará un DM de felicitación y quedará visible en el marketplace.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: '✅ Sí, certificar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#059669'
    });

    if (!confirmation.isConfirmed) return;

    try {
        // 1. Actualizar en Firestore
        const userRef = doc(db, 'users', teacherId);
        const teacherRef = doc(db, 'teachers', teacherId);
        // Use setDoc+merge so it works even if the public 'teachers' doc doesn't exist yet
        const { setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        await Promise.all([
            updateDoc(userRef, { certified: true }),
            setDoc(teacherRef, { certified: true }, { merge: true })
        ]);

        // 2. Mandar DM de Moon si tiene Discord
        if (discordId) {
            await sendDiscordNotification(
                '🌟 ¡Felicidades! Eres Guardiano Certificado',
                `¡Hola Prof. ${teacherName.split(' ')[0]}!\n\nEl equipo de **Moonsforest** ha revisado tu entrevista y estamos felices de darte la bienvenida oficial.\n\n✅ Tu perfil ahora es **visible para los alumnos** en el marketplace.\n📝 Abre tus horarios en tu agenda y empieza a recibir evaluaciones.\n\n¡Gracias por unirte al bosque! 🌲✨`,
                3066993, // Verde
                discordId
            );
        }

        await Swal.fire('¡Certificado!', `${teacherName.split(' ')[0]} ahora es un Guardiano Certificado. ${discordId ? 'Moon le aviso por Discord.' : 'No tiene Discord configurado.'}`, 'success');
        loadTeachers(); // Refrescar tabla

    } catch (err) {
        console.error('Error al certificar maestro:', err);
        Swal.fire('Error', 'No se pudo certificar al maestro.', 'error');
    }
};

/**
 * ❌ Rechazar Maestro
 */
window.rejectTeacher = async (teacherId, teacherName, discordId) => {
    const { value: reason, isConfirmed } = await Swal.fire({
        title: `Rechazar a ${teacherName.split(' ')[0]}`,
        input: 'textarea',
        inputLabel: 'Motivo (opcional, se incluirá en el DM de Moon):',
        inputPlaceholder: 'Ej: Tu nivel de inglés aún no cumple el estándar necesario para evaluar niños...',
        inputAttributes: { rows: 3 },
        showCancelButton: true,
        confirmButtonText: '🚫 Rechazar y notificar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#dc2626'
    });

    if (!isConfirmed) return;

    try {
        const defaultReason = 'Tu nivel de inglés actual no cumple el estándar que necesitamos para garantizar la mejor experiencia a nuestros alumnos.';
        const finalReason = reason?.trim() || defaultReason;

        // 2. Mandar DM de Moon si tiene Discord
        if (discordId) {
            await sendDiscordNotification(
                '🌲 Actualización sobre tu solicitud en Moonsforest',
                `¡Hola Prof. ${teacherName.split(' ')[0]}!\n\nGracias por tomarte el tiempo de grabar tu entrevista y por tu interés en unirte a nuestro equipo.\n\nDespues de revisar tu video de forma personal, hemos decidido no continuar con tu solicitud en este momento.\n\n💬 *${finalReason}*\n\nTe animamos a seguir practicando y a volver a aplicar más adelante. ¡Las puertas del bosque siempre estarán abiertas! 🌲`,
                15158332, // Rojo amable
                discordId
            );
            await Swal.fire('¡Notificado!', `Moon le mandó el mensaje a ${teacherName.split(' ')[0]} por Discord.`, 'info');
        } else {
            await Swal.fire('Sin Discord', `${teacherName.split(' ')[0]} no tiene Discord configurado. Contáctalo manualmente.`, 'warning');
        }

        loadTeachers();

    } catch (err) {
        console.error('Error al rechazar maestro:', err);
        Swal.fire('Error', 'No se pudo enviar la notificación.', 'error');
    }
};

/**
 * 👩‍🏫 Teachers Management Logic
 */
async function loadTeachers() {
    const tableBody = document.getElementById('teachers-table-body');
    const teachersCountEl = document.getElementById('kpi-teachers-count');
    const slotsWeekEl = document.getElementById('kpi-slots-week');

    try {
        // 1. Fetch data
        const usersRef = collection(db, 'users');
        const slotsRef = collection(db, 'slots');

        const [usersSnap, slotsSnap] = await Promise.all([
            getDocs(usersRef),
            getDocs(slotsRef)
        ]);

        const allUsers = [];
        usersSnap.forEach(doc => allUsers.push({ id: doc.id, ...doc.data() }));

        const teachers = allUsers.filter(u => u.isTeacher);
        const students = allUsers.filter(u => !u.isTeacher && !u.isAdmin);
        const slots = [];
        slotsSnap.forEach(doc => slots.push(doc.data()));

        teachersCountEl.textContent = teachers.length;
        slotsWeekEl.textContent = slots.length;

        // 2. Process stats per teacher
        tableBody.innerHTML = teachers.map(teacher => {
            const teacherRefCode = teacher.teacherProfile?.refCode;
            const teacherSlots = slots.filter(s => s.teacherId === teacher.id);
            const openSlots = teacherSlots.filter(s => s.status === 'available').length;
            const bookedSlots = teacherSlots.filter(s => s.status === 'booked').length;
            const teacherReferrals = teacherRefCode ? students.filter(s => s.referredBy === teacherRefCode).length : 0;
            const referralEarnings = teacherReferrals * 50;
            const evalEarnings = bookedSlots * 30;
            const totalEst = referralEarnings + evalEarnings;

            const isCertified = teacher.certified === true;
            const discordId = teacher.teacherProfile?.discordId || null;
            const loomLink = teacher.teacherProfile?.loomInterview || null;

            const certBadge = isCertified
                ? `<span style="background:#dcfce7; color:#166534; padding: 3px 10px; border-radius: 99px; font-size: 0.72rem; font-weight: 700;">\u2705 Certificado</span>`
                : `<span style="background:#fef9c3; color:#854d0e; padding: 3px 10px; border-radius: 99px; font-size: 0.72rem; font-weight: 700;">\u23f3 Pendiente</span>`;

            const loomBtn = loomLink
                ? `<a href="${loomLink}" target="_blank" style="font-size: 0.72rem; color: #2563eb; font-weight: 600; text-decoration: none;">🎙️ Ver Loom</a>`
                : `<span style="font-size: 0.72rem; color: #94a3b8;">Sin video</span>`;

            return `
                <tr style="border-bottom: 1px solid var(--slate-50);">
                    <td style="padding: 1rem;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <img src="${teacher.photoURL || '/assets/avatar-placeholder.png'}" style="width: 36px; height: 36px; border-radius: 50%;">
                            <div>
                                <div style="font-weight: 600; color: var(--slate-900);">${teacher.name || 'Sin nombre'}</div>
                                <div style="font-size: 0.75rem; color: var(--slate-500);">${teacher.email}</div>
                            </div>
                        </div>
                    </td>
                    <td style="padding: 1rem; text-align: center;">
                        <div>${certBadge}</div>
                        <div style="margin-top: 6px;">${loomBtn}</div>
                    </td>
                    <td style="padding: 1rem; text-align: center;">${openSlots}</td>
                    <td style="padding: 1rem; text-align: center;">${bookedSlots}</td>
                    <td style="padding: 1rem; text-align: center;">${teacherReferrals}</td>
                    <td style="padding: 1rem; font-weight: 600; color: #10b981;">$${totalEst.toFixed(2)}</td>
                    <td style="padding: 1rem;">
                        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                            ${!isCertified
                    ? `<button class="btn" style="padding: 0.2rem 0.6rem; font-size: 0.68rem; background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; font-weight: 700;"
                                        onclick="certifyTeacher('${teacher.id}', '${teacher.name}', '${discordId}')">\u2705 Aprobar</button>
                                   <button class="btn" style="padding: 0.2rem 0.6rem; font-size: 0.68rem; background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; font-weight: 700;"
                                        onclick="rejectTeacher('${teacher.id}', '${teacher.name}', '${discordId}')">\u274c Rechazar</button>`
                    : `<span style="font-size: 0.72rem; color: #94a3b8;">Activo</span>`
                }
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error("Error cargando maestros:", error);
        tableBody.innerHTML = `<tr><td colspan="7" style="color:red; text-align:center;">Error: ${error.message}</td></tr>`;
    }
}

/**
 * 🎒 Students Management Logic
 */
async function loadStudents() {
    const tableBody = document.getElementById('students-table-body');
    const searchInput = document.getElementById('search-student');

    try {
        const usersRef = collection(db, 'users');
        const snap = await getDocs(usersRef);

        let allStudents = [];
        snap.forEach(doc => {
            const data = doc.data();
            if (!data.isAdmin && !data.isTeacher) {
                allStudents.push({ id: doc.id, ...data });
            }
        });

        const renderTable = (list) => {
            if (list.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="6" style="padding:2rem; text-align:center;">No se encontraron alumnos.</td></tr>';
                return;
            }

            tableBody.innerHTML = list.map(student => `
                <tr style="border-bottom: 1px solid var(--slate-50); hover: background: var(--slate-50);">
                    <td style="padding: 1rem;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <img src="${student.photoURL || '/assets/avatar-placeholder.png'}" style="width: 36px; height: 36px; border-radius: 50%;">
                            <div>
                                <div style="font-weight: 600; color: var(--slate-900);">${student.name || 'Sin nombre'}</div>
                                <div style="font-size: 0.75rem; color: var(--slate-500);">${student.email}</div>
                            </div>
                        </div>
                    </td>
                    <td style="padding: 1rem;">
                        <span style="font-size: 0.85rem; background: var(--sky-blue); color: var(--primary-deep); padding: 2px 8px; border-radius: 4px;">
                            M${student.module || 1} L${student.lesson || 1}
                        </span>
                    </td>
                    <td style="padding: 1rem; font-weight: 600;">${student.minutesSpokenToday || 0}m</td>
                    <td style="padding: 1rem;">${student.totalMinutesSpoken || 0}m</td>
                    <td style="padding: 1rem;">
                        <span class="status-badge ${student.isSubscribed ? 'badge-active' : 'badge-pending'}">
                            ${student.isSubscribed ? 'Activo' : 'Prueba'}
                        </span>
                    </td>
                    <td style="padding: 1rem; display: flex; gap: 4px;">
                        <button class="btn" style="padding: 0.25rem 0.75rem; font-size: 0.75rem; border: 1px solid var(--slate-300);" 
                                onclick="alert('Detalle de ${student.id}')">Ficha</button>
                        <button class="btn" onclick="impersonateUser('${student.id}')" style="padding: 0.25rem 0.75rem; font-size: 0.75rem; background: var(--slate-100);">🕵️</button>
                    </td>
                </tr>
            `).join('');
        };

        renderTable(allStudents);

        // Búsqueda en tiempo real
        searchInput.oninput = (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = allStudents.filter(s =>
                (s.name && s.name.toLowerCase().includes(term)) ||
                (s.email && s.email.toLowerCase().includes(term))
            );
            renderTable(filtered);
        };

    } catch (error) {
        console.error("Error cargando alumnos:", error);
        tableBody.innerHTML = `<tr><td colspan="6" style="color:red; text-align:center;">Error: ${error.message}</td></tr>`;
    }
}
