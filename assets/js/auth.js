(() => {
  const root = new URL("../../", document.currentScript.src);
  const registrationUrl = new URL("pages/register.html", root).href;
  const registrationPanel = document.querySelector(".registration-panel");
  const google = document.querySelector(".registration-google");
  let client;
  let initialization;
  let session = null;
  let busy = false;
  let notice = "";
  let noticeError = false;
  const subscribers = new Set();
  const t = (value) => window.cinemaI18n?.t(value) || value;

  function showNotice(message, error = false) {
    notice = message;
    noticeError = error;
    const target = registrationPanel ? document.querySelector("#registration-note") : null;
    if (target) {
      target.hidden = !message;
      target.textContent = t(message);
      target.dataset.error = String(error);
    }
  }

  function render() {
    subscribers.forEach((callback) => callback(session));
    const authLink = document.querySelector("[data-auth-link]");
    if (authLink) {
      const authenticated = Boolean(session);
      authLink.dataset.authenticated = String(authenticated);
      authLink.setAttribute("aria-label", authenticated ? "\u0412\u0438 \u0443\u0432\u0456\u0439\u0448\u043b\u0438" : "\u0420\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u044f \u0442\u0430 \u0432\u0445\u0456\u0434");
      authLink.title = authenticated ? "\u0412\u0438 \u0443\u0432\u0456\u0439\u0448\u043b\u0438" : "\u041d\u0435 \u0443\u0432\u0456\u0439\u0448\u043b\u0438";
    }
    if (!registrationPanel) return;
    document.querySelector("#registration-methods").hidden = !!session;
    document.querySelector("#registration-account").hidden = !session;
    document.querySelector("#registration-account-email").textContent = session?.user?.email || "";
    document.querySelectorAll(".registration-panel button").forEach((element) => {
      element.disabled = busy;
    });
  }

  function errorMessage(error) {
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
      showNotice("Ви вийшли з акаунта.");
    });
  }

  google?.addEventListener("click", async () => {
    if (!client) await initialize();
    if (!client) {
      showNotice("Google-вхід недоступний. Перевірте налаштування Supabase та з’єднання з інтернетом.", true);
      return;
    }
    await run(async () => {
      const { error } = await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo: registrationUrl } });
      if (error) throw error;
    });
  });
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

  async function initializeOnce() {
    render();
    const config = window.cinemaAuthConfig;
    if (!config?.url || !config?.publishableKey) {
      if (registrationPanel) showNotice("Вхід тимчасово недоступний. Спробуйте пізніше.", true);
      return;
    }
    if (!/^https?:$/.test(location.protocol)) {
      if (registrationPanel) showNotice("Для входу відкрийте сайт через HTTPS або localhost.", true);
      return;
    }
    try {
      await loadSdk();
      client = window.supabase.createClient(config.url, config.publishableKey, {
        auth: { flowType: "pkce", detectSessionInUrl: false, persistSession: true, autoRefreshToken: true },
      });
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
    } finally { render(); }
  }
  function initialize() {
    if (!initialization) {
      initialization = initializeOnce().finally(() => {
        if (!client) initialization = null;
      });
    }
    return initialization;
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
