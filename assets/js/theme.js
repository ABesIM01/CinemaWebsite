// Apply the saved theme before the page is painted.
(() => {
  let theme = "dark";
  try {
    if (localStorage.getItem("cinema-theme") === "light") theme = "light";
  } catch {
    /* The theme also works when storage is unavailable. */
  }
  document.documentElement.dataset.theme = theme;
  try {
    document.documentElement.lang = localStorage.getItem("cinema-language") === "en" ? "en" : "uk";
  } catch {
    document.documentElement.lang = "uk";
  }
  document.querySelector('meta[name="theme-color"]').content =
    theme === "light" ? "#f7f7f9" : "#101014";
})();
