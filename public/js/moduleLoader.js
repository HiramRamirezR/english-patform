import { auth, db } from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const moduleId = urlParams.get('id');

    if (!moduleId) {
        window.location.href = "mapa.html";
        return;
    }

    let config;
    try {
        const response = await fetch(`/data/${moduleId}.json`);
        if (!response.ok) throw new Error("Módulo no encontrado");
        config = await response.json();
    } catch (error) {
        console.error("Error cargando el módulo:", error);
        document.getElementById('module-title').innerText = "Módulo en construcción";
        document.getElementById('module-desc').innerText = "Vuelve muy pronto.";
        return;
    }

    document.title = `${config.title} | Moonsforest`;
    document.getElementById('module-title').innerText = config.title;
    document.getElementById('module-desc').innerText = config.description;

    const mapPath = document.getElementById('map-path');
    mapPath.innerHTML = ''; // Limpiar loader

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        try {
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);
            let completedLessons = [];

            if (userSnap.exists()) {
                const data = userSnap.data();
                completedLessons = data.completedLessons || [];
            }

            // Renderizar Mapa
            config.lessons.forEach((lesson, index) => {
                const isCompleted = completedLessons.includes(lesson.id);
                // Si la anterior está completada o es la primera
                const previousLessonId = index > 0 ? config.lessons[index - 1].id : null;
                const isUnlocked = index === 0 || completedLessons.includes(previousLessonId);

                const node = document.createElement('div');
                node.className = `module-node ${isUnlocked ? 'unlocked' : 'locked'}`;
                node.style.width = '100%';
                node.style.height = 'auto';
                node.style.padding = '1.2rem';
                node.style.marginBottom = '0.5rem';

                if (isUnlocked) {
                    node.style.cursor = 'pointer';
                    node.onclick = () => window.location.href = `lesson.html?id=${lesson.id}`;
                }

                // Si está completada, cambia el fondo del ícono a verde
                const iconBg = isCompleted ? 'var(--success)' : (isUnlocked ? 'var(--primary-light)' : 'var(--slate-200)');
                const checkmark = isCompleted ? '<span style="color: var(--success); font-weight: bold; font-size: 1.2rem; margin-left: 1rem;">✔</span>' : '';

                node.innerHTML = `
                    <span class="module-icon" style="background: ${iconBg}; margin-right: 1.25rem;">${lesson.icon}</span>
                    <div style="flex: 1; display:flex; align-items:center; justify-content: space-between; overflow: hidden;">
                        <div style="overflow: hidden;">
                            <span class="module-label" style="font-size: 1.05rem; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${lesson.title}</span>
                            <p style="font-size: 0.85rem; color: var(--slate-500); margin-top: 0.2rem; margin-bottom: 0;">${lesson.desc}</p>
                        </div>
                        ${checkmark}
                    </div>
                `;

                mapPath.appendChild(node);
            });

        } catch (error) {
            console.error("Error cargando el progreso del módulo:", error);
            mapPath.innerHTML = '<p style="color:red;">Error cargando el progreso. Intenta refrescar.</p>';
        }
    });
});
