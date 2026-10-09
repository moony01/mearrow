const VALID_SCREENS = ["screen-1", "screen-2", "screen-3", "screen-4", "screen-5"];
const ALL_SCREEN = "all";

function createHiddenStyle() {
  const style = document.createElement("style");
  style.textContent = `
    [hidden] {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
}

function normalizeTarget(value) {
  if (value === ALL_SCREEN) {
    return ALL_SCREEN;
  }

  return VALID_SCREENS.includes(value) ? value : null;
}

function readInitialMode() {
  const params = new URLSearchParams(window.location.search);
  const screen = normalizeTarget(params.get("screen"));

  if (screen && screen !== ALL_SCREEN) {
    return { target: screen, singleScreen: true };
  }

  return { target: ALL_SCREEN, singleScreen: false };
}

function setActiveState(buttons, activeTarget) {
  buttons.forEach((button) => {
    const isActive = button.dataset.screenTarget === activeTarget;

    button.classList.toggle("is-active", isActive);
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function setVisibleCards(cards, target) {
  cards.forEach((card) => {
    const matches = target === ALL_SCREEN || card.dataset.screen === target;
    card.hidden = !matches;
    card.setAttribute("aria-hidden", String(!matches));
  });
}

function applyMode({ target, singleScreen }, buttons, cards) {
  document.body.classList.toggle("single-screen", singleScreen);
  setActiveState(buttons, target);
  setVisibleCards(cards, target);
}

function initScreenFilter() {
  const buttons = Array.from(document.querySelectorAll("[data-screen-target]"));
  const cards = Array.from(document.querySelectorAll(".phone-card[data-screen], .web-page-entry[data-screen]"));

  if (!buttons.length || !cards.length) {
    return;
  }

  createHiddenStyle();

  let currentMode = readInitialMode();
  applyMode(currentMode, buttons, cards);

  buttons.forEach((button) => {
    button.setAttribute("aria-pressed", "false");

    button.addEventListener("click", () => {
      currentMode = {
        target: normalizeTarget(button.dataset.screenTarget) ?? ALL_SCREEN,
        singleScreen: false,
      };

      applyMode(currentMode, buttons, cards);
    });
  });

  applyMode(currentMode, buttons, cards);
}

document.addEventListener("DOMContentLoaded", initScreenFilter);
