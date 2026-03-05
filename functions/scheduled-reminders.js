const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const fetch = require("node-fetch");

// Initialize Admin SDK (Requires FIREBASE_SERVICE_ACCOUNT in env)
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.error("No service account found. Scheduled reminders aborted.");
} else {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (e) {
        console.error("Error parsing service account:", e);
    }
}

const db = getFirestore();

/**
 * Netlify Scheduled Function (Runs every 10 minutes)
 * CRON: "*/10 * * * * "
    */
exports.handler = async (event, context) => {
    console.log("⏰ Running Scheduled Reminders...");

    try {
        const now = new Date();
        const tenMinutesFromNow = new Date(now.getTime() + 15 * 60000); // 15 mins window

        // 1. Fetch booked slots starting soon
        // Note: This is an example. To work properly, date/time needs to be queryable.
        const slotsRef = db.collection('slots');
        const snapshot = await slotsRef
            .where('status', '==', 'booked')
            .where('reminderSent', '==', false)
            .get();

        if (snapshot.empty) {
            console.log("No pending reminders.");
            return { statusCode: 200 };
        }

        for (const doc of snapshot.docs) {
            const slot = doc.data();
            const slotDate = new Date(`${slot.date}T${slot.startTime}`);

            // If slot is within next 15 mins
            if (slotDate > now && slotDate <= tenMinutesFromNow) {
                console.log(`Sending reminder for slot ${doc.id}`);

                // Fetch teacher Discord ID
                const teacherSnap = await db.collection('users').doc(slot.teacherId).get();
                const teacherData = teacherSnap.data();
                const discordId = teacherData?.teacherProfile?.discordId;

                if (discordId) {
                    // Send DM via our other Netlify function
                    // (Or duplicate the discord logic here for efficiency)
                    await fetch(`https://${process.env.URL}/.netlify/functions/discord`, {
                        method: 'POST',
                        body: JSON.stringify({
                            recipient_id: discordId,
                            title: "⏰ ¡Misión en 15 Minutos!",
                            description: `¡Hola Prof! Tu clase con **${slot.studentName}** comienza pronto.\n\n**Hora:** ${slot.startTime} hrs\n**Misión:** ${slot.evaluationType}\n\n[Entrar a sesión (Zoom)](${teacherData.teacherProfile.zoomLink})`,
                            color: 16763904 // Dorado
                        })
                    });

                    // Mark as sent
                    await doc.ref.update({ reminderSent: true });
                }
            }
        }

        return { statusCode: 200, body: "Reminders processed" };
    } catch (err) {
        console.error("Scheduled task error:", err);
        return { statusCode: 500, body: err.toString() };
    }
};
