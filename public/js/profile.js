import { auth, db } from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { sendDiscordNotification } from './discord.js';

// Elementos del DOM
const loadingState = document.getElementById('loading-state');
const profileContent = document.getElementById('profile-content');
const profilePhoto = document.getElementById('profile-photo');
const profileName = document.getElementById('profile-name');
const profileEmail = document.getElementById('profile-email');
const profileRoleTag = document.getElementById('profile-role-tag');

const teacherIntro = document.getElementById('teacher-intro');
const teacherFormBtn = document.getElementById('show-teacher-form-btn');
const teacherForm = document.getElementById('teacher-form');
const cancelTeacherBtn = document.getElementById('cancel-teacher-btn');
const submitProvider = document.getElementById('submit-teacher-btn');

document.addEventListener('DOMContentLoaded', () => {
    // Manejo de la UI del Formulario
    teacherFormBtn.addEventListener('click', () => {
        teacherIntro.style.display = 'none';
        teacherForm.classList.add('show-form');
    });

    cancelTeacherBtn.addEventListener('click', () => {
        teacherForm.classList.remove('show-form');
        teacherIntro.style.display = 'block';
    });

    // Guardar el perfil de maestro
    teacherForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitProvider.innerText = 'Activando...';
        submitProvider.disabled = true;

        const teacherBio = document.getElementById('teacher-bio').value;
        const teacherVideo = document.getElementById('teacher-video').value;
        const teacherZoom = document.getElementById('teacher-zoom').value;
        const teacherWhatsapp = document.getElementById('teacher-whatsapp').value;
        const teacherCv = document.getElementById('teacher-cv').value;
        const teacherClabe = document.getElementById('teacher-clabe').value;
        const teacherBank = document.getElementById('teacher-bank').value;

        try {
            const user = auth.currentUser;
            if (!user) throw new Error("No hay usuario autenticado.");

            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                isTeacher: true,
                teacherProfile: {
                    bio: teacherBio,
                    video: teacherVideo || null,
                    zoomLink: teacherZoom,
                    whatsapp: teacherWhatsapp,
                    cvLink: teacherCv,
                    clabe: teacherClabe,
                    bank: teacherBank,
                    status: 'active' // Podríamos usar pending si queremos revisión manual en el futuro
                }
            });

            // Notificación a Discord
            await sendDiscordNotification(
                "🧑‍🏫 Solicitud de Maestro",
                `**${user.displayName}** acaba de completar su registro como Maestro y está en espera de alumnos.`,
                10181046 // Morado
            );

            alert('¡Felicidades! Tu perfil de Maestro ha sido activado.');
            window.location.reload(); // Recargar para que el Header también actualice

        } catch (error) {
            console.error("Error al actualizar perfil a maestro:", error);
            alert("Hubo un error al guardar tu información. Por favor, revisa tu conexión e intenta de nuevo.");
            submitProvider.innerText = 'Activar mi Perfil de Maestro';
            submitProvider.disabled = false;
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

                // Cambiar la UI si ya es maestro
                if (userData.isTeacher) {
                    profileRoleTag.textContent = 'Alumno + Maestro Activo';
                    profileRoleTag.className = 'tag-teacher';

                    // Ocultar formulario entero y cambiar el mensaje
                    teacherIntro.innerHTML = `
                        <h2 style="font-size: 1.25rem; color: #166534; margin-bottom: 0.5rem;">🎒 ¡Tu perfil de Maestro está activo!</h2>
                        <p style="color: var(--slate-700); font-size: 0.95rem;">
                            Utiliza el botón en la barra superior para cambiar a tu panel de control de maestro, 
                            donde podrás gestionar tus horarios, ver tus ganancias y preparar sesiones.
                        </p>
                    `;
                    teacherIntro.style.background = '#dcfce7';
                    teacherIntro.style.padding = '1.5rem';
                    teacherIntro.style.borderRadius = '12px';
                    document.getElementById('teacher-section').style.background = 'transparent';
                    document.getElementById('teacher-section').style.border = 'none';
                    document.getElementById('teacher-section').style.padding = '0';
                    teacherForm.style.display = 'none';
                }
            } else {
                console.warn("El documento de Firestore aún no se sincroniza.");
            }

            // 3. Mostrar el contenido UI final
            loadingState.style.display = 'none';
            profileContent.style.display = 'block';

        } catch (error) {
            console.error("Error leyendo datos del perfil:", error);
            loadingState.textContent = "Error al cargar la información. Recarga la página por favor.";
        }
    });
});
