let timer = 0;
export function showToast(el, text, ms = 1800) {
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(timer);
  timer = setTimeout(() => el.classList.remove('show'), ms);
}
