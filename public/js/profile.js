import { auth, db } from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Elementos del DOM
const loadingState = document.getElementById('loading-state');
const profileContent = document.getElementById('profile-content');
const profilePhoto = document.getElementById('profile-photo');
const profileName = document.getElementById('profile-name');
const profileEmail = document.getElementById('profile-email');
const profileRoleTag = document.getElementById('profile-role-tag');

// Elementos de edición de Student
const editProfileBtn = document.getElementById('edit-profile-btn');
const editProfileForm = document.getElementById('edit-profile-form');
const cancelEditProfileBtn = document.getElementById('cancel-edit-profile-btn');
const saveEditProfileBtn = document.getElementById('save-edit-profile-btn');
const editNameInput = document.getElementById('edit-name-input');
const displayAvatarProfile = document.getElementById('display-avatar-profile');
const miniAvatarOptions = document.querySelectorAll('.mini-avatar-option');
let currentSelectedAvatar = '👤';
let currentUserDoc = null;

document.addEventListener('DOMContentLoaded', () => {
    // --- Lógica Editar Perfil Estudiante ---
    editProfileBtn.addEventListener('click', () => {
        editProfileForm.style.display = 'block';
        editProfileBtn.style.display = 'none';

        // Cargar datos actuales
        if (currentUserDoc && currentUserDoc.name) {
            editNameInput.value = currentUserDoc.name;
        }

        if (currentUserDoc && currentUserDoc.avatar) {
            currentSelectedAvatar = currentUserDoc.avatar;
            miniAvatarOptions.forEach(opt => {
                if (opt.getAttribute('data-avatar') === currentSelectedAvatar) {
                    opt.classList.add('selected');
                } else {
                    opt.classList.remove('selected');
                }
            });
        }
    });

    cancelEditProfileBtn.addEventListener('click', () => {
        editProfileForm.style.display = 'none';
        editProfileBtn.style.display = 'block';
    });

    miniAvatarOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            miniAvatarOptions.forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            currentSelectedAvatar = opt.getAttribute('data-avatar');
        });
    });

    saveEditProfileBtn.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (!user) return;

        saveEditProfileBtn.disabled = true;
        saveEditProfileBtn.textContent = 'Guardando...';

        const newName = editNameInput.value.trim();

        try {
            const userRef = doc(db, 'users', user.uid);
            const updates = { avatar: currentSelectedAvatar };
            if (newName) updates.name = newName;

            import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js").then(async ({ updateDoc }) => {
                await updateDoc(userRef, updates);

                // Actualizar interfaz al vuelo
                if (newName) profileName.textContent = newName;
                displayAvatarProfile.textContent = currentSelectedAvatar;

                // Actualizar currentUserDoc en memoria
                if (currentUserDoc) {
                    currentUserDoc.name = newName || currentUserDoc.name;
                    currentUserDoc.avatar = currentSelectedAvatar;
                }

                // Ocultar formulario
                editProfileForm.style.display = 'none';
                editProfileBtn.style.display = 'block';

                Swal.fire({
                    title: '¡Perfil Actualizado!',
                    text: 'Tus datos básicos se guardaron con éxito.',
                    icon: 'success',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
            });

        } catch (error) {
            console.error("Error actualizando perfil base:", error);
        } finally {
            saveEditProfileBtn.disabled = false;
            saveEditProfileBtn.textContent = 'Guardar Cambios';
        }
    });

    // Lógica Central de Autenticación en la página
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            // Expulsar si no hay sesión
            window.location.href = 'index.html';
            return;
        }

        try {
            // 1. Mostrar datos de Google
            profilePhoto.src = user.photoURL || 'https://ui-avatars.com/api/?name=User&background=eff6ff&color=1e3a8a';
            profileName.textContent = user.displayName;
            profileEmail.textContent = user.email;

            // 2. Obtener datos de Firestore (Para los roles)
            const docRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const userData = docSnap.data();
                currentUserDoc = userData; // Guardar ref globa

                if (userData.avatar) {
                    displayAvatarProfile.textContent = userData.avatar;
                }

                if (userData.name) {
                    profileName.textContent = userData.name;
                }

            } else {
                console.warn("El documento de Firestore aún no se sincroniza.");
            }

            // 3. Mostrar el contenido UI final
            loadingState.style.display = 'none';
            profileContent.style.display = 'block';

            // 4. ─── Sección de Referidos ─────────────────────────────────────
            const referralSection = document.getElementById('referral-section');
            if (referralSection && docSnap.exists()) {
                const userData = docSnap.data();

                // Generar/reutilizar código de referido del alumno
                const existingRef = userData.referralCode;
                const refCode = existingRef || ('MF' + user.uid.substring(0, 6).toUpperCase());

                // Guardar si no existía
                if (!existingRef) {
                    import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js")
                        .then(({ updateDoc }) => updateDoc(doc(db, 'users', user.uid), { referralCode: refCode }))
                        .catch(() => {});
                }

                const refLink = `${window.location.origin}/index.html?ref=${refCode}`;
                const referralCount  = userData.referralCount  || 0;
                const referralActive = userData.referralActive || 0;
                const discount = referralActive * 50;

                document.getElementById('referral-link-display').textContent = refLink;
                document.getElementById('referral-count').textContent   = referralCount;
                document.getElementById('referral-active').textContent  = referralActive;
                document.getElementById('referral-discount').textContent = `$${discount}`;
                referralSection.style.display = 'block';

                // Botón copiar
                document.getElementById('referral-copy-btn').addEventListener('click', async () => {
                    try {
                        await navigator.clipboard.writeText(refLink);
                        const btn = document.getElementById('referral-copy-btn');
                        btn.textContent = '✅ Copiado';
                        setTimeout(() => { btn.textContent = '📋 Copiar'; }, 2000);
                    } catch {
                        // Fallback para navegadores sin Clipboard API
                        const ta = document.createElement('textarea');
                        ta.value = refLink;
                        document.body.appendChild(ta);
                        ta.select();
                        document.execCommand('copy');
                        document.body.removeChild(ta);
                    }
                });
            }

        } catch (error) {
            console.error("Error leyendo datos del perfil:", error);
            loadingState.textContent = "Error al cargar la información. Recarga la página por favor.";
        }
    });
});
