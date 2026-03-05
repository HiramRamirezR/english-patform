# 🤖 Moonsforest Discord Bot - Implementation Plan

## 🎯 Objective
Create a simple Discord bot to notify teachers via Direct Message (DM) about specific platform events, ensuring they never miss a booking or a referral.

## 🚀 Phases

### Phase 1: Preparation (Infrastructure) ✅
- [x] **Create Discord Application:** Set up the bot in the [Discord Developer Portal](https://discord.com/developers/applications).
- [x] **Configure Intents:** Enable `Server Members Intent` to allow the bot to find teachers in the server.
- [x] **Data Schema:** Add `discordId` field to teacher profiles in Firestore.
- [x] **Profile Management:** Allow teachers to edit their profile and save their Discord User ID.

### Phase 2: Bot Logic (Netlify Functions) 🚧
- [ ] **Bot Token:** Securely store the `DISCORD_BOT_TOKEN` in Netlify environment variables.
- [x] **DM Function:** Created/Updated `functions/discord.js` to handle DMs via Discord API v10.
- [x] **Frontend Helper:** Updated `public/js/discord.js` to support `recipientId`.

### Phase 3: Event Triggers 🚧
- [x] **New Evaluations:** Notify the teacher via DM when a student books a slot.
- [x] **Referral Registrations:** Notify the teacher via DM when a new student joins using their `refCode`.
- [ ] **Payment Completion:** Notify when a payment (Mercado Pago) is confirmed. *(Pending: MP Webhook integration)*.

## 💡 Future & Growth Ideas (Moon Bot)

### Phase 4: Teacher Motivation & Retention 🚧
- [ ] **Earning Alerts:** DM teachers when a payment is marked as "completed" (e.g., *"¡Generaste $150 MXN! Acumulado semanal: $800"*).
- [ ] **Class Reminders:** DM 10-15 minutes before a session starts with the student name and Zoom link.
- [ ] **Weekly Summaries:** DM a report every Sunday with hours taught, earnings, and new referrals.

### Phase 5: Operational Efficiency 🚧
- [ ] **Demand Alerts:** Notify in the team channel when pupils search for slots and find zero availability (to encourage opening more slots).
- [ ] **Automated Onboarding:** Send a welcome DM to new teachers with an orientation video and a link to complete their profile.
- [ ] **Admin Quick Actions:** Use Discord buttons (e.g., `[Verify CV]`, `[Block Slot]`) to manage teachers directly from the chat.

### Phase 6: Viral Growth & Gamification 🚧
- [ ] **Referral Milestones:** DM teachers when they hit 5, 10 or 50 active referrals with a badge or higher commission.
- [ ] **Student Progress DM:** Notify teachers when one of their students levels up or completes a module.

## 📝 Change Log
- **2026-03-04:** Plan initialized. Identified the need for `discordId` in teacher profiles.
