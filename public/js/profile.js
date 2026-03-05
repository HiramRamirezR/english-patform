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
        teacherForm.style.display = 'none'; // Asegurar que se oculta
        teacherIntro.style.display = 'block'; // Volver a mostrar el intro/checklist
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
        const teacherDiscord = document.getElementById('teacher-discord').value;
        const teacherClabe = document.getElementById('teacher-clabe').value;
        const teacherBank = document.getElementById('teacher-bank').value;

        try {
            const user = auth.currentUser;
            if (!user) throw new Error("No hay usuario autenticado.");

            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);
            const existingData = userSnap.data();

            const generateRefCode = (name) => {
                const base = name ? name.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '') : 'MF';
                return base + Math.floor(1000 + Math.random() * 9000);
            };

            // Mantener refCode existente o generar uno nuevo
            const refCode = existingData.teacherProfile?.refCode || generateRefCode(user.displayName);

            await updateDoc(userRef, {
                isTeacher: true,
                teacherProfile: {
                    ...existingData.teacherProfile,
                    bio: teacherBio,
                    video: teacherVideo || null,
                    zoomLink: teacherZoom,
                    whatsapp: teacherWhatsapp,
                    cvLink: teacherCv,
                    discordId: teacherDiscord || null,
                    clabe: teacherClabe,
                    bank: teacherBank,
                    status: existingData.teacherProfile?.status || 'active',
                    refCode: refCode
                }
            });

            // Notificación a Discord (Solo si es nuevo)
            if (!existingData.isTeacher) {
                await sendDiscordNotification(
                    "🧑‍🏫 Solicitud de Maestro",
                    `**${user.displayName}** acaba de completar su registro como Maestro y está en espera de alumnos.`,
                    10181046 // Morado
                );
            }

            await Swal.fire({
                title: existingData.isTeacher ? '¡Perfil Actualizado!' : '¡Felicidades!',
                text: existingData.isTeacher ? 'Tus datos se han guardado correctamente.' : 'Tu perfil de Maestro ha sido activado. ¡Bienvenido al equipo!',
                icon: 'success',
                confirmButtonColor: '#059669'
            });
            window.location.reload();

        } catch (error) {
            console.error("Error al actualizar perfil a maestro:", error);
            Swal.fire({
                title: 'Error',
                text: 'Hubo un error al guardar tu información. Por favor, revisa tu conexión e intenta de nuevo.',
                icon: 'error',
                confirmButtonColor: '#ef4444'
            });
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

                    // Calcular Completitud del Perfil
                    const profile = userData.teacherProfile || {};
                    const fields = [
                        { key: 'bio', label: 'Biografía', public: true },
                        { key: 'video', label: 'Video de Presentación', public: true },
                        { key: 'zoomLink', label: 'Enlace Video-sala', public: true },
                        { key: 'whatsapp', label: 'WhatsApp', public: false },
                        { key: 'cvLink', label: 'CV / LinkedIn', public: false },
                        { key: 'discordId', label: 'Discord (Bot)', public: false },
                        { key: 'clabe', label: 'CLABE Bancaria', public: false },
                        { key: 'bank', label: 'Banco', public: false }
                    ];

                    let completedCount = 0;
                    const checklistHtml = fields.map(f => {
                        const isDone = profile[f.key] && profile[f.key] !== '';
                        if (isDone) completedCount++;
                        return `
                            <li class="checklist-item ${isDone ? 'done' : 'missing'}">
                                <span class="check-icon">${isDone ? '✅' : '❌'}</span>
                                ${f.label} <span style="font-size: 0.65rem; opacity: 0.7; margin-left: auto;">${f.public ? '(Público)' : '(Privado)'}</span>
                            </li>
                        `;
                    }).join('');

                    const percentage = Math.round((completedCount / fields.length) * 100);

                    // Ocultar formulario entero y cambiar el mensaje
                    teacherIntro.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                             <h2 style="font-size: 1.15rem; color: #166534; margin: 0;">🎒 ¡Tu perfil de Maestro está activo!</h2>
                             <span style="font-size: 0.85rem; font-weight: 700; color: #166534;">${percentage}% completo</span>
                        </div>
                        
                        <div class="progress-container">
                            <div class="progress-bar" style="width: ${percentage}%"></div>
                        </div>

                        <ul class="checklist">
                            ${checklistHtml}
                        </ul>

                        <p style="color: var(--slate-700); font-size: 0.85rem; margin-bottom: 1.25rem; line-height: 1.4;">
                            Tu formación y biografía son visibles para los alumnos. 
                            <strong>Tus datos bancarios, CV y WhatsApp son 100% privados</strong> y solo el equipo administrativo tiene acceso para gestionar tus pagos.
                        </p>
                        
                        <button id="edit-teacher-profile-btn" class="btn" style="background: white; border: 1px solid #166534; color: #166534; font-size: 0.85rem; padding: 0.5rem 1.25rem; width: 100%; font-weight: 600;">
                            Editar mi Información Profesional
                        </button>
                    `;
                    teacherIntro.style.background = '#f0fdf4';
                    teacherIntro.style.padding = '1.75rem';
                    teacherIntro.style.borderRadius = '20px';
                    teacherIntro.style.border = '1px solid #bbf7d0';
                    document.getElementById('teacher-section').style.background = 'transparent';
                    document.getElementById('teacher-section').style.border = 'none';
                    document.getElementById('teacher-section').style.padding = '0';
                    teacherForm.style.display = 'none';

                    // Lógica para editar perfil
                    document.getElementById('edit-teacher-profile-btn').addEventListener('click', () => {
                        const profile = userData.teacherProfile || {};
                        document.getElementById('teacher-bio').value = profile.bio || '';
                        document.getElementById('teacher-video').value = profile.video || '';
                        document.getElementById('teacher-zoom').value = profile.zoomLink || '';
                        document.getElementById('teacher-whatsapp').value = profile.whatsapp || '';
                        document.getElementById('teacher-cv').value = profile.cvLink || '';
                        document.getElementById('teacher-discord').value = profile.discordId || '';
                        document.getElementById('teacher-clabe').value = profile.clabe || '';
                        document.getElementById('teacher-bank').value = profile.bank || '';

                        submitProvider.innerText = 'Guardar Cambios';
                        teacherIntro.style.display = 'none';
                        teacherForm.classList.add('show-form');
                        teacherForm.style.display = 'block';
                    });
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
