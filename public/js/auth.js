import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { sendDiscordNotification } from './discord.js';

/**
 * Configuración de Firebase
 */
const firebaseConfig = {
    apiKey: "AIzaSyCUEOZ3OAa69N-ONy6LYxpgexOmvZYlLTU",
    authDomain: "english-platform-5c49b.firebaseapp.com",
    projectId: "english-platform-5c49b",
    storageBucket: "english-platform-5c49b.firebasestorage.app",
    messagingSenderId: "764678309974",
    appId: "1:764678309974:web:9c90e5bedddfd72f3753f7"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const provider = new GoogleAuthProvider();

const initApp = () => {
    console.log("English Peak: Sistema de Auth inicializado.");

    // Botones de login
    const setupLogin = (id, targetRoute = 'mapa.html') => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                if (auth.currentUser) {
                    // Si ya está logueado, lo mandamos a su ruta
                    window.location.href = targetRoute;
                } else {
                    // Si no, forzamos login
                    handleLogin();
                }
            });
        }
    };

    setupLogin('google-login');
    setupLogin('hero-cta-free');
    setupLogin('hero-cta-explore');
    setupLogin('hero-cta-teacher', 'profile.html');

    // Lógica de referidos
    const urlParams = new URL(window.location.href).searchParams;
    const refCode = urlParams.get('ref');
    if (refCode) {
        localStorage.setItem('moonsforest_ref', refCode);
    }

    // Escuchar cambios en el estado de autenticación
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("Usuario autenticado:", user.displayName);

            // Actualizar nombre en el dashboard si existe el elemento
            const userNameEl = document.getElementById('user-name');
            if (userNameEl) {
                userNameEl.textContent = `¡Hola, ${user.displayName.split(' ')[0]}!`;
            }
        } else {
            console.log("No hay sesión activa.");
            // Si estamos en el mapa y no hay sesión, volver a la landing
            if (window.location.pathname.endsWith('mapa.html')) {
                window.location.href = 'index.html';
            }
        }
    });
}

// Bandera para evitar múltiples clics concurrentes
let isLoggingIn = false;

export const handleLogin = async () => {
    if (isLoggingIn) return;

    // --- DETECCIÓN DE WEBVIEW DE FACEBOOK/INSTAGRAM ---
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    const isFacebookApp = (ua.indexOf("FBAN") > -1) || (ua.indexOf("FBAV") > -1) || (ua.indexOf("Instagram") > -1);

    if (isFacebookApp) {
        const overlay = document.getElementById('webview-alert-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
        } else {
            alert("⚠️ ACCESO BLOQUEADO POR NAVEGADOR:\n\nToca los TRES PUNTITOS de la esquina y elige 'Abrir en el navegador' para poder entrar.");
        }
        return;
    }
    // ----------------------------------------------------

    isLoggingIn = true;

    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        console.log("Login exitoso con Google:", user.displayName);

        // Lógica de Firestore: Perfiles Duales Automáticos
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            console.log("Creando nuevo perfil de usuario (student base)...");
            const storedRefCode = localStorage.getItem('moonsforest_ref') || null;

            await setDoc(userRef, {
                uid: user.uid,
                name: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                role: 'student', // Todos nacen como alumno
                isTeacher: false, // Bandera de switch inactiva
                createdAt: serverTimestamp(),
                points: 0,
                referredBy: storedRefCode // Si null, no fue referido
            });

            // Notificación a Discord
            const refMsg = storedRefCode ? `\n🎁 *Llegó usando el código de referido:* **${storedRefCode}**` : '';
            await sendDiscordNotification(
                "👋 Nuevo Viajero Registrado",
                `**${user.displayName}** (${user.email}) acaba de unirse a Moonsforest.${refMsg}`,
                15258703 // Amarillo
            );
        }

        // Redirigir al mapa
        window.location.href = 'mapa.html';
    } catch (error) {
        // Ignorar errores de cancelación para no asustar al usuario
        if (error.code !== 'auth/cancelled-popup-request' && error.code !== 'auth/popup-closed-by-user') {
            console.error("Error en login:", error.code, error.message);
            alert("Error al iniciar sesión: " + error.message);
        }
    } finally {
        isLoggingIn = false;
    }
}

// Función para cerrar sesión
export const logout = () => {
    signOut(auth).then(() => {
        window.location.href = 'index.html';
    });
}

// Ejecutar inicialización
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
