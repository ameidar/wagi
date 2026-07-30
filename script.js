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
let voiceAgentMicMuted = false;

const voiceAgentAudioTracks = new Set();

const VOICE_AGENT_OVERRIDE_ID = 'wagi-voice-agent-layout-override';
const VOICE_AGENT_SIZE = 'clamp(112px, 9vw, 132px)';
const VOICE_AGENT_EDGE_GAP = 'clamp(14px, 2vw, 24px)';
const VOICE_AGENT_MUTE_BUTTON_ID = 'wagi-mic-mute-button';
const VOICE_AGENT_MUTE_STYLE_ID = 'wagi-mic-mute-button-style';

const updateVoiceAgentAudioTracks = () => {
  voiceAgentAudioTracks.forEach((track) => {
    if (track.readyState === 'ended') {
      voiceAgentAudioTracks.delete(track);
      return;
    }

    track.enabled = !voiceAgentMicMuted;
  });
};

const rememberVoiceAgentStream = (stream) => {
  if (!stream?.getAudioTracks) return stream;

  stream.getAudioTracks().forEach((track) => {
    voiceAgentAudioTracks.add(track);
    track.enabled = !voiceAgentMicMuted;
    track.addEventListener?.('ended', () => voiceAgentAudioTracks.delete(track), { once: true });
  });

  return stream;
};

if (navigator.mediaDevices?.getUserMedia && navigator.mediaDevices.getUserMedia.wagiTracked !== true) {
  try {
    const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    const trackedGetUserMedia = (...args) => originalGetUserMedia(...args).then(rememberVoiceAgentStream);
    trackedGetUserMedia.wagiTracked = true;
    navigator.mediaDevices.getUserMedia = trackedGetUserMedia;
  } catch {
    // If a browser disallows patching getUserMedia, the visible control still renders.
  }
}

const syncVoiceAgentMuteButton = (button) => {
  button.type = 'button';
  button.className = voiceAgentMicMuted ? 'is-muted' : '';
  button.setAttribute('aria-pressed', String(voiceAgentMicMuted));
  button.setAttribute('aria-label', voiceAgentMicMuted ? 'להחזיר מיקרופון' : 'להשתיק מיקרופון');
  button.title = voiceAgentMicMuted ? 'להחזיר מיקרופון' : 'להשתיק מיקרופון';
  button.textContent = voiceAgentMicMuted ? '🔇' : '🎙️';
};

const toggleVoiceAgentMicMute = (button) => {
  voiceAgentMicMuted = !voiceAgentMicMuted;
  updateVoiceAgentAudioTracks();
  syncVoiceAgentMuteButton(button);
};

const ensureVoiceAgentMuteStyle = () => {
  if (document.getElementById(VOICE_AGENT_MUTE_STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = VOICE_AGENT_MUTE_STYLE_ID;
  style.textContent = `
    #${VOICE_AGENT_MUTE_BUTTON_ID} {
      position: fixed;
      width: clamp(36px, 3vw, 44px);
      height: clamp(36px, 3vw, 44px);
      border: 0;
      border-radius: 999px;
      display: grid;
      place-items: center;
      background: #ffffff;
      color: #0f172a;
      box-shadow: 0 12px 34px rgba(15, 23, 42, 0.26);
      cursor: pointer;
      font-size: clamp(18px, 1.8vw, 22px);
      line-height: 1;
      padding: 0;
      z-index: 2147483647;
      transform: translate(-12%, -12%);
    }

    #${VOICE_AGENT_MUTE_BUTTON_ID}.is-muted {
      background: #ef4444;
      color: #ffffff;
    }

    #${VOICE_AGENT_MUTE_BUTTON_ID}:focus-visible {
      outline: 3px solid rgba(34, 211, 238, 0.95);
      outline-offset: 3px;
    }
  `;
  document.head.appendChild(style);
};

const positionVoiceAgentMuteButton = (wrap) => {
  const button = document.getElementById(VOICE_AGENT_MUTE_BUTTON_ID);
  if (!button) return;

  const rect = wrap.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    button.hidden = true;
    return;
  }

  const size = button.offsetWidth || 40;
  const margin = 8;
  const left = Math.max(margin, Math.min(window.innerWidth - size - margin, rect.left + rect.width - size * 0.7));
  const top = Math.max(margin, Math.min(window.innerHeight - size - margin, rect.top + rect.height - size * 0.7));

  button.hidden = false;
  button.style.left = `${left}px`;
  button.style.top = `${top}px`;
};

const ensureVoiceAgentMuteButton = (wrap) => {
  ensureVoiceAgentMuteStyle();

  let button = document.getElementById(VOICE_AGENT_MUTE_BUTTON_ID);

  if (!button) {
    button = document.createElement('button');
    button.id = VOICE_AGENT_MUTE_BUTTON_ID;
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleVoiceAgentMicMute(button);
    });
    button.addEventListener('pointerdown', (event) => event.stopPropagation());
    document.body.appendChild(button);
  }

  syncVoiceAgentMuteButton(button);
  positionVoiceAgentMuteButton(wrap);
};

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

  ensureVoiceAgentMuteButton(wrap);

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
      window.requestAnimationFrame(positionVoiceAgent);
    }
  });
};

const clickVoiceAgentBubble = () => {
  const host = document.getElementById('opal-voice-avatar-wagi');
  const shadow = host?.shadowRoot;
  const bubble = shadow?.querySelector('.bubble');
  if (!bubble) return false;

  bubble.classList.remove('wagi-pre-speaking');

  try {
    bubble.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, pointerType: 'mouse', isPrimary: true }));
    bubble.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1, pointerType: 'mouse', isPrimary: true }));
  } catch {
    bubble.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    bubble.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  }

  bubble.click();
  return true;
};

const activateVoiceAgentFromPageButton = () => {
  if (clickVoiceAgentBubble()) return;

  const startSection = document.getElementById('start');
  startSection?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  let attempts = 0;
  const activationTimer = window.setInterval(() => {
    attempts += 1;
    if (clickVoiceAgentBubble() || attempts >= 16) {
      window.clearInterval(activationTimer);
    }
  }, 250);
};

document.querySelectorAll('a[href="#start"]').forEach((button) => {
  button.addEventListener('click', (event) => {
    event.preventDefault();
    closeMenu();
    activateVoiceAgentFromPageButton();
  });
});

const playVoiceAgentIntro = () => {
  const host = document.getElementById('opal-voice-avatar-wagi');
  const shadow = host?.shadowRoot;
  const bubble = shadow?.querySelector('.bubble');
  if (!bubble || bubble.dataset.wagiIntroStarted === 'true') return;

  bubble.dataset.wagiIntroStarted = 'true';
  bubble.classList.add('wagi-pre-speaking');

  const stopSpeakingState = () => {
    bubble.classList.remove('wagi-pre-speaking');
  };

  const hideIntroState = () => {
    stopSpeakingState();
  };

  bubble.addEventListener('click', hideIntroState, { once: true });
  window.setTimeout(stopSpeakingState, 5200);
};

const scheduleVoiceAgentIntro = () => {
  if (voiceAgentIntroScheduled) return;
  voiceAgentIntroScheduled = true;
  window.setTimeout(playVoiceAgentIntro, 900);
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
}, 250);
