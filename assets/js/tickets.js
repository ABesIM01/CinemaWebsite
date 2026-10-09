(() => {
  const auth = window.cinemaAuth;
  const root = new URL("../../", document.currentScript.src);
  const t = (value) => window.cinemaI18n?.t(value) || value;
  document.querySelectorAll('.cinema-hall').forEach((hall) => {
    const dialog = hall.querySelector('.hall-payment:not(.hall-selection-dialog)');
    const send = dialog.querySelector('.ticket-send');
    const payment = dialog.querySelector('.ticket-payment-actions');
    const confirmPayment = dialog.querySelector('.hall-confirm-payment');
    const emailActions = dialog.querySelector('.ticket-email-actions');
    const login = dialog.querySelector('.ticket-login');
    const status = dialog.querySelector('.ticket-status');
    const preview = dialog.querySelector('.ticket-preview');
    const rows = hall.querySelector('.hall-rows');
    login.href = new URL('pages/register.html', root).href;
    let session = null;
    let busy = false;
    let lastOrder;
    let sentKey = '';
    let paidKey = '';
    let message = '';
    let failed = false;
    const seatIds = () => [...rows.querySelectorAll('button.hall-seat--selected[data-seat-id]:not(:disabled)')]
      .map((seat) => seat.dataset.seatId).sort();
    const orderKey = () => JSON.stringify([session?.user?.id, hall.dataset.movieId, seatIds()]);

    function render() {
      const signedIn = !!session?.user?.email;
      const paid = paidKey === orderKey();
      payment.hidden = paid;
      emailActions.hidden = !paid;
      confirmPayment.disabled = busy || !seatIds().length;
      login.hidden = signedIn;
      send.hidden = !paid || !signedIn;
      send.disabled = busy || !paid || !seatIds().length || sentKey === orderKey();
      send.textContent = t(busy ? 'Надсилаємо квитки…' : 'Надіслати квитки на пошту');
      status.textContent = t(message || (paid ? (signedIn ? 'Квитки у PDF надійдуть на пошту вашого акаунта.' : 'Увійдіть в акаунт, щоб отримати квитки на пошту.') : 'Натисніть «Оплатити», щоб перейти до надсилання квитків.'));
      status.dataset.error = String(failed);
    }
    auth?.subscribe((next) => {
      if (session?.user?.id !== next?.user?.id) {
        preview.replaceChildren();
        message = '';
        sentKey = '';
        paidKey = '';
        failed = false;
        lastOrder = null;
      }
      session = next;
      render();
    });
    rows.addEventListener('click', () => {
      if (paidKey && orderKey() !== paidKey) {
        preview.replaceChildren();
        message = '';
        failed = false;
        paidKey = '';
        sentKey = '';
        lastOrder = null;
      }
      render();
    });
    document.addEventListener('cinema-language-change', render);
    confirmPayment.addEventListener('click', () => {
      if (busy || !seatIds().length) return;
      paidKey = orderKey();
      message = 'Демонстраційну оплату підтверджено. Тепер можна надіслати квитки на пошту.';
      failed = false;
      render();
    });
    send.addEventListener('click', async () => {
      if (busy || !auth || paidKey !== orderKey() || !session?.user?.email || !seatIds().length) return;
      const key = orderKey();
      if (key === sentKey) return;
      if (!lastOrder || lastOrder.key !== key) lastOrder = {
        key, requestId: crypto.randomUUID(), movieId: hall.dataset.movieId, seats: seatIds(),
      };
      const order = { requestId: lastOrder.requestId, movieId: lastOrder.movieId, seats: lastOrder.seats };
      const accountId = session?.user?.id;
      busy = true;
      failed = false;
      message = 'Надсилаємо квитки…';
      render();
      try {
        const result = await auth.sendTicketEmail(order);
        if (session?.user?.id !== accountId || key !== orderKey()) return;
        sentKey = key;
        message = 'Квитки передано поштовому сервісу. Перевірте пошту та папку «Спам».';
        preview.replaceChildren(...result.tickets.map((ticket) => {
          const card = document.createElement('article');
          card.className = 'ticket-card';
          const fields = [
            ['Номер квитка', ticket.number],
            ['Номер місця', ticket.seat],
            ['Вартість', `${ticket.price} ₴`],
            ['Назва сеансу', ticket.sessionName],
            ['Тривалість', `${ticket.durationMinutes} хв`],
          ];
          fields.forEach(([label, value]) => {
            const line = document.createElement('p');
            const name = document.createElement('strong');
            name.textContent = `${label}: `;
            const content = document.createElement('span');
            content.textContent = value;
            if (label === 'Номер квитка') content.dataset.noTranslate = '';
            line.append(name, content);
            card.append(line);
          });
          return card;
        }));
      } catch (error) {
        if (session?.user?.id !== accountId || key !== orderKey()) return;
        failed = true;
        if (error.code === 'auth_required') session = null;
        message = error.code === 'auth_required' ? 'Увійдіть в акаунт, щоб отримати квитки на пошту.'
          : error.code === 'rate_limit' ? 'Забагато запитів квитків. Спробуйте пізніше.'
          : error.code === 'in_progress' ? 'Квитки вже надсилаються. Зачекайте пів хвилини та повторіть.'
          : error.code === 'pdf_generation_failed' ? 'Не вдалося сформувати PDF-квитки. Спробуйте ще раз.'
          : ['ticket_service_unavailable', 'service_unavailable', 'server_not_configured', 'email_not_configured', 'ticket_storage_unavailable'].includes(error.code) ? 'Надсилання квитків поки недоступне. Зверніться до адміністратора сайту.'
          : 'Не вдалося надіслати квитки. Спробуйте ще раз. Якщо помилка повторюється, зверніться до адміністратора.';
      } finally { busy = false; render(); }
    });
    render();
  });
})();
