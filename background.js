// Default settings
let settings = {
  openaiKey: '',         // Your OpenAI API key
  model: 'gpt-4o-mini',  // OpenAI model
  temperature: 0.7       // Generation temperature
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
      generateWithOpenAI(request.text)
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
      return true;

    case 'get_settings':
      sendResponse({ settings });
      return false;

    default:
      console.warn('Unknown action:', request.action);
      return false;
  }
});

// Generate comment via OpenAI API
async function generateWithOpenAI(text) {
  if (!settings.openaiKey) {
    throw new Error('OpenAI API key is not set');
  }

  const payload = {
    model: settings.model,
    temperature: settings.temperature,
    messages: [
      { role: 'user', content: `برای این پست یک کامنت جذاب بنویس که بتونه ترغیب‌کننده باشه :\n\n${text}` }
    ]
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
