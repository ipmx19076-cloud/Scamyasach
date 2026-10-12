# Scam Ya Sach?

Got a message that feels off? Paste any SMS, WhatsApp message, email, UPI request or a description of a phone call, and Scam Ya Sach? tells you whether it looks like a **scam**, **suspicious**, or **genuine**, with the warning signs highlighted inside the message and clear next steps.

It also includes a 2-minute training game (at `/game`) for the class demo: swipe left on scams and right on genuine messages.

Built as a course project for the Executive MBA at IIM Lucknow.

## How the checker works

1. **Privacy first, on the phone.** Before anything is sent, the app hides one-time codes (`[code]`), account and card numbers (`[number]`), and partly masks phone numbers.
2. **Pattern check.** A built-in rule set (`lib/rules.ts`) looks for classic Indian scam signs: entering a UPI PIN to "receive" money, OTP requests, KYC links, .apk files, screen-sharing apps, "digital arrest", fees to claim prizes or parcels, guaranteed returns, task jobs, threats and urgency.
3. **AI check.** The server route `/api/check` asks Claude (through the Anthropic API) to judge the message and quote the exact words that are red flags. The answer is validated; any quote that isn't really in the message is dropped.
4. **Combined verdict.** If the AI calls a message genuine but the pattern check found a serious red flag, the verdict becomes "suspicious" and the reason is shown.
5. **Fallback.** If the API key is missing, the API fails, or the phone is offline, the app still answers using the pattern check and says so.

Messages are never stored or logged. The result always includes what to do next, and for scams, the 1930 helpline and cybercrime.gov.in.

## Set up the AI check

1. Create an API key at https://console.anthropic.com.
2. In Vercel, open your project, go to **Settings → Environment Variables**, add `ANTHROPIC_API_KEY` with your key, and redeploy.
3. For local development, copy `.env.example` to `.env.local` and put the key there. `.env.local` is git-ignored.
4. Optional: set `CHECK_MODEL` to choose the model. The default is `claude-sonnet-5-5`; `claude-haiku-5-5` is cheaper and faster.

The route has a simple per-IP limit (8 checks a minute) to protect your API bill during a public demo.

## The training game

- **Daily Challenge**: the same 10 cards for everyone on a given India date (6 scams of different types, 4 genuine, easy to hard). One attempt per device per day.
- **Practice**: endless, 3 lives, difficulty rises as you get more right.
- **Results**: score, rating (Easy target / Alert / Fraud-proof), accuracy by scam type, the two types you missed most, and a Wordle-style share grid (🟩 right, 🟥 wrong, ⬜ timed out).
- **How to stay safe**: eight plain-language rules, plus the 1930 helpline and cybercrime.gov.in.
- 40 fictional scenarios (24 scams, 16 genuine) covering fake KYC, UPI "receive money" requests, fake customer care, "digital arrest", power-cut threats, job/task scams, parcel fees, lotteries, screen-sharing apps, OTP requests and fake investment groups.
- Light and dark themes, sound effects made with the Web Audio API (with a remembered mute), keyboard support (← Scam, → Sach, Enter for next).
- No database, no analytics, no login. Game progress is kept only in the browser's localStorage.

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
npm test           # pattern check, masking, verdict merge, daily selection, scoring, content
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
2. In Vercel, choose **Add New → Project**, import the repository, and keep the defaults (framework: Next.js).
3. Add `ANTHROPIC_API_KEY` (see above) and deploy.
4. For the class demo, put the URL of `/play/daily` in a QR code so everyone lands straight on the Daily Challenge, and demo the checker on `/`.

## Single-file version

`npm run build:standalone` bundles the app, fonts included, into one HTML file at `standalone/dist/scam-ya-sach.html`. It works offline (the checker uses the pattern check only) and can be opened from a laptop or USB stick as a backup if the venue Wi-Fi fails.

## Project structure

```
app/                 Routes: / (checker), /game, /play/daily, /play/practice, /safety, /api/check
components/          App (screen switcher), Checker, GameHome, Play, SwipeCard, Message (channel renderers),
                     Timer, Results, Safety, Toggles
content/             scenarios.en.ts (all scenario data, typed), scenarios.ts (by language)
lib/                 rules.ts (pattern check), redact.ts (privacy masking), check.ts (verdict merge),
                     prompt.ts (AI instructions), daily.ts (seeded IST daily pick), scoring.ts, share.ts,
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
