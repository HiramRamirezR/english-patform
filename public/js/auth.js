/**
 * Configuración de Firebase
 * Nota: Estas llaves son públicas por diseño de Firebase Web SDK.
 * La seguridad se aplica vía Firestore Rules.
 */
const firebaseConfig = {
    apiKey: "AIzaSyCUEOZ3OAa69N-ONy6LYxpgexOmvZYlLTU",
    authDomain: "english-platform-5c49b.firebaseapp.com",
    projectId: "english-platform-5c49b",
    storageBucket: "english-platform-5c49b.firebasestorage.app",
    messagingSenderId: "764678309974",
    appId: "1:764678309974:web:9c90e5bedddfd72f3753f7"
};

const initApp = () => {
    console.log("🌲 English Forest: Sistema de Auth listo.");

    const loginBtn = document.getElementById('google-login');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            handleLogin();
        });
    }
}

const handleLogin = () => {
    // Aquí implementaremos el popup de Google Auth después
    console.log('Iniciando sesión con:', firebaseConfig.projectId);
    window.location.href = 'dashboard.html';
}

document.addEventListener('DOMContentLoaded', initApp);
