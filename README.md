# Dienstplan

Interne Web-App für Dienstplanung und Zeiterfassung (bis ~10 Mitarbeiter).

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Prisma · PostgreSQL (Neon) · Auth.js v5 · Deploy auf Vercel

## Phasen

1. ~~Grundgerüst + Login + Deployment~~ ✓
2. ~~Mitarbeiterprofile~~ ✓ (Liste, Einladungslink, bearbeiten, Passwort ändern)
3. ~~Zeiterfassung~~ ✓ (Stempeluhr, manuelle Einträge, Pausenlogik, Admin-Freigabe)
4. **Schichtplan mit Vorlagen** ← _aktuell_ (Wochenraster, Vorlagen, Vorwoche kopieren)
5. Urlaub + NRW-Feiertage
6. Auswertungen + PDF/CSV-Export

## Lokal einrichten

```bash
npm install
cp .env.example .env      # dann .env ausfüllen (siehe unten)
npm run db:push           # Tabellen in der Datenbank anlegen
npm run db:seed           # Admin-Konto aus ADMIN_* in .env anlegen
npm run dev               # http://localhost:3000
```

### `.env`

| Variable         | Woher                                                                    |
| ---------------- | ----------------------------------------------------------------------- |
| `DATABASE_URL`   | Neon-Dashboard → Connection string (Pooled), mit `?sslmode=require`     |
| `AUTH_SECRET`    | `npx auth secret` oder `openssl rand -base64 33`                        |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | Zugangsdaten für das erste Admin-Konto (nur für `db:seed`) |
| `RESEND_API_KEY` | Optional. Von [resend.com](https://resend.com) – für Einladungs-E-Mails. Ohne Key wird der Link nur im Admin-Bereich angezeigt. |
| `EMAIL_FROM`     | Optional. Absenderadresse (erst nach Domain-Verifizierung bei Resend).  |

## Deployment (Vercel)

1. Repo zu GitHub pushen.
2. Auf [vercel.com](https://vercel.com) → **New Project** → GitHub-Repo importieren.
3. Environment Variables setzen: `DATABASE_URL`, `AUTH_SECRET`.
   `AUTH_URL` wird auf Vercel automatisch erkannt.
4. Deploy. Danach einmalig `npx prisma db push` und `npm run db:seed`
   lokal gegen die Produktions-`DATABASE_URL` ausführen (oder via Neon SQL Editor).

## Nützliche Skripte

| Befehl              | Zweck                                  |
| ------------------- | -------------------------------------- |
| `npm run dev`       | Dev-Server                             |
| `npm run build`     | Produktions-Build (inkl. `prisma generate`) |
| `npm run db:push`   | Schema → Datenbank (ohne Migration)    |
| `npm run db:seed`   | Admin-Konto anlegen/aktualisieren      |
| `npm run db:studio` | Prisma Studio (DB im Browser)          |
| `npm run lint`      | ESLint                                 |
