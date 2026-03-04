import { auth, db, handleLogin, logout } from '../auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const renderHeader = (user, userData = null) => {
    const headerContainer = document.getElementById('main-header');
    if (!headerContainer) return;

    let navLinks = '';

    if (user) {
        // Usuario Autenticado
        let teacherBtn = '';
        if (userData && userData.isTeacher) {
            const isTeacherView = window.location.pathname.includes('teacher.html');
            const targetUrl = isTeacherView ? 'mapa.html' : 'teacher.html';
            const btnText = isTeacherView ? 'Cambiar a Alumno' : 'Cambiar a Maestro';

            teacherBtn = `<a href="${targetUrl}" class="btn btn-accent" style="padding: 0.5rem 1rem; font-size: 0.8rem; margin-right: 0.5rem;">${btnText}</a>`;
        }

        let evaluateBtn = '';
        const isTeacherView = window.location.pathname.includes('teacher.html');

        if (!userData || !isTeacherView) {
            // Lógica para determinar el tipo de evaluación
            const completedLessons = userData?.completedLessons || [];

            // Encontrar el módulo más alto alcanzado que esté completo (lección 20)
            const modules = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10'];
            let latestModuleFinished = null;

            for (const modId of modules) {
                if (completedLessons.includes(`${modId}l20`)) {
                    latestModuleFinished = modId;
                }
            }

            const btnLabel = latestModuleFinished ? `Certificar Módulo ${latestModuleFinished.replace('m', '')} ($60)` : `Salto de Nivel ($60)`;
            const evalType = latestModuleFinished ? `Certificación Módulo ${latestModuleFinished.replace('m', '')}` : `Salto de Nivel (Fast-Track)`;

            evaluateBtn = `<button id="evaluate-btn" data-type="${evalType}" data-mod="${latestModuleFinished || ''}" class="btn" style="background-color: var(--accent-warm); color: var(--slate-900); padding: 0.5rem 1rem; font-size: 0.8rem; font-weight: 600; border: none; box-shadow: 0 4px 6px -1px rgba(251, 146, 60, 0.4);">${btnLabel}</button>`;
        }

        let adminLink = '';
        if (userData && userData.isAdmin) {
            adminLink = `<a href="admin.html" style="color: var(--accent-orange); text-decoration: none; font-weight: 700; border: 1px solid var(--accent-orange); padding: 0.2rem 0.6rem; border-radius: 6px;">Admin</a>`;
        }

        navLinks = `
            ${evaluateBtn}
            ${teacherBtn}
            ${adminLink}
            <a href="index.html" style="color: var(--slate-700); text-decoration: none; font-weight: 500;">Home</a>
            <a href="mapa.html" style="color: var(--slate-700); text-decoration: none; font-weight: 500;">Mapa</a>
            <a href="profile.html" style="color: var(--slate-700); text-decoration: none; font-weight: 500;">Perfil</a>
            <button class="btn" id="header-logout-btn" style="border: 1px solid var(--slate-300); color: var(--slate-500); padding: 0.5rem 1rem; font-size: 0.9rem; background: transparent; transition: all 0.2s;">Cerrar Sesión</button>
        `;
    } else {
        // Visitante
        navLinks = `
            <a href="index.html" style="color: var(--slate-700); text-decoration: none; font-weight: 500;">Home</a>
            <button class="btn btn-primary" id="header-login-btn" style="padding: 0.5rem 1.5rem; font-size: 0.9rem;">Iniciar Sesión</button>
        `;
    }

    headerContainer.innerHTML = `
        <header style="background: var(--white); box-shadow: var(--shadow-sm); position: sticky; top: 0; z-index: 1000; width: 100%;">
            <nav class="container" style="display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; max-width: 1200px; margin: 0 auto;">
                <div class="logo">
                    <a href="index.html" style="text-decoration: none; color: var(--primary-deep); font-weight: 700; font-size: 1.25rem;">🌲 Moonsforest</a>
                </div>
                <div class="nav-links" style="display: flex; gap: 1.5rem; align-items: center;">
                    ${navLinks}
                </div>
            </nav>
        </header>
    `;

    // Asignar Event Listeners después de renderizar el HTML
    const loginBtn = document.getElementById('header-login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogin();
        });
    }

    const logoutBtn = document.getElementById('header-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }

    const evaluateBtnEl = document.getElementById('evaluate-btn');
    if (evaluateBtnEl) {
        evaluateBtnEl.addEventListener('click', () => {
            window.location.href = 'evaluacion.html';
        });
    }
};

// Renderizar inmediatamente estado "Visitante" para evitar parpadeos
renderHeader(null);

// Escuchar los cambios de Auth de Firebase para redibujar el header
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const docRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                renderHeader(user, docSnap.data());
            } else {
                renderHeader(user, null);
            }
        } catch (error) {
            console.error("Error al obtener datos del usuario:", error);
            renderHeader(user, null);
        }
    } else {
        renderHeader(null);
    }
});
