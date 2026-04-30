import { auth, db, getEffectiveUser } from './auth.js';
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

        // Suplantación de identidad para soporte
        const effectiveUser = await getEffectiveUser();
        const effectiveUid = effectiveUser.uid;

        try {
            const userRef = doc(db, 'users', effectiveUid);
            const userSnap = await getDoc(userRef);
            let completedLessons = [];
            let moduleStars = {};

            if (userSnap.exists()) {
                const data = userSnap.data();
                completedLessons = data.completedLessons || [];
                moduleStars = data.moduleStars || {};
                
                // --- VERIFICACIÓN DE ACCESO ---
                const unlocked = data.unlockedModules || ['m1'];
                const freeModId = data.freeModuleId || 'm1';
                const isPremium = data.isPremium || false;
                const isCompleted = completedLessons.includes(`${moduleId}l20`);

                const hasAccess = isPremium || (moduleId === freeModId) || unlocked.includes(moduleId) || isCompleted;

                if (!hasAccess) {
                    console.warn("Acceso denegado al módulo:", moduleId);
                    window.location.href = "mapa.html?error=locked";
                    return;
                }
                // -----------------------------

                // Actualizar Progreso Visual
                const progressContainer = document.getElementById('module-progress-container');
                const progressFill = document.getElementById('progress-fill');
                const avatarMarker = document.getElementById('avatar-marker');
                
                if (progressContainer && config.lessons) {
                    progressContainer.style.display = 'block';
                    const total = config.lessons.length;
                    const completedInModule = config.lessons.filter(l => completedLessons.includes(l.id)).length;
                    const percentage = total > 0 ? (completedInModule / total) * 100 : 0;
                    
                    // Pequeño delay para que la transición se vea al entrar
                    setTimeout(() => {
                        progressFill.style.width = `${percentage}%`;
                        avatarMarker.style.left = `${percentage}%`;
                        if (data.avatar) avatarMarker.textContent = data.avatar;
                    }, 300);
                }
            }

            // Práctica Diaria Infinita
            const practiceNode = document.createElement('div');
            practiceNode.className = `module-node unlocked`;
            practiceNode.style.width = '100%';
            practiceNode.style.height = 'auto';
            practiceNode.style.padding = '1.2rem';
            practiceNode.style.marginBottom = '2rem';
            practiceNode.style.border = '2px dashed var(--forest-glow)';
            practiceNode.style.cursor = 'pointer';
            practiceNode.onclick = () => window.location.href = `lesson.html?id=daily_practice&module=${moduleId}`;
            practiceNode.innerHTML = `
                <span class="module-icon" style="background: var(--forest-glow); margin-right: 1.25rem;">✨</span>
                <div style="flex: 1; display:flex; align-items:center; justify-content: space-between; overflow: hidden;">
                    <div style="overflow: hidden; padding-right: 0.5rem;">
                        <span class="module-label" style="font-size: 1.15rem; color: #fff; display: block;">Práctica Diaria Infinita</span>
                        <p style="font-size: 0.85rem; color: var(--slate-300); margin-top: 0.2rem; margin-bottom: 0;">Domina lo aprendido con retos aleatorios.</p>
                    </div>
                </div>
            `;
            mapPath.appendChild(practiceNode);

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

                const starsCount = moduleStars[lesson.id] || 0;
                let starsHtml = '';
                if (isCompleted) {
                    for (let i = 0; i < 3; i++) {
                        starsHtml += `<span style="color: ${i < starsCount ? '#facc15' : 'var(--slate-300)'}; font-size: 1rem; text-shadow: 0 1px 1px rgba(0,0,0,0.1); margin-left: 2px;">⭐</span>`;
                    }
                    if (starsCount === 0) {
                        // Caso legacy (las completó antes de las estrellas)
                        starsHtml = '<span style="color: var(--success); font-weight: bold; font-size: 1.2rem; margin-left: 1rem;">✔</span>';
                    }
                }

                const checkmark = isCompleted ? `<div style="display:flex; align-items:center;">${starsHtml}</div>` : '';

                node.innerHTML = `
                    <span class="module-icon" style="background: ${iconBg}; margin-right: 1.25rem;">${lesson.icon}</span>
                    <div style="flex: 1; display:flex; align-items:center; justify-content: space-between; overflow: hidden;">
                        <div style="overflow: hidden; padding-right: 0.5rem;">
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
