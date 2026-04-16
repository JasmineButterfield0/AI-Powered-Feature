# AI Text Classifier

A minimal web app that uses a **local LLM (Ollama)** to classify any text as a **question**, **complaint**, or **feedback** — with streaming responses and in-memory caching.

## Features

| Feature | Details |
|---|---|
| LLM API call | Sends prompts to Ollama at `http://localhost:11434/api/generate` |
| Model | `gemma4:e2b` |
| Streaming | Response tokens appear in real time (`stream: true`) |
| Caching | Same input? Returns instantly from memory — no second API call |
| Error handling | Shows a friendly message if Ollama is not running |

## Project structure

```
text-classifier/
├── index.html   ← page layout & markup
├── style.css    ← all visual styling
├── script.js    ← API calls, streaming, caching logic
└── README.md    ← this file
```

## Prerequisites

- [Ollama](https://ollama.com) installed on your machine

## Quick start

```bash
# 1. Start the Ollama server
ollama serve

# 2. Pull the model (first time only — ~1 GB download)
ollama pull gemma4:e2b

# 3. Open the app
#    Just double-click index.html  OR  run a tiny local server:
npx serve .
# then visit http://localhost:3000
```

> **Note:** Opening `index.html` directly via `file://` works in most browsers.
> If you see CORS errors, use `npx serve .` or `python3 -m http.server 8080` instead.

## Test inputs

| Input | Expected |
|---|---|
| `Why is my order still not here?` | question |
| `How do I reset my password?` | question |
| `The app keeps crashing every time I open it.` | complaint |
| `Your customer service was incredibly rude.` | complaint |
| `I love the new dark mode — great addition!` | feedback |
| `The onboarding flow could be clearer.` | feedback |

Submit the same input twice to see the cache in action (the ⚡ badge appears).

## How it works

1. User types text and clicks **Classify**.
2. The cache is checked first. Cache hit → instant result, no API call.
3. Cache miss → `fetch()` POSTs to Ollama with `stream: true`.
4. The `ReadableStream` is read chunk by chunk; each chunk is a JSON line with a `response` token.
5. Tokens are appended to the display in real time.
6. Once the stream ends, the first word is parsed to determine the category badge colour.
7. The full response is saved to the cache for future lookups.

## Troubleshooting

| Problem | Fix |
|---|---|
| "Could not reach Ollama" | Run `ollama serve` in a terminal |
| Model not found | Run `ollama pull gemma4:e2b` |
| CORS error in browser | Serve the files with `npx serve .` instead of opening directly |
| Blank badge / "unknown" | The model gave an unexpected response — try rephrasing |

## License

MIT — free to use and modify.
