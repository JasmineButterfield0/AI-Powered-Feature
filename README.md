Reflections: 

1. I built an AI-powered text classification feature using a local LLM with Ollama. I chose Option A because it seemed like the fastest and simplest way to actually get something working without having to deal with API keys or setting up external services. The app lets a user type in text and then classifies it as a “question,” “complaint,” or “feedback.” I also added streaming responses and caching so it would meet the Complete Tier requirements.

2. What surprised me the most was how many small issues came up even though the idea itself was pretty simple. At first, I ran into errors like “command not found,” which turned out to be because Ollama wasn’t installed. Then I got errors like “404 Not Found” and “400 Bad Request,” which were caused by using the wrong API endpoint or formatting the request incorrectly. It was also frustrating that if Ollama wasn’t running or the model wasn’t pulled, nothing worked at all. Honestly, debugging took way longer than writing the actual code for the UI.

3. I learned that LLM APIs are really sensitive to how you structure requests. Even a small mistake in the URL or body can completely break everything. Using Ollama locally was nice because I didn’t need an API key, but it also meant I had to manage everything myself, like making sure the server was running and the model was installed. It definitely helped me understand how these systems work behind the scenes.

4. If I had more time, I would improve the design and make the classifications more accurate by tweaking the prompt more. I’d also maybe store past results instead of just caching them temporarily. Overall, this project helped me go from just learning about APIs to actually using one in a real app.

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
