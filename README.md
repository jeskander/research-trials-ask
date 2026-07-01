# Research Trials Ask

Demo RAG assistant for querying clinical trial protocols. Built for clinicians to ask questions about trial protocols with cited source references.

**This is a demonstration only** — not for clinical use.

## Quick start

```bash
npm install
cp .env.example .env.local   # add your OPENAI_API_KEY
# add PDFs to data/pdfs/ and register in data/trials.json
npm run ingest
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API key (protected)

Your OpenAI key must **only** live in `.env.local`:

```bash
OPENAI_API_KEY=sk-...
```

- `.env.local` is **gitignored** and will not be pushed to GitHub
- Never commit `.env`, `.env.local`, or paste keys into source files
- Before pushing to GitHub, run:

```bash
npm run check-secrets
```

On Vercel/hosting, set `OPENAI_API_KEY` in the platform's **environment variables** (not in code).

## Adding real trial PDFs

1. Drop PDFs into `data/pdfs/` (gitignored by default)
2. Copy `data/trials.example.json` format into `data/trials.json`:

```json
[
  {
    "id": "nihr-123456",
    "title": "Full trial title",
    "condition": "Disease area",
    "phase": "III",
    "sponsor": "Sponsor name",
    "protocolFile": "your-file.pdf"
  }
]
```

3. Run `npm run ingest` to chunk, embed, and write indexes to `data/index/`
4. Re-run ingest whenever PDFs or `trials.json` change

Re-ingest one trial: `npm run ingest -- nihr-123456`

## What gets committed to GitHub

| Path | Committed? |
|------|------------|
| `.env.local` | **No** (secrets) |
| `data/pdfs/*.pdf` | **No** (gitignored — confidential protocols) |
| `data/index/*.json` | **No** (regenerate with ingest) |
| Source code, `trials.json` metadata | Yes |

If you want PDFs or indexes in the repo (e.g. private repo), remove the relevant lines from `.gitignore`.

## How it works

- Select a trial from the sidebar to scope questions to that protocol
- Ask questions in natural language; the app retrieves relevant chunks and streams an answer with page citations
- Click a citation (`p.12`) or source card to view the protocol excerpt
- Refresh the page to reset all chat state (no persistence)
