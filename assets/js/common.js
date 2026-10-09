(() => {
  const toggle = document.querySelector(".theme-toggle");
  function setTheme(theme) {
    const light = theme === "light";
    document.documentElement.dataset.theme = light ? "light" : "dark";
    const label = window.cinemaI18n.t(light ? "Увімкнути темну тему" : "Увімкнути світлу тему");
    toggle.setAttribute("aria-checked", String(light));
    toggle.title = label;
    document.querySelector('meta[name="theme-color"]').content = light
      ? "#f7f7f9"
      : "#101014";
  }
  setTheme(document.documentElement.dataset.theme);
  toggle.addEventListener("click", () => {
    const theme =
      document.documentElement.dataset.theme === "light" ? "dark" : "light";
    setTheme(theme);
    try {
      localStorage.setItem("cinema-theme", theme);
    } catch {
      /* Optional storage. */
    }
  });
  window.addEventListener("storage", (event) => {
    if (event.key === "cinema-theme" || event.key === null)
      setTheme(event.newValue);
  });
  document.querySelectorAll(".menu-panel a").forEach((link) => {
    link.addEventListener("click", () => {
      document.querySelector(".mobile-menu").open = false;
    });
  });
  const settings = document.querySelector(".settings-dialog");
  document.querySelector(".settings-toggle").addEventListener("click", () => settings.showModal());
  let startedOutside = false;
  function outside(event) {
    const bounds = settings.getBoundingClientRect();
    return event.target === settings && (event.clientX < bounds.left || event.clientX > bounds.right
      || event.clientY < bounds.top || event.clientY > bounds.bottom);
  }
  settings.addEventListener("pointerdown", (event) => { startedOutside = outside(event); });
  settings.addEventListener("click", (event) => {
    if (startedOutside && outside(event)) settings.close();
    startedOutside = false;
  });
})();
