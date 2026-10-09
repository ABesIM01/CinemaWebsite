// Карусель із короткими фрагментами трейлерів без звуку.
(() => {
  const SLIDE_INTERVAL = 10000;
  const VIDEO_REVEAL_DELAY = 3000;
  const hero = document.querySelector(".hero-grid");
  hero.append(
    document.querySelector("#more-premieres").content.cloneNode(true)
  );
  const slides = [...hero.children];
  const dots = [...document.querySelectorAll(".slider-dot")];
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let active = 0;
  let timer;
  let gesture = null;
  let paused = false;
  let videoApiReady = false;
  const videos = new Map();
  slides.forEach((slide, index) => {
    slide.id = `premiere-${index + 1}`;
    dots[index].setAttribute("aria-controls", slide.id);
    slide.querySelector("img").draggable = false;
  });

  function canPlay(index) {
    const next = (active + 1) % slides.length;
    return (index === active || index === next) &&
      !document.hidden && !reducedMotion.matches;
  }

  function hideVideo(index) {
    const video = videos.get(index);
    if (video) {
      clearTimeout(video.revealTimer);
      video.revealTimer = null;
    }
    slides[index].querySelector(".feature-visual").classList.remove("is-playing");
  }

  function revealVideo(index) {
    const video = videos.get(index);
    const visual = slides[index].querySelector(".feature-visual");
    if (video.revealTimer || visual.classList.contains("is-playing")) return;
    const initialTime = video.player.getCurrentTime();
    // Чекаємо завершення стартової анімації YouTube під постером.
    // Наступний слайд проходить цю підготовку ще до перемикання.
    video.revealTimer = setTimeout(() => {
      video.revealTimer = null;
      if (canPlay(index) && !video.failed &&
          video.player.getPlayerState() === YT.PlayerState.PLAYING &&
          video.player.getCurrentTime() > initialTime + 0.25) {
        visual.classList.add("is-playing");
      }
    }, VIDEO_REVEAL_DELAY);
  }

  function playClip(index, player) {
    hideVideo(index);
    videos.get(index).started = true;
    const slide = slides[index];
    const start = Number(slide.dataset.clipStart);
    player.mute();
    player.loadVideoById({
      videoId: slide.dataset.videoId,
      startSeconds: start,
      endSeconds: start + 24,
    });
  }

  function createVideo(index) {
    const slide = slides[index];
    const visual = slide.querySelector(".feature-visual");
    const start = Number(slide.dataset.clipStart);
    const mount = document.createElement("div");
    mount.id = `premiere-video-${index + 1}`;
    mount.className = "feature-video";
    mount.setAttribute("aria-hidden", "true");
    visual.prepend(mount);
    const video = { ready: false, failed: false, started: false, player: null, revealTimer: null };
    videos.set(index, video);
    video.player = new YT.Player(mount.id, {
      videoId: slide.dataset.videoId,
      width: "100%",
      height: "100%",
      playerVars: {
        autoplay: 0, mute: 1, controls: 0, disablekb: 1, fs: 0,
        playsinline: 1, iv_load_policy: 3, rel: 0,
        start, end: start + 24, origin: location.origin,
      },
      events: {
        onReady(event) {
          video.ready = true;
          const iframe = event.target.getIframe();
          iframe.classList.add("feature-video");
          iframe.title = `Фрагмент трейлера — ${slide.querySelector("h3").textContent}`;
          iframe.tabIndex = -1;
          iframe.setAttribute("aria-hidden", "true");
          iframe.removeAttribute("allowfullscreen");
          iframe.setAttribute("allow", "autoplay; encrypted-media");
          iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
          const resize = () => {
            const bounds = visual.getBoundingClientRect();
            const pixelRatio = window.devicePixelRatio || 1;
            const width = Math.ceil(Math.max(
              bounds.width + 160,
              ((bounds.height + 256) * 16) / 9
            ) * pixelRatio / 2) * 2 / pixelRatio;
            const height = Math.ceil(width * 9 / 16 * pixelRatio / 2) * 2 / pixelRatio;
            iframe.style.width = `${width}px`;
            iframe.style.height = `${height}px`;
            iframe.style.left = `${Math.round((bounds.width - width) / 2 * pixelRatio) / pixelRatio}px`;
            iframe.style.top = `${Math.round((bounds.height - height) / 2 * pixelRatio) / pixelRatio}px`;
          };
          new ResizeObserver(resize).observe(visual);
          resize();
          event.target.mute();
          if (canPlay(index)) playClip(index, event.target);
        },
        onStateChange(event) {
          const playing = event.data === YT.PlayerState.PLAYING;
          if (playing && canPlay(index) && !video.failed) revealVideo(index);
          else hideVideo(index);
          if (playing && !canPlay(index)) event.target.pauseVideo();
          if (event.data === YT.PlayerState.ENDED && canPlay(index)) playClip(index, event.target);
        },
        onAutoplayBlocked() { hideVideo(index); },
        onError() {
          video.failed = true;
          hideVideo(index);
        },
      },
    });
  }

  function syncVideos() {
    videos.forEach((video, index) => {
      if (!video.ready || video.failed) return;
      if (canPlay(index)) {
        video.player.mute();
        if (!video.started) playClip(index, video.player);
        else if (video.player.getPlayerState() !== YT.PlayerState.PLAYING) {
          hideVideo(index);
          video.player.playVideo();
        }
      } else {
        hideVideo(index);
        video.started = false;
        video.player.pauseVideo();
      }
    });
    if (videoApiReady && canPlay(active)) {
      const next = (active + 1) % slides.length;
      if (!videos.has(active)) createVideo(active);
      if (!videos.has(next)) createVideo(next);
    }
  }

  function loadVideoApi() {
    if (!/^https?:$/.test(location.protocol) || reducedMotion.matches) return;
    if (window.YT?.Player) {
      videoApiReady = true;
      syncVideos();
      return;
    }
    if (document.querySelector("script[data-hero-video-api]")) return;
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      videoApiReady = true;
      syncVideos();
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.dataset.heroVideoApi = "true";
    script.async = true;
    document.head.append(script);
  }

  function render() {
    slides.forEach((slide, index) => {
      const visible = index === active;
      slide.classList.toggle("is-visible", visible);
      slide.inert = !visible;
      slide.setAttribute("aria-hidden", String(!visible));
      dots[index].classList.toggle("active", index === active);
      if (visible) dots[index].setAttribute("aria-current", "true");
      else dots[index].removeAttribute("aria-current");
    });
    syncVideos();
  }
  render();
  hero.classList.add("carousel-ready");
  reducedMotion.addEventListener("change", () => {
    syncVideos();
    loadVideoApi();
  });
  document.addEventListener("visibilitychange", () => syncVideos());
  const pause = document.querySelector(".slider-pause");
  pause.addEventListener("click", () => {
    paused = !paused;
    pause.setAttribute("aria-pressed", String(paused));
    pause.textContent = paused ? "Продовжити" : "Пауза";
    pause.setAttribute(
      "aria-label",
      paused
        ? "Продовжити автоперемикання слайдів"
        : "Призупинити автоперемикання слайдів"
    );
    restartTimer();
  });

  function selectSlide(index) {
    active = (index + slides.length) % slides.length;
    render();
    restartTimer();
  }

  function restartTimer() {
    clearInterval(timer);
    timer = setInterval(() => {
      if (
        document.hidden ||
        reducedMotion.matches ||
        paused ||
        gesture ||
        hero.matches(":focus-within")
      )
        return;
      active = (active + 1) % slides.length;
      render();
    }, SLIDE_INTERVAL);
  }

  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => selectSlide(index));
    dot.addEventListener("keydown", (event) => {
      let next;
      if (event.key === "ArrowRight") next = (index + 1) % slides.length;
      else if (event.key === "ArrowLeft")
        next = (index + slides.length - 1) % slides.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = slides.length - 1;
      else return;
      event.preventDefault();
      dots[next].focus();
      selectSlide(next);
    });
  });

  hero.addEventListener("pointerdown", (event) => {
    if (
      !event.isPrimary ||
      event.button !== 0 ||
      event.target.closest("a, button")
    )
      return;
    if (
      event.pointerType === "mouse" &&
      !event.target.closest(".feature-visual")
    )
      return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY };
    hero.setPointerCapture(event.pointerId);
  });
  hero.addEventListener("pointerup", (event) => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    gesture = null;
    if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      selectSlide(active + (dx < 0 ? 1 : -1));
    }
  });
  const cancelGesture = () => {
    gesture = null;
  };
  hero.addEventListener("pointercancel", cancelGesture);
  hero.addEventListener("lostpointercapture", cancelGesture);
  restartTimer();
  loadVideoApi();
})();
