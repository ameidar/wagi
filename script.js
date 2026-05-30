const header = document.querySelector('.site-header');

const updateHeaderState = () => {
  if (!header) return;
  header.dataset.scrolled = window.scrollY > 8 ? 'true' : 'false';
};

updateHeaderState();
window.addEventListener('scroll', updateHeaderState, { passive: true });
