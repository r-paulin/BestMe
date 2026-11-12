const STORAGE_KEY = "me-app-state";

const ROUTES = [
  "welcome",
  "template",
  "details",
  "eating",
  "meals",
  "activity",
  "health",
  "fasting",
  "preparing",
  "home",
  "offers",
  "shopping",
  "offer",
  "workouts",
];

const defaultState = () => ({
  firstName: "Reinis",
  lastName: "",
  age: "38",
  gender: "Male",
  height: "188",
  heightUnit: "cm",
  weight: "108",
  weightUnit: "kg",
  country: "Latvia",
  eatingStyle: "classic",
  diets: [],
  mealKinds: [],
  variety: [],
  exercise: "none",
  activity: "sitting",
  medicines: "yes",
  conditions: "no",
  labs: [],
  fasting: "13:11",
  fastingStartedAt: null,
  expert: "elina",
  onboarded: false,
});

const FASTING_GOAL_MS = 16 * 60 * 60 * 1000;
const OFFER_MS = 10 * 60 * 1000;
let fastingTick = 0;
let offerTick = 0;
let offerEndsAt = 0;
let selectedTab = "home";
let pendingNav = null;
const TAB_ORDER = { home: 0, offers: 1, shopping: 2 };
const TABBAR_ROUTES = new Set(["home", "offers", "shopping"]);

export function canAdvancePersonalDetails(data) {
  return ["firstName", "lastName", "age", "gender", "height", "weight", "country"].every(
    (key) => String(data[key] ?? "").trim().length > 0
  );
}

function loadState() {
  try {
    return { ...defaultState(), ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return defaultState();
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* private mode / quota */
  }
}

function routeFromHash() {
  const name = location.hash.replace(/^#\/?/, "") || "welcome";
  if (name === "ready") return "preparing";
  return ROUTES.includes(name) ? name : "welcome";
}

let backTarget = "welcome";

function go(name) {
  backTarget = currentScreen || "welcome";
  const next = `#/${name}`;
  // Same hash does not fire hashchange — force the screen update.
  if (location.hash === next) {
    showScreen(name);
    return;
  }
  location.hash = next;
}

function $(sel, root = document) {
  return root.querySelector(sel);
}

function $all(sel, root = document) {
  return [...root.querySelectorAll(sel)];
}

let currentScreen = null;
let activeTransition = null;

function restartPrepStars() {
  $all(".prep-stage .star").forEach((el) => {
    el.style.animation = "none";
  });
  void document.body.offsetWidth;
  $all(".prep-stage .star").forEach((el) => {
    el.style.animation = "";
  });
}

function syncTabbar(route) {
  const bar = $("[data-tabbar]");
  if (!bar) return;
  const show = TABBAR_ROUTES.has(route);
  bar.hidden = !show;
  if (!show) return;
  const tabs = $all("[data-tab]", bar);
  let activeIndex = 0;
  tabs.forEach((tab, i) => {
    const on = tab.dataset.tab === selectedTab;
    tab.classList.toggle("is-active", on);
    if (on) {
      activeIndex = i;
      tab.setAttribute("aria-current", "page");
    } else {
      tab.removeAttribute("aria-current");
    }
  });
  const thumb = bar.querySelector("[data-tabs-thumb]");
  if (thumb) thumb.style.transform = `translateX(${activeIndex * 80}px)`;
}

function focusScreen(screen) {
  const target =
    screen.querySelector("h1, [tabindex='-1']") ||
    screen.querySelector("button, a, input, select, textarea");
  if (!target) return;
  if (!target.hasAttribute("tabindex") && target.tagName === "H1") {
    target.tabIndex = -1;
  }
  target.focus({ preventScroll: true });
}

function applyScreen(name) {
  const next = $(`[data-screen="${name}"]`);
  if (!next) return;
  // Each tab is its own root (HIG); pushed template keeps the Home tab selected.
  if (Object.hasOwn(TAB_ORDER, name)) selectedTab = name;
  $all("[data-screen]").forEach((el) => {
    const on = el === next;
    el.hidden = !on;
    el.classList.toggle("is-current", on);
    el.classList.remove("is-enter");
  });
  const scroller = next.querySelector(".screen-scroll");
  if (scroller) scroller.scrollTop = 0;
  void next.offsetWidth;
  next.classList.add("is-enter");
  if (name === "preparing") restartPrepStars();
  syncTabbar(name);
  focusScreen(next);
}

function navDirection(prevName, name) {
  if (pendingNav) return pendingNav;
  if (Object.hasOwn(TAB_ORDER, prevName) && Object.hasOwn(TAB_ORDER, name)) {
    return TAB_ORDER[name] < TAB_ORDER[prevName] ? "back" : "forward";
  }
  const prevIndex = ROUTES.indexOf(prevName);
  const nextIndex = ROUTES.indexOf(name);
  return prevIndex !== -1 && nextIndex !== -1 && nextIndex < prevIndex ? "back" : "forward";
}

function showScreen(name) {
  const prevName = currentScreen;
  const dir = navDirection(prevName, name);
  pendingNav = null;
  currentScreen = name;

  const swap = () => applyScreen(name);
  if (!prevName || prevName === name || !document.startViewTransition) {
    swap();
    return;
  }

  const run = () => {
    if (currentScreen !== name) return;
    const supportsTypes = typeof ViewTransition === "function" && "types" in ViewTransition.prototype;
    let transition;
    try {
      transition = supportsTypes
        ? document.startViewTransition({ update: swap, types: [dir] })
        : document.startViewTransition(swap);
    } catch {
      swap();
      return;
    }
    activeTransition = transition;
    transition.finished.finally(() => {
      if (activeTransition === transition) activeTransition = null;
      if (currentScreen === "preparing") restartPrepStars();
    });
  };

  if (activeTransition) {
    activeTransition.skipTransition();
    activeTransition.finished.finally(run);
    return;
  }
  run();
}

function bindDetails(state) {
  const map = {
    firstName: "#firstName",
    lastName: "#lastName",
    age: "#age",
    gender: "#gender",
    height: "#height",
    heightUnit: "#heightUnit",
    weight: "#weight",
    weightUnit: "#weightUnit",
    country: "#country",
  };
  Object.entries(map).forEach(([key, sel]) => {
    const el = $(sel);
    if (!el) return;
    el.value = state[key] ?? "";
    el.addEventListener("input", () => {
      state[key] = el.value;
      saveState(state);
      el.closest(".field")?.classList.remove("is-invalid");
      el.setAttribute("aria-invalid", "false");
    });
  });
}

function attrName(key) {
  return key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

function syncChoices(root, key, value, multi) {
  const attr = attrName(key);
  const list = Array.isArray(value) ? value : [];
  $all(`[data-${attr}]`, root).forEach((btn) => {
    const v = btn.getAttribute(`data-${attr}`);
    const selected = multi ? list.includes(v) : value === v;
    btn.classList.toggle("is-selected", selected);
    btn.setAttribute("aria-checked", selected ? "true" : "false");
  });
}

function bindChoiceGroup(state, key, multi = false) {
  const attr = attrName(key);
  if (multi && !Array.isArray(state[key])) state[key] = [];
  $all(`[data-${attr}]`).forEach((btn) => {
    btn.addEventListener("click", () => {
      const v = btn.getAttribute(`data-${attr}`);
      if (multi) {
        const set = new Set(Array.isArray(state[key]) ? state[key] : []);
        set.has(v) ? set.delete(v) : set.add(v);
        state[key] = [...set];
      } else {
        state[key] = v;
      }
      saveState(state);
      syncChoices(document, key, state[key], multi);
      if (key === "expert") syncExpertOffer(state);
    });
  });
  syncChoices(document, key, state[key], multi);
  if (key === "expert") syncExpertOffer(state);
}

function syncExpertOffer(state) {
  const offer = $("[data-screen=offer]");
  if (!offer) return;
  const none = state.expert === "none";
  offer.classList.toggle("is-no-coach", none);
  offer.querySelector(".upsell-foot")?.toggleAttribute("inert", none);
}

function fillProgress() {
  $all("[data-progress]").forEach((el) => {
    const step = Number(el.dataset.progress);
    const fill = el.querySelector(".progress__fill");
    const count = el.querySelector(".progress__count");
    if (fill) fill.style.transform = `scaleX(${step / 6})`;
    if (count) count.textContent = `${step} / 6`;
  });
}

function syncWeek() {
  // Week strip is Mon→Sun; Date#getDay is Sun=0.
  const todayIdx = (new Date().getDay() + 6) % 7;
  $all(".week .day").forEach((el, i) => {
    el.classList.toggle("is-today", i === todayIdx);
    el.classList.toggle("is-done", i < todayIdx);
  });
}

function updateHome(state) {
  const name = state.firstName?.trim() || "Reinis";
  $all("[data-user-name]").forEach((el) => {
    el.textContent = name;
  });
  const weight = state.weight?.trim() || "108";
  const unit = state.weightUnit || "kg";
  $all("[data-user-weight]").forEach((el) => {
    el.textContent = `${weight}${unit}`;
  });
  syncWeek();
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatElapsed(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

function formatStamp(date) {
  const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
  const time = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${weekday}, ${time}`;
}

function stopFastingTick() {
  window.clearTimeout(syncFastingCard._swap);
  syncFastingCard._swap = 0;
  window.clearInterval(fastingTick);
  fastingTick = 0;
  $(".fasting-card .fasting-title")?.classList.remove("is-swap");
}

function paintFastingTimer(startedAt) {
  const title = $(".fasting-card .fasting-title");
  if (!title || !startedAt) return;
  title.textContent = formatElapsed(Date.now() - startedAt);
}

function syncFastingCard(state, animate) {
  const card = $(".fasting-card");
  if (!card) return;
  const title = card.querySelector(".fasting-title");
  const btn = card.querySelector(".fasting-btn");
  const idle = card.querySelector(".fasting-idle");
  const active = card.querySelector(".fasting-active");
  const startedEl = card.querySelector("[data-fasting-started]");
  const goalEl = card.querySelector("[data-fasting-goal]");
  const startedAt = state.fastingStartedAt ? Number(state.fastingStartedAt) : null;
  const on = Boolean(startedAt);

  const apply = () => {
    card.classList.toggle("is-active", on);
    if (btn) btn.textContent = on ? "End" : "Start";
    if (idle) idle.hidden = on;
    if (active) active.hidden = !on;
    if (on) {
      const start = new Date(startedAt);
      const goal = new Date(startedAt + FASTING_GOAL_MS);
      if (startedEl) startedEl.textContent = formatStamp(start);
      if (goalEl) goalEl.textContent = formatStamp(goal);
      paintFastingTimer(startedAt);
      stopFastingTick();
      fastingTick = window.setInterval(() => paintFastingTimer(startedAt), 1000);
    } else {
      stopFastingTick();
      if (title) title.textContent = "Start fasting";
    }
    requestAnimationFrame(() => {
      card.classList.toggle("is-shown", on);
    });
  };

  window.clearTimeout(syncFastingCard._swap);
  syncFastingCard._swap = 0;

  if (!animate || !title) {
    title?.classList.remove("is-swap");
    apply();
    return;
  }

  title.classList.add("is-swap");
  syncFastingCard._swap = window.setTimeout(() => {
    syncFastingCard._swap = 0;
    apply();
    title.classList.remove("is-swap");
  }, 200);
}

function toggleFasting(state) {
  if (state.fastingStartedAt) {
    state.fastingStartedAt = null;
  } else {
    state.fastingStartedAt = Date.now();
  }
  saveState(state);
  syncFastingCard(state, true);
}

function stopOfferTick() {
  window.clearInterval(offerTick);
  offerTick = 0;
}

function paintOfferCountdown() {
  const el = $("[data-offer-ends]");
  if (!el || !offerEndsAt) return;
  const left = Math.max(0, offerEndsAt - Date.now());
  const total = Math.ceil(left / 1000);
  el.textContent = `Offer ends in ${Math.floor(total / 60)}:${pad2(total % 60)}`;
  if (left <= 0) stopOfferTick();
}

function startOfferCountdown() {
  if (!offerEndsAt || offerEndsAt <= Date.now()) offerEndsAt = Date.now() + OFFER_MS;
  paintOfferCountdown();
  stopOfferTick();
  offerTick = window.setInterval(paintOfferCountdown, 1000);
}

function stopPreparing() {
  window.clearTimeout(startPreparing._swap);
  window.clearTimeout(startPreparing._ready);
  window.clearTimeout(startPreparing._hide);
}

function setPrepCopy(titleText, subText) {
  const title = $("[data-screen=preparing] .prep-title");
  const sub = $("[data-screen=preparing] .prep-sub");
  if (title) title.textContent = titleText;
  if (sub) sub.textContent = subText;
}

function showPrepText() {
  const block = $("[data-screen=preparing] .t-stagger");
  if (!block) return;
  block.classList.remove("is-hiding", "is-shown");
  void block.offsetHeight;
  block.classList.add("is-shown");
}

function hidePrepText(done) {
  const block = $("[data-screen=preparing] .t-stagger");
  if (!block) {
    done?.();
    return;
  }
  block.classList.add("is-hiding");
  block.classList.remove("is-shown");
  window.clearTimeout(startPreparing._hide);
  startPreparing._hide = window.setTimeout(() => {
    block.classList.remove("is-hiding");
    done?.();
  }, 200);
}

function startPreparing() {
  stopPreparing();
  const screen = $("[data-screen=preparing]");
  screen?.classList.remove("is-ready");
  setPrepCopy("Preparing your profile", "This may take a moment");
  showPrepText();
  restartPrepStars();
  startPreparing._swap = window.setTimeout(() => {
    hidePrepText(() => {
      setPrepCopy("Bringing your plan together", "This may take a moment");
      showPrepText();
    });
  }, 1000);
  startPreparing._ready = window.setTimeout(() => {
    hidePrepText(() => {
      screen?.classList.add("is-ready");
      setPrepCopy("Your profile is ready!", "Let’s take the next step towards a healthier you");
      showPrepText();
    });
  }, 3000);
}

function wire(state) {
  fillProgress();
  bindDetails(state);
  bindChoiceGroup(state, "eatingStyle");
  bindChoiceGroup(state, "diets", true);
  bindChoiceGroup(state, "mealKinds", true);
  bindChoiceGroup(state, "variety", true);
  bindChoiceGroup(state, "exercise");
  bindChoiceGroup(state, "activity");
  bindChoiceGroup(state, "medicines");
  bindChoiceGroup(state, "conditions");
  bindChoiceGroup(state, "labs", true);
  bindChoiceGroup(state, "fasting");
  bindChoiceGroup(state, "expert");

  document.addEventListener("click", (e) => {
    const fastingBtn = e.target.closest(".fasting-btn");
    if (fastingBtn) {
      toggleFasting(state);
      return;
    }
    const t = e.target.closest("[data-go]");
    if (!t) return;
    const next = t.dataset.go;
    if (t.dataset.tab) {
      const from = selectedTab;
      selectedTab = t.dataset.tab;
      pendingNav = TAB_ORDER[selectedTab] < TAB_ORDER[from] ? "back" : "forward";
      syncTabbar(routeFromHash());
      // Re-tapping the active tab: stay on root (HIG), refresh selection only.
      if (next === routeFromHash()) {
        pendingNav = null;
        return;
      }
    } else if (next === "template" || next === "offer" || next === "workouts") {
      pendingNav = "forward";
    } else if (next === "back") {
      pendingNav = "back";
    }
    if (next === "back") {
      go(backTarget || "welcome");
      return;
    }
    if (next === "eating") {
      const ok = canAdvancePersonalDetails(state);
      $all("#details .field[data-required]").forEach((field) => {
        const input = field.querySelector("input, select");
        const empty = !String(input?.value ?? "").trim();
        field.classList.toggle("is-invalid", empty);
        input?.setAttribute("aria-invalid", empty ? "true" : "false");
      });
      if (!ok) return;
    }
    if (next === "home") {
      state.onboarded = true;
      saveState(state);
      if (!t.dataset.tab) selectedTab = "home";
    }
    go(next);
  });

  window.addEventListener("hashchange", () => {
    const route = routeFromHash();
    if (route === "preparing") startPreparing();
    else stopPreparing();
    if (route === "home") syncFastingCard(state, false);
    else stopFastingTick();
    if (route === "offer") startOfferCountdown();
    else stopOfferTick();
    updateHome(state);
    showScreen(route);
  });

  // Browser refresh always restarts at the first onboarding screen (no history push).
  stopPreparing();
  stopFastingTick();
  stopOfferTick();
  history.replaceState(null, "", "#/welcome");
  updateHome(state);
  showScreen("welcome");
}

if (typeof window !== "undefined") {
  const state = loadState();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => wire(state));
  } else {
    wire(state);
  }
}
