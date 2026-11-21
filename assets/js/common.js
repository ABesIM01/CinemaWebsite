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
  const mobileMenu = document.querySelector(".mobile-menu");
  document.querySelectorAll(".menu-panel a").forEach((link) => {
    link.addEventListener("click", () => { mobileMenu.open = false; });
  });
  document.addEventListener("click", (event) => {
    if (mobileMenu.open && !mobileMenu.contains(event.target)) mobileMenu.open = false;
  });
  document.querySelectorAll(".movie-card").forEach((card) => {
    const movieLink = card.querySelector(".poster-link");
    if (!movieLink) return;
    card.tabIndex = 0;
    card.setAttribute("role", "link");
    card.setAttribute("aria-label", movieLink.getAttribute("aria-label") || "Open movie details");
    card.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.target.closest("a, button, input, select, textarea, [role=button]")) return;
      window.location.href = movieLink.href;
    });
    card.addEventListener("keydown", (event) => {
      if (event.target !== card || (event.key !== "Enter" && event.key !== " ")) return;
      event.preventDefault();
      window.location.href = movieLink.href;
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
