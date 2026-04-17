import { auth, db, handleLogin, logout } from '../auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const renderHeader = (user, userData = null) => {
    const headerContainer = document.getElementById('main-header');
    if (!headerContainer) return;

    // ─── Estilos inyectados una sola vez ─────────────────────────────────────
    if (!document.getElementById('header-styles')) {
        const style = document.createElement('style');
        style.id = 'header-styles';
        style.textContent = `
            #site-header {
                background: rgba(255,255,255,0.97);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                box-shadow: 0 1px 0 rgba(0,0,0,0.08);
                position: sticky;
                top: 0;
                z-index: 1000;
                width: 100%;
                font-family: 'Outfit', sans-serif;
            }
            #site-header nav {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.85rem 1.25rem;
                max-width: 1200px;
                margin: 0 auto;
            }
            .header-logo {
                text-decoration: none;
                color: var(--primary-deep, #1e3a5f);
                font-weight: 800;
                font-size: 1.2rem;
                letter-spacing: -0.3px;
                flex-shrink: 0;
            }
            #desktop-nav {
                display: flex;
                gap: 1.25rem;
                align-items: center;
            }
            .header-link {
                color: var(--slate-700, #334155);
                text-decoration: none;
                font-weight: 500;
                font-size: 0.9rem;
                padding: 0.35rem 0.5rem;
                border-radius: 8px;
                transition: background 0.15s, color 0.15s;
            }
            .header-link:hover { background: #f1f5f9; color: var(--primary-deep, #1e3a5f); }
            .header-link.active { color: var(--primary-deep, #1e3a5f); font-weight: 700; }
            .header-btn-outline {
                border: 1px solid #cbd5e1;
                color: #64748b;
                padding: 0.45rem 1rem;
                font-size: 0.85rem;
                background: transparent;
                border-radius: 999px;
                cursor: pointer;
                font-family: 'Outfit', sans-serif;
                font-weight: 500;
                transition: all 0.15s;
            }
            .header-btn-outline:hover { border-color: #94a3b8; color: #334155; background: #f8fafc; }
            .header-btn-eval {
                background: linear-gradient(135deg, #fb923c, #f97316);
                color: white;
                border: none;
                padding: 0.5rem 1rem;
                font-size: 0.82rem;
                font-weight: 700;
                border-radius: 999px;
                cursor: pointer;
                font-family: 'Outfit', sans-serif;
                box-shadow: 0 4px 10px rgba(249,115,22,0.3);
                transition: transform 0.15s, box-shadow 0.15s;
                white-space: nowrap;
            }
            .header-btn-eval:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(249,115,22,0.4); }
            .header-btn-admin {
                color: #f97316;
                text-decoration: none;
                font-weight: 700;
                font-size: 0.82rem;
                border: 1px solid #f97316;
                padding: 0.35rem 0.65rem;
                border-radius: 6px;
            }
            /* ── Zona móvil ── */
            #mobile-nav-row {
                display: none;
                align-items: center;
                gap: 0.75rem;
            }
            #hamburger-btn {
                background: none;
                border: none;
                cursor: pointer;
                padding: 0.4rem;
                display: flex;
                flex-direction: column;
                gap: 5px;
                border-radius: 8px;
                transition: background 0.15s;
            }
            #hamburger-btn:hover { background: #f1f5f9; }
            #hamburger-btn .bar {
                width: 22px;
                height: 2px;
                background: #334155;
                border-radius: 2px;
                transition: all 0.3s ease;
                display: block;
            }
            #hamburger-btn.open .bar:nth-child(1) { transform: translateY(7px) rotate(45deg); }
            #hamburger-btn.open .bar:nth-child(2) { opacity: 0; transform: scaleX(0); }
            #hamburger-btn.open .bar:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
            /* ── Drawer ── */
            #mobile-drawer {
                max-height: 0;
                overflow: hidden;
                transition: max-height 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease;
                opacity: 0;
                background: white;
                border-top: 1px solid #f1f5f9;
            }
            #mobile-drawer.open { max-height: 400px; opacity: 1; }
            #mobile-drawer-inner {
                padding: 1rem 1.25rem 1.25rem;
                display: flex;
                flex-direction: column;
                gap: 0.25rem;
            }
            .drawer-link {
                display: flex;
                align-items: center;
                gap: 0.6rem;
                padding: 0.75rem 0.75rem;
                border-radius: 12px;
                text-decoration: none;
                font-weight: 500;
                font-size: 0.95rem;
                color: #334155;
                transition: background 0.15s;
            }
            .drawer-link:hover, .drawer-link.active { background: #f1f5f9; color: #1e3a5f; }
            .drawer-divider { height: 1px; background: #f1f5f9; margin: 0.5rem 0; }
            .drawer-btn-logout {
                width: 100%;
                background: none;
                border: 1px solid #e2e8f0;
                padding: 0.75rem;
                border-radius: 12px;
                color: #64748b;
                font-size: 0.9rem;
                font-family: 'Outfit', sans-serif;
                font-weight: 500;
                cursor: pointer;
                text-align: left;
                display: flex;
                align-items: center;
                gap: 0.6rem;
                transition: background 0.15s;
            }
            .drawer-btn-logout:hover { background: #fef2f2; color: #ef4444; border-color: #fecaca; }
            /* ── Breakpoints ── */
            @media (max-width: 640px) {
                #desktop-nav    { display: none !important; }
                #mobile-nav-row { display: flex !important; }
            }
            @media (min-width: 641px) {
                #mobile-nav-row { display: none !important; }
                #mobile-drawer  { display: none !important; }
            }
        `;
        document.head.appendChild(style);
    }

    // ─── Página activa ────────────────────────────────────────────────────────
    const path = window.location.pathname;
    const active = (page) => path.includes(page) ? 'active' : '';

    // ─── Contenido según estado ───────────────────────────────────────────────
    let desktopNav = '';
    let mobileRightContent = '';
    let mobileDrawerContent = '';

    if (user) {
        const completedLessons = userData?.completedLessons || [];
        const modules = ['m1','m2','m3','m4','m5','m6','m7','m8','m9','m10'];
        let latestDone = null;
        for (const mod of modules) {
            if (completedLessons.includes(`${mod}l20`)) latestDone = mod;
        }

        const evalLabel = latestDone
            ? `Certificar M${latestDone.replace('m','')} ($60)`
            : 'Salto de Nivel ($60)';
        const evalType = latestDone
            ? `Certificación Módulo ${latestDone.replace('m','')}`
            : 'Salto de Nivel (Fast-Track)';

        const isTeacherView = path.includes('teacher.html');

        const evalBtnHtml = !isTeacherView
            ? `<button id="evaluate-btn" data-type="${evalType}" data-mod="${latestDone||''}" class="header-btn-eval">${evalLabel}</button>`
            : '';

        const teacherLink = userData?.isTeacher
            ? `<a href="${isTeacherView ? 'mapa.html' : 'teacher.html'}" class="header-link">${isTeacherView ? '🎒 Alumno' : '📘 Maestro'}</a>`
            : '';

        const adminLink = userData?.isAdmin
            ? `<a href="admin.html" class="header-btn-admin">Admin</a>`
            : '';

        // Desktop
        desktopNav = `
            <div id="desktop-nav">
                ${evalBtnHtml}
                ${teacherLink}
                ${adminLink}
                <a href="index.html"   class="header-link ${active('index')}">Inicio</a>
                <a href="mapa.html"    class="header-link ${active('mapa')}">Mapa</a>
                <a href="profile.html" class="header-link ${active('profile')}">Perfil</a>
                <button class="header-btn-outline" id="header-logout-btn">Salir</button>
            </div>
        `;

        // Móvil — CTA junto al hamburger
        mobileRightContent = evalBtnHtml;

        // Drawer
        mobileDrawerContent = `
            <div id="mobile-drawer-inner">
                ${userData?.isTeacher ? `<a href="${isTeacherView ? 'mapa.html' : 'teacher.html'}" class="drawer-link">${isTeacherView ? '🎒 Cambiar a Alumno' : '📘 Cambiar a Maestro'}</a>` : ''}
                ${userData?.isAdmin   ? `<a href="admin.html" class="drawer-link">⚙️ Panel Admin</a>` : ''}
                <a href="index.html"      class="drawer-link ${active('index')}">🏠 Inicio</a>
                <a href="mapa.html"       class="drawer-link ${active('mapa')}">🗺️ Mapa del Bosque</a>
                <a href="profile.html"    class="drawer-link ${active('profile')}">👤 Mi Perfil</a>
                <a href="evaluacion.html" class="drawer-link ${active('evaluacion')}">📅 Agendar Evaluación</a>
                <div class="drawer-divider"></div>
                <button class="drawer-btn-logout" id="drawer-logout-btn">🚪 Cerrar Sesión</button>
            </div>
        `;

    } else {
        // Visitante
        desktopNav = `
            <div id="desktop-nav">
                <a href="index.html" class="header-link">Inicio</a>
                <button class="header-btn-eval" id="header-login-btn"
                    style="background:linear-gradient(135deg,#38bdf8,#0ea5e9); box-shadow:0 4px 10px rgba(56,189,248,0.3);">
                    Iniciar Sesión
                </button>
            </div>
        `;
        mobileRightContent = `
            <button class="header-btn-eval" id="header-login-btn-m"
                style="background:linear-gradient(135deg,#38bdf8,#0ea5e9); box-shadow:0 4px 10px rgba(56,189,248,0.3); font-size:0.8rem; padding:0.45rem 0.85rem;">
                Entrar
            </button>
        `;
        mobileDrawerContent = `
            <div id="mobile-drawer-inner">
                <a href="index.html" class="drawer-link">🏠 Inicio</a>
            </div>
        `;
    }

    // ─── HTML ─────────────────────────────────────────────────────────────────
    headerContainer.innerHTML = `
        <header id="site-header">
            <nav>
                <a href="index.html" class="header-logo">🌲 Moonsforest</a>
                ${desktopNav}
                <div id="mobile-nav-row">
                    ${mobileRightContent}
                    <button id="hamburger-btn" aria-label="Abrir menú" aria-expanded="false">
                        <span class="bar"></span>
                        <span class="bar"></span>
                        <span class="bar"></span>
                    </button>
                </div>
            </nav>
            <div id="mobile-drawer" role="navigation" aria-label="Menú móvil">
                ${mobileDrawerContent}
            </div>
        </header>
    `;

    // ─── Listeners ────────────────────────────────────────────────────────────
    document.getElementById('header-login-btn')  ?.addEventListener('click', (e) => { e.preventDefault(); handleLogin(); });
    document.getElementById('header-login-btn-m')?.addEventListener('click', (e) => { e.preventDefault(); handleLogin(); });
    document.getElementById('header-logout-btn') ?.addEventListener('click', (e) => { e.preventDefault(); logout(); });
    document.getElementById('drawer-logout-btn') ?.addEventListener('click', (e) => { e.preventDefault(); logout(); });
    document.getElementById('evaluate-btn')      ?.addEventListener('click', () => { window.location.href = 'evaluacion.html'; });

    // Hamburger
    const hamburger = document.getElementById('hamburger-btn');
    const drawer    = document.getElementById('mobile-drawer');
    if (hamburger && drawer) {
        hamburger.addEventListener('click', () => {
            const open = drawer.classList.toggle('open');
            hamburger.classList.toggle('open', open);
            hamburger.setAttribute('aria-expanded', String(open));
        });
        document.addEventListener('click', (e) => {
            if (!document.getElementById('site-header')?.contains(e.target)) {
                drawer.classList.remove('open');
                hamburger.classList.remove('open');
                hamburger.setAttribute('aria-expanded', 'false');
            }
        }, { passive: true });
        drawer.querySelectorAll('a').forEach(link =>
            link.addEventListener('click', () => {
                drawer.classList.remove('open');
                hamburger.classList.remove('open');
            })
        );
    }
};

// Estado visitante inmediato (sin parpadeo)
renderHeader(null);

onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const snap = await getDoc(doc(db, 'users', user.uid));
            renderHeader(user, snap.exists() ? snap.data() : null);
        } catch (e) {
            console.error('Header auth error:', e);
            renderHeader(user, null);
        }
    } else {
        renderHeader(null);
    }
});
