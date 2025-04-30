// Default settings
let settings = {
  service: 'openai',       // 'openai' or 'ollama'
  openaiKey: '',           // Your OpenAI API key
  ollamaModel: 'deepseek-r1:7b', // Ollama model name
  temperature: 0.7         // Generation temperature
};

// Load saved settings from chrome.storage
chrome.storage.sync.get(['settings'], (result) => {
  if (result.settings) {
    settings = result.settings;
    console.log('Loaded settings:', settings);
  } else {
    console.log('Using default settings');
  }
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'generate_comment':
      generateComment(request.text)
        .then(comment => sendResponse({ comment }))
        .catch(error => sendResponse({ error: error.message }));
      return true; // Keep channel open for async

    case 'save_settings':
      settings = request.settings;
      chrome.storage.sync.set({ settings }, () => {
        if (chrome.runtime.lastError) {
          console.error('Error saving settings:', chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          console.log('Settings saved:', settings);
          sendResponse({ success: true });
        }
      });
      return true; // Async response

    case 'get_settings':
      sendResponse({ settings });
      return false;

    default:
      console.warn('Unknown action:', request.action);
      return false;
  }
});

// Main generator dispatcher
async function generateComment(text) {
  if (settings.service === 'openai') {
    return await generateWithOpenAI(text);
  } else {
    return await generateWithOllama(text);
  }
}

// Generate comment via OpenAI API
async function generateWithOpenAI(text) {
  if (!settings.openaiKey) {
    throw new Error('OpenAI API key is not set');
  }

  const payload = {
    model: 'gpt-4o-mini',
    temperature: settings.temperature,
    messages: [{ role: 'user', content: `،برای این پست یک کامنت محاوره ای بنویس انگار متخصصی توی مکالمه و موضوعی که این پست بهش اشاره کرده ! جوری که متوجه نشه این رو هوش مصنوعی نوشته و بعضی وقتا از :) هم استفاده کن :\n\n${text}` }]
  };

  console.log('Sending to OpenAI:', payload);
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.openaiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('OpenAI error:', response.status, errText);
    throw new Error(`OpenAI error: ${response.status}`);
  }

  const data = await response.json();
  console.log('OpenAI result:', data);
  return data.choices?.[0]?.message?.content || '';
}

// Generate comment via local Ollama chat endpoint
async function generateWithOllama(text) {
  if (!settings.ollamaModel) {
    throw new Error('Ollama model is not set');
  }

  const payload = {
    model: settings.ollamaModel,
    messages: [{ role: 'user', content: text }],
    temperature: settings.temperature,
    stream: false
  };

  const headers = { 'Content-Type': 'application/json' };
  const hosts = ['http://localhost:11434', 'http://127.0.0.1:11434'];
  let lastError;

  for (const host of hosts) {
    const url = `${host}/api/chat`;
    console.log(`Attempting Ollama chat request to: ${url}`);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Ollama error ${response.status}: ${errText}`);
      }

      const data = await response.json();
      console.log('Ollama chat result:', data);
      if (!('response' in data)) {
        throw new Error('Ollama returned no response field');
      }

      try {
        return JSON.parse(data.response);
      } catch {
        return data.response;
      }

    } catch (err) {
      console.warn(`Request to ${host} failed:`, err);
      lastError = err;
    }
  }

  throw new Error(`All Ollama chat requests failed. Last error: ${lastError.message}`);
}
