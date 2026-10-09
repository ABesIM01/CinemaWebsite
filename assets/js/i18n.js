(() => {
  const messages = Object.fromEntries(`
КАДР|KADR
Налаштування|Settings
Мова|Language
Англійська мова|English language
Увімкнути англійську мову|Switch to English
Увімкнути українську мову|Switch to Ukrainian
Світла тема|Light theme
Зміна теми|Change theme
Увімкнути світлу тему|Switch to light theme
Увімкнути темну тему|Switch to dark theme
Головна навігація|Main navigation
Головна|Home
Афіша|Now showing
Рекомендуємо|Featured
Кінотеатр|Cinema
Кіно поруч|Nearby cinemas
Обрати сеанс|Choose a showtime
Реєстрація|Sign up
Надіслати квитки на пошту|Email tickets
Не вдалося сформувати PDF-квитки. Спробуйте ще раз.|Could not generate PDF tickets. Please try again.
Натисніть «Оплатити», щоб перейти до надсилання квитків.|Click “Pay” to proceed to emailing your tickets.
Демонстраційну оплату підтверджено. Тепер можна надіслати квитки на пошту.|Demo payment confirmed. You can now email your tickets.
Демонстраційна оплата: гроші не списуються.|Demo payment: no money is charged.
Надсилання квитків поки недоступне. Зверніться до адміністратора сайту.|Ticket emailing is currently unavailable. Contact the website administrator.
Надсилаємо квитки…|Sending tickets…
Увійти та отримати квитки|Sign in to get tickets
Квитки надійдуть на пошту вашого акаунта.|Tickets will be sent to your account email.
Квитки у PDF надійдуть на пошту вашого акаунта.|PDF tickets will be sent to your account email.
Увійдіть в акаунт, щоб отримати квитки на пошту.|Sign in to receive tickets by email.
Квитки передано поштовому сервісу. Перевірте пошту та папку «Спам».|Tickets have been accepted by the email service. Check your inbox and spam folder.
Забагато запитів квитків. Спробуйте пізніше.|Too many ticket requests. Please try again later.
Квитки вже надсилаються. Зачекайте пів хвилини та повторіть.|Tickets are already being sent. Wait 30 seconds and try again.
Не вдалося надіслати квитки. Спробуйте ще раз. Якщо помилка повторюється, зверніться до адміністратора.|Could not send tickets. Try again. If the problem persists, contact the administrator.
Демонстраційні квитки: оплата й бронювання ще не підключені.|Demo tickets: payment and booking are not connected yet.
Номер квитка|Ticket number
Номер місця|Seat number
Вартість|Price
Назва сеансу|Session name
Реєстрація та вхід|Sign up or sign in
Електронна пошта|Email address
Увійдіть за кодом із листа або через Google. Якщо акаунта ще немає, створимо його автоматично.|Sign in with an email code or Google. If you do not have an account, we will create one automatically.
Надіслати код|Send code
Код підтвердження|Verification code
Введіть код із листа для|Enter the email code for
Підтвердити та увійти|Verify and sign in
Надіслати код повторно|Resend code
Повторне надсилання доступне через хвилину|You can resend the code in one minute
Змінити пошту|Change email
Вийти з акаунта|Sign out
Ви увійшли як|You are signed in as
Пароль не потрібен. Підтвердьте свою електронну пошту кодом із листа.|No password needed. Verify your email address with the code from your inbox.
Вхід тимчасово недоступний. Спробуйте пізніше.|Sign-in is temporarily unavailable. Please try again later.
Для входу відкрийте сайт через HTTPS або localhost.|Open the website over HTTPS or localhost to sign in.
Код неправильний або його термін дії минув. Спробуйте ще раз чи запросіть новий код.|The code is incorrect or has expired. Try again or request a new code.
Забагато спроб. Зачекайте хвилину й повторіть.|Too many attempts. Wait one minute and try again.
Не вдалося виконати вхід. Перевірте з’єднання та спробуйте ще раз.|Could not sign in. Check your connection and try again.
Ви вийшли з акаунта.|You have signed out.
Код надіслано на вашу пошту. Перевірте також папку «Спам».|The code has been sent to your email. Check your spam folder too.
Вхід успішний. Можна повертатися до афіші.|You are signed in. You can return to the movies.
Введіть електронну пошту, щоб отримати код.|Enter your email address to receive a code.
Вхід через Google скасовано або не вдалося завершити. Спробуйте ще раз.|Google sign-in was cancelled or could not be completed. Try again.
Для входу увімкніть JavaScript у браузері.|Enable JavaScript in your browser to sign in.
Про кінотеатр|About the cinema
Відкрити меню|Open menu
Знайти кінотеатри поруч|Find nearby cinemas
Кіно на великому екрані|Cinema on the big screen
Київ · Афіша та розклад сеансів|Kyiv · Movies and showtimes
У ЦЕНТРІ УВАГИ|IN THE SPOTLIGHT
ІСТОРІЇ, ЯКІ ВАРТО ПОБАЧИТИ|STORIES WORTH SEEING
Новинки кіно|Featured movies
У прокаті · Український дубляж|Now showing · Ukrainian dubbing
У прокаті|Now showing
Сеанси та деталі|Showtimes and details
Трейлер|Trailer
Дивитися трейлер|Watch trailer
Зараз у кіно|Now showing
Вибрати фільм|Choose a movie
Пауза|Pause
Продовжити|Continue
Автоперемикання · 10 с|Auto advance · 10 s
Призупинити автоперемикання слайдів|Pause automatic slides
Продовжити автоперемикання слайдів|Resume automatic slides
Дюна: Частина друга|Dune: Part Two
Інтерстеллар|Interstellar
Думками навиворіт 2|Inside Out 2
Бетмен|The Batman
Аватар: Шлях води|Avatar: The Way of Water
Готель «Ґранд Будапешт»|The Grand Budapest Hotel
Готель Ґранд Будапешт|The Grand Budapest Hotel
Фантастика, пригоди|Sci-fi, adventure
Фантастика, драма|Sci-fi, drama
Анімація, сімейний|Animation, family
Бойовик, детектив|Action, mystery
Комедія, пригоди|Comedy, adventure
Пол Атрейдес приєднується до фременів на пустельній планеті Арракіс. Між коханням, помстою та відповідальністю за майбутнє він мусить знайти власний шлях.|Paul Atreides joins the Fremen on the desert planet Arrakis. Torn between love, revenge and responsibility for the future, he must find his own path.
Команда дослідників вирушає за межі Сонячної системи, щоб знайти новий дім для людства. Космічна подорож стає історією про час, родину та силу зв’язку між близькими.|A team of explorers travels beyond the Solar System to find a new home for humanity. Their journey becomes a story about time, family and the bonds between loved ones.
Райлі дорослішає, і в її внутрішньому світі з’являються нові емоції. Радість та її друзі намагаються зрозуміти зміни й допомогти дівчині прийняти себе.|As Riley grows up, new emotions arrive in her mind. Joy and her friends try to understand the changes and help her accept herself.
Бетмен розслідує серію загадкових злочинів у Ґотемі. Пошук відповідей відкриває таємниці міста й змушує його переосмислити власну роль у боротьбі за справедливість.|Batman investigates a series of mysterious crimes in Gotham. His search uncovers the city's secrets and makes him rethink his role in the fight for justice.
Джейк Саллі та Нейтірі захищають свою родину й шукають прихистку серед морського народу Пандори. На них чекає знайомство з океаном та нові випробування.|Jake Sully and Neytiri protect their family and seek refuge with Pandora's sea clans. The ocean brings new discoveries and challenges.
Консьєрж Ґустав та молодий портьє Зеро опиняються в центрі пригод навколо спадщини й викраденої картини. Історія легендарного готелю поєднує гумор, дружбу та ностальгію.|Concierge Gustave and young lobby boy Zero find themselves caught up in an adventure involving an inheritance and a stolen painting. The legendary hotel's story blends humour, friendship and nostalgia.
СЕАНС|SHOWTIME
ВІЛЬНО|AVAILABLE
ЗВИЧАЙНЕ|STANDARD
Кінотеатр КАДР|KADR Cinema
Київ. Фільми українською у форматах 2D, 3D та IMAX.|Kyiv. Movies in Ukrainian in 2D, 3D and IMAX.
Переглянути розклад →|View showtimes →
Демонстраційна сторінка.|Demo website.
Розклад, ціни та кількість місць наведено для прикладу.|Showtimes, prices and seat availability are examples.
Афіша кінотеатру|Cinema listings
Навігаційний шлях|Breadcrumbs
Про фільм|About the movie
Деталі фільму|Movie details
Більше інформації про фільм|More movie information
Оригінальна назва|Original title
Рік виходу|Release year
Режисер|Director
Тривалість|Runtime
Жанр|Genre
Основні актори|Main cast
Актори озвучення (оригінал)|Voice cast (original)
Офіційна сторінка фільму ↗|Official movie website ↗
Розклад сеансів|Showtimes
Приклад розкладу. Ціни та кількість місць наведено для демонстрації.|Example showtimes. Prices and seat availability are for demonstration.
Демонстраційний розклад|Example showtimes
← До всіх фільмів|← All movies
Схема кінозалу|Seating plan
Твоє місце в кіно|Your seat at the cinema
Вільних місць:|Available seats:
Звичайне:|Standard:
Сеанс|Showtime
ЕКРАН|SCREEN
Звичайні місця|Standard seats
VIP-дивани|VIP sofas
VIP-диван|VIP sofa
за місце|per seat
6 звичайних рядів по 10 місць і 2 VIP-ряди по 4 дивани, прохід посередині|6 standard rows of 10 seats and 2 VIP rows of 4 sofas, with a centre aisle
Виходи з обох боків залу|Exits on both sides of the auditorium
ВИХІД|EXIT
Позначення місць|Seat legend
Звичайне місце|Standard seat
Вибране місце|Selected seat
Зайняте місце|Occupied seat
Вибрані місця|Selected seats
Вибрано місць:|Selected seats:
Показати всі вибрані місця|Show all selected seats
Оплатити|Pay
Оплата квитків|Ticket payment
До оплати|Proceed to payment
Разом:|Total:
Онлайн-оплата ще не підключена. Це попередній розрахунок вартості; місця не заброньовано.|Online payment is not connected yet. This is a price estimate; seats have not been booked.
Повернутися до вибору|Back to seat selection
Закрити|Close
Натисніть на вільне місце, щоб вибрати його — воно стане сірим. Повторне натискання скасовує вибір. Кожен VIP-диван — одне просторе місце. Демонстраційна схема: вибір діє до оновлення сторінки.|Click an available seat to select it — it turns grey. Click again to deselect. Each VIP sofa is one spacious seat. Demo seating plan: selection lasts until you reload the page.
Інші фільми|Other movies
Трейлер українською|Trailer in Ukrainian
Трейлер англійською|Trailer in English
Увімкнути звук|Turn sound on
Вимкнути звук|Turn sound off
Звук увімкнено.|Sound is on.
Трейлер відтворюється без звуку. Натисни кнопку «Увімкнути звук» над відео.|The trailer plays without sound. Click “Turn sound on” above the video.
Трейлер відтворюється без звуку. Натисни кнопку «Увімкнути звук» над відео, щоб почати перегляд зі звуком.|The trailer plays without sound. Click “Turn sound on” above the video to watch with sound.
Для перегляду трейлера відкрий сайт через Live Server або скористайся посиланням на YouTube.|Open the website using Live Server or watch the trailer on YouTube.
Не вдалося завантажити трейлер. Спробуй оновити сторінку або дивись на YouTube.|The trailer could not be loaded. Reload the page or watch it on YouTube.
Натисни кнопку «Увімкнути звук» над відео, щоб почати перегляд зі звуком.|Click “Turn sound on” above the video to watch with sound.
Трейлер недоступний у вбудованому програвачі. Спробуй переглянути його на YouTube.|The trailer is unavailable in the embedded player. Watch it on YouTube.
Не вдалося підключитися до YouTube. Спробуй оновити сторінку або перейди за посиланням нижче.|Could not connect to YouTube. Reload the page or use the link below.
Не вдалося підключитися до YouTube. Спробуй оновити сторінку або перейти за посиланням нижче.|Could not connect to YouTube. Reload the page or use the link below.
Дивитися на YouTube ↗|Watch on YouTube ↗
Фрагмент трейлера|Trailer clip
зображення з трейлера|trailer image
Постер фільму|Movie poster:
Кінотеатри в радіусі|Cinemas within
км за відстанню. Відстань — по прямій; маршрут — у Google Maps.|km, sorted by distance. Distances are straight-line; routes are available on Google Maps.
км|km
м|m
Створіть обліковий запис|Create an account
Введіть електронну пошту або номер телефону.|Enter your email address or phone number.
Електронна пошта або мобільний номер|Email address or mobile number
Ел. пошта або моб. номер|Email or mobile number
або|or
Зареєструватися через Google|Sign up with Google
Реєстрація незабаром стане доступною.|Registration will be available soon.
← Повернутися до афіші|← Back to movies
КІНО ПОРУЧ|NEARBY CINEMAS
Знайдіть найближчий кінотеатр|Find your nearest cinema
Дозвольте визначити ваше розташування — знайдемо кінотеатри будь-якої мережі поблизу.|Allow location access to find nearby cinemas from any chain.
Карта кінотеатрів|Cinema map
Кінотеатри на карті Google|Cinemas on Google Maps
Знайти поруч|Find nearby
Відкрити Google Maps ↗|Open Google Maps ↗
Найближчі кінотеатри|Nearest cinemas
На карті — кінотеатри Києва. Натисніть «Знайти поруч» для пошуку біля вас.|The map shows cinemas in Kyiv. Click “Find nearby” to search around you.
Дані кінотеатрів:|Cinema data:
. Карта — Google Maps.|. Map — Google Maps.
Для геолокації увімкніть JavaScript або скористайтеся посиланням Google Maps.|Enable JavaScript to use your location, or open Google Maps.
Для визначення розташування відкрийте сайт через HTTPS або localhost. Пошук також доступний у Google Maps.|Open the website over HTTPS or localhost to use your location. You can also search on Google Maps.
Шукаємо…|Searching…
Визначаємо ваше розташування. Дозвольте доступ у браузері.|Finding your location. Allow access in your browser.
Шукаємо найближчі кінотеатри…|Searching for nearby cinemas…
Розширюємо пошук до 50 км…|Expanding the search to 50 km…
У відкритих даних не знайдено кінотеатрів у радіусі 50 км. Спробуйте пошук у Google Maps.|No cinemas were found in the open data within 50 km. Try Google Maps.
Доступ до розташування заборонено. Дозвольте його в налаштуваннях браузера й повторіть пошук або відкрийте Google Maps.|Location access was denied. Allow it in your browser settings and try again, or open Google Maps.
Не вдалося визначити розташування. Спробуйте ще раз або відкрийте Google Maps.|Could not find your location. Try again or open Google Maps.
Визначення розташування зайняло забагато часу. Спробуйте ще раз.|Finding your location took too long. Try again.
Геолокація недоступна. Скористайтеся Google Maps.|Location is unavailable. Use Google Maps.
Сервіс пошуку тимчасово недоступний. Спробуйте ще раз або відкрийте Google Maps.|The search service is temporarily unavailable. Try again or open Google Maps.
Переглянути розташування: натисніть назву кінотеатру|Click the cinema name to view its location
Прокласти маршрут ↗|Get directions ↗
Тімоті Шаламе|Timothée Chalamet
Зендея|Zendaya
Ребекка Фергюсон|Rebecca Ferguson
Хав’єр Бардем|Javier Bardem
Остін Батлер|Austin Butler
Флоренс П’ю|Florence Pugh
Крістофер Нолан|Christopher Nolan
Дені Вільнев|Denis Villeneuve
Меттью Макконахі|Matthew McConaughey
Енн Гетевей|Anne Hathaway
Джессіка Честейн|Jessica Chastain
Майкл Кейн|Michael Caine
Маккензі Фой|Mackenzie Foy
Джон Літгоу|John Lithgow
Келсі Манн|Kelsey Mann
Емі Полер|Amy Poehler
Мая Гоук|Maya Hawke
Філліс Сміт|Phyllis Smith
Льюїс Блек|Lewis Black
Тоні Гейл|Tony Hale
Ліза Лапіра|Liza Lapira
Метт Рівз|Matt Reeves
Роберт Паттінсон|Robert Pattinson
Зої Кравіц|Zoë Kravitz
Пол Дано|Paul Dano
Джеффрі Райт|Jeffrey Wright
Енді Серкіс|Andy Serkis
Колін Фаррелл|Colin Farrell
Джеймс Кемерон|James Cameron
Сем Вортінгтон|Sam Worthington
Зої Салдана|Zoe Saldaña
Сіґурні Вівер|Sigourney Weaver
Стівен Ленґ|Stephen Lang
Кейт Вінслет|Kate Winslet
Кліфф Кертіс|Cliff Curtis
Вес Андерсон|Wes Anderson
Рейф Файнс|Ralph Fiennes
Тоні Револорі|Tony Revolori
Сірша Ронан|Saoirse Ronan
Едрієн Броуді|Adrien Brody
Віллем Дефо|Willem Dafoe
Тільда Свінтон|Tilda Swinton
карусель|carousel
звичайне|standard
вибране|selected
вільне|available
зайняте|occupied
місце|seat
місць|seats
фільмів|movies
хв|min
год|h
Ряд|Row
головна|home
з|of
о|at
  ` .trim().split("\n").map((line) => line.trim().split("|")));
  const normalize = (text) => text.replace(/\s+/g, " ").trim();
  const entries = Object.entries(messages).sort((a, b) => b[0].length - a[0].length);
  const reverse = new Map(entries.map(([uk, en]) => [en, uk]));
  const patterns = entries.map(([uk, en]) => [new RegExp(`(?<![\\p{L}])${uk.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}])`, "gu"), en]);
  const cache = new Map();
  function translate(text) {
    const key = normalize(text);
    let result = cache.get(key) || messages[key];
    if (!result) {
      result = key;
      for (const [pattern, en] of patterns) result = result.replace(pattern, en);
      cache.set(key, result);
    }
    return text.match(/^\s*/)[0] + result + text.match(/\s*$/)[0];
  }
  let language = document.documentElement.lang === "en" ? "en" : "uk";
  window.cinemaI18n = { t: (text) => language === "en" ? translate(text) : text, translate };
  if (!document.body) return;
  const originals = new WeakMap();
  const attributes = ["aria-label", "aria-roledescription", "title", "placeholder", "alt", "content"];
  function renderValue(node, key, value, write) {
    const values = originals.get(node) || {};
    let state = values[key];
    if (!state || state.last !== value) {
      let original = reverse.get(normalize(value)) || value;
      // New labels may include a movie title copied from the English page.
      if (/[а-яіїєґ]/i.test(original)) {
        ["Dune: Part Two", "Interstellar", "Inside Out 2", "The Batman", "Avatar: The Way of Water", "The Grand Budapest Hotel"].forEach((title) => {
          original = original.replaceAll(title, reverse.get(title));
        });
      }
      state = { original };
      values[key] = state;
      originals.set(node, values);
    }
    const next = language === "en" ? translate(state.original) : state.original;
    if (value !== next) write(next);
    state.last = next;
  }
  const observer = new MutationObserver(() => render());
  function render() {
    observer.disconnect();
    const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (!node.parentElement || node.parentElement.closest('script, style, svg, [data-no-translate], dd[lang="en"]')) continue;
      if (!node.nodeValue.trim()) continue;
      renderValue(node, "text", node.nodeValue, (value) => { node.nodeValue = value; });
    }
    document.querySelectorAll("*").forEach((element) => {
      if (element.closest("[data-no-translate]")) return;
      attributes.forEach((attribute) => {
        if (element.hasAttribute(attribute)) {
          renderValue(element, attribute, element.getAttribute(attribute), (value) => element.setAttribute(attribute, value));
        }
      });
    });
    observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: attributes });
  }
  const toggle = document.querySelector(".language-toggle");
  function setLanguage(value) {
    language = value === "en" ? "en" : "uk";
    document.documentElement.lang = language;
    toggle.setAttribute("aria-checked", String(language === "en"));
    toggle.querySelector(".language-thumb").textContent = language === "en" ? "EN" : "UA";
    toggle.title = language === "en" ? "Увімкнути українську мову" : "Увімкнути англійську мову";
    render();
    document.dispatchEvent(new CustomEvent("cinema-language-change", { detail: language }));
  }
  toggle.addEventListener("click", () => {
    setLanguage(language === "en" ? "uk" : "en");
    try { localStorage.setItem("cinema-language", language); } catch { /* Optional storage. */ }
  });
  window.addEventListener("storage", (event) => {
    if (event.key === "cinema-language" || event.key === null) {
      try { setLanguage(localStorage.getItem("cinema-language")); } catch { setLanguage("uk"); }
    }
  });
  setLanguage(language);
})();
