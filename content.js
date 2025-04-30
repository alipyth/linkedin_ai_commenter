// دکمه‌های تولید کامنت را به همه عناصر مورد نظر اضافه می‌کند
function injectCommentButton(element) {
  // چک کن اگر قبلاً دکمه اضافه شده باشد
  if (element.hasAttribute('data-ai-button-added')) return;

  const button = document.createElement('button');
  button.className = 'ai-comment-button';
  button.textContent = 'تولید کامنت با AI';
  
  // نشانه‌گذاری عنصر به عنوان پردازش‌شده
  element.setAttribute('data-ai-button-added', 'true');

  button.addEventListener('click', async () => {
    const text = element.textContent.trim();
    button.disabled = true;
    button.textContent = 'در حال پردازش...';
    
    const response = await chrome.runtime.sendMessage({
      action: 'generate_comment',
      text: text
    });
    
    if (response.error) {
      alert('خطا: ' + response.error);
    } else {
      const resultBox = document.createElement('div');
      resultBox.className = 'ai-result';
      resultBox.textContent = response.comment;
      element.parentNode.appendChild(resultBox);
    }
    
    button.disabled = false;
    button.textContent = 'تولید کامنت با AI';
  });
  
  element.parentNode.appendChild(button);
}
// مشاهده‌کننده تغییرات DOM
const observer = new MutationObserver((mutations) => {
  // برای جلوگیری از تداخل با خود observer، تاخیر اضافه کنید
  setTimeout(() => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) { // فقط عنصرهای DOM
          if (node.classList.contains('feed-shared-inline-show-more-text')) {
            injectCommentButton(node);
          }
          
          // جستجوی عناصر فرزند
          node.querySelectorAll('.feed-shared-inline-show-more-text').forEach(injectCommentButton);
        }
      });
    });
  }, 100); // تاخیر 100ms برای جلوگیری از تداخل
});

observer.observe(document.body, { childList: true, subtree: true });