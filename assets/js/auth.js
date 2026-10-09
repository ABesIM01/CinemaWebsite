(() => {
  const root = new URL("../../", document.currentScript.src);
  const registrationUrl = new URL("pages/register.html", root).href;
  const emailForm = document.querySelector("#registration-email-form");
  const codeForm = document.querySelector("#registration-code-form");
  const contact = document.querySelector("#registration-contact");
  const code = document.querySelector("#registration-code");
  const resend = document.querySelector("#registration-resend");
  const google = document.querySelector(".registration-google");
  let client;
  let session = null;
  let busy = false;
  let pendingEmail = "";
  let resendAt = 0;
  let notice = "";
  let noticeError = false;
  const subscribers = new Set();
  const t = (value) => window.cinemaI18n?.t(value) || value;

  function showNotice(message, error = false) {
    notice = message;
    noticeError = error;
    const target = document.querySelector(emailForm ? "#registration-note" : ".settings-auth-status");
    if (target) {
      target.hidden = !message;
      target.textContent = t(message);
      target.dataset.error = String(error);
    }
  }

  function render() {
    subscribers.forEach((callback) => callback(session));
    const previous = document.querySelector(".settings-registration");
    const action = document.createElement(session ? "button" : "a");
    action.className = "button-primary settings-registration";
    action.textContent = t(session ? "Вийти з акаунта" : "Реєстрація");
    if (session) {
      action.type = "button";
      action.disabled = busy;
      action.addEventListener("click", logout);
    } else action.href = registrationUrl;
    previous?.replaceWith(action);
    if (!emailForm) return;
    document.querySelector("#registration-methods").hidden = !!session;
    document.querySelector("#registration-account").hidden = !session;
    document.querySelector("#registration-account-email").textContent = session?.user?.email || "";
    document.querySelectorAll(".registration-panel button, .registration-panel input").forEach((element) => {
      element.disabled = busy || !client;
    });
    resend.disabled = busy || !client || Date.now() < resendAt;
    resend.textContent = t(Date.now() < resendAt ? "Повторне надсилання доступне через хвилину" : "Надіслати код повторно");
  }

  function errorMessage(error) {
    if (error?.code === "otp_expired" || error?.code === "otp_disabled")
      return "Код неправильний або його термін дії минув. Спробуйте ще раз чи запросіть новий код.";
    if (error?.status === 429 || error?.code?.includes("rate_limit"))
      return "Забагато спроб. Зачекайте хвилину й повторіть.";
    return "Не вдалося виконати вхід. Перевірте з’єднання та спробуйте ще раз.";
  }

  async function run(operation) {
    if (busy || !client) return;
    busy = true;
    render();
    try { await operation(); }
    catch (error) { showNotice(errorMessage(error), true); }
    finally { busy = false; render(); }
  }

  async function logout() {
    await run(async () => {
      const { error } = await client.auth.signOut({ scope: "local" });
      if (error) throw error;
      session = null;
      pendingEmail = "";
      if (emailForm) {
        emailForm.reset();
        codeForm.reset();
        emailForm.hidden = false;
        codeForm.hidden = true;
        document.querySelector("#registration-alternatives").hidden = false;
      }
      showNotice("Ви вийшли з акаунта.");
    });
  }

  async function sendCode(email) {
    const { error } = await client.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    if (error) throw error;
    pendingEmail = email;
    emailForm.hidden = true;
    codeForm.hidden = false;
    document.querySelector("#registration-alternatives").hidden = true;
    document.querySelector("#registration-email").textContent = email;
    code.value = "";
    resendAt = Date.now() + 60000;
    setTimeout(render, 60000);
    showNotice("Код надіслано на вашу пошту. Перевірте також папку «Спам».");
  }

  emailForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    contact.value = contact.value.trim();
    if (!emailForm.reportValidity()) return;
    await run(() => sendCode(contact.value));
    if (pendingEmail) code.focus();
  });
  codeForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!codeForm.reportValidity() || !pendingEmail) return;
    await run(async () => {
      const { data, error } = await client.auth.verifyOtp({ email: pendingEmail, token: code.value.trim(), type: "email" });
      if (error) throw error;
      if (!data.session) throw new Error("Missing session");
      session = data.session;
      code.value = "";
      showNotice("Вхід успішний. Можна повертатися до афіші.");
    });
  });
  resend?.addEventListener("click", async () => {
    if (Date.now() < resendAt || !pendingEmail) return;
    await run(() => sendCode(pendingEmail));
    code.focus();
  });
  document.querySelector("#registration-change")?.addEventListener("click", () => {
    if (busy) return;
    pendingEmail = "";
    code.value = "";
    emailForm.hidden = false;
    codeForm.hidden = true;
    document.querySelector("#registration-alternatives").hidden = false;
    showNotice("Введіть електронну пошту, щоб отримати код.");
    contact.focus();
  });
  google?.addEventListener("click", () => run(async () => {
    const { error } = await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo: registrationUrl } });
    if (error) throw error;
  }));
  document.querySelector("#registration-logout")?.addEventListener("click", logout);
  document.addEventListener("cinema-language-change", () => { render(); showNotice(notice, noticeError); });

  function loadSdk() {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.8/dist/umd/supabase.js";
      script.async = true;
      const timeout = setTimeout(() => reject(new Error("SDK timeout")), 15000);
      script.onload = () => { clearTimeout(timeout); resolve(); };
      script.onerror = () => { clearTimeout(timeout); reject(new Error("SDK unavailable")); };
      document.head.append(script);
    });
  }

  async function initialize() {
    render();
    const config = window.cinemaAuthConfig;
    if (!config?.url || !config?.publishableKey) {
      if (emailForm) showNotice("Вхід тимчасово недоступний. Спробуйте пізніше.", true);
      return;
    }
    if (!/^https?:$/.test(location.protocol)) {
      if (emailForm) showNotice("Для входу відкрийте сайт через HTTPS або localhost.", true);
      return;
    }
    try {
      await loadSdk();
      client = window.supabase.createClient(config.url, config.publishableKey, {
        auth: { flowType: "pkce", detectSessionInUrl: false, persistSession: true, autoRefreshToken: true },
      });
      busy = true;
      client.auth.onAuthStateChange((_event, nextSession) => {
        session = nextSession;
        render();
      });
      const callbackUrl = new URL(location.href);
      const oauthCode = callbackUrl.searchParams.get("code");
      const oauthError = callbackUrl.searchParams.get("error") || new URLSearchParams(callbackUrl.hash.slice(1)).get("error");
      if (oauthCode || oauthError) {
        // Remove callback parameters before making any further requests.
        callbackUrl.searchParams.delete("code");
        ["error", "error_code", "error_description"].forEach((key) => callbackUrl.searchParams.delete(key));
        callbackUrl.hash = "";
        history.replaceState(null, "", callbackUrl.href);
        if (oauthError) showNotice("Вхід через Google скасовано або не вдалося завершити. Спробуйте ще раз.", true);
        else {
          const { error } = await client.auth.exchangeCodeForSession(oauthCode);
          if (error) throw error;
          showNotice("Вхід успішний. Можна повертатися до афіші.");
        }
      }
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      session = data.session;
    } catch {
      showNotice("Не вдалося виконати вхід. Перевірте з’єднання та спробуйте ще раз.", true);
    } finally { busy = false; render(); }
  }
  const ready = initialize();
  window.cinemaAuth = {
    ready,
    subscribe(callback) {
      subscribers.add(callback);
      callback(session);
      return () => subscribers.delete(callback);
    },
    async getSession() {
      await ready;
      if (!client) return null;
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      return data.session;
    },
    async sendTicketEmail(order) {
      const current = await this.getSession();
      if (!current?.user?.email) throw Object.assign(new Error("Sign in required"), { code: "auth_required" });
      const { data, error } = await client.functions.invoke("send-tickets", { body: order });
      if (error) {
        let response;
        try { response = await error.context?.json(); } catch { /* Network failure. */ }
        const serviceMissing = response?.code === "NOT_FOUND" || error.context?.status === 404;
        const networkFailure = error.name === "FunctionsFetchError";
        throw Object.assign(error, { code: serviceMissing || networkFailure ? "ticket_service_unavailable" : response?.code || "send_failed" });
      }
      if (!data?.tickets?.length || !data?.accepted) throw Object.assign(new Error("Email not accepted"), { code: "send_failed" });
      return data;
    },
  };
})();
