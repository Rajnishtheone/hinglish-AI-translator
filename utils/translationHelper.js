const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

class TranslationHelper {
  static async translateWithGroq(text, apiKey, { prompt, temperature = 0.7, maxTokens = 1000 } = {}) {
    if (!text || !text.trim()) {
      throw new Error('Nothing to translate.');
    }

    if (!apiKey) {
      const message = chrome.i18n?.getMessage('apiKeyMissing') || 'Please configure your API key first';
      throw new Error(message);
    }

    const systemPrompt =
      prompt ||
      'You convert English text into natural Hinglish (Hindi written in Latin script) while keeping the meaning intact. Respond with the translated text only.';

    const response = await fetch(GROQ_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
      }),
    });

    const fallbackError = chrome.i18n?.getMessage('translationFailed') || 'Translation failed';

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      const detail = payload?.error?.message || response.statusText || response.status;
      throw new Error(`${fallbackError}: ${detail}`);
    }

    const payload = await response.json();
    const translated = payload?.choices?.[0]?.message?.content?.trim();

    if (!translated) {
      throw new Error(fallbackError);
    }

    return translated;
  }

  static isTranslatableText(text) {
    if (!text || text.length < 2) return false;
    if (/^\d+$/.test(text.trim())) return false;
    if (text.startsWith('{') && text.endsWith('}')) return false;
    if (text.startsWith('[') && text.endsWith(']')) return false;
    return true;
  }

  static createTranslationPopup(original, translated) {
    const popup = document.createElement('div');
    popup.className = 'hinglish-popup';

    popup.innerHTML = `
      <div class="hinglish-popup-content">
        <div class="hinglish-original">
          <strong>Original:</strong>
          <span>${original}</span>
        </div>
        <div class="hinglish-translation">
          <strong>Translation:</strong>
          <span>${translated}</span>
        </div>
        <div class="hinglish-popup-actions">
          <button class="hinglish-copy" type="button" title="Copy translation">Copy</button>
          <button class="hinglish-close" type="button" title="Close popup">Close</button>
        </div>
      </div>
    `;

    return popup;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TranslationHelper;
}
