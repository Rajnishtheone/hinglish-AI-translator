const THEME_KEY = 'themeMode';
const THEME_TEXT = {
  light: 'Dark',
  dark: 'Light',
};

document.addEventListener('DOMContentLoaded', async () => {
  const themeToggleBtn = document.getElementById('themeToggle');
  const apiKeyInput = document.getElementById('apiKey');
  const apiKeyContainer = document.getElementById('apiKeyContainer');
  const apiKeyStatus = document.getElementById('apiKeyStatus');
  const toggleApiKey = document.getElementById('toggleApiKey');
  const saveApiKey = document.getElementById('saveApiKey');
  const changeApiKey = document.getElementById('changeApiKey');
  const removeApiKey = document.getElementById('removeApiKey');
  const translationStyle = document.getElementById('translationStyle');
  const languageLevel = document.getElementById('languageLevel');
  const saveSettings = document.getElementById('saveSettings');

  const initialTheme = await getSavedTheme();
  applyTheme(initialTheme);
  themeToggleBtn.textContent = THEME_TEXT[initialTheme];

  themeToggleBtn.addEventListener('click', async () => {
    const newTheme = document.body.classList.toggle('dark-mode') ? 'dark' : 'light';
    themeToggleBtn.textContent = THEME_TEXT[newTheme];
    await chrome.storage.local.set({ [THEME_KEY]: newTheme });
  });

  const { groqApiKey } = await chrome.storage.local.get('groqApiKey');
  if (!groqApiKey) {
    window.location.href = 'welcome.html';
    return;
  }

  setApiKeyConfigured(apiKeyStatus);

  const { translationSettings } = await chrome.storage.local.get('translationSettings');
  if (translationSettings) {
    translationStyle.value = translationSettings.style || 'hinglish';
    languageLevel.value = translationSettings.level || 'balanced';
  }

  toggleApiKey.addEventListener('click', () => {
    const isPassword = apiKeyInput.type === 'password';
    apiKeyInput.type = isPassword ? 'text' : 'password';
    toggleApiKey.textContent = isPassword ? 'Hide' : 'Show';
  });

  saveApiKey.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      showError('Enter your Groq API key to continue.');
      return;
    }

    try {
      await chrome.storage.local.set({ groqApiKey: apiKey });
      await validateGroqKey(apiKey);

      showSuccess('API key saved successfully.');
      apiKeyInput.value = '';
      apiKeyInput.type = 'password';
      toggleApiKey.textContent = 'Show';
      apiKeyContainer.style.display = 'none';
      setApiKeyConfigured(apiKeyStatus);
    } catch (error) {
      console.error('API key validation error:', error);
      await chrome.storage.local.remove('groqApiKey');
      showError(error.message || 'Failed to validate API key.');
    }
  });

  changeApiKey.addEventListener('click', () => {
    apiKeyContainer.style.display = 'block';
  });

  removeApiKey.addEventListener('click', async () => {
    try {
      await chrome.storage.local.remove('groqApiKey');
      window.location.href = 'welcome.html';
    } catch (error) {
      console.error('Error removing API key:', error);
      showError('Failed to remove API key.');
    }
  });

  saveSettings.addEventListener('click', async () => {
    const settings = {
      style: translationStyle.value,
      level: languageLevel.value,
    };

    try {
      await chrome.storage.local.set({ translationSettings: settings });
      showSuccess('Settings saved.');
    } catch (error) {
      console.error('Error saving settings:', error);
      showError('Failed to save settings.');
    }
  });
});

async function getSavedTheme() {
  const { [THEME_KEY]: themeMode } = await chrome.storage.local.get(THEME_KEY);
  return themeMode === 'dark' ? 'dark' : 'light';
}

function applyTheme(theme) {
  document.body.classList.toggle('dark-mode', theme === 'dark');
}

function setApiKeyConfigured(element) {
  element.textContent = 'API key configured';
  element.style.color = '#0b8043';
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
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello' },
      ],
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = payload?.error?.message || `Groq API error: ${response.status}`;
    throw new Error(message);
  }
}

function showSuccess(message) {
  showToast(message, 'success-message');
}

function showError(message) {
  showToast(message, 'error-message');
}

function showToast(message, className) {
  const toast = document.createElement('div');
  toast.className = className;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
