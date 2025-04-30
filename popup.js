document.addEventListener('DOMContentLoaded', () => {
  const service = document.getElementById('service');
  const openaiKey = document.getElementById('openaiKey');
  const ollamaModel = document.getElementById('ollamaModel');
  const temperature = document.getElementById('temperature');
  const saveBtn = document.getElementById('saveBtn');
  const status = document.getElementById('status');

  // بارگذاری تنظیمات فعلی
  chrome.runtime.sendMessage({ action: 'get_settings' }, (response) => {
    if (response.settings) {
      service.value = response.settings.service;
      openaiKey.value = response.settings.openaiKey || '';
      ollamaModel.value = response.settings.ollamaModel || 'llama2';
      temperature.value = response.settings.temperature || 0.7;
      
      toggleFields(response.settings.service);
    }
  });

  // تغییر فیلدها وقتی سرویس تغییر کرد
  service.addEventListener('change', (e) => {
    toggleFields(e.target.value);
  });

  function toggleFields(selectedService) {
    openaiKey.disabled = selectedService !== 'openai';
    ollamaModel.disabled = selectedService !== 'ollama';
  }

  // ذخیره تنظیمات
  saveBtn.addEventListener('click', () => {
    const newSettings = {
      service: service.value,
      openaiKey: openaiKey.value,
      ollamaModel: ollamaModel.value,
      temperature: parseFloat(temperature.value)
    };

    chrome.runtime.sendMessage({ 
      action: 'save_settings', 
      settings: newSettings 
    }, (response) => {
      if (response && response.success) {
        status.textContent = 'تنظیمات ذخیره شد!';
      } else {
        status.textContent = 'خطا در ذخیره تنظیمات!';
        console.error(response.error);
      }
      setTimeout(() => status.textContent = '', 2000);
    });
  });
});