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
            teacherBtn = `<a href="teacher.html" class="btn btn-accent" style="padding: 0.5rem 1rem; font-size: 0.8rem; margin-right: 0.5rem;">Cambiar a Maestro</a>`;
        }

        navLinks = `
            ${teacherBtn}
            <a href="index.html" style="color: var(--slate-700); text-decoration: none; font-weight: 500;">Home</a>
            <a href="dashboard.html" style="color: var(--slate-700); text-decoration: none; font-weight: 500;">Dashboard</a>
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
                    <a href="index.html" style="text-decoration: none; color: var(--primary-deep); font-weight: 700; font-size: 1.25rem;">🏔️ English Peak</a>
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
