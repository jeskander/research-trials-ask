# Trial protocol PDFs

Drop your trial protocol PDFs here (one PDF per trial).

**These files are gitignored by default** — they will not be pushed to GitHub unless you remove `/data/pdfs/*.pdf` from `.gitignore`.

## Steps

1. Copy your PDF into this folder, e.g. `my-trial-protocol.pdf`

2. Register it in `data/trials.json`:

```json
{
  "id": "nihr-123456",
  "title": "Full trial title as shown to clinicians",
  "condition": "e.g. Type 2 diabetes",
  "phase": "III",
  "sponsor": "Trial sponsor name",
  "protocolFile": "my-trial-protocol.pdf"
}
```

3. Ensure `.env.local` contains your `OPENAI_API_KEY`

4. Run ingestion:

```bash
npm run ingest
```

To re-ingest a single trial:

```bash
npm run ingest -- nihr-123456
```
