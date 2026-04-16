// ============================================================
// script.js — AI Text Classifier
// Sends text to a local Ollama API, streams the response,
// classifies into question / complaint / feedback,
// and caches results so the same input never calls the API twice.
// ============================================================

// --- Configuration ------------------------------------------

// The local Ollama endpoint for text generation
const OLLAMA_URL = "http://localhost:11434/api/generate";

// The model we want Ollama to use
const MODEL = "gemma4:e2b";

// The three valid categories the model can return
const VALID_CATEGORIES = ["question", "complaint", "feedback"];

// --- Simple in-memory cache ---------------------------------
// We use a plain JavaScript object as a key→value store.
// Key   = the user's input text (trimmed, lowercased for consistency)
// Value = the full LLM response string
//
// This cache lives only as long as the page is open.
// If you wanted it to persist, you could swap this for localStorage.
const responseCache = {};

// --- DOM references -----------------------------------------
// Grab every element we need to read from or write to.
const userInput    = document.getElementById("userInput");
const classifyBtn  = document.getElementById("classifyBtn");
const resultBox    = document.getElementById("resultBox");
const categoryBadge = document.getElementById("categoryBadge");
const streamOutput = document.getElementById("streamOutput");
const errorBox     = document.getElementById("errorBox");
const errorMsg     = document.getElementById("errorMsg");
const cacheNote    = document.getElementById("cacheNote");

// --- Event listener -----------------------------------------
// When the user clicks "Classify", run our main function.
classifyBtn.addEventListener("click", handleClassify);

// Also allow pressing Enter (without Shift) inside the textarea.
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault(); // don't insert a newline
    handleClassify();
  }
});

// --- Main handler -------------------------------------------
async function handleClassify() {
  // 1. Read and clean the user's input
  const rawText = userInput.value.trim();

  // Don't do anything if the box is empty
  if (!rawText) {
    showError("Please enter some text before classifying.");
    return;
  }

  // 2. Create a cache key — use lowercase so "Hello?" and "hello?" share a slot
  const cacheKey = rawText.toLowerCase();

  // 3. Check the cache first
  if (responseCache[cacheKey] !== undefined) {
    // We already have a result — no need to hit the API
    displayResult(responseCache[cacheKey], /*fromCache=*/ true);
    return;
  }

  // 4. Not cached → call the Ollama API with streaming
  resetUI();                // clear previous results / errors
  setLoading(true);         // disable button, show "thinking" badge

  try {
    const fullResponse = await streamFromOllama(rawText);

    // Save the full response to the cache before displaying
    responseCache[cacheKey] = fullResponse;

    displayResult(fullResponse, /*fromCache=*/ false);
  } catch (err) {
    // Handle network errors (e.g. Ollama not running)
    showError(
      "Could not reach Ollama. Make sure it is running with:\n" +
      "  ollama serve\n\n" +
      "Also confirm the model is pulled:\n" +
      "  ollama pull " + MODEL + "\n\n" +
      "Error details: " + err.message
    );
  } finally {
    setLoading(false); // re-enable button regardless of success/failure
  }
}

// --- Streaming API call -------------------------------------
// Sends the prompt to Ollama with stream:true.
// Reads the response chunk by chunk, updating the UI in real time.
// Returns the complete accumulated response text when done.
async function streamFromOllama(userText) {
  // Build a clear, instructional prompt.
  // We tell the model exactly what to output so it stays on task.
  const prompt =
    `You are a text classification assistant. ` +
    `Classify the following text into EXACTLY one of these three categories: ` +
    `"question", "complaint", or "feedback".\n\n` +
    `Rules:\n` +
    `- Respond with the category name first (one word), then a brief one-sentence reason.\n` +
    `- The first word of your response MUST be one of: question, complaint, feedback.\n\n` +
    `Text to classify: "${userText}"`;

  // Make the fetch request to Ollama
  const response = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      prompt: prompt,
      stream: true
    }),
  });

  // If the server returned a non-OK status, throw an error
  if (!response.ok) {
    throw new Error(`Ollama returned HTTP ${response.status}: ${response.statusText}`);
  }

  // --- Read the stream ----------------------------------------
  // Ollama sends a series of newline-delimited JSON objects, e.g.:
  //   {"model":"gemma4:e2b","response":"question","done":false}
  //   {"model":"gemma4:e2b","response":" — the","done":false}
  //   ...
  //   {"model":"gemma4:e2b","response":"","done":true}

  const reader = response.body.getReader();     // ReadableStreamDefaultReader
  const decoder = new TextDecoder("utf-8");     // converts bytes → string
  let fullText = "";                            // accumulated response

  while (true) {
    // Read the next chunk of bytes from the stream
    const { value, done } = await reader.read();

    // When done is true, the stream has ended — break out of the loop
    if (done) break;

    // Decode the bytes into a string (may contain multiple lines)
    const chunk = decoder.decode(value, { stream: true });

    // Each line is a separate JSON object — split on newlines and process each
    const lines = chunk.split("\n").filter((line) => line.trim() !== "");

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);

        // The "response" field contains the next token (a word or part of a word)
        if (parsed.response) {
          fullText += parsed.response;

          // Update the raw stream output in real time so the user can watch it appear
          streamOutput.textContent = fullText;

          // Also try to parse the category live as it streams in
          updateBadgeLive(fullText);
        }

        // "done: true" means this is the final JSON object — we can stop
        if (parsed.done) break;

      } catch (_parseError) {
        // Ignore lines that aren't valid JSON (shouldn't happen, but just in case)
      }
    }
  }

  return fullText;
}

// --- Live badge update (during streaming) -------------------
// As tokens stream in, check if the first word already matches a category.
// Shows an amber "thinking" badge until a match is found.
function updateBadgeLive(text) {
  const firstWord = text.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, "");

  if (VALID_CATEGORIES.includes(firstWord)) {
    // We have a confirmed category — show the coloured badge right away
    setBadge(firstWord);
  } else {
    // Still streaming — show a neutral "thinking" state
    setBadge("thinking", "classifying…");
  }
}

// --- Display final result -----------------------------------
// Called once the full LLM response is available (from stream or cache).
function displayResult(fullText, fromCache) {
  // Parse the final category from the full response text
  const category = parseCategory(fullText);

  // Show the result card
  resultBox.classList.remove("hidden");

  // Set the final coloured badge
  if (category) {
    setBadge(category);
  } else {
    // Model didn't follow instructions — show a fallback
    setBadge("unknown");
    categoryBadge.textContent = "unknown";
  }

  // Show the raw model output underneath the badge
  streamOutput.textContent = fullText.trim();

  // Show or hide the cache note
  if (fromCache) {
    cacheNote.classList.remove("hidden");
  } else {
    cacheNote.classList.add("hidden");
  }
}

// --- Parse category from text -------------------------------
// Looks at the first real word of the LLM response.
// Returns "question", "complaint", "feedback", or null.
function parseCategory(text) {
  const firstWord = text.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, "");
  return VALID_CATEGORIES.includes(firstWord) ? firstWord : null;
}

// --- Set the category badge --------------------------------
// Updates the badge text and applies the matching CSS class.
function setBadge(category, overrideLabel) {
  // Remove any previously applied category class
  categoryBadge.classList.remove(...VALID_CATEGORIES, "thinking", "unknown");

  // Apply the new class (drives the CSS colour)
  categoryBadge.classList.add(category);

  // Set the visible text (use override label if provided, otherwise use category name)
  categoryBadge.textContent = overrideLabel || category;
}

// --- Show an error message ----------------------------------
function showError(message) {
  errorBox.classList.remove("hidden");
  errorMsg.textContent = message;
  resultBox.classList.add("hidden");
  cacheNote.classList.add("hidden");
}

// --- Loading state ------------------------------------------
// Disables the button while a request is in flight.
function setLoading(isLoading) {
  classifyBtn.disabled = isLoading;
  classifyBtn.textContent = isLoading ? "Classifying…" : "Classify";
}

// --- Reset UI -----------------------------------------------
// Clears result/error areas before a new request.
function resetUI() {
  resultBox.classList.add("hidden");
  errorBox.classList.add("hidden");
  cacheNote.classList.add("hidden");
  streamOutput.textContent = "";
  categoryBadge.textContent = "";
  categoryBadge.className = "badge"; // reset all class modifiers
}
