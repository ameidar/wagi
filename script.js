const header = document.querySelector('.site-header');
const menuToggle = document.querySelector('.menu-toggle');
const menuPanel = document.querySelector('#site-menu');

const updateHeaderState = () => {
  if (!header) return;
  header.dataset.scrolled = window.scrollY > 8 ? 'true' : 'false';
};

updateHeaderState();
window.addEventListener('scroll', updateHeaderState, { passive: true });

const closeMenu = () => {
  if (!menuToggle || !menuPanel) return;
  menuToggle.setAttribute('aria-expanded', 'false');
  menuPanel.hidden = true;
};

const toggleMenu = () => {
  if (!menuToggle || !menuPanel) return;
  const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', String(!isOpen));
  menuPanel.hidden = isOpen;
};

menuToggle?.addEventListener('click', (event) => {
  event.stopPropagation();
  toggleMenu();
});

menuPanel?.addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const link = target?.closest('a');
  if (link) closeMenu();
});

document.addEventListener('click', (event) => {
  if (!menuPanel || menuPanel.hidden) return;
  const target = event.target instanceof Element ? event.target : null;
  if (target?.closest('.compact-menu')) return;
  closeMenu();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeMenu();
});

let voiceAgentObserver = null;
let voiceAgentWasDragged = false;
let voiceAgentIntroScheduled = false;

const VOICE_AGENT_OVERRIDE_ID = 'wagi-voice-agent-layout-override';
const VOICE_AGENT_SIZE = 'clamp(112px, 9vw, 132px)';
const VOICE_AGENT_EDGE_GAP = 'clamp(14px, 2vw, 24px)';
const VOICE_AGENT_INTRO_STORAGE_KEY = 'wagi_voice_agent_intro_played';
const VOICE_AGENT_INTRO_TEXT = 'לחצו עליי כדי שאדבר או אשתוק.';

const setImportant = (element, property, value) => {
  if (
    element.style.getPropertyValue(property) === value &&
    element.style.getPropertyPriority(property) === 'important'
  ) {
    return;
  }
  element.style.setProperty(property, value, 'important');
};

const positionVoiceAgent = () => {
  const host = document.getElementById('opal-voice-avatar-wagi');
  const shadow = host?.shadowRoot;
  if (!shadow) return false;

  const wrap = shadow.querySelector('.wrap');
  if (!wrap) return false;

  if (!shadow.getElementById(VOICE_AGENT_OVERRIDE_ID)) {
    const style = document.createElement('style');
    style.id = VOICE_AGENT_OVERRIDE_ID;
    style.textContent = `
      :host {
        --wagi-agent-size: ${VOICE_AGENT_SIZE};
        --wagi-agent-edge-gap: ${VOICE_AGENT_EDGE_GAP};
      }

      .wrap {
        position: fixed !important;
        width: var(--wagi-agent-size) !important;
        z-index: 2147483647 !important;
      }

      .bubble,
      .bubble img {
        width: var(--wagi-agent-size) !important;
        height: var(--wagi-agent-size) !important;
      }

      .pulse {
        inset: -10% !important;
      }

      .bubble.wagi-pre-speaking {
        box-shadow:
          0 20px 62px rgba(34, 211, 238, 0.38),
          0 0 0 4px rgba(34, 211, 238, 0.95),
          0 0 0 14px rgba(34, 211, 238, 0.2) !important;
      }

      .bubble.wagi-pre-speaking .mouth-open {
        animation: wagiPreSpeakMouth 0.34s ease-in-out infinite !important;
      }

      .bubble.wagi-pre-speaking .mouth-o {
        animation: wagiPreSpeakMouthSoft 0.34s ease-in-out infinite !important;
      }

      @keyframes wagiPreSpeakMouth {
        0%, 100% { opacity: 0; }
        48%, 74% { opacity: 0.92; }
      }

      @keyframes wagiPreSpeakMouthSoft {
        0%, 100% { opacity: 0; }
        24%, 52% { opacity: 0.58; }
      }

      .permission {
        left: 0 !important;
        right: auto !important;
        top: auto !important;
        bottom: calc(var(--wagi-agent-size) + 14px) !important;
      }

      .status.wagi-intro-status {
        display: block !important;
        max-width: min(260px, calc(100vw - 32px)) !important;
        background: rgba(7, 18, 47, 0.92) !important;
        font-size: 13px !important;
        line-height: 1.35 !important;
        padding: 9px 12px !important;
        pointer-events: none !important;
      }

      .chat-toggle,
      .chat-panel {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
    `;
    shadow.appendChild(style);
  }

  setImportant(wrap, 'position', 'fixed');
  setImportant(wrap, 'width', VOICE_AGENT_SIZE);
  setImportant(wrap, 'z-index', '2147483647');

  if (!voiceAgentWasDragged) {
    setImportant(wrap, 'left', VOICE_AGENT_EDGE_GAP);
    setImportant(wrap, 'right', 'auto');
    setImportant(wrap, 'top', 'auto');
    setImportant(wrap, 'bottom', VOICE_AGENT_EDGE_GAP);
    setImportant(wrap, 'transform', 'none');
  }

  const chatToggle = shadow.querySelector('.chat-toggle');
  if (chatToggle) {
    setImportant(chatToggle, 'display', 'none');
    setImportant(chatToggle, 'visibility', 'hidden');
    setImportant(chatToggle, 'pointer-events', 'none');
  }

  const chatPanel = shadow.querySelector('.chat-panel');
  if (chatPanel) {
    setImportant(chatPanel, 'display', 'none');
    setImportant(chatPanel, 'visibility', 'hidden');
    setImportant(chatPanel, 'pointer-events', 'none');
  }

  return true;
};

const trackVoiceAgentDrag = () => {
  const host = document.getElementById('opal-voice-avatar-wagi');
  const shadow = host?.shadowRoot;
  const bubble = shadow?.querySelector('.bubble');
  if (!bubble || bubble.dataset.wagiDragTracked === 'true') return;

  bubble.dataset.wagiDragTracked = 'true';

  let startX = 0;
  let startY = 0;

  bubble.addEventListener('pointerdown', (event) => {
    startX = event.clientX;
    startY = event.clientY;
  });

  bubble.addEventListener('pointermove', (event) => {
    if (Math.abs(event.clientX - startX) + Math.abs(event.clientY - startY) > 6) {
      voiceAgentWasDragged = true;
    }
  });
};

const chooseHebrewVoice = () => {
  if (!('speechSynthesis' in window)) return null;
  return window.speechSynthesis
    .getVoices()
    .find((voice) => /^he([-_]|$)/i.test(voice.lang) || /hebrew|עברית/i.test(voice.name));
};

const playVoiceAgentIntro = () => {
  const host = document.getElementById('opal-voice-avatar-wagi');
  const shadow = host?.shadowRoot;
  const bubble = shadow?.querySelector('.bubble');
  const status = shadow?.querySelector('.status');
  if (!bubble || bubble.dataset.wagiIntroStarted === 'true') return;

  bubble.dataset.wagiIntroStarted = 'true';
  bubble.classList.add('wagi-pre-speaking');

  if (status) {
    status.textContent = VOICE_AGENT_INTRO_TEXT;
    status.classList.add('wagi-intro-status', 'is-visible');
  }

  const stopSpeakingState = () => {
    bubble.classList.remove('wagi-pre-speaking');
  };

  const hideIntroState = () => {
    stopSpeakingState();
    status?.classList.remove('wagi-intro-status', 'is-visible');
  };

  bubble.addEventListener('click', hideIntroState, { once: true });
  window.setTimeout(stopSpeakingState, 5200);

  if (!('speechSynthesis' in window)) return;

  try {
    const alreadyPlayed = window.sessionStorage.getItem(VOICE_AGENT_INTRO_STORAGE_KEY) === 'true';
    if (alreadyPlayed) return;
    window.sessionStorage.setItem(VOICE_AGENT_INTRO_STORAGE_KEY, 'true');

    const utterance = new SpeechSynthesisUtterance(VOICE_AGENT_INTRO_TEXT);
    utterance.lang = 'he-IL';
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.voice = chooseHebrewVoice();
    utterance.onend = stopSpeakingState;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  } catch {
    // Keep the visual greeting when the browser blocks automatic speech.
  }
};

const scheduleVoiceAgentIntro = () => {
  if (voiceAgentIntroScheduled) return;
  voiceAgentIntroScheduled = true;
  window.setTimeout(playVoiceAgentIntro, 900);
  if ('speechSynthesis' in window) {
    window.speechSynthesis.addEventListener?.('voiceschanged', playVoiceAgentIntro, { once: true });
  }
};

const keepVoiceAgentPlaced = () => {
  if (!positionVoiceAgent()) return;
  trackVoiceAgentDrag();
  scheduleVoiceAgentIntro();
  if (voiceAgentObserver) return;

  const host = document.getElementById('opal-voice-avatar-wagi');
  const shadow = host?.shadowRoot;
  if (!shadow) return;

  voiceAgentObserver = new MutationObserver(() => {
    positionVoiceAgent();
    trackVoiceAgentDrag();
  });
  voiceAgentObserver.observe(shadow, { childList: true, subtree: true });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', keepVoiceAgentPlaced, { once: true });
} else {
  keepVoiceAgentPlaced();
}

const voiceAgentPositionTimer = window.setInterval(() => {
  keepVoiceAgentPlaced();
  if (voiceAgentObserver) window.clearInterval(voiceAgentPositionTimer);
}, 250);
