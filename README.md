# OziTuma Dictionary

A multilingual dictionary for African indigenous languages. Search words and compare translations across **18 languages** including Yoruba, Hausa, Igbo, Swahili, Zulu, and more.

Built with **Next.js 16**, **TypeScript**, and a **Rust GraphQL backend**.

## Features

- **Search** — Type any word and search across all 18 languages
- **Language filter** — Click a language chip to narrow results to a specific language
- **Translation preview** — See meanings inline in search results
- **Word detail** — Click a result to see all translations with meanings and usage examples
- **Dark theme** — Clean, modern dark UI

## Languages covered

| Region | Languages |
|--------|-----------|
| 🇳🇬 Nigeria | Yoruba, Hausa, Igbo |
| 🇰🇪 East Africa | Swahili, Luhya (Bukusu, Wanga, Luwanga) |
| 🇿🇦 Southern Africa | Zulu, Xhosa, Swati, Ndebele, Tswana, N. Sotho, S. Sotho, Venda, Tsonga, Afrikaans |

## Getting started

### Prerequisites

- **Node.js** 18+
- **Backend** — The [dictionary-backend](https://github.com/Ozikoro/dictionary-backend) must be running on `http://127.0.0.1:3000`

### Run the frontend

```bash
npm install
npm run dev
```

Opens on **http://localhost:3001** by default.

### Run both (backend + frontend)

```bash
# Terminal 1 — Backend (from dictionary-backend repo)
./target/debug/backend.exe

# Terminal 2 — Frontend
npm run dev
```

The frontend proxies GraphQL requests to the backend via `/api/graphql`.

## Build for production

```bash
npm run build
npm start
```

## Project structure

```
src/
├── app/
│   ├── layout.tsx         # Root layout with metadata
│   ├── page.tsx           # Home / search page
│   ├── word/[id]/page.tsx # Word detail page with translations
│   └── globals.css        # Global styles (dark theme)
└── lib/
    ├── graphql.ts         # GraphQL client and queries
    └── types.ts           # TypeScript interfaces
```
