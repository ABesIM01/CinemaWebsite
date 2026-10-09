(() => {
  const container = document.querySelector("#cinemas-map");
  if (!container) return;
  const button = document.querySelector("#find-cinemas");
  const status = document.querySelector("#cinemas-status");
  const results = document.querySelector("#cinemas-results");
  const googleLink = document.querySelector("#cinemas-google-link");
  const endpoints = ["https://overpass.private.coffee/api/interpreter", "https://overpass-api.de/api/interpreter"];
  function updateMapLanguage() {
    const iframe = container.querySelector("iframe");
    if (!iframe) return;
    const url = new URL(iframe.src);
    const language = document.documentElement.lang === "en" ? "en" : "uk";
    if (url.searchParams.get("hl") !== language) {
      url.searchParams.set("hl", language);
      iframe.src = url.href;
    }
  }
  document.addEventListener("cinema-language-change", updateMapLanguage);
  updateMapLanguage();

  function showEmbeddedMap(center) {
    const iframe = document.createElement("iframe");
    iframe.title = "Кінотеатри на карті Google";
    iframe.loading = "lazy";
    iframe.referrerPolicy = "no-referrer-when-downgrade";
    iframe.allowFullscreen = true;
    const query = `кінотеатри біля ${center.lat},${center.lng}`;
    iframe.src = `https://www.google.com/maps?q=${encodeURIComponent(query)}&ll=${center.lat},${center.lng}&z=13&output=embed&hl=uk`;
    container.replaceChildren(iframe);
    updateMapLanguage();
    googleLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  function locate() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false, timeout: 15000, maximumAge: 60000,
      });
    });
  }

  function distanceBetween(a, b) {
    const radians = (value) => value * Math.PI / 180;
    const latitude = radians(b.lat - a.lat);
    const longitude = radians(b.lng - a.lng);
    const haversine = Math.sin(latitude / 2) ** 2
      + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(longitude / 2) ** 2;
    return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, haversine)));
  }

  function normalizePlaces(elements, center, radius) {
    const places = [];
    for (const element of elements) {
      const point = element.center || element;
      if (!Number.isFinite(point.lat) || !Number.isFinite(point.lon)) continue;
      const tags = element.tags || {};
      const location = { lat: point.lat, lng: point.lon };
      const distance = distanceBetween(center, location);
      if (distance > radius) continue;
      const name = tags["name:uk"] || tags.name || tags.brand || "Кінотеатр";
      // A cinema may be mapped as both a building and a point.
      if (places.some((place) => place.name === name && distanceBetween(place.location, location) < 100)) continue;
      const street = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ");
      const address = tags["addr:full"] || [tags["addr:city"], street].filter(Boolean).join(", ");
      places.push({ name, location, distance, address });
    }
    return places.sort((a, b) => a.distance - b.distance).slice(0, 5);
  }

  async function searchNearby(center, radius) {
    const query = `[out:json][timeout:15];nwr["amenity"="cinema"](around:${radius},${center.lat},${center.lng});out center;`;
    for (const endpoint of endpoints) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 18000);
      try {
        const response = await fetch(endpoint, {
          method: "POST", body: new URLSearchParams({ data: query }),
          signal: controller.signal, credentials: "omit",
        });
        if (!response.ok) throw new Error("SEARCH_FAILED");
        const data = await response.json();
        // Overpass can return HTTP 200 for a timed-out, partial query.
        if (data.remark || !Array.isArray(data.elements)) throw new Error("INCOMPLETE_SEARCH");
        return normalizePlaces(data.elements, center, radius);
      } catch (error) {
        if (endpoint === endpoints[endpoints.length - 1]) throw error;
      } finally {
        clearTimeout(timer);
      }
    }
  }

  function renderPlaces(places, center) {
    results.replaceChildren();
    places.forEach((place, index) => {
      const item = document.createElement("li");
      item.className = "cinema-result";
      const heading = document.createElement("div");
      heading.className = "cinema-result-heading";
      const title = document.createElement("h3");
      const mapLink = document.createElement("a");
      mapLink.textContent = `${index + 1}. ${place.name}`;
      const mapParams = new URLSearchParams({ api: "1", query: `${place.location.lat},${place.location.lng}` });
      mapLink.href = `https://www.google.com/maps/search/?${mapParams}`;
      mapLink.target = "_blank";
      mapLink.rel = "noopener noreferrer";
      title.append(mapLink);
      const length = document.createElement("span");
      length.className = "cinema-distance";
      length.textContent = place.distance < 1000
        ? `${Math.round(place.distance)} м`
        : `${(place.distance / 1000).toLocaleString("uk-UA", { maximumFractionDigits: 1 })} км`;
      heading.append(title, length);
      const address = document.createElement("p");
      address.className = "cinema-address";
      address.textContent = place.address || "Переглянути розташування: натисніть назву кінотеатру";
      const route = document.createElement("a");
      route.className = "cinema-route";
      route.textContent = "Прокласти маршрут ↗";
      const routeParams = new URLSearchParams({
        api: "1", origin: `${center.lat},${center.lng}`,
        destination: `${place.location.lat},${place.location.lng}`,
      });
      route.href = `https://www.google.com/maps/dir/?${routeParams}`;
      route.target = "_blank";
      route.rel = "noopener noreferrer";
      item.append(heading, address, route);
      results.append(item);
    });
  }

  button.addEventListener("click", async () => {
    if (!window.isSecureContext || !navigator.geolocation) {
      status.textContent = "Для визначення розташування відкрийте сайт через HTTPS або localhost. Пошук також доступний у Google Maps.";
      return;
    }
    button.disabled = true;
    button.textContent = "Шукаємо…";
    results.replaceChildren();
    status.textContent = "Визначаємо ваше розташування. Дозвольте доступ у браузері.";
    let located = false;
    try {
      const position = await locate();
      const center = { lat: position.coords.latitude, lng: position.coords.longitude };
      located = true;
      showEmbeddedMap(center);
      status.textContent = "Шукаємо найближчі кінотеатри…";
      let radius = 20000;
      let places = await searchNearby(center, radius);
      if (!places.length) {
        radius = 50000;
        status.textContent = "Розширюємо пошук до 50 км…";
        places = await searchNearby(center, radius);
      }
      renderPlaces(places, center);
      status.textContent = places.length
        ? `Кінотеатри в радіусі ${radius / 1000} км за відстанню. Відстань — по прямій; маршрут — у Google Maps.`
        : "У відкритих даних не знайдено кінотеатрів у радіусі 50 км. Спробуйте пошук у Google Maps.";
    } catch (error) {
      if (!located) {
        const messages = {
          1: "Доступ до розташування заборонено. Дозвольте його в налаштуваннях браузера й повторіть пошук або відкрийте Google Maps.",
          2: "Не вдалося визначити розташування. Спробуйте ще раз або відкрийте Google Maps.",
          3: "Визначення розташування зайняло забагато часу. Спробуйте ще раз.",
        };
        status.textContent = messages[error.code] || "Геолокація недоступна. Скористайтеся Google Maps.";
      } else {
        status.textContent = "Сервіс пошуку тимчасово недоступний. Спробуйте ще раз або відкрийте Google Maps.";
      }
    } finally {
      button.disabled = false;
      button.textContent = "Знайти поруч";
    }
  });
})();
