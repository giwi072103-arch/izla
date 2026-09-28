import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  Search,
  Plus,
  ArrowUpRight,
  ArrowRight,
  MapPin,
  Package,
  Truck,
  Wrench,
  Sparkles,
  Scissors,
  GraduationCap,
  Code,
  Car,
  Grid2X2,
  Sun,
  Moon,
  ChevronDown,
  ShieldCheck,
  Star,
  Heart,
  SlidersHorizontal,
  ClipboardList,
  UserRound,
  Headphones,
  LogOut,
  Check,
  MessageCircle,
  Clock,
  Navigation,
  Camera,
  FileText,
  Settings,
  AlertTriangle,
  Send,
  CheckCircle2,
  X,
  Lock,
  Globe,
  LayoutDashboard,
  Users,
  Scale,
  Download,
} from "lucide-react";
import { api } from "./api";
import { Language, useT, categoryNames, statusNames } from "./i18n";
import {
  Button,
  Field,
  Modal,
  CameraCapture,
  SlideAction,
  DeliveryMap,
  AddressPicker,
  Empty,
} from "./components";
import Legal from "./legal";
import ConnectionStatus, { NotFound } from "./ConnectionStatus";
import "./style.css";
const icons = {
  delivery: Truck,
  repair: Wrench,
  cleaning: Sparkles,
  beauty: Scissors,
  education: GraduationCap,
  digital: Code,
  auto: Car,
  other: Grid2X2,
};
const money = (n) => Number(n).toLocaleString("ru-RU");
const initialOrder = {
  category: "delivery",
  title: "",
  description: "",
  budget: 25000,
  city: "Бухара",
  pickup: "",
  destination: "",
  contents: "",
  recipient_phone: "+998",
  photo: "",
  legal: false,
};
function App() {
  const [lang, setLang] = useState(localStorage.getItem("izla-lang") || "ru");
  return (
    <Language.Provider value={lang}>
      <Shell
        lang={lang}
        setLang={(v) => {
          setLang(v);
          localStorage.setItem("izla-lang", v);
          document.documentElement.lang = v;
        }}
      />
    </Language.Provider>
  );
}
function Shell({ lang, setLang }) {
  const T = useT(),
    [theme, setTheme] = useState(localStorage.getItem("izla-theme") || "light"),
    [page, setPage] = useState(location.hash.slice(1) || "catalog"),
    [config, setConfig] = useState({}),
    [user, setUser] = useState(null),
    [authOpen, setAuthOpen] = useState(false),
    [toast, setToast] = useState(""),
    [listings, setListings] = useState([]),
    [selected, setSelected] = useState(null),
    [category, setCategory] = useState("all"),
    [search, setSearch] = useState(""),
    [city, setCity] = useState("Бухара"),
    [sort, setSort] = useState("new"),
    [favorites, setFavorites] = useState(
      JSON.parse(localStorage.getItem("izla-favorites") || "[]"),
    ),
    [tab, setTab] = useState("services");
  const notify = (e) => setToast(typeof e === "string" ? e : e.message);
  const refresh = () => api("/me").then((d) => setUser(d.user));
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("izla-theme", theme);
  }, [theme]);
  useEffect(() => {
    const fn = () => setPage(location.hash.slice(1) || "catalog");
    window.addEventListener("hashchange", fn);
    Promise.all([
      api("/config").then(setConfig),
      refresh(),
      api("/listings").then(setListings),
    ]).catch(notify);
    return () => window.removeEventListener("hashchange", fn);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 6000);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    const sync = () => { if (!document.hidden) refresh().catch(() => {}); };
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    return () => { window.removeEventListener("focus", sync); document.removeEventListener("visibilitychange", sync); };
  }, []);
  const go = (p) => {
    location.hash = p;
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const protectedGo = (p) => (user ? go(p) : setAuthOpen(true));
  const toggleFav = (id) => {
    const n = favorites.includes(id)
      ? favorites.filter((v) => v !== id)
      : [...favorites, id];
    setFavorites(n);
    localStorage.setItem("izla-favorites", JSON.stringify(n));
  };
  let visible = listings.filter(
    (l) =>
      (category === "all" || l.category === category) &&
      (!search ||
        `${l.title} ${l.description}`
          .toLowerCase()
          .includes(search.toLowerCase())) &&
      (city === "all" || l.city === city) &&
      (tab !== "saved" || favorites.includes(l.id)),
  );
  if (sort === "price") visible.sort((a, b) => a.price - b.price);
  if (sort === "rating")
    visible.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  const nav = [
    ["catalog", Grid2X2, T("Каталог услуг", "Xizmatlar", "Services")],
    ["orders", ClipboardList, T("Мои заказы", "Buyurtmalarim", "My orders")],
    ["profile", UserRound, T("Профиль", "Profil", "Profile")],
  ];
  return (
    <>
      <header className="topbar">
        <a href="#catalog" className="logo" aria-label="IZLA">
          izla<span className="logo-dot">↗</span>
        </a>
        <span className="brand-caption">
          {T(
            "Люди. Услуги. Рядом.",
            "Odamlar. Xizmatlar. Yaqinda.",
            "People. Services. Nearby.",
          )}
        </span>
        <div className="top-location">
          <MapPin size={16} />
          <select
            aria-label={T("Город", "Shahar", "City")}
            value={city}
            onChange={(e) => setCity(e.target.value)}
          >
            <option value="Бухара">{T("Бухара", "Buxoro", "Bukhara")}</option>
            <option value="Ташкент">
              {T("Ташкент", "Toshkent", "Tashkent")}
            </option>
            <option value="Самарканд">
              {T("Самарканд", "Samarqand", "Samarkand")}
            </option>
            <option value="all">
              {T("Все города", "Barcha shaharlar", "All cities")}
            </option>
          </select>
        </div>
        <div className="top-actions">
          <select
            className="lang"
            aria-label="Language"
            value={lang}
            onChange={(e) => setLang(e.target.value)}
          >
            <option value="ru">RU</option>
            <option value="uz">UZ</option>
            <option value="en">EN</option>
          </select>
          <button
            className="icon-button"
            aria-label={T(
              "Сменить тему",
              "Mavzuni o‘zgartirish",
              "Toggle theme",
            )}
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          >
            {theme === "light" ? <Moon size={19} /> : <Sun size={19} />}
          </button>
          <button
            className="account-button"
            onClick={() => (user ? go("profile") : setAuthOpen(true))}
          >
            <UserRound size={18} />
            <span>{user ? user.name : T("Войти", "Kirish", "Sign in")}</span>
          </button>
        </div>
      </header>
      <div className="app-shell">
        <aside className="sidebar">
          <nav>
            {nav.map(([id, Icon, label]) => (
              <button
                key={id}
                onClick={() => (id === "catalog" ? go(id) : protectedGo(id))}
                className={"nav-item " + (page === id ? "active" : "")}
              >
                <Icon size={20} />
                {label}
                {page === id && <span className="nav-dot" />}
              </button>
            ))}
            <button
              className={
                "nav-item " +
                (tab === "saved" && page === "catalog" ? "active" : "")
              }
              onClick={() => {
                setTab("saved");
                go("catalog");
              }}
            >
              <Heart size={20} />
              {T("Избранное", "Saqlanganlar", "Saved")}
              <span className="count">{favorites.length}</span>
            </button>
            {user?.role === "admin" && (
              <button
                className={"nav-item " + (page === "admin" ? "active" : "")}
                onClick={() => go("admin")}
              >
                <LayoutDashboard size={20} />
                {T("Управление", "Boshqaruv", "Administration")}
              </button>
            )}
          </nav>
          <div className="sidebar-card">
            <div className="round-icon">
              <ShieldCheck size={22} />
            </div>
            <h3>
              {T(
                "Доверие в деталях",
                "Ishonch tafsilotlarda",
                "Trust in the details",
              )}
            </h3>
            <p>
              {T(
                "Подтверждённый телефон, фото этапов и поддержка в спорных ситуациях.",
                "Tasdiqlangan telefon, jarayon suratlari va nizolarda yordam.",
                "Confirmed phone, photo evidence and support when you need it.",
              )}
            </p>
            <button className="text-button" onClick={() => go("terms")}>
              {T("Как это работает", "Qanday ishlaydi", "How it works")}
              <ArrowUpRight size={16} />
            </button>
          </div>
          <div className="sidebar-bottom">
            <button className="nav-item" onClick={() => go("support")}>
              <Headphones size={20} />
              {T("Помощь и поддержка", "Yordam", "Help & support")}
            </button>
            <a href="#terms">{T("Правила", "Qoidalar", "Terms")}</a>
            <a href="#privacy">
              {T("Конфиденциальность", "Maxfiylik", "Privacy")}
            </a>
            <span>© 2026 IZLA</span>
          </div>
        </aside>
        <main>
          {page === "catalog" ? (
            <>
              <div className="page-heading catalog-hero">
                <div className="hero-orbit" aria-hidden="true">
                  <div className="orbit-ring" /><div className="orbit-ring inner" />
                  <span className="orbit-core"><Sparkles size={42} strokeWidth={1.5}/></span>
                  <span className="orbit-tile parcel"><Package size={30}/></span>
                  <span className="orbit-tile tools"><Wrench size={27}/></span>
                  <span className="orbit-tile route"><Navigation size={27}/></span>
                  <span className="orbit-dot one"/><span className="orbit-dot two"/>
                </div>
                <div className="hero-copy">
                  <span className="eyebrow">
                    {T(
                      "СЕРВИСЫ ДЛЯ ВАШЕГО ДНЯ",
                      "KUNINGIZ UCHUN XIZMATLAR",
                      "SERVICES FOR YOUR EVERYDAY",
                    )}
                  </span>
                  <h1>
                    {T(
                      "Кто-то точно умеет.",
                      "Buni kimdir albatta uddalaydi.",
                      "Someone knows how.",
                    )}
                  </h1>
                  <p className="muted">
                    {T(
                      "Найдите помощь рядом — или предложите свою.",
                      "Yaqiningizdan yordam toping yoki xizmatingizni taklif qiling.",
                      "Find help nearby — or offer yours.",
                    )}
                  </p>
                </div>
                <button
                  className="primary"
                  onClick={() =>
                    protectedGo(user?.role === "worker" ? "offer" : "create")
                  }
                >
                  <Plus size={19} />
                  {user?.role === "worker"
                    ? T(
                        "Предложить услугу",
                        "Xizmat taklif qilish",
                        "Offer a service",
                      )
                    : T("Создать заявку", "Buyurtma yaratish", "Post a task")}
                </button>
              </div>
              <div className="searchbar">
                <Search size={22} />
                <input
                  aria-label={T(
                    "Поиск услуг",
                    "Xizmat qidirish",
                    "Search services",
                  )}
                  placeholder={T(
                    "Какая помощь вам нужна?",
                    "Sizga qanday yordam kerak?",
                    "What do you need help with?",
                  )}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button
                  className="search-submit"
                  onClick={() =>
                    document
                      .getElementById("results")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  {T("Найти", "Qidirish", "Search")}
                  <ArrowRight size={18} />
                </button>
              </div>
              <section className="categories">
                {Object.entries(categoryNames).map(([id, names]) => {
                  const Icon = icons[id];
                  return (
                    <button
                      key={id}
                      className={
                        "category " +
                        id +
                        " " +
                        (category === id ? "selected" : "")
                      }
                      onClick={() => setCategory(category === id ? "all" : id)}
                    >
                      <span className="category-icon">
                        <Icon size={27} strokeWidth={1.7} />
                      </span>
                      <span>{T(...names)}</span>
                    </button>
                  );
                })}
              </section>
              <section className="feature-grid">
                <div className="delivery-feature">
                  <div className="feature-top">
                    <span className="pill light">
                      <Truck size={15} />
                      {T(
                        "Доставка по городу",
                        "Shahar bo‘ylab yetkazish",
                        "Across the city",
                      )}
                    </span>
                    <ArrowUpRight size={23} />
                  </div>
                  <h2>
                    {T(
                      "Из рук в руки.",
                      "Qo‘ldan qo‘lga.",
                      "From hand to hand.",
                    )}
                    <br />
                    {T(
                      "Всё под контролем.",
                      "Hammasi nazoratda.",
                      "Every step accounted for.",
                    )}
                  </h2>
                  <p>
                    {T(
                      "Фото посылки, маршрут и подтверждение получения — в одном заказе.",
                      "Jo‘natma surati, yo‘nalish va qabul tasdig‘i — bitta buyurtmada.",
                      "Parcel photos, your route and confirmation in one order.",
                    )}
                  </p>
                  <button
                    onClick={() => {
                      setCategory("delivery");
                      protectedGo("create");
                    }}
                  >
                    {T(
                      "Заказать доставку",
                      "Yetkazishni buyurtma qilish",
                      "Book a delivery",
                    )}
                    <ArrowRight size={18} />
                  </button>
                  <div className="feature-steps">
                    <span>
                      <CheckCircle2 size={15} />
                      {T("Фото", "Surat", "Photo")}
                    </span>
                    <i />
                    <span>
                      <Navigation size={15} />
                      {T("Маршрут", "Yo‘nalish", "Route")}
                    </span>
                    <i />
                    <span>
                      <ShieldCheck size={15} />
                      {T("Получение", "Qabul", "Handover")}
                    </span>
                  </div>
                </div>
                <div className="worker-feature">
                  <span className="eyebrow">
                    {T(
                      "ДЛЯ ТЕХ, КТО УМЕЕТ",
                      "USTALAR UCHUN",
                      "FOR PEOPLE WITH SKILLS",
                    )}
                  </span>
                  <div className="worker-icon">
                    <Wrench size={35} strokeWidth={1.5} />
                    <Sparkles size={22} />
                  </div>
                  <h2>
                    {T("Ваши навыки.", "Sizning mahoratingiz.", "Your skills.")}
                    <br />
                    {T(
                      "Новые возможности.",
                      "Yangi imkoniyatlar.",
                      "New possibilities.",
                    )}
                  </h2>
                  <p>
                    {T(
                      "Создайте профиль исполнителя и находите заказы в своём городе.",
                      "Ijrochi profilini yarating va shahringizda buyurtmalar toping.",
                      "Create a provider profile and find work in your city.",
                    )}
                  </p>
                  <button
                    className="text-button"
                    onClick={() =>
                      user
                        ? go(user.role === "worker" ? "offer" : "profile")
                        : setAuthOpen(true)
                    }
                  >
                    {T(
                      "Стать исполнителем",
                      "Ijrochi bo‘lish",
                      "Become a provider",
                    )}
                    <ArrowUpRight size={19} />
                  </button>
                </div>
              </section>
              <div className="results-heading" id="results">
                <div className="tabs">
                  <button
                    className={tab === "services" ? "active" : ""}
                    onClick={() => setTab("services")}
                  >
                    {T(
                      "Услуги рядом",
                      "Yaqindagi xizmatlar",
                      "Services nearby",
                    )}
                  </button>
                  <button
                    className={tab === "saved" ? "active" : ""}
                    onClick={() => setTab("saved")}
                  >
                    {T("Избранное", "Saqlanganlar", "Saved")}
                  </button>
                </div>
                <select
                  aria-label={T("Сортировка", "Saralash", "Sort")}
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="new">
                    {T("Сначала новые", "Avval yangilari", "Newest first")}
                  </option>
                  <option value="price">
                    {T("Дешевле", "Arzonroq", "Lowest price")}
                  </option>
                  <option value="rating">
                    {T("По рейтингу", "Reyting bo‘yicha", "Top rated")}
                  </option>
                </select>
              </div>
              {category !== "all" && (
                <button
                  className="filter-pill"
                  onClick={() => setCategory("all")}
                >
                  {T(...categoryNames[category])}
                  <X size={14} />
                </button>
              )}
              {visible.length ? (
                <div className="listing-grid">
                  {visible.map((l) => {
                    const Icon = icons[l.category];
                    return (
                      <article className="listing-card" key={l.id}>
                        <div className={"listing-art " + l.category}>
                          <Icon size={44} strokeWidth={1.3} />
                          <button
                            className={
                              "favorite " +
                              (favorites.includes(l.id) ? "saved" : "")
                            }
                            aria-label={T("В избранное", "Saqlash", "Save")}
                            onClick={() => toggleFav(l.id)}
                          >
                            <Heart size={18} />
                          </button>
                        </div>
                        <div className="listing-body">
                          <span className="small muted">
                            {T(...categoryNames[l.category])} · {l.city}
                          </span>
                          <button
                            className="listing-title"
                            onClick={() => setSelected(l)}
                          >
                            {l.title}
                          </button>
                          <strong className="price">
                            {l.price
                              ? `${money(l.price)} ${T("сум", "so‘m", "UZS")}`
                              : T("Договорная", "Kelishiladi", "Negotiable")}
                          </strong>
                          <div className="provider">
                            <span className="avatar">{l.name.slice(0, 1)}</span>
                            <span>
                              {l.name}
                              <small>
                                <ShieldCheck size={12} />
                                {["manual", "myid"].includes(l.verified) ? T("Личность проверена", "Shaxs tekshirilgan", "Identity reviewed") : T("Телефон подтверждён", "Telefon tasdiqlangan", "Phone confirmed")}
                              </small>
                            </span>
                            <span className="rating">
                              <Star size={13} />
                              {l.review_count
                                ? Number(l.rating).toFixed(1)
                                : "—"}
                            </span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="catalog-empty">
                  <div className="empty-symbol">
                    <Search size={24} />
                  </div>
                  <div>
                    <h3>
                      {T(
                        "Здесь появятся предложения исполнителей",
                        "Bu yerda ijrochilar takliflari paydo bo‘ladi",
                        "Provider offers will appear here",
                      )}
                    </h3>
                    <p>
                      {T(
                        "Пока подходящих услуг нет. Создайте заявку — исполнители смогут её увидеть.",
                        "Hozircha xizmatlar yo‘q. Buyurtma yarating — ijrochilar uni ko‘radi.",
                        "No matching services yet. Post a task for providers to discover.",
                      )}
                    </p>
                  </div>
                  <button
                    className="secondary"
                    onClick={() => {
                      setSearch("");
                      setCategory("all");
                      setTab("services");
                    }}
                  >
                    {T(
                      "Сбросить фильтры",
                      "Filtrlarni tozalash",
                      "Reset filters",
                    )}
                  </button>
                </div>
              )}
              <div className="trust-strip">
                <span>
                  <ShieldCheck />
                  {T(
                    "Проверенные профили",
                    "Tekshirilgan profillar",
                    "Reviewed profiles",
                  )}
                </span>
                <span>
                  <Camera />
                  {T(
                    "Фотофиксация этапов",
                    "Bosqichlar surati",
                    "Photo evidence",
                  )}
                </span>
                <span>
                  <Headphones />
                  {T(
                    "Поддержка в спорах",
                    "Nizolarda yordam",
                    "Dispute support",
                  )}
                </span>
              </div>
            </>
          ) : page === "create" ? (
            <CreateOrder
              initialCategory={category === "all" ? "delivery" : category}
              user={user}
              config={config}
              notify={notify}
              onDone={(id) => go("order/" + id)}
              city={city === "all" ? "Бухара" : city}
            />
          ) : page === "offer" ? (
            <Offer
              config={config}
              user={user}
              notify={notify}
              onDone={() => {
                api("/listings").then(setListings);
                go("catalog");
              }}
            />
          ) : page === "orders" ? (
            <Orders user={user} notify={notify} go={go} />
          ) : page.startsWith("order/") ? (
            <OrderDetail
              id={page.split("/")[1]}
              user={user}
              config={config}
              notify={notify}
            />
          ) : page === "profile" ? (
            <Profile
              user={user}
              config={config}
              notify={notify}
              refresh={refresh}
              go={go}
              onLogin={() => setAuthOpen(true)}
              onLogout={async () => {
                await api("/auth/logout", {});
                setUser(null);
                go("catalog");
              }}
            />
          ) : page === "admin" ? (
            <Admin user={user} notify={notify} go={go} />
          ) : ["terms", "privacy"].includes(page) ? (
            <Legal page={page} />
          ) : page === "support" ? (
            <Support />
          ) : (
            <NotFound onHome={() => go("catalog")} />
          )}
          <footer>
            <span>
              izla{" "}
              <span className="muted">
                / {T("Услуги рядом", "Yaqindagi xizmatlar", "Services nearby")}
              </span>
            </span>
            <div>
              <a href="#terms">{T("Правила", "Qoidalar", "Terms")}</a>
              <a href="#privacy">
                {T("Конфиденциальность", "Maxfiylik", "Privacy")}
              </a>
              <a href="#support">{T("Поддержка", "Yordam", "Support")}</a>
            </div>
          </footer>
        </main>
      </div>
      <ConnectionStatus />
      <nav className="mobile-nav">
        {nav.map(([id, Icon, label]) => (
          <button
            className={page === id ? "active" : ""}
            key={id}
            onClick={() => (id === "catalog" ? go(id) : protectedGo(id))}
          >
            <Icon size={21} />
            <span>{label}</span>
          </button>
        ))}
        <button
          onClick={() =>
            protectedGo(user?.role === "worker" ? "offer" : "create")
          }
        >
          <Plus size={21} />
          <span>{T("Создать", "Yaratish", "Create")}</span>
        </button>
      </nav>
      {authOpen && (
        <Modal
          title={T(
            "Добро пожаловать в IZLA",
            "IZLA’ga xush kelibsiz",
            "Welcome to IZLA",
          )}
          onClose={() => setAuthOpen(false)}
        >
          <Auth
            config={config}
            notify={notify}
            onDone={(u) => {
              setUser(u);
              setAuthOpen(false);
              go("profile");
            }}
          />
        </Modal>
      )}
      {selected && (
        <Modal title={selected.title} onClose={() => setSelected(null)}>
          <ListingDetail
            listing={selected}
            user={user}
            notify={notify}
            onRequest={() => {
              setSelected(null);
              setCategory(selected.category);
              protectedGo("create");
            }}
          />
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <span>{toast}</span>
          <button aria-label="Close" onClick={() => setToast("")}>
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
}
function Auth({ config, notify, onDone }) {
  const T = useT(),
    [v, set] = useState({
      name: "",
      phone: "+998",
      role: "client",
      consent: false,
    }),
    [challenge, setChallenge] = useState(null),
    [code, setCode] = useState(""),
    [busy, setBusy] = useState(false);
  const update = (k, x) => set({ ...v, [k]: x });
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      if (challenge) {
        const d = await api("/auth/verify", { ...challenge, code });
        onDone(d.user);
      } else setChallenge(await api("/auth/start", v));
    } catch (e) {
      notify(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="form-stack">
      {challenge ? (
        <>
          <p>
            {T(
              "Откройте бота, поделитесь своим номером и введите полученный код.",
              "Botni oching, raqamingizni ulashing va kodni kiriting.",
              "Open the bot, share your own phone number and enter the code.",
            )}
          </p>
          <a
            href={challenge.url}
            target="_blank"
            rel="noreferrer"
            className="primary"
          >
            {T("Открыть Telegram", "Telegram’ni ochish", "Open Telegram")}
            <ArrowUpRight size={18} />
          </a>
          <Field
            label={T("Код из бота", "Botdagi kod", "Code from the bot")}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
          />
          <Button className="primary" busy={busy}>
            {T("Подтвердить", "Tasdiqlash", "Verify")}
          </Button>
          <button
            type="button"
            className="ghost"
            onClick={() => setChallenge(null)}
          >
            {T("Начать заново", "Qaytadan boshlash", "Start over")}
          </button>
        </>
      ) : (
        <>
          <div className="role-picker">
            {["client", "worker"].map((role) => (
              <button
                type="button"
                key={role}
                className={v.role === role ? "selected" : ""}
                onClick={() => update("role", role)}
              >
                {role === "client" ? <UserRound /> : <Wrench />}
                {role === "client"
                  ? T("Я клиент", "Men mijozman", "I need help")
                  : T("Я исполнитель", "Men ijrochiman", "I offer services")}
              </button>
            ))}
          </div>
          <Field
            label={T("Ваше имя", "Ismingiz", "Your name")}
            value={v.name}
            onChange={(e) => update("name", e.target.value)}
            minLength={2}
            maxLength={80}
            required
            autoComplete="name"
          />
          <Field
            label={T(
              "Номер вашего Telegram",
              "Telegram raqamingiz",
              "Your Telegram phone",
            )}
            value={v.phone}
            onChange={(e) => update("phone", e.target.value)}
            type="tel"
            pattern="\+998[0-9]{9}"
            placeholder="+998901234567"
            required
            autoComplete="tel"
          />
          <label className="checkbox">
            <input
              type="checkbox"
              required
              checked={v.consent}
              onChange={(e) => update("consent", e.target.checked)}
            />
            <span>
              {T(
                "Мне есть 18 лет. Принимаю правила и политику конфиденциальности.",
                "Men 18 yoshga to‘lganman. Qoidalar va maxfiylik siyosatiga roziman.",
                "I am 18 or older and accept the terms and privacy policy.",
              )}{" "}
              <a href="#terms" target="_blank">
                {T("Прочитать", "O‘qish", "Read")}
              </a>
            </span>
          </label>
          {!config.telegram && (
            <p className="notice">
              {T(
                "Регистрация откроется после подключения Telegram-бота.",
                "Telegram bot ulangach ro‘yxatdan o‘tish ochiladi.",
                "Registration opens once the Telegram bot is connected.",
              )}
            </p>
          )}
          <Button className="primary" disabled={!config.telegram} busy={busy}>
            {T(
              "Получить код в Telegram",
              "Telegram’da kod olish",
              "Get a Telegram code",
            )}
            <ArrowRight size={18} />
          </Button>
        </>
      )}
      {config.development && (
        <div className="dev-box">
          <p>LOCAL TEST ONLY</p>
          {["client", "worker", "admin"].map((role) => (
            <button
              type="button"
              key={role}
              onClick={() =>
                api("/dev/login", { role })
                  .then((d) => onDone(d.user))
                  .catch(notify)
              }
            >
              {role}
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
function CreateOrder({ initialCategory, user, config, notify, onDone, city }) {
  const T = useT(),
    [v, set] = useState({ ...initialOrder, category: initialCategory, city }),
    [busy, setBusy] = useState(false);
  const update = (k, x) => set((p) => ({ ...p, [k]: x }));
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      onDone((await api("/orders", v)).id);
    } catch (e) {
      notify(e);
    } finally {
      setBusy(false);
    }
  }
  const verified = config.identityVerificationRequired === false || ["manual", "myid"].includes(user?.verified);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            IZLA / {T("НОВАЯ ЗАЯВКА", "YANGI BUYURTMA", "NEW TASK")}
          </span>
          <h1>
            {T("Что нужно сделать?", "Nima qilish kerak?", "What needs doing?")}
          </h1>
          <p className="muted">
            {T(
              "Подробности помогут найти подходящего исполнителя.",
              "Tafsilotlar mos ijrochini topishga yordam beradi.",
              "The details help you find the right person.",
            )}
          </p>
        </div>
      </div>
      <form onSubmit={submit} className="form-layout">
        <div className="panel form-stack">
          <Field label={T("Категория", "Toifa", "Category")}>
            <select
              value={v.category}
              onChange={(e) => update("category", e.target.value)}
            >
              {Object.entries(categoryNames).map(([k, n]) => (
                <option key={k} value={k}>
                  {T(...n)}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label={T("Название задачи", "Vazifa nomi", "Task title")}
            value={v.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder={T(
              "Например: доставить коробку с книгами",
              "Masalan: kitoblar qutisini yetkazish",
              "For example: deliver a box of books",
            )}
            minLength={5}
            maxLength={120}
            required
          />
          <Field
            label={T("Подробное описание", "Batafsil tavsif", "Description")}
          >
            <textarea
              value={v.description}
              onChange={(e) => update("description", e.target.value)}
              minLength={15}
              maxLength={4000}
              required
              rows={4}
            />
          </Field>
          <div className="two-cols">
            <Field
              label={T("Город", "Shahar", "City")}
              value={v.city}
              onChange={(e) => update("city", e.target.value)}
              required
            />
            <Field
              label={T("Бюджет, сум", "Byudjet, so‘m", "Budget, UZS")}
              value={v.budget}
              onChange={(e) => update("budget", e.target.value)}
              type="number"
              min={1000}
              max={100000000}
              required
            />
          </div>
          <Field
            label={
              v.category === "delivery"
                ? T("Откуда забрать", "Qayerdan olish", "Pickup address")
                : T("Адрес выполнения", "Bajarish manzili", "Service address")
            }
            value={v.pickup}
            onChange={(e) => set(p => ({ ...p, pickup: e.target.value, pickupPoint: undefined }))}
            minLength={5}
            maxLength={300}
            required
          />
          <AddressPicker apiKey={config.yandexKey} geocoderKey={config.yandexGeocoderKey} suggestKey={config.yandexSuggestKey} value={v.pickup} city={v.city} selectedPoint={v.pickupPoint}
            onSelect={(point, address) => set(p => ({ ...p, pickupPoint: point, pickup: address }))} />
          {v.category === "delivery" && (
            <>
              <Field
                label={T("Куда доставить", "Qayerga yetkazish", "Destination")}
                value={v.destination}
                onChange={(e) => set(p => ({ ...p, destination: e.target.value, destPoint: undefined }))}
                minLength={5}
                maxLength={300}
                required
              />
              <AddressPicker apiKey={config.yandexKey} geocoderKey={config.yandexGeocoderKey} suggestKey={config.yandexSuggestKey} value={v.destination} city={v.city} selectedPoint={v.destPoint}
                onSelect={(point, address) => set(p => ({ ...p, destPoint: point, destination: address }))} />
              <Field
                label={T(
                  "Что внутри: предметы, количество, особенности",
                  "Ichida nima: buyumlar, soni, xususiyatlari",
                  "Contents: items, quantity and handling",
                )}
              >
                <textarea
                  value={v.contents}
                  onChange={(e) => update("contents", e.target.value)}
                  minLength={5}
                  maxLength={1000}
                  required
                />
              </Field>
              <Field
                label={T(
                  "Телефон получателя",
                  "Oluvchi telefoni",
                  "Recipient phone",
                )}
                value={v.recipient_phone}
                onChange={(e) => update("recipient_phone", e.target.value)}
                type="tel"
                pattern="\+998[0-9]{9}"
                required
              />
              <p className="small muted">
                {T(
                  "Получатель сможет видеть заказ после входа с этим номером.",
                  "Oluvchi shu raqam bilan kirib buyurtmani ko‘radi.",
                  "The recipient can view the order after signing in with this phone.",
                )}
              </p>
            </>
          )}
          <label className="checkbox">
            <input
              type="checkbox"
              checked={v.legal}
              onChange={(e) => update("legal", e.target.checked)}
              required
            />
            <span>
              {T(
                "Заказ законный. Описание достоверно, условия согласованы, получатель согласен на передачу контакта.",
                "Buyurtma qonuniy, tavsif to‘g‘ri va oluvchi kontakt berilishiga rozi.",
                "This is lawful, the description is accurate and the recipient consents to sharing their contact.",
              )}
            </span>
          </label>
        </div>
        <aside className="form-stack">
          <div className="panel">
            <h3>
              <Camera size={20} />
              {T(
                "Фото до начала",
                "Boshlanishdan oldin surat",
                "Before you begin",
              )}
            </h3>
            <p className="muted small">
              {T(
                "Обязательный снимок посылки или объекта работы. Он сохранится в истории заказа.",
                "Jo‘natma yoki ish obyektining majburiy surati.",
                "A required photo of the parcel or work area, saved to the order.",
              )}
            </p>
            <CameraCapture
              value={v.photo}
              onChange={(x) => update("photo", x)}
              label={T(
                "Снимите объект целиком",
                "Obyektni to‘liq oling",
                "Capture the whole object",
              )}
            />
          </div>
          {v.category === "delivery" && (
            v.pickupPoint && v.destPoint ? <DeliveryMap apiKey={config.yandexKey} order={{ id: "preview", status: "preview", city: v.city, pickup: v.pickup, destination: v.destination, pickup_lat: v.pickupPoint.lat, pickup_lon: v.pickupPoint.lon, dest_lat: v.destPoint.lat, dest_lon: v.destPoint.lon }} /> : null
          )}
          <div className="panel form-stack">
            {!verified && (
              <p className="notice">
                {T(
                  "Для публикации нужна проверка личности.",
                  "E’lon qilish uchun shaxsni tekshirish kerak.",
                  "Identity verification is required to post.",
                )}{" "}
                <a href="#profile">
                  {T("Перейти в профиль", "Profilga o‘tish", "Open profile")}
                </a>
              </p>
            )}
            <Button
              className="primary"
              busy={busy}
              disabled={
                !verified || !v.photo || !v.legal || user?.role !== "client"
              }
            >
              {T("Опубликовать заявку", "Buyurtmani joylash", "Publish task")}
              <ArrowRight size={18} />
            </Button>
            <p className="small muted">
              {T(
                "Оплата согласуется напрямую. Онлайн-оплаты в пилотной версии нет.",
                "To‘lov bevosita kelishiladi. Onlayn to‘lov yo‘q.",
                "Payment is arranged directly. Online payments are not available in the pilot.",
              )}
            </p>
          </div>
        </aside>
      </form>
    </>
  );
}
function Offer({ user, config, notify, onDone }) {
  const T = useT(),
    [v, set] = useState({
      category: "repair",
      title: "",
      description: "",
      price: 0,
      city: "Бухара",
    }),
    [busy, setBusy] = useState(false);
  return (
    <div className="narrow">
      <h1>
        {T("Предложить услугу", "Xizmat taklif qilish", "Offer a service")}
      </h1>
      <form
        className="panel form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await api("/listings", v);
            onDone();
          } catch (e) {
            notify(e);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label={T("Категория", "Toifa", "Category")}>
          <select
            value={v.category}
            onChange={(e) => set({ ...v, category: e.target.value })}
          >
            {Object.entries(categoryNames).map(([k, n]) => (
              <option key={k} value={k}>
                {T(...n)}
              </option>
            ))}
          </select>
        </Field>
        {[
          ["title", T("Название", "Nomi", "Title")],
          ["city", T("Город", "Shahar", "City")],
          [
            "price",
            T(
              "Цена от, сум · 0 — договорная",
              "Narx, so‘m · 0 — kelishiladi",
              "Price from, UZS · 0 means negotiable",
            ),
          ],
        ].map(([k, l]) => (
          <Field
            key={k}
            label={l}
            value={v[k]}
            onChange={(e) => set({ ...v, [k]: e.target.value })}
            type={k === "price" ? "number" : "text"}
            required
            min={0}
            minLength={k === "title" ? 5 : 2}
          />
        ))}
        <Field
          label={T(
            "Опыт и состав услуги",
            "Tajriba va xizmat tarkibi",
            "Experience and scope",
          )}
        >
          <textarea
            value={v.description}
            onChange={(e) => set({ ...v, description: e.target.value })}
            minLength={20}
            maxLength={4000}
            required
            rows={6}
          />
        </Field>
        {config.identityVerificationRequired !== false && !["manual", "myid"].includes(user?.verified) && (
          <p className="notice">
            {T(
              "Сначала пройдите проверку в профиле.",
              "Avval profilda tekshiruvdan o‘ting.",
              "Complete identity review in your profile first.",
            )}
          </p>
        )}
        <Button
          className="primary"
          busy={busy}
          disabled={
            user?.role !== "worker" ||
            (config.identityVerificationRequired !== false && !["manual", "myid"].includes(user?.verified))
          }
        >
          {T("Опубликовать", "Joylash", "Publish")}
        </Button>
      </form>
    </div>
  );
}
function Orders({ user, notify, go }) {
  const T = useT(),
    [orders, set] = useState([]),
    [filter, setFilter] = useState("all"),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    if (user)
      api("/orders")
        .then(set)
        .catch(notify)
        .finally(() => setLoading(false));
  }, [user]);
  if (!user)
    return (
      <Empty
        title={T("Войдите в аккаунт", "Hisobga kiring", "Sign in first")}
      />
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            IZLA / {T("ЗАКАЗЫ", "BUYURTMALAR", "ORDERS")}
          </span>
          <h1>
            {user.role === "worker"
              ? T(
                  "Ваша работа здесь",
                  "Sizning ishingiz shu yerda",
                  "Your work, in one place",
                )
              : T("Мои заказы", "Buyurtmalarim", "My orders")}
          </h1>
        </div>
        {user.role === "client" && (
          <button className="primary" onClick={() => go("create")}>
            <Plus size={18} />
            {T("Новая заявка", "Yangi buyurtma", "New task")}
          </button>
        )}
      </div>
      <div className="tabs">
        {[
          ["all", T("Все", "Barchasi", "All")],
          ["active", T("Активные", "Faol", "Active")],
          ["completed", T("Завершённые", "Bajarilgan", "Completed")],
        ].map(([k, l]) => (
          <button
            className={filter === k ? "active" : ""}
            key={k}
            onClick={() => setFilter(k)}
          >
            {l}
          </button>
        ))}
      </div>
      {loading ? (
        <p>{T("Загрузка…", "Yuklanmoqda…", "Loading…")}</p>
      ) : (
        orders
          .filter((o) =>
            filter === "all" || filter === "completed"
              ? filter === "all" || o.status === "completed"
              : !["completed", "cancelled"].includes(o.status),
          )
          .map((o) => (
            <div className="order-row panel" key={o.id}>
              <div className={"order-icon " + o.category}>
                {React.createElement(icons[o.category], { size: 25 })}
              </div>
              <div className="grow">
                <span className="small muted">
                  #{o.id.slice(0, 8)} · {o.city}
                </span>
                <h3>{o.title}</h3>
                <span className={"status " + o.status}>
                  {T(...statusNames[o.status])}
                </span>
              </div>
              <strong>
                {money(o.budget)} {T("сум", "so‘m", "UZS")}
              </strong>
              {o.status === "open" &&
              user.role === "worker" &&
              o.client_id !== user.id ? (
                <button
                  className="primary"
                  onClick={() =>
                    api("/orders/" + o.id + "/actions", { action: "accept" })
                      .then(() => go("order/" + o.id))
                      .catch(notify)
                  }
                >
                  {T("Принять", "Qabul qilish", "Accept")}
                </button>
              ) : (
                <button
                  className="secondary"
                  onClick={() => go("order/" + o.id)}
                >
                  <ArrowRight size={18} />
                </button>
              )}
            </div>
          ))
      )}
      {!loading && !orders.length && (
        <Empty
          icon={ClipboardList}
          title={T(
            "Пока нет заказов",
            "Hozircha buyurtmalar yo‘q",
            "No orders yet",
          )}
        >
          <p className="muted">
            {T(
              "Здесь будут заявки и история выполненных работ.",
              "Bu yerda buyurtmalar va bajarilgan ishlar tarixi bo‘ladi.",
              "Your tasks and completed work will appear here.",
            )}
          </p>
        </Empty>
      )}
    </>
  );
}
function OrderDetail({ id, user, config, notify }) {
  const T = useT(),
    [data, set] = useState(null),
    [photo, setPhoto] = useState(""),
    [desc, setDesc] = useState(""),
    [msg, setMsg] = useState(""),
    [busy, setBusy] = useState(false),
    [tracking, setTracking] = useState(false),
    [dispute, setDispute] = useState(false),
    [reason, setReason] = useState(""),
    [rating, setRating] = useState(5),
    [review, setReview] = useState(""),
    [gpsError, setGpsError] = useState("");
  const load = () => api("/orders/" + id).then(set);
  useEffect(() => {
    if (!user) return;
    load().catch(notify);
    const it = setInterval(() => load().catch(() => {}), 5000);
    return () => clearInterval(it);
  }, [id, user]);
  const o = data?.order,
    worker = o?.worker_id === user?.id,
    client = o?.client_id === user?.id;
  useEffect(() => {
    if (
      !tracking ||
      !worker ||
      !["assigned", "in_progress"].includes(o?.status)
    )
      return;
    let last = 0;
    const watch = navigator.geolocation.watchPosition(
      (p) => {
        if (Date.now() - last < 5000) return;
        last = Date.now();
        api("/orders/" + id + "/location", {
          lat: p.coords.latitude,
          lon: p.coords.longitude,
          accuracy: p.coords.accuracy,
        }).catch((e) => setGpsError(e.message));
      },
      (e) => {
        setGpsError(
          T(
            "Разрешите геолокацию в настройках браузера.",
            "Brauzerda joylashuvga ruxsat bering.",
            "Allow location access in browser settings.",
          ),
        );
        setTracking(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [tracking, worker, o?.status, id]);
  async function action(a) {
    setBusy(true);
    try {
      await api("/orders/" + id + "/actions", {
        action: a,
        photo,
        description: desc,
      });
      setPhoto("");
      setDesc("");
      await load();
    } catch (e) {
      notify(e);
    } finally {
      setBusy(false);
    }
  }
  if (!user)
    return (
      <Empty
        title={T("Войдите в аккаунт", "Hisobga kiring", "Sign in first")}
      />
    );
  if (!data)
    return (
      <p>{T("Загрузка заказа…", "Buyurtma yuklanmoqda…", "Loading order…")}</p>
    );
  const stage = [
    "open",
    "assigned",
    "in_progress",
    "awaiting_confirmation",
    "completed",
  ].indexOf(o.status);
  return (
    <>
      <div className="page-heading">
        <div>
          <a className="eyebrow" href="#orders">
            ← {T("МОИ ЗАКАЗЫ", "BUYURTMALARIM", "MY ORDERS")} / #
            {id.slice(0, 8)}
          </a>
          <h1>{o.title}</h1>
          <span className={"status " + o.status}>
            {T(...statusNames[o.status])}
          </span>
        </div>
        <strong className="big-price">
          {money(o.budget)} {T("сум", "so‘m", "UZS")}
        </strong>
      </div>
      <div className="progress-steps">
        {[
          "open",
          "assigned",
          "in_progress",
          "awaiting_confirmation",
          "completed",
        ].map((s, i) => (
          <div key={s} className={i <= stage ? "done" : ""}>
            <span>{i < stage ? <Check size={14} /> : i + 1}</span>
            <small>{T(...statusNames[s])}</small>
          </div>
        ))}
      </div>
      <div className="form-layout">
        <div className="form-stack">
          {o.category === "delivery" && (
            <>
              <DeliveryMap
                apiKey={config.yandexKey}
                order={o}
                location={data.location}
              />
              <div className="panel compact">
                <p>
                  <MapPin size={17} />
                  <strong>A</strong> {o.pickup}
                </p>
                <p>
                  <MapPin size={17} />
                  <strong>B</strong> {o.destination}
                </p>
                <p className="small muted">
                  {data.location
                    ? `${T("Обновлено", "Yangilandi", "Updated")}: ${new Date(data.location.updated_at).toLocaleTimeString()} · ±${Math.round(data.location.accuracy)} m`
                    : T(
                        "Курьер ещё не передаёт координаты",
                        "Kuryer hali joylashuvni uzatmayapti",
                        "Waiting for courier location",
                      )}
                </p>
                {data.location &&
                  Date.now() - new Date(data.location.updated_at) > 60000 && (
                    <p className="notice">
                      {T(
                        "Координаты устарели. Свяжитесь с курьером.",
                        "Joylashuv eskirgan. Kuryer bilan bog‘laning.",
                        "Location is stale. Contact the courier.",
                      )}
                    </p>
                  )}
                {worker && ["assigned", "in_progress"].includes(o.status) && (
                  <>
                    <button
                      className={tracking ? "secondary" : "primary"}
                      onClick={() => {
                        if (!navigator.geolocation) {
                          notify(
                            T(
                              "Геолокация недоступна",
                              "Joylashuv mavjud emas",
                              "Geolocation unavailable",
                            ),
                          );
                          return;
                        }
                        setTracking(!tracking);
                      }}
                    >
                      <Navigation size={17} />
                      {tracking
                        ? T(
                            "Остановить передачу",
                            "Uzatishni to‘xtatish",
                            "Stop sharing",
                          )
                        : T(
                            "Передавать геопозицию",
                            "Joylashuvni uzatish",
                            "Share location",
                          )}
                    </button>
                    <p className="small muted">
                      {T(
                        "Оставляйте приложение открытым: при блокировке экрана браузер может остановить GPS.",
                        "Ilovani ochiq qoldiring: ekran qulflanganda GPS to‘xtashi mumkin.",
                        "Keep the app open: locking the screen may pause GPS updates.",
                      )}
                    </p>
                    {gpsError && <p className="error">{gpsError}</p>}
                  </>
                )}
              </div>
            </>
          )}
          <div className="panel">
            <h3>{T("Детали задачи", "Vazifa tafsilotlari", "Task details")}</h3>
            <p className="preline">{o.description}</p>
            {o.contents && (
              <p>
                <strong>{T("Содержимое", "Tarkibi", "Contents")}: </strong>
                {o.contents}
              </p>
            )}
            <p className="small muted">
              {o.city} · {o.pickup}
            </p>
            {o.recipient_phone && (
              <p>
                {T("Получатель", "Oluvchi", "Recipient")}: {o.recipient_phone}
              </p>
            )}
          </div>
          <div className="panel">
            <h3>
              <Camera size={19} />
              {T("Доказательства", "Dalillar", "Evidence")}
            </h3>
            <div className="evidence-grid">
              {data.evidence.map((e) => (
                <a
                  key={e.id}
                  href={"/api/evidence/" + e.id}
                  target="_blank"
                  rel="noreferrer"
                >
                  <img src={"/api/evidence/" + e.id} alt={e.kind} />
                  <span>
                    {
                      {
                        client_before: T(
                          "До заказа",
                          "Buyurtmadan oldin",
                          "Before order",
                        ),
                        worker_before: T(
                          "При получении",
                          "Qabul paytida",
                          "At collection",
                        ),
                        worker_after: T("Результат", "Natija", "Result"),
                      }[e.kind]
                    }
                  </span>
                  <small>{new Date(e.created_at).toLocaleString()}</small>
                </a>
              ))}
            </div>
          </div>
          <div className="panel">
            <h3>
              <Clock size={19} />
              {T("История заказа", "Buyurtma tarixi", "Order history")}
            </h3>
            <div className="timeline">
              {data.events.map((e) => (
                <div key={e.id}>
                  <span />
                  <section>
                    <strong>{eventLabel(e.action, T)}</strong>
                    {e.details?.description && <p>{e.details.description}</p>}
                    {e.details?.resolution && <p>{e.details.resolution}</p>}
                    <small>{new Date(e.created_at).toLocaleString()}</small>
                  </section>
                </div>
              ))}
            </div>
          </div>
        </div>
        <aside className="form-stack">
          {(client || worker) && (
            <div className="panel form-stack">
              <h3>{T("Следующий шаг", "Keyingi qadam", "Next step")}</h3>
              {client && o.status === "open" && (
                <button className="secondary" onClick={() => action("cancel")}>
                  {T("Отменить заявку", "Bekor qilish", "Cancel task")}
                </button>
              )}
              {client &&
                o.status === "assigned" &&
                o.category === "delivery" && (
                  <>
                    <p className="small">
                      {T(
                        "Подтвердите только после встречи с курьером и передачи посылки.",
                        "Kuryerga jo‘natmani bergandan keyin tasdiqlang.",
                        "Confirm only after meeting the courier and handing over the parcel.",
                      )}
                    </p>
                    <SlideAction
                      label={
                        o.sender_confirmed
                          ? T(
                              "Передача подтверждена",
                              "Topshirish tasdiqlandi",
                              "Handover confirmed",
                            )
                          : T(
                              "Сдвиньте: посылка передана",
                              "Suring: jo‘natma berildi",
                              "Slide: parcel handed over",
                            )
                      }
                      disabled={o.sender_confirmed}
                      busy={busy}
                      onConfirm={() => action("handover")}
                    />
                  </>
                )}
              {worker && ["assigned", "in_progress"].includes(o.status) && (
                <>
                  <p className="small muted">
                    {T(
                      "Снимите предмет и опишите его состояние.",
                      "Buyumni suratga oling va holatini yozing.",
                      "Photograph the item and describe its condition.",
                    )}
                  </p>
                  <CameraCapture
                    value={photo}
                    onChange={setPhoto}
                    label={
                      o.status === "assigned"
                        ? T(
                            "Фото перед получением / началом",
                            "Boshlashdan oldingi surat",
                            "Before collection / start",
                          )
                        : T(
                            "Фото результата / доставки",
                            "Natija surati",
                            "Result / delivery photo",
                          )
                    }
                  />
                  <Field
                    label={T(
                      "Описание содержимого и состояния",
                      "Tarkib va holat tavsifi",
                      "Contents and condition",
                    )}
                  >
                    <textarea
                      value={desc}
                      onChange={(e) => setDesc(e.target.value)}
                      minLength={5}
                      maxLength={1000}
                    />
                  </Field>
                  <SlideAction
                    label={
                      o.status === "assigned"
                        ? T(
                            "Сдвиньте, чтобы начать",
                            "Boshlash uchun suring",
                            "Slide to start",
                          )
                        : T(
                            "Сдвиньте: работа выполнена",
                            "Suring: ish bajarildi",
                            "Slide: work is done",
                          )
                    }
                    disabled={
                      !photo ||
                      desc.trim().length < 5 ||
                      (o.category === "delivery" &&
                        o.status === "assigned" &&
                        !o.sender_confirmed)
                    }
                    busy={busy}
                    onConfirm={() =>
                      action(o.status === "assigned" ? "start" : "finish")
                    }
                  />
                  {o.category === "delivery" &&
                    o.status === "assigned" &&
                    !o.sender_confirmed && (
                      <p className="small muted">
                        {T(
                          "Ожидаем подтверждение отправителя.",
                          "Jo‘natuvchi tasdig‘ini kutamiz.",
                          "Waiting for sender confirmation.",
                        )}
                      </p>
                    )}
                </>
              )}
              {client && o.status === "awaiting_confirmation" && (
                <>
                  <p>
                    {T(
                      "Проверьте результат и фотографии перед завершением.",
                      "Yakunlashdan oldin natija va suratlarni tekshiring.",
                      "Check the results and photos before confirming.",
                    )}
                  </p>
                  <SlideAction
                    label={T(
                      "Сдвиньте: всё выполнено",
                      "Suring: barchasi bajarildi",
                      "Slide: confirm completion",
                    )}
                    busy={busy}
                    onConfirm={() => action("confirm")}
                  />
                </>
              )}
              {["completed", "cancelled", "disputed"].includes(o.status) && (
                <p className="muted">{T(...statusNames[o.status])}</p>
              )}
              {[
                "assigned",
                "in_progress",
                "awaiting_confirmation",
                "completed",
              ].includes(o.status) && (
                <button
                  className="text-button danger"
                  onClick={() => setDispute(true)}
                >
                  <AlertTriangle size={16} />
                  {T(
                    "Возникла проблема",
                    "Muammo yuz berdi",
                    "Report a problem",
                  )}
                </button>
              )}
            </div>
          )}
          <div className="panel">
            <h3>
              <MessageCircle size={20} />
              {T("Чат заказа", "Buyurtma chati", "Order chat")}
            </h3>
            <div className="messages">
              {data.messages.length ? (
                data.messages.map((m) => (
                  <div
                    className={
                      "message " + (m.user_id === user.id ? "own" : "")
                    }
                    key={m.id}
                  >
                    <small>{m.name}</small>
                    <p>{m.body}</p>
                    <time>
                      {new Date(m.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                ))
              ) : (
                <p className="small muted">
                  {T(
                    "Уточните детали здесь. Переписка сохранится для разбора споров.",
                    "Tafsilotlarni shu yerda aniqlang. Xabarlar nizolar uchun saqlanadi.",
                    "Discuss details here. Messages are retained for dispute review.",
                  )}
                </p>
              )}
            </div>
            <form
              className="message-form"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await api("/orders/" + id + "/messages", { body: msg });
                  setMsg("");
                  load();
                } catch (e) {
                  notify(e);
                }
              }}
            >
              <input
                aria-label={T("Сообщение", "Xabar", "Message")}
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder={T("Написать…", "Yozish…", "Message…")}
                required
                maxLength={2000}
              />
              <button
                aria-label={T("Отправить", "Yuborish", "Send")}
                className="primary"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
          {client && o.status === "completed" && (
            <form
              className="panel form-stack"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await api("/orders/" + id + "/review", {
                    rating,
                    body: review,
                  });
                  setReview("");
                  notify(
                    T(
                      "Отзыв опубликован",
                      "Sharh joylandi",
                      "Review published",
                    ),
                  );
                } catch (e) {
                  notify(e);
                }
              }}
            >
              <h3>
                {T(
                  "Оцените исполнителя",
                  "Ijrochini baholang",
                  "Review your provider",
                )}
              </h3>
              <div className="stars">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    aria-label={n + " / 5"}
                    type="button"
                    key={n}
                    onClick={() => setRating(n)}
                  >
                    <Star fill={n <= rating ? "currentColor" : "none"} />
                  </button>
                ))}
              </div>
              <textarea
                aria-label={T("Отзыв", "Sharh", "Review")}
                value={review}
                onChange={(e) => setReview(e.target.value)}
                required
                minLength={5}
                maxLength={2000}
              />
              <button className="primary">
                {T("Оставить отзыв", "Sharh qoldirish", "Post review")}
              </button>
            </form>
          )}
          {user.role === "admin" && (
            <a
              className="secondary"
              href={"/api/admin/orders/" + id + "/export"}
            >
              <Download size={18} />
              {T("Экспорт дела JSON", "Ishni JSON yuklash", "Export case JSON")}
            </a>
          )}
        </aside>
      </div>
      {dispute && (
        <Modal
          title={T("Открыть спор", "Nizo ochish", "Open a dispute")}
          onClose={() => setDispute(false)}
        >
          <form
            className="form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api("/orders/" + id + "/dispute", { reason });
                setDispute(false);
                load();
              } catch (e) {
                notify(e);
              }
            }}
          >
            <p>
              {T(
                "Опишите проблему. Фотографии и история заказа доступны администратору.",
                "Muammoni yozing. Suratlar va tarix administratorga ko‘rinadi.",
                "Describe the issue. Photos and history are available to administrators.",
              )}
            </p>
            <textarea
              aria-label={T("Причина спора", "Nizo sababi", "Dispute reason")}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              minLength={10}
              maxLength={3000}
              required
            />
            <button className="primary">
              {T(
                "Отправить в поддержку",
                "Yordamga yuborish",
                "Send to support",
              )}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
function eventLabel(a, T) {
  const labels = {
    "order.created": ["Заявка создана", "Buyurtma yaratildi", "Task created"],
    "order.accept": [
      "Исполнитель принял заказ",
      "Ijrochi qabul qildi",
      "Provider accepted",
    ],
    "order.handover": [
      "Отправитель подтвердил передачу",
      "Jo‘natuvchi tasdiqladi",
      "Sender confirmed handover",
    ],
    "order.start": ["Работа начата", "Ish boshlandi", "Work started"],
    "order.finish": [
      "Результат отправлен",
      "Natija yuborildi",
      "Result submitted",
    ],
    "order.confirm": [
      "Клиент подтвердил выполнение",
      "Mijoz tasdiqladi",
      "Client confirmed",
    ],
    "order.cancel": ["Заказ отменён", "Bekor qilindi", "Cancelled"],
    "dispute.opened": ["Спор открыт", "Nizo ochildi", "Dispute opened"],
    "dispute.resolved": [
      "Решение администратора",
      "Administrator qarori",
      "Administrator decision",
    ],
    "evidence.viewed": [
      "Администратор просмотрел фото",
      "Administrator suratni ko‘rdi",
      "Evidence reviewed",
    ],
    "case.exported": ["Дело экспортировано", "Ish yuklandi", "Case exported"],
  };
  return labels[a] ? T(...labels[a]) : a;
}
function AccountControls({ user, refresh, notify, go }) {
  const T = useT(), [busy, setBusy] = useState(false), [inbox, setInbox] = useState({ items: [], enabled: true });
  useEffect(() => {
    let dead = false;
    const load = () => api("/notifications").then(d => { if (!dead) setInbox(d); }).catch(() => {});
    load(); const timer = setInterval(() => { if (!document.hidden) load(); }, 20000);
    return () => { dead = true; clearInterval(timer); };
  }, [user.id]);
  async function role(next) {
    setBusy(true);
    try { await api("/account/role", { role: next }); await refresh(); notify(T("Режим аккаунта изменён", "Hisob rejimi o‘zgardi", "Account mode updated")); }
    catch (e) { notify(e); } finally { setBusy(false); }
  }
  return <section className="account-center panel form-stack">
    <div className="row"><div className="round-icon"><Settings size={22}/></div><h2>{T("Ваш режим", "Sizning rejimingiz", "Your mode")}</h2></div>
    {user.role === "admin" ? <button className="primary" onClick={() => go("admin")}><LayoutDashboard size={20}/>{T("Открыть админку", "Boshqaruvni ochish", "Open admin")}</button> : <div className="mode-switch">
      {["client", "worker"].map(r => <button type="button" key={r} aria-pressed={user.role === r} disabled={busy || user.role === r} className={user.role === r ? "chosen" : ""} onClick={() => role(r)}>{r === "client" ? <UserRound size={25}/> : <Wrench size={25}/>}<span><strong>{r === "client" ? T("Я клиент", "Men mijozman", "Client") : T("Я исполнитель", "Men ijrochiman", "Provider")}</strong><small>{r === "client" ? T("Создавать заявки", "Buyurtma yaratish", "Post tasks") : T("Предлагать услуги и брать заказы", "Xizmat va buyurtmalar", "Offer services and take tasks")}</small></span>{user.role === r && <CheckCircle2 size={19}/>}</button>)}
    </div>}
    <p className="small muted">{T("История и текущие заказы сохраняются при переключении.", "Rejim almashganda buyurtmalar saqlanadi.", "Your history and existing tasks stay with your account.")}</p>
    <div className="row"><MessageCircle size={21}/><h3>{T("Уведомления", "Bildirishnomalar", "Notifications")}</h3><span className="pill">{inbox.items.filter(n => !n.read_at).length}</span></div>
    <label className="checkbox"><input type="checkbox" checked={inbox.enabled} disabled={busy} onChange={async e => {
      const enabled=e.target.checked; setBusy(true);
      try { await api("/notifications/preferences", { enabled }); setInbox(p => ({...p,enabled})); }
      catch(e) { notify(e); } finally {setBusy(false);}
    }}/>{T("Присылать уведомления в Telegram", "Telegram orqali xabar berish", "Send notifications to Telegram")}</label>
    <div className="inbox-list">{inbox.items.length ? inbox.items.map(n => <button key={n.id} className={n.read_at ? "inbox-item" : "inbox-item unread"} onClick={() => go("order/"+n.order_id)}><span>{n.body}<small>{new Date(n.created_at).toLocaleString()}</small></span><ArrowUpRight size={18}/></button>) : <p className="muted">{T("Здесь появятся события ваших заказов.", "Buyurtma xabarlari shu yerda bo‘ladi.", "Your order updates will appear here.")}</p>}</div>
    {inbox.items.some(n=>!n.read_at) && <button className="ghost" onClick={async()=>{try{await api("/notifications/read",{});setInbox(p=>({...p,items:p.items.map(n=>({...n,read_at:new Date().toISOString()}))}));}catch(e){notify(e);}}}>{T("Отметить прочитанными", "O‘qilgan deb belgilash", "Mark as read")}</button>}
    <p className="small muted">{T("В боте: /help — команды, /orders — заказы, /client и /worker — смена режима.", "Bot: /help — buyruqlar, /orders — buyurtmalar, /client va /worker — rejim.", "Bot: /help, /orders, /client and /worker.")}</p>
  </section>;
}
function Profile({ user, config, notify, refresh, onLogin, onLogout, go }) {
  const T = useT(),
    [photos, setPhotos] = useState(["", "", "", "", ""]),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false);
  if (!user)
    return (
      <Empty
        icon={UserRound}
        title={T("Ваш профиль", "Profilingiz", "Your profile")}
      >
        <button className="primary" onClick={onLogin}>
          {T("Войти", "Kirish", "Sign in")}
        </button>
      </Empty>
    );
  const verified = ["manual", "myid"].includes(user.verified),
    labels = [
      T("Документ: лицевая сторона", "Hujjat: old tomoni", "ID: front"),
      T("Документ: обратная сторона", "Hujjat: orqa tomoni", "ID: back"),
      T("Лицо: прямо", "Yuz: to‘g‘ri", "Face: front"),
      T("Лицо: поворот влево", "Yuz: chapga", "Face: turn left"),
      T("Лицо: поворот вправо", "Yuz: o‘ngga", "Face: turn right"),
    ];
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            IZLA / {T("АККАУНТ", "HISOB", "ACCOUNT")}
          </span>
          <h1>{T("Ваш профиль", "Profilingiz", "Your profile")}</h1>
        </div>
        <button className="secondary" onClick={() => onLogout().catch(notify)}>
          <LogOut size={17} />
          {T("Выйти", "Chiqish", "Sign out")}
        </button>
      </div>
      <div className="profile-card panel">
        <div className="avatar large">{user.name.slice(0, 1)}</div>
        <div>
          <h2>{user.name}</h2>
          <p className="muted">
            {user.phone} ·{" "}
            {user.role === "worker"
              ? T("Исполнитель", "Ijrochi", "Provider")
              : user.role === "admin"
                ? T("Администратор", "Administrator", "Administrator")
                : T("Клиент", "Mijoz", "Client")}
          </p>
          <span className={"pill " + (verified ? "success" : "")}>
            <ShieldCheck size={16} />
            {verified
              ? user.verified === "myid"
                ? "MyID"
                : T(
                    "Ручная проверка пройдена",
                    "Qo‘lda tekshiruvdan o‘tgan",
                    "Manually reviewed",
                  )
              : user.verified === "pending"
                ? T("На проверке", "Tekshirilmoqda", "Under review")
                : T(
                    "Личность не проверена",
                    "Shaxs tekshirilmagan",
                    "Identity not reviewed",
                  )}
          </span>
        </div>
      </div>
      <AccountControls user={user} refresh={refresh} notify={notify} go={go}/>
      <div className="form-layout">
        {config.identityVerificationRequired !== false ? <section className="panel form-stack">
          <h2>
            {T(
              "Подтверждение личности",
              "Shaxsni tasdiqlash",
              "Verify your identity",
            )}
          </h2>
          <p className="muted">
            {T(
              "Проверка нужна и клиенту, и исполнителю до первого заказа.",
              "Birinchi buyurtmadan oldin mijoz va ijrochi tekshirilishi kerak.",
              "Both clients and providers need identity review before their first order.",
            )}
          </p>
          <div className="integration-row">
            <span className="integration-logo">
              my<span>id</span>
            </span>
            <div>
              <strong>MyID</strong>
              <p className="small muted">
                {T(
                  "Официальная идентификация",
                  "Rasmiy identifikatsiya",
                  "Official identity verification",
                )}
              </p>
            </div>
            <span className="pill">
              {T("Не подключено", "Ulanmagan", "Not connected")}
            </span>
          </div>
          {!config.manualKyc ? (
            <p className="notice">
              {T(
                "Приём документов пока закрыт. Подключаем проверку и защищённое хранилище в Узбекистане. Не отправляйте паспорт в чат поддержки.",
                "Hujjatlar hali qabul qilinmaydi. O‘zbekistonda himoyalangan saqlash ulanmoqda. Pasportni yordam chatiga yubormang.",
                "Document intake is closed while identity review and secure storage in Uzbekistan are configured. Do not send your passport to support chat.",
              )}
            </p>
          ) : !verified && user.verified !== "pending" ? (
            <>
              <h3>
                {T("Ручная проверка", "Qo‘lda tekshirish", "Manual review")}
              </h3>
              <p className="small muted">
                {T(
                  "Это проверка модератором, не MyID и не автоматическое распознавание живого лица. Снимки делаются камерой.",
                  "Bu moderator tekshiruvi, MyID yoki avtomatik liveness emas.",
                  "A moderator review, not MyID or automated liveness detection. Photos are taken with your camera.",
                )}
              </p>
              <div className="capture-grid">
                {labels.map((l, i) => (
                  <CameraCapture
                    key={i}
                    label={l}
                    facing={i > 1 ? "user" : "environment"}
                    value={photos[i]}
                    onChange={(p) =>
                      setPhotos(photos.map((v, n) => (n === i ? p : v)))
                    }
                  />
                ))}
              </div>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span>
                  {T(
                    "Согласен на обработку документа и снимков лица для ручной проверки личности согласно политике конфиденциальности.",
                    "Maxfiylik siyosatiga muvofiq hujjat va yuz suratlarini qayta ishlashga roziman.",
                    "I consent to processing my ID and face photos for manual identity review under the privacy policy.",
                  )}
                </span>
              </label>
              <Button
                className="primary"
                busy={busy}
                disabled={!photos.every(Boolean) || !consent}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await api("/kyc", { photos, consent });
                    setPhotos(["", "", "", "", ""]);
                    refresh();
                  } catch (e) {
                    notify(e);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {T(
                  "Отправить на проверку",
                  "Tekshiruvga yuborish",
                  "Submit for review",
                )}
              </Button>
            </>
          ) : (
            <p className="success-text">
              {verified
                ? T("Проверка завершена", "Tekshiruv tugadi", "Review complete")
                : T(
                    "Заявка передана модератору",
                    "So‘rov moderatorga berildi",
                    "Submitted to a moderator",
                  )}
            </p>
          )}
        </section> : <section className="panel form-stack">
          <h2>{T("Можно начинать", "Boshlashingiz mumkin", "Ready to start")}</h2>
          <p>{T("Проверка документов временно не требуется. Создавайте заявки или предлагайте услуги после подтверждения телефона.", "Hujjat tekshiruvi vaqtincha talab qilinmaydi. Telefon tasdiqlangach buyurtma yoki xizmat yarating.", "Document review is temporarily optional. Post tasks or offer services after confirming your phone.")}</p>
          <button className="primary" onClick={() => go(user.role === "worker" ? "offer" : "create")}>{T("Начать", "Boshlash", "Get started")}<ArrowRight size={18}/></button>
        </section>}
        <aside className="panel">
          <h3>
            <Lock size={20} />
            {T(
              "Ваши данные защищены",
              "Ma’lumotlaringiz himoyalangan",
              "Your data is protected",
            )}
          </h3>
          <p className="muted">
            {T(
              "Документы не видны другим пользователям. Просмотры администратором фиксируются в журнале.",
              "Hujjatlar boshqa foydalanuvchilarga ko‘rinmaydi. Administrator ko‘rishlari qayd etiladi.",
              "Other users cannot see your documents. Administrator access is logged.",
            )}
          </p>
          <a href="#privacy" className="text-button">
            {T(
              "Политика конфиденциальности",
              "Maxfiylik siyosati",
              "Privacy policy",
            )}
            <ArrowUpRight size={16} />
          </a>
          {user.role === "admin" && (
            <button className="primary" onClick={() => go("admin")}>
              {T("Открыть админку", "Boshqaruvni ochish", "Open admin")}
            </button>
          )}
        </aside>
      </div>
    </>
  );
}
function ListingDetail({ listing: l, user, notify, onRequest }) {
  const T = useT(),
    [comments, setComments] = useState([]),
    [reviews, setReviews] = useState([]),
    [body, setBody] = useState("");
  useEffect(() => {
    Promise.all([
      api("/listings/" + l.id + "/comments").then(setComments),
      api("/workers/" + l.user_id + "/reviews").then(setReviews),
    ]).catch(notify);
  }, [l.id]);
  return (
    <div className="form-stack">
      <span className="pill">
        {T(...categoryNames[l.category])} · {l.city}
      </span>
      <p className="preline">{l.description}</p>
      <strong className="big-price">
        {l.price
          ? money(l.price) + " " + T("сум", "so‘m", "UZS")
          : T("Договорная цена", "Kelishilgan narx", "Negotiable price")}
      </strong>
      <p>
        <ShieldCheck size={16} /> {l.name}
      </p>
      <button className="primary" onClick={onRequest}>
        {T(
          "Создать заявку в этой категории",
          "Shu toifada buyurtma",
          "Post a task in this category",
        )}
        <ArrowRight size={16} />
      </button>
      <h3>
        {T(
          "Отзывы о выполненных заказах",
          "Bajarilgan buyurtmalar sharhlari",
          "Verified order reviews",
        )}{" "}
        ({reviews.length})
      </h3>
      {reviews.map((r) => (
        <div className="comment" key={r.id}>
          <strong>
            {r.name} · {r.rating} ★
          </strong>
          <p>{r.body}</p>
        </div>
      ))}
      <h3>
        {T(
          "Вопросы и комментарии",
          "Savollar va izohlar",
          "Questions and comments",
        )}
      </h3>
      {comments.map((c) => (
        <div className="comment" key={c.id}>
          <strong>{c.name}</strong>
          <p>{c.body}</p>
        </div>
      ))}
      {user && (
        <form
          className="form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api("/listings/" + l.id + "/comments", { body });
              setBody("");
              setComments(await api("/listings/" + l.id + "/comments"));
            } catch (e) {
              notify(e);
            }
          }}
        >
          <textarea
            aria-label={T("Комментарий", "Izoh", "Comment")}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            minLength={2}
            maxLength={1000}
          />
          <button className="secondary">
            {T("Отправить", "Yuborish", "Send")}
          </button>
        </form>
      )}
    </div>
  );
}
function Admin({ user, notify, go }) {
  const T = useT(),
    [data, set] = useState(null),
    [tab, setTab] = useState("orders"),
    [decision, setDecision] = useState(null),
    [reason, setReason] = useState(""),
    [status, setStatus] = useState("completed"),
    [photos, setPhotos] = useState([]);
  const load = () => api("/admin").then(set);
  useEffect(() => {
    if (user?.role === "admin") load().catch(notify);
  }, [user]);
  if (user?.role !== "admin")
    return (
      <Empty
        icon={Lock}
        title={T(
          "Доступ только администратору",
          "Faqat administrator uchun",
          "Administrator access only",
        )}
      />
    );
  if (!data) return <p>{T("Загрузка…", "Yuklanmoqda…", "Loading…")}</p>;
  async function decide(e) {
    e.preventDefault();
    try {
      if (decision.type === "hide")
        await api("/admin/listings/" + decision.id + "/hide", { reason });
      if (decision.type === "ban")
        await api("/admin/users/" + decision.id + "/ban", {
          banned: !decision.banned,
          reason,
        });
      if (decision.type === "dispute")
        await api("/admin/disputes/" + decision.id, {
          status,
          resolution: reason,
        });
      if (decision.type === "kyc")
        await api("/admin/kyc/" + decision.id, {
          approved: status === "completed",
          reason,
        });
      setDecision(null);
      setPhotos([]);
      setReason("");
      await load();
    } catch (e) {
      notify(e);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">IZLA / CONTROL ROOM</span>
          <h1>{T("Центр управления", "Boshqaruv markazi", "Control room")}</h1>
        </div>
        <button className="secondary" onClick={() => load().catch(notify)}>
          {T("Обновить", "Yangilash", "Refresh")}
        </button>
      </div>
      <div className="stats">
        {[
          [
            Users,
            data.users.length,
            T("Пользователи", "Foydalanuvchilar", "Users"),
          ],
          [
            ClipboardList,
            data.orders.length,
            T("Заказы", "Buyurtmalar", "Orders"),
          ],
          [
            Scale,
            data.disputes.filter((d) => d.status === "open").length,
            T("Открытые споры", "Ochiq nizolar", "Open disputes"),
          ],
          [
            ShieldCheck,
            data.submissions.length,
            T("Проверки личности", "Shaxsni tekshirish", "Identity reviews"),
          ],
        ].map(([Icon, n, l]) => (
          <div className="panel" key={l}>
            <Icon size={21} />
            <strong>{n}</strong>
            <span>{l}</span>
          </div>
        ))}
      </div>
      <div className="tabs">
        {[
          ["orders", T("Заказы", "Buyurtmalar", "Orders")],
          ["users", T("Пользователи", "Foydalanuvchilar", "Users")],
          ["listings", T("Объявления", "E’lonlar", "Listings")],
          ["disputes", T("Споры", "Nizolar", "Disputes")],
          ["submissions", T("Документы", "Hujjatlar", "Identity")],
          ["logs", T("Журнал", "Jurnal", "Audit log")],
        ].map(([k, l]) => (
          <button
            key={k}
            className={tab === k ? "active" : ""}
            onClick={() => setTab(k)}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>{T("Описание", "Tavsif", "Description")}</th>
              <th>{T("Статус", "Holat", "Status")}</th>
              <th>{T("Действие", "Harakat", "Action")}</th>
            </tr>
          </thead>
          <tbody>
            {data[tab].map((r) => (
              <tr key={r.id}>
                <td>
                  <code>{r.id.slice(0, 8)}</code>
                </td>
                <td>
                  {["orders", "listings"].includes(tab) ? (
                    r.title
                  ) : tab === "users" ? (
                    <>
                      {r.name}
                      <small className="block muted">{r.phone}</small>
                    </>
                  ) : tab === "disputes" ? (
                    r.reason
                  ) : tab === "logs" ? (
                    <>
                      {eventLabel(r.action, T)}
                      <small className="block muted">
                        {JSON.stringify(r.details)}
                      </small>
                    </>
                  ) : (
                    r.user_id.slice(0, 8)
                  )}
                </td>
                <td>
                  {r.status
                    ? statusNames[r.status]
                      ? T(...statusNames[r.status])
                      : r.status
                    : tab === "users"
                      ? `${r.role} · ${r.verified}${r.banned ? " · BLOCKED" : ""}`
                      : new Date(r.created_at).toLocaleString()}
                </td>
                <td>
                  {tab === "orders" && (
                    <button
                      className="secondary"
                      onClick={() => go("order/" + r.id)}
                    >
                      {T("Открыть", "Ochish", "Open")}
                    </button>
                  )}
                  {tab === "listings" && r.active && (
                    <button
                      className="secondary"
                      onClick={() => {
                        setDecision({ ...r, type: "hide" });
                        setReason("");
                      }}
                    >
                      {T("Скрыть", "Yashirish", "Hide")}
                    </button>
                  )}
                  {tab === "users" && r.role !== "admin" && (
                    <button
                      className="secondary"
                      onClick={() => {
                        setDecision({ ...r, type: "ban" });
                        setReason("");
                      }}
                    >
                      {r.banned
                        ? T("Разблокировать", "Blokdan chiqarish", "Unblock")
                        : T("Заблокировать", "Bloklash", "Block")}
                    </button>
                  )}
                  {tab === "disputes" && (
                    <div className="row">
                      <button
                        className="secondary"
                        onClick={() => go("order/" + r.order_id)}
                      >
                        {T("Доказательства", "Dalillar", "Evidence")}
                      </button>
                      {r.status === "open" && (
                        <button
                          className="primary"
                          onClick={() => {
                            setDecision({ ...r, type: "dispute" });
                            setReason("");
                          }}
                        >
                          {T("Решение", "Qaror", "Resolve")}
                        </button>
                      )}
                    </div>
                  )}
                  {tab === "submissions" && (
                    <button
                      className="primary"
                      onClick={async () => {
                        try {
                          const d = await api("/admin/kyc/" + r.id);
                          setPhotos(d.photos);
                          setDecision({ ...r, type: "kyc" });
                          setReason("");
                        } catch (e) {
                          notify(e);
                        }
                      }}
                    >
                      {T("Проверить", "Tekshirish", "Review")}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data[tab].length && (
          <Empty title={T("Нет записей", "Yozuvlar yo‘q", "No records")} />
        )}
      </div>
      {decision && (
        <Modal
          title={T(
            "Решение администратора",
            "Administrator qarori",
            "Administrator decision",
          )}
          onClose={() => {
            setDecision(null);
            setPhotos([]);
          }}
        >
          <form className="form-stack" onSubmit={decide}>
            {photos.length > 0 && (
              <div className="evidence-grid">
                {photos.map((p, i) => (
                  <img key={i} src={p} alt={"KYC " + i} />
                ))}
              </div>
            )}
            {["dispute", "kyc"].includes(decision.type) && (
              <Field label={T("Результат", "Natija", "Outcome")}>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="completed">
                    {decision.type === "kyc"
                      ? T(
                          "Одобрить ручную проверку",
                          "Qo‘lda tekshiruvni tasdiqlash",
                          "Approve manual review",
                        )
                      : T(
                          "Завершить заказ",
                          "Buyurtmani yakunlash",
                          "Complete order",
                        )}
                  </option>
                  <option value="cancelled">
                    {decision.type === "kyc"
                      ? T("Отклонить", "Rad etish", "Reject")
                      : T("Отменить заказ", "Bekor qilish", "Cancel order")}
                  </option>
                </select>
              </Field>
            )}
            <Field
              label={T(
                "Обоснование: минимум 20 символов",
                "Asos: kamida 20 belgi",
                "Reason: at least 20 characters",
              )}
            >
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                minLength={20}
                maxLength={1000}
                required
              />
            </Field>
            <p className="small muted">
              {T(
                "Действие будет записано в журнал. Денежный возврат не выполняется.",
                "Harakat jurnalga yoziladi. Pul qaytarilmaydi.",
                "This action will be audited. It does not issue a monetary refund.",
              )}
            </p>
            <button className="primary">
              {T("Сохранить решение", "Qarorni saqlash", "Save decision")}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
function Support() {
  const T = useT();
  return (
    <div className="narrow">
      <span className="eyebrow">IZLA / {T("ПОМОЩЬ", "YORDAM", "HELP")}</span>
      <h1>{T("Мы на связи", "Biz aloqadamiz", "Get in touch")}</h1>
      <p className="muted">
        {T(
          "Укажите номер заказа и кратко опишите ситуацию.",
          "Buyurtma raqami va vaziyatni qisqacha yozing.",
          "Include your order number and a short description.",
        )}
      </p>
      <div className="panel contact-list">
        <a href="tel:+998200309100">
          <Headphones />
          <span>
            {T("Позвонить", "Qo‘ng‘iroq qilish", "Call us")}
            <strong>+998 20 030 91 00</strong>
          </span>
          <ArrowUpRight />
        </a>
        <a href="https://t.me/i0000001i" target="_blank" rel="noreferrer">
          <MessageCircle />
          <span>
            Telegram<strong>@i0000001i</strong>
          </span>
          <ArrowUpRight />
        </a>
        <a href="mailto:anvarikromov778@gmail.com">
          <Send />
          <span>
            Email<strong>anvarikromov778@gmail.com</strong>
          </span>
          <ArrowUpRight />
        </a>
      </div>
      <p className="notice">
        {T(
          "Не отправляйте коды входа и фотографии документов в поддержку. Для спора используйте кнопку в заказе — так сохранятся доказательства.",
          "Kirish kodlari va hujjat suratlarini yordamga yubormang. Nizo uchun buyurtmadagi tugmadan foydalaning.",
          "Do not send login codes or identity documents to support. Open disputes from the order to preserve the evidence.",
        )}
      </p>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
