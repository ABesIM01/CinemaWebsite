(() => {
  const translate = (value) => window.cinemaI18n?.t(value) || value;
  const money = (value) => `${value.toLocaleString('uk-UA')} ₴`;
  const requestedShowtime = new URLSearchParams(location.search).get('showtime');
  const storageKey = (movieId) => `cinema-showtime:${movieId}`;
  function savedShowtime(movieId) {
    try { return localStorage.getItem(storageKey(movieId)); } catch { return null; }
  }
  function saveShowtime(movieId, id) {
    try { localStorage.setItem(storageKey(movieId), id); } catch { /* The current page selection still works. */ }
  }

  function choices(baseTime) {
    return [
      { id: 'morning', time: '10:30', delta: -20, hall: 2 },
      { id: 'day', time: '14:00', delta: -10, hall: 3 },
      { id: 'evening', time: baseTime, delta: 0, hall: 1 },
      { id: 'late', time: baseTime === '21:15' ? '22:00' : '21:15', delta: 20, hall: 4 },
    ].filter((choice, index, all) => all.findIndex((item) => item.time === choice.time) === index);
  }

  const dialog = document.createElement('dialog');
  dialog.className = 'settings-dialog showtime-dialog';
  dialog.setAttribute('aria-labelledby', 'showtime-title');
  dialog.innerHTML = `
    <div class="settings-heading">
      <h2 id="showtime-title">${translate('Оберіть час сеансу')}</h2>
      <form method="dialog"><button class="settings-close" aria-label="${translate('Закрити')}">×</button></form>
    </div>
    <div class="showtime-choices" role="group" aria-labelledby="showtime-title"></div>`;
  document.body.append(dialog);

  let applyChoice = null;
  function openDialog(options, selectedId, apply) {
    applyChoice = apply;
    const list = dialog.querySelector('.showtime-choices');
    list.replaceChildren(...options.map((choice) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'showtime-choice';
      button.textContent = choice.time;
      button.setAttribute('aria-pressed', String(choice.id === selectedId));
      button.addEventListener('click', () => {
        applyChoice?.(choice);
        dialog.close();
      });
      return button;
    }));
    dialog.showModal();
    list.querySelector('[aria-pressed="true"]')?.focus({ preventScroll: true });
  }

  let pointerStartedOutside = false;
  function isOutside(event) {
    const bounds = dialog.getBoundingClientRect();
    return event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right
      || event.clientY < bounds.top || event.clientY > bounds.bottom);
  }
  dialog.addEventListener('pointerdown', (event) => { pointerStartedOutside = isOutside(event); });
  dialog.addEventListener('click', (event) => {
    if (pointerStartedOutside && isOutside(event)) dialog.close();
    pointerStartedOutside = false;
  });
  document.addEventListener('cinema-language-change', () => {
    dialog.querySelector('#showtime-title').textContent = translate('Оберіть час сеансу');
    dialog.querySelector('.settings-close').setAttribute('aria-label', translate('Закрити'));
  });

  function currentChoice(options, movieId) {
    const saved = savedShowtime(movieId);
    return options.find((choice) => choice.id === requestedShowtime)
      || options.find((choice) => choice.id === saved)
      || options.find((choice) => choice.id === 'evening');
  }
  function updateLink(link, id) {
    const url = new URL(link.href, location.href);
    url.searchParams.set('showtime', id);
    url.hash = 'session-title';
    link.href = url.href;
  }
  function updateCardLinks(card, activeLink, id) {
    card.querySelectorAll('a[href*="/movies/"]').forEach((link) => {
      if (link === activeLink) return;
      const url = new URL(link.href, location.href);
      url.searchParams.set('showtime', id);
      link.href = url.href;
    });
  }

  document.querySelectorAll('.movie-card .session').forEach((session) => {
    const time = session.querySelector('time');
    const price = session.querySelector('strong');
    const link = session.querySelector('.session-link');
    if (!time || !price || !link) return;
    const baseTime = time.textContent.trim();
    const basePrice = Number(price.textContent.replace(/\D/g, ''));
    const options = choices(baseTime);
    const movieId = new URL(link.href, location.href).pathname.split('/').pop().replace(/\.html$/, '');
    let selected = currentChoice(options, movieId);

    function apply(choice) {
      selected = choice;
      time.textContent = choice.time;
      price.innerHTML = `${basePrice + choice.delta} <small>₴</small>`;
      link.setAttribute('aria-label', `${translate('Обрати сеанс')}: ${choice.time}`);
      link.setAttribute('aria-haspopup', 'dialog');
      link.setAttribute('aria-controls', 'showtime-title');
      updateLink(link, choice.id);
      updateCardLinks(session.closest('.movie-card'), link, choice.id);
      saveShowtime(movieId, choice.id);
    }
    apply(selected);
    link.addEventListener('click', (event) => {
      event.preventDefault();
      openDialog(options, selected.id, apply);
    });
  });

  document.querySelectorAll('.movie-page').forEach((page) => {
    const schedule = page.querySelector('.movie-schedule .session');
    const hall = page.querySelector('.cinema-hall');
    if (!schedule || !hall) return;
    const scheduleTime = schedule.querySelector('time');
    const schedulePrice = schedule.querySelector('strong');
    const baseTime = scheduleTime.textContent.trim();
    const basePrice = Number(schedulePrice.textContent.replace(/\D/g, ''));
    const options = choices(baseTime);
    const movieId = hall.dataset.movieId;
    let selected = currentChoice(options, movieId);
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'session-time-trigger';
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-controls', 'showtime-title');
    trigger.append(scheduleTime.cloneNode());
    scheduleTime.replaceWith(trigger);
    const displayedTime = trigger.querySelector('time');

    const hallSession = hall.querySelector('.hall-session');
    const timeNode = hallSession.querySelector('time');
    const hallDetails = hallSession.querySelectorAll(':scope > span');
    const hallName = document.createElement('span');
    hallName.className = 'hall-number';
    hallSession.prepend(hallName);
    const seats = hall.querySelectorAll('.hall-seat[data-price]');
    const regularBase = Number(seats[0]?.dataset.price);
    const originalVipPrice = Number([...seats].find((seat) => seat.classList.contains('hall-seat--vip'))?.dataset.price || regularBase + 100);

    function apply(choice) {
      selected = choice;
      saveShowtime(movieId, choice.id);
      const regularPrice = basePrice + choice.delta;
      const vipPrice = originalVipPrice + choice.delta;
      displayedTime.textContent = choice.time;
      schedulePrice.innerHTML = `${regularPrice} <small>₴</small>`;
      timeNode.textContent = choice.time;
      hall.dataset.room = String(choice.hall);
      hall.dataset.showtime = choice.id;
      hall.dataset.sessionTime = choice.time;
      hallName.textContent = `${translate('Зал')} ${choice.hall}`;
      hallDetails[2].innerHTML = `${translate('Звичайне')}: <strong>${regularPrice} ₴</strong>`;
      hallDetails[3].innerHTML = `VIP: <strong>${vipPrice} ₴</strong>`;
      hall.querySelectorAll('.hall-tier').forEach((tier) => {
        const vip = tier.classList.contains('hall-tier--vip');
        tier.textContent = `${translate(vip ? 'VIP-дивани' : 'Звичайні місця')} · ${vip ? vipPrice : regularPrice} ₴${vip ? ` ${translate('за місце')}` : ''}`;
      });
      seats.forEach((seat) => {
        const amount = seat.classList.contains('hall-seat--vip') ? vipPrice : regularPrice;
        seat.dataset.price = amount;
        const label = seat.dataset.seatLabel;
        seat.title = `${label} — ${money(amount)}`;
        seat.setAttribute('aria-label', `${label}, ${money(amount)}: ${seat.disabled ? 'зайняте' : 'вільне'}`);
      });
      document.dispatchEvent(new CustomEvent('cinema-showtime-change', { detail: choice }));
    }

    trigger.addEventListener('click', () => openDialog(options, selected.id, apply));
    document.addEventListener('cinema-language-change', () => {
      hallName.textContent = `${translate('Зал')} ${selected.hall}`;
      hallDetails[2].innerHTML = `${translate('Звичайне')}: <strong>${basePrice + selected.delta} ₴</strong>`;
    });
    apply(selected);
  });
})();
