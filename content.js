const TRANSLATE_PAGE_ACTION = 'translatePage';
const TRANSLATION_ACTION = 'translateText';
const TRANSLATION_ERROR_PREFIX = 'Translation error:';
const MAX_TEXT_LENGTH = 700;

const apiKeyMissingMessage =
  chrome.i18n.getMessage('apiKeyMissing') || 'Please configure your API key first';
const defaultTranslationError =
  chrome.i18n.getMessage('translationFailed') || 'Translation failed';

const localTranslationCache = new Map();

chrome.runtime.onMessage.addListener((request) => {
  if (request.action === TRANSLATE_PAGE_ACTION) {
    translatePageContent();
  }
});

async function translatePageContent() {
  const loadingIndicator = createLoadingIndicator();

  try {
    const { translationMode } = await chrome.storage.local.get(['translationMode']);
    const mode = translationMode || 'paragraphs';

    if (mode === 'paragraphs') {
      await translateParagraphs();
    } else {
      await translateAllText();
    }

    showLoadingSuccess(loadingIndicator);
  } catch (error) {
    console.error('Page translation error:', error);
    showLoadingError(loadingIndicator, error?.message || defaultTranslationError);
  }
}

async function translateParagraphs() {
  const nodes = document.querySelectorAll(
    'p, h1, h2, h3, h4, h5, h6, li, span, div, blockquote'
  );

  for (const element of nodes) {
    if (!isElementEligible(element)) {
      continue;
    }

    const originalText = element.textContent.trim();
    if (!originalText || shouldSkipText(originalText)) {
      continue;
    }

    try {
      const translation = await requestTranslation(originalText);
      if (!translation) {
        continue;
      }

      element.dataset.hinglishOriginal = originalText;
      element.textContent = translation;
      element.classList.add('hinglish-translated');
    } catch (error) {
      if (error?.message === apiKeyMissingMessage) {
        throw error;
      }
      console.error('Translation error:', error);
    }
  }
}

async function translateAllText() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
  const textNodes = [];
  let node = walker.nextNode();

  while (node) {
    if (
      node.parentElement &&
      !node.parentElement.classList.contains('hinglish-translated') &&
      node.textContent &&
      !shouldSkipText(node.textContent)
    ) {
      textNodes.push(node);
    }
    node = walker.nextNode();
  }

  for (const textNode of textNodes) {
    const originalText = textNode.textContent || '';
    if (!originalText.trim()) {
      continue;
    }

    try {
      const translation = await requestTranslation(originalText);
      if (!translation) {
        continue;
      }

      textNode.textContent = translation;
      if (textNode.parentElement) {
        textNode.parentElement.classList.add('hinglish-translated');
      }
    } catch (error) {
      if (error?.message === apiKeyMissingMessage) {
        throw error;
      }
      console.error('Translation error:', error);
    }
  }
}

async function requestTranslation(text) {
  const trimmed = text.trim();
  if (!trimmed || shouldSkipText(trimmed)) {
    return null;
  }

  if (localTranslationCache.has(trimmed)) {
    return localTranslationCache.get(trimmed);
  }

  const response = await chrome.runtime.sendMessage({
    action: TRANSLATION_ACTION,
    text: trimmed,
  });

  if (typeof response === 'string') {
    if (response === apiKeyMissingMessage) {
      throw new Error(apiKeyMissingMessage);
    }

    if (response.startsWith(TRANSLATION_ERROR_PREFIX)) {
      const cleanMessage = response.slice(TRANSLATION_ERROR_PREFIX.length).trim();
      throw new Error(cleanMessage || defaultTranslationError);
    }
  }

  if (typeof response === 'string' && response.trim()) {
    localTranslationCache.set(trimmed, response);
  }

  return typeof response === 'string' ? response : null;
}

function isElementEligible(element) {
  if (!element || element.classList.contains('hinglish-translated')) {
    return false;
  }

  if (element.childNodes.length !== 1) {
    return false;
  }

  const [child] = element.childNodes;
  return child.nodeType === Node.TEXT_NODE;
}

function shouldSkipText(text) {
  if (!text) {
    return true;
  }

  const trimmed = text.trim();
  return trimmed.length < 2 || trimmed.length > MAX_TEXT_LENGTH || /^\d+$/.test(trimmed);
}

function createLoadingIndicator() {
  const indicator = document.createElement('div');
  indicator.style.position = 'fixed';
  indicator.style.top = '10px';
  indicator.style.right = '10px';
  indicator.style.padding = '10px 14px';
  indicator.style.backgroundColor = '#1a73e8';
  indicator.style.color = '#ffffff';
  indicator.style.borderRadius = '4px';
  indicator.style.zIndex = '2147483647';
  indicator.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.2)';
  indicator.style.fontFamily = 'Segoe UI, Arial, sans-serif';
  indicator.style.fontSize = '14px';
  indicator.textContent = 'Translating page...';
  document.body.appendChild(indicator);

  return indicator;
}

function showLoadingSuccess(indicator) {
  indicator.textContent = 'Translation complete!';
  indicator.style.backgroundColor = '#0b8043';
  setTimeout(() => indicator.remove(), 2000);
}

function showLoadingError(indicator, message) {
  indicator.textContent = message;
  indicator.style.backgroundColor = '#d93025';
  setTimeout(() => indicator.remove(), 2500);
}
