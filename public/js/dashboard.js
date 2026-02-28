import { auth, db } from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// DOM Elements
const avatarModal = document.getElementById('avatar-modal');
const dashboardContent = document.getElementById('dashboard-content');
const avatarOptions = document.querySelectorAll('.avatar-option');
const saveAvatarBtn = document.getElementById('save-avatar-btn');
const displayAvatar = document.getElementById('display-avatar');
const userNameDisplay = document.getElementById('user-name');
const moonTrigger = document.getElementById('moon-trigger');
const moonText = document.getElementById('moon-text');

let currentUser = null;
let currentProfile = null;
let selectedAvatar = null;

// Avatar Selection Logic
avatarOptions.forEach(opt => {
    opt.addEventListener('click', () => {
        // Clear previous selection
        avatarOptions.forEach(o => o.classList.remove('selected'));
        // Select new
        opt.classList.add('selected');
        selectedAvatar = opt.getAttribute('data-avatar');

        // Enable button
        saveAvatarBtn.disabled = false;
    });
});

saveAvatarBtn.addEventListener('click', async () => {
    if (!selectedAvatar || !currentUser) return;

    saveAvatarBtn.disabled = true;
    saveAvatarBtn.textContent = 'Guardando...';

    try {
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
            avatar: selectedAvatar
        });

        // Update UI locally
        currentProfile.avatar = selectedAvatar;
        setupDashboardUI();

    } catch (error) {
        console.error("Error guardando avatar:", error);
        alert('Ocurrió un error. Intenta de nuevo.');
        saveAvatarBtn.disabled = false;
        saveAvatarBtn.textContent = 'Comenzar Aventura';
    }
});

// Setup Initial Dashboard State
const setupDashboardUI = () => {
    // Si no tiene avatar, mostrar Onboarding
    if (!currentProfile.avatar) {
        avatarModal.style.display = 'flex';
        dashboardContent.style.display = 'none';
        return;
    }

    // Ya tiene avatar, preparar el "Peak"
    avatarModal.style.display = 'none';
    dashboardContent.style.display = 'block';

    // Rellenar Datos
    displayAvatar.textContent = currentProfile.avatar;
    const firstName = currentProfile.name.split(' ')[0];
    userNameDisplay.textContent = `¡Hola, ${firstName}!`;

    // Frase inicial
    moonText.innerHTML = `¡Hola viajero! Qué bueno verte, <strong>${currentProfile.avatar}</strong>. Entra al Campamento Base (Módulo 1) para prepararnos.`;
};

// Auth and DB Check
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        currentUser = user;

        try {
            const docRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                currentProfile = docSnap.data();
                setupDashboardUI();
            } else {
                console.warn("Perfil de usuario no enontrado en Firestore.");
                // Forzar re-login o manejar error
            }

        } catch (error) {
            console.error("Error cargando perfil del dashboard:", error);
        }
    });

    // Moon Interaction
    const moonPhrases = [
        "¿Sabías que English Peak es la montaña más alta?",
        "Tómate tu tiempo en el Campamento Base.",
        "Si sientes que esto es muy fácil, pide una evaluación con un humano. 🚁",
        "Ese avatar te queda increíble, por cierto."
    ];

    moonTrigger.addEventListener('click', () => {
        const randomPhrase = moonPhrases[Math.floor(Math.random() * moonPhrases.length)];
        moonText.innerHTML = randomPhrase;
        moonText.style.opacity = 1;
        moonText.style.transform = 'translateY(0) scale(1)';

        // Hide after 4 seconds
        setTimeout(() => {
            moonText.style.opacity = 0;
            moonText.style.transform = 'translateY(10px) scale(0.9)';
        }, 4000);
    });
});
