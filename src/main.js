const API_ENDPOINT = new URL('/api', window.location.origin).toString();
const endpoint = document.querySelector('#endpoint');
const secondaryEndpoint = document.querySelector('#endpoint-secondary');
const quoteText = document.querySelector('#quote-text');
const quoteAuthor = document.querySelector('#quote-author');
const quoteId = document.querySelector('#quote-id');
const apiStatus = document.querySelector('#api-status');
const refreshButton = document.querySelector('#refresh-quote');
const responseSample = document.querySelector('#response-sample');
const toast = document.querySelector('#toast');
let toastTimeout;

endpoint.textContent = API_ENDPOINT;
secondaryEndpoint.textContent = API_ENDPOINT;

function setApiStatus(message, state = 'pending') {
  const dotClass = state === 'online'
    ? ''
    : state === 'error'
      ? ' status-dot-error'
      : ' status-dot-muted';

  apiStatus.classList.toggle('is-error', state === 'error');
  apiStatus.replaceChildren();

  const dot = document.createElement('span');
  dot.className = `status-dot${dotClass}`;
  dot.setAttribute('aria-hidden', 'true');
  apiStatus.append(dot, document.createTextNode(` ${message}`));
}

function isQuoteResponse(value) {
  return value !== null
    && typeof value === 'object'
    && typeof value.id === 'string'
    && typeof value.from === 'string'
    && typeof value.quote === 'string'
    && typeof value.responseTime === 'string';
}

async function loadQuote() {
  refreshButton.disabled = true;
  refreshButton.setAttribute('aria-busy', 'true');
  setApiStatus('Requesting a quote');

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`API returned ${response.status}`);

    const result = await response.json();
    if (!isQuoteResponse(result)) throw new Error('Unexpected API response');

    quoteText.textContent = result.quote;
    quoteAuthor.textContent = result.from;
    quoteId.textContent = `#${result.id}`;
    responseSample.textContent = JSON.stringify(result, null, 2);
    setApiStatus(`API online · ${result.responseTime}`, 'online');
  } catch {
    setApiStatus('API unavailable · try again', 'error');
  } finally {
    window.clearTimeout(timeout);
    refreshButton.disabled = false;
    refreshButton.removeAttribute('aria-busy');
  }
}

function showToast(message) {
  window.clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.classList.add('is-visible');
  toastTimeout = window.setTimeout(() => toast.classList.remove('is-visible'), 2200);
}

async function copyText(text) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const temporaryInput = document.createElement('textarea');
  temporaryInput.value = text;
  temporaryInput.setAttribute('readonly', '');
  temporaryInput.className = 'clipboard-fallback';
  document.body.append(temporaryInput);
  temporaryInput.select();

  const copied = document.execCommand('copy');
  temporaryInput.remove();
  if (!copied) throw new Error('Clipboard copy is unavailable');
}

document.querySelectorAll('[data-copy-target]').forEach((button) => {
  button.addEventListener('click', async () => {
    const target = document.getElementById(button.dataset.copyTarget);
    if (!target) return;

    try {
      await copyText(target.textContent.trim());
      showToast('Copied to clipboard');
    } catch {
      showToast('Could not copy. Select the text and copy it manually.');
    }
  });
});

refreshButton.addEventListener('click', loadQuote);
loadQuote();
