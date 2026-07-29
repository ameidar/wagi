const header = document.querySelector('.site-header');

const updateHeaderState = () => {
  if (!header) return;
  header.dataset.scrolled = window.scrollY > 8 ? 'true' : 'false';
};

updateHeaderState();
window.addEventListener('scroll', updateHeaderState, { passive: true });

let voiceAgentObserver = null;
let voiceAgentWasDragged = false;

const VOICE_AGENT_OVERRIDE_ID = 'wagi-voice-agent-layout-override';
const VOICE_AGENT_SIZE = 'clamp(100px, 8vw, 118px)';
const VOICE_AGENT_EDGE_GAP = 'clamp(14px, 2vw, 24px)';

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

const keepVoiceAgentPlaced = () => {
  if (!positionVoiceAgent()) return;
  trackVoiceAgentDrag();
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
