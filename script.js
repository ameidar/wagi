const header = document.querySelector('.site-header');

const updateHeaderState = () => {
  if (!header) return;
  header.dataset.scrolled = window.scrollY > 8 ? 'true' : 'false';
};

updateHeaderState();
window.addEventListener('scroll', updateHeaderState, { passive: true });

let voiceAgentObserver = null;

const centerVoiceAgent = () => {
  const host = document.getElementById('opal-voice-avatar-wagi');
  const shadow = host?.shadowRoot;
  if (!shadow) return false;

  const wrap = shadow.querySelector('.wrap');
  if (!wrap) return false;

  Object.assign(wrap.style, {
    position: 'fixed',
    left: '50vw',
    top: '50vh',
    right: 'auto',
    bottom: 'auto',
    transform: 'translate(-50%, -50%)',
    zIndex: '2147483647',
  });

  const chatToggle = shadow.querySelector('.chat-toggle');
  if (chatToggle) chatToggle.style.display = 'none';

  const chatPanel = shadow.querySelector('.chat-panel');
  if (chatPanel) chatPanel.style.display = 'none';

  return true;
};

const keepVoiceAgentCentered = () => {
  if (!centerVoiceAgent()) return;
  if (voiceAgentObserver) return;

  const host = document.getElementById('opal-voice-avatar-wagi');
  const shadow = host?.shadowRoot;
  if (!shadow) return;

  voiceAgentObserver = new MutationObserver(centerVoiceAgent);
  voiceAgentObserver.observe(shadow, { childList: true, subtree: true });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', keepVoiceAgentCentered, { once: true });
} else {
  keepVoiceAgentCentered();
}

const voiceAgentPositionTimer = window.setInterval(() => {
  keepVoiceAgentCentered();
  if (voiceAgentObserver) window.clearInterval(voiceAgentPositionTimer);
}, 250);
