import { auth, db } from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

function unlockLesson(elementId, url) {
    const el = document.getElementById(elementId);
    if (el) {
        el.classList.remove('locked');
        el.classList.add('unlocked');
        // Remover cualquier borde dashed u opacidad extra si la hubiera
        el.style.opacity = '1';
        el.style.filter = 'none';
        el.style.cursor = 'pointer';
        el.onclick = () => window.location.href = url;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        try {
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const data = userSnap.data();
                const completedLessons = data.completedLessons || [];

                // 1.1 siempre está desbloqueada por defecto en el HTML

                // Lógica de desbloqueo en cadena
                if (completedLessons.includes('m1l1')) {
                    unlockLesson('lesson-m1l2', 'm1l2.html');
                }
                if (completedLessons.includes('m1l2')) {
                    unlockLesson('lesson-m1l3', 'm1l3.html');
                }
                if (completedLessons.includes('m1l3')) {
                    unlockLesson('lesson-m1l4', 'm1l4.html');
                }
                if (completedLessons.includes('m1l4')) {
                    // La lección 1.5 es especial, aseguramos sobreescribir sus atributos
                    const finalLesson = document.getElementById('lesson-m1l5');
                    if (finalLesson) {
                        finalLesson.classList.remove('locked');
                        finalLesson.classList.add('unlocked');
                        finalLesson.style.cursor = 'pointer';
                        finalLesson.style.opacity = '1';
                        finalLesson.style.filter = 'none';
                        finalLesson.onclick = () => window.location.href = 'm1l5.html';
                    }
                }
            }
        } catch (error) {
            console.error("Error cargando el progreso de lecciones:", error);
        }
    });
});
