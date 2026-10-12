// Вибір місць у демонстраційній схемі залу.
document.querySelectorAll(".hall-rows").forEach((rows) => {
  const hall = rows.closest(".cinema-hall");
  const checkout = hall.querySelector(".hall-checkout");
  const selection = hall.querySelector(".hall-selection");
  const selectionMore = hall.querySelector(".hall-selection-more");
  const selectionDialog = hall.querySelector(".hall-selection-dialog");
  const pay = hall.querySelector(".hall-pay");
  const dialog = hall.querySelector(".hall-payment:not(.hall-selection-dialog)");
  const money = (value) => `${value.toLocaleString("uk-UA")} ₴`;

  function selectedSeats() {
    return [...rows.querySelectorAll(".hall-seat--selected")];
  }

  function total(seats) {
    return seats.reduce((sum, seat) => sum + Number(seat.dataset.price), 0);
  }

  function updateCheckout() {
    const seats = selectedSeats();
    checkout.hidden = seats.length === 0;
    const collapsed = seats.length > 4;
    selection.textContent = collapsed ? `Вибрано місць: ${seats.length}` : seats.map((seat) => seat.dataset.seatLabel).join("; ");
    selection.hidden = false;
    selectionMore.hidden = !collapsed;
    pay.textContent = `Оплатити ${money(total(seats))}`;
  }

  rows.addEventListener("click", (event) => {
    const seat = event.target.closest("button.hall-seat");
    if (!seat || !rows.contains(seat) || seat.disabled) return;
    const selected = seat.classList.toggle("hall-seat--selected");
    seat.setAttribute("aria-pressed", String(selected));
    seat.setAttribute("aria-label", `${seat.dataset.seatLabel}, ${money(Number(seat.dataset.price))}: ${selected ? "вибране" : "вільне"}`);
    updateCheckout();
  });
  document.addEventListener("cinema-showtime-change", () => {
    selectedSeats().forEach((seat) => {
      seat.classList.remove("hall-seat--selected");
      seat.setAttribute("aria-pressed", "false");
    });
    updateCheckout();
  });

  function showOrder(targetDialog) {
    const seats = selectedSeats();
    if (!seats.length) return;
    targetDialog.querySelector(".payment-movie").textContent = document.querySelector("#movie-title").textContent;
    targetDialog.querySelector(".payment-session").textContent = hall.querySelector(".hall-session time").textContent;
    const list = targetDialog.querySelector(".payment-seats");
    list.replaceChildren(...seats.map((seat) => {
      const item = document.createElement("li");
      item.textContent = `${seat.dataset.seatLabel} — ${money(Number(seat.dataset.price))}`;
      return item;
    }));
    targetDialog.querySelector(".payment-total").textContent = money(total(seats));
    targetDialog.showModal();
    const firstControl = [...targetDialog.querySelectorAll('button, a[href]')]
      .find((control) => !control.disabled && control.getClientRects().length);
    firstControl?.focus({ preventScroll: true });
  }
  selectionMore.addEventListener("click", () => showOrder(selectionDialog));
  pay.addEventListener("click", () => showOrder(dialog));
  selectionDialog.querySelector(".hall-proceed").addEventListener("click", () => {
    selectionDialog.close();
    showOrder(dialog);
  });
  [selectionDialog, dialog].forEach((modal) => {
    let startedOutside = false;
    function isOutside(event) {
      const bounds = modal.getBoundingClientRect();
      return event.target === modal && (
        event.clientX < bounds.left || event.clientX > bounds.right
        || event.clientY < bounds.top || event.clientY > bounds.bottom
      );
    }
    modal.addEventListener("pointerdown", (event) => {
      startedOutside = isOutside(event);
    });
    modal.addEventListener("click", (event) => {
      if (startedOutside && isOutside(event)) modal.close();
      startedOutside = false;
    });
  });
  updateCheckout();
});

// YouTube IFrame Player API: автоматичне відтворення без звуку.
(() => {
  const section = document.querySelector(".movie-trailer");
  if (!section) return;
  const sound = section.querySelector(".trailer-sound");
  const status = section.querySelector(".trailer-status");
  let player;
  let ready = false;
  let soundEnabled = false;

  function showFallback(message) {
    ready = false;
    sound.disabled = true;
    status.textContent = message;
  }

  function toggleSound() {
    if (!ready) return;
    soundEnabled = !soundEnabled;
    if (soundEnabled) {
      player.unMute();
      player.setVolume(80);
      player.playVideo();
    } else {
      player.mute();
    }
    sound.textContent = soundEnabled ? "Вимкнути звук" : "Увімкнути звук";
    sound.setAttribute("aria-pressed", String(soundEnabled));
    status.textContent = soundEnabled
      ? "Звук увімкнено."
      : "Трейлер відтворюється без звуку. Натисни кнопку «Увімкнути звук» над відео.";
  }
  sound.addEventListener("click", toggleSound);

  if (!/^https?:$/.test(location.protocol)) {
    showFallback(
      "Для перегляду трейлера відкрий сайт через Live Server або скористайся посиланням на YouTube."
    );
    return;
  }

  const timeout = setTimeout(() => {
    if (!ready)
      showFallback(
        "Не вдалося завантажити трейлер. Спробуй оновити сторінку або дивись на YouTube."
      );
  }, 15000);

  function createPlayer() {
    player = new YT.Player("trailer-player", {
      videoId: section.dataset.videoId,
      width: "100%",
      height: "100%",
      playerVars: {
        autoplay: 1,
        mute: 1,
        playsinline: 1,
        rel: 0,
        origin: location.origin,
      },
      events: {
        onReady(event) {
          clearTimeout(timeout);
          ready = true;
          const iframe = event.target.getIframe();
          iframe.title = `Трейлер — ${
            document.querySelector("#movie-title").textContent
          }`;
          iframe.removeAttribute("allowfullscreen");
          iframe.setAttribute(
            "allow",
            "autoplay; encrypted-media; picture-in-picture; fullscreen"
          );
          iframe.setAttribute(
            "referrerpolicy",
            "strict-origin-when-cross-origin"
          );
          event.target.mute();
          sound.disabled = false;
          event.target.playVideo();
        },
        onAutoplayBlocked() {
          status.textContent =
            "Натисни кнопку «Увімкнути звук» над відео, щоб почати перегляд зі звуком.";
        },
        onError() {
          clearTimeout(timeout);
          showFallback(
            "Трейлер недоступний у вбудованому програвачі. Спробуй переглянути його на YouTube."
          );
        },
      },
    });
  }

  if (window.YT?.Player) {
    createPlayer();
  } else {
    window.onYouTubeIframeAPIReady = createPlayer;
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      clearTimeout(timeout);
      showFallback(
        "Не вдалося підключитися до YouTube. Спробуй оновити сторінку або перейти за посиланням нижче."
      );
    };
    document.head.append(script);
  }
})();
