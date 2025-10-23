const THEME_KEY = 'themeMode';
const THEME_TEXT = {
  light: 'Dark',
  dark: 'Light',
};

document.addEventListener('DOMContentLoaded', async () => {
  const { groqApiKey } = await chrome.storage.local.get('groqApiKey');
  if (groqApiKey) {
    window.location.href = 'popup.html';
    return;
  }

  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveButton = document.getElementById('saveApiKey');
  const themeToggle = document.getElementById('themeToggle');
  const setupContainer = document.querySelector('.setup');
  const errorMessage = document.createElement('div');
  errorMessage.className = 'error-message';
  setupContainer.appendChild(errorMessage);

  const savedTheme = await getSavedTheme();
  applyTheme(savedTheme);
  themeToggle.textContent = THEME_TEXT[savedTheme];

  themeToggle.addEventListener('click', async () => {
    const isDark = document.body.classList.toggle('dark-mode');
    document.body.classList.toggle('light-mode', !isDark);
    const theme = isDark ? 'dark' : 'light';
    themeToggle.textContent = THEME_TEXT[theme];
    await chrome.storage.local.set({ [THEME_KEY]: theme });
  });

  saveButton.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      errorMessage.textContent = 'Please enter your API key.';
      return;
    }

    errorMessage.textContent = '';

    try {
      await chrome.storage.local.set({ groqApiKey: apiKey });
      await validateGroqKey(apiKey);
      window.location.href = 'popup.html';
    } catch (error) {
      console.error('API key validation error:', error);
      await chrome.storage.local.remove('groqApiKey');
      errorMessage.textContent = error.message || 'Invalid API key. Please try again.';
    }
  });
});

async function getSavedTheme() {
  const { [THEME_KEY]: themeMode } = await chrome.storage.local.get(THEME_KEY);
  const theme = themeMode === 'dark' ? 'dark' : 'light';
  document.body.classList.toggle('light-mode', theme === 'light');
  document.body.classList.toggle('dark-mode', theme === 'dark');
  return theme;
}

function applyTheme(theme) {
  document.body.classList.toggle('light-mode', theme === 'light');
  document.body.classList.toggle('dark-mode', theme === 'dark');
}

async function validateGroqKey(apiKey) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      temperature: 0.7,
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Hello from Hinglish Translator.' }],
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = payload?.error?.message || `Groq API error: ${response.status}`;
    throw new Error(message);
  }
}
