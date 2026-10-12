# Scam Ya Sach?

A 2-minute, mobile-first browser game that teaches people in India to spot UPI, SMS, WhatsApp and phone-call scams. Players see one realistic message at a time and swipe **left for Scam, right for Sach (genuine)** before a 12-second timer runs out. After each answer, the red flags (or the reasons it is safe) are highlighted inside the message, numbered, with one-line explanations.

Built as a course project for the Executive MBA at IIM Lucknow.

## What's in it

- **Daily Challenge**: the same 10 cards for everyone on a given India date (6 scams of different types, 4 genuine, easy to hard). One attempt per device per day.
- **Practice**: endless, 3 lives, difficulty rises as you get more right.
- **Results**: score, rating (Easy target / Alert / Fraud-proof), accuracy by scam type, the two types you missed most, and a Wordle-style share grid (🟩 right, 🟥 wrong, ⬜ timed out).
- **How to stay safe**: eight plain-language rules, plus the 1930 helpline and cybercrime.gov.in.
- 40 fictional scenarios (24 scams, 16 genuine) covering fake KYC, UPI "receive money" requests, fake customer care, "digital arrest", power-cut threats, job/task scams, parcel fees, lotteries, screen-sharing apps, OTP requests and fake investment groups.
- Light and dark themes, sound effects made with the Web Audio API (with a remembered mute), keyboard support (← Scam, → Sach, Enter for next).
- No backend, no database, no analytics, no login. Nothing personal is asked for or stored; only game progress is kept in the browser's localStorage.

## Run it locally

Requires Node.js 20 or later.

```bash
npm install
npm run dev        # http://localhost:3000
```

Open the address on your phone (same Wi-Fi) with your computer's local IP, for example `http://192.168.1.20:3000`.

## Checks

```bash
npm run lint
npm run typecheck
npm test           # daily selection, scoring, share text, and content checks
npm run check      # all three
npm run build      # production build
```

The content tests make sure every highlighted phrase really appears in its message, every scenario has a takeaway, every scam type from the brief is covered, and no scenario contains a working link, a dialable phone number or a real-looking UPI handle.

## Deploy on Vercel

1. Create an empty GitHub repository and push this folder to it:
   ```bash
   git remote add origin https://github.com/<you>/scam-ya-sach.git
   git push -u origin main
   ```
2. In Vercel, choose **Add New → Project**, import the repository, and keep the defaults (framework: Next.js). No environment variables are needed.
3. Deploy. For the class demo, put the URL of `/play/daily` in a QR code so everyone lands straight on the Daily Challenge.

## Single-file version

`npm run build:standalone` bundles the whole game, fonts included, into one HTML file at `standalone/dist/scam-ya-sach.html`. It works offline and can be opened from a laptop or USB stick as a backup if the venue Wi-Fi fails.

## Project structure

```
app/                 Next.js routes: /, /play/daily, /play/practice, /safety
components/          App (screen switcher), Home, Play, SwipeCard, Message (channel renderers),
                     Timer, Results, Safety, Toggles
content/             scenarios.en.ts (all scenario data, typed), scenarios.ts (by language)
lib/                 Pure game logic: daily.ts (seeded IST daily pick), scoring.ts, share.ts,
                     highlight.ts, storage.ts, sound.ts, prefs.ts, labels.ts, types.ts
standalone/          Single-file build script and entry point
```

Game logic in `lib/` has no React dependency and is unit tested.

## Writing new scenarios

Add an object to `content/scenarios.en.ts`. Each flag's `text` must be copied exactly from the `body`; the tests fail otherwise. Keep these rules:

- Use only the invented organisations (Bharat Pragati Bank, Nayi Disha Wallet, ExampleMart, SwiftDak Couriers, Gangapur Power, Sampark Telecom) or new invented names. No real bank or brand names in scam messages.
- Web addresses must end in `.example`. This top-level domain is reserved and can never point to a real site, which is safer than `example.in` (an ordinary domain someone could own).
- Phone numbers must be masked with X's. UPI handles must use `@exampay`.

## Hindi

UI copy is English with light Hinglish. Fonts (Baloo 2 and Hind) include Devanagari. To add Hindi content, create `content/scenarios.hi.ts` with the same ids and register it in `content/scenarios.ts`.

## Edge cases handled

- Timer runs out: counts as wrong, the reveal still shows.
- Reload mid-card in the Daily Challenge: that card counts as missed, the round resumes from the next card.
- localStorage blocked (private mode): the game works; the daily limit just isn't enforced.
- Midnight rollover while playing: the round finishes on the set it started with.
- Small screens (320px) and long messages: the page scrolls and the answer buttons stay at the bottom.
