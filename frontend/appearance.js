/* Device-local visual preferences, shared by the public page and study area. */
(() => {
  const storageKey = "resolveai.appearance.v1";
  const defaults = { accent: "violet", density: "comfortable" };
  let preferences = { ...defaults };
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (["violet", "cyan", "mint"].includes(saved?.accent)) preferences.accent = saved.accent;
    if (["comfortable", "compact"].includes(saved?.density)) preferences.density = saved.density;
  } catch (_) { /* Preferences still work when browser storage is unavailable. */ }

  function apply() {
    document.documentElement.dataset.accent = preferences.accent;
    document.documentElement.dataset.density = preferences.density;
    document.querySelectorAll("[data-accent-choice]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.accentChoice === preferences.accent));
    });
    const compact = document.getElementById("compactMode");
    if (compact) compact.checked = preferences.density === "compact";
  }
  apply();

  document.addEventListener("DOMContentLoaded", () => {
    apply();
    function save() {
      apply();
      const status = document.getElementById("appearanceStatus");
      try {
        localStorage.setItem(storageKey, JSON.stringify(preferences));
        if (status) status.textContent = "Preferências salvas neste navegador.";
      } catch (_) {
        if (status) status.textContent = "Visual aplicado. Este navegador não permitiu salvar a preferência.";
      }
    }
    document.querySelectorAll("[data-accent-choice]").forEach((button) => {
      button.addEventListener("click", () => {
        preferences.accent = button.dataset.accentChoice;
        save();
      });
    });
    document.getElementById("compactMode")?.addEventListener("change", (event) => {
      preferences.density = event.target.checked ? "compact" : "comfortable";
      save();
    });
    const panel = document.getElementById("appearancePanel");
    const toggle = document.getElementById("appearanceToggle");
    function close() {
      if (!panel || !toggle) return;
      panel.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
    }
    toggle?.addEventListener("click", () => {
      panel.hidden = !panel.hidden;
      toggle.setAttribute("aria-expanded", String(!panel.hidden));
    });
    document.addEventListener("click", (event) => {
      if (panel && !panel.contains(event.target) && !toggle.contains(event.target)) close();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && panel && !panel.hidden) {
        close();
        toggle.focus();
      }
    });

    const links = [...document.querySelectorAll(".app-section-nav a")];
    const sections = links.map((link) => document.querySelector(link.getAttribute("href"))).filter(Boolean);
    function setActive(id) {
      links.forEach((link) => {
        if (link.hash === `#${id}`) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    }
    if (sections.length) {
      let scheduled = false;
      function updateNavigation() {
        let active = sections[0];
        for (const section of sections) {
          if (section.getBoundingClientRect().top <= 180) active = section;
        }
        setActive(active.id);
        scheduled = false;
      }
      window.addEventListener("scroll", () => {
        if (!scheduled) {
          scheduled = true;
          requestAnimationFrame(updateNavigation);
        }
      }, { passive: true });
      updateNavigation();
    }
    document.getElementById("questionInput")?.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !event.isComposing) {
        event.preventDefault();
        const solve = document.getElementById("solveBtn");
        if (solve && !solve.disabled) solve.click();
      }
    });
  });
})();
