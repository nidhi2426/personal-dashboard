"use strict";

/* =====================================================
   0. STORAGE HELPERS
   localStorage can throw (private mode, storage full, disabled),
   so every read/write is wrapped. Values are stored as JSON strings.
   ===================================================== */
const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  },
};

// Shortcut so we don't type document.getElementById everywhere
const $ = (id) => document.getElementById(id);

/* =====================================================
   1. CLOCK
   setInterval re-runs updateClock every second.
   We call it once immediately so there is no blank "--:--" gap.
   ===================================================== */
function updateClock() {
  const now = new Date();
  $("clock").textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  $("date").textContent = now.toLocaleDateString([], {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const h = now.getHours();
  $("greeting").textContent =
    h < 5 ? "Still up?" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}
updateClock();
setInterval(updateClock, 1000);

/* =====================================================
   2. THEME TOGGLE
   The <html data-theme="..."> attribute switches the CSS variables.
   The head script already applied the saved theme; this handles clicks.
   ===================================================== */
$("theme-toggle").addEventListener("click", () => {
  const root = document.documentElement;
  const next = root.dataset.theme === "dark" ? "light" : "dark";
  root.dataset.theme = next;
  localStorage.setItem("dash.theme", next); // plain string, matches the head script
});

/* =====================================================
   3. WEATHER (OpenWeatherMap + Geolocation)
   Flow: need key -> ask browser for location -> fetch -> render.
   The key is entered by the user and kept in THEIR localStorage,
   so it never has to be committed to a public GitHub repo.
   Results are cached 10 min to stay well inside the free-tier limits.
   ===================================================== */
const KEY_STORE = "dash.owmKey";
const CACHE_STORE = "dash.weatherCache";
const CACHE_MS = 10 * 60 * 1000;

function showWeatherMessage(text) {
  $("weather-status").hidden = false;
  $("weather-status").textContent = text;
  $("weather-data").hidden = true;
}

function renderWeather(d) {
  $("weather-status").hidden = true;
  $("key-form").hidden = true;
  $("weather-data").hidden = false;
  // textContent (not innerHTML) so API data can never inject HTML
  $("w-temp").textContent = Math.round(d.main.temp);
  $("w-desc").textContent = d.weather[0].description;
  $("w-place").textContent = d.name;
  $("w-meta").textContent =
    `Feels like ${Math.round(d.main.feels_like)}°C, humidity ${d.main.humidity}%, wind ${d.wind.speed} m/s`;
}

async function fetchWeather(lat, lon, key) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${encodeURIComponent(key)}`;
  const res = await fetch(url);
  if (res.status === 401) throw new Error("The API key was rejected. New keys can take up to 2 hours to activate.");
  if (!res.ok) throw new Error(`Weather service error (${res.status}).`);
  return res.json();
}

function loadWeather() {
  const key = store.get(KEY_STORE, "");
  if (!key) {
    showWeatherMessage("Add a free OpenWeatherMap key to see your weather.");
    $("key-form").hidden = false;
    return;
  }

  const cache = store.get(CACHE_STORE, null);
  if (cache && Date.now() - cache.time < CACHE_MS) {
    renderWeather(cache.data);
    return;
  }

  if (!("geolocation" in navigator)) {
    showWeatherMessage("This browser doesn't support location.");
    return;
  }

  showWeatherMessage("Finding your location…");
  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      try {
        const data = await fetchWeather(coords.latitude, coords.longitude, key);
        store.set(CACHE_STORE, { time: Date.now(), data });
        renderWeather(data);
      } catch (err) {
        showWeatherMessage(err.message);
        if (err.message.includes("rejected")) $("key-form").hidden = false; // let them re-enter the key
      }
    },
    () => showWeatherMessage("Location is blocked. Allow location access for this site and reload.")
  );
}

$("key-form").addEventListener("submit", (e) => {
  e.preventDefault(); // stop the page from reloading
  store.set(KEY_STORE, $("key-input").value.trim());
  localStorage.removeItem(CACHE_STORE);
  $("key-input").value = "";
  loadWeather();
});

/* =====================================================
   4. TO-DO LIST
   State = one array of {id, text, done}. Every change updates the
   array, saves it, then re-renders. The array is the single source
   of truth; the DOM is just a picture of it.
   ===================================================== */
let todos = store.get("dash.todos", []);

function saveTodos() { store.set("dash.todos", todos); }

function renderTodos() {
  const list = $("todo-list");
  list.replaceChildren(); // clear the old items

  todos.forEach((todo) => {
    const li = document.createElement("li");
    li.classList.toggle("done", todo.done);

    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = todo.done;
    box.setAttribute("aria-label", `Mark "${todo.text}" as done`);
    box.addEventListener("change", () => { todo.done = box.checked; saveTodos(); renderTodos(); });

    const text = document.createElement("span");
    text.textContent = todo.text; // textContent = safe against HTML injection

    const del = document.createElement("button");
    del.className = "del";
    del.type = "button";
    del.textContent = "×";
    del.setAttribute("aria-label", `Delete "${todo.text}"`);
    del.addEventListener("click", () => {
      todos = todos.filter((t) => t.id !== todo.id);
      saveTodos(); renderTodos();
    });

    li.append(box, text, del);
    list.append(li);
  });

  const open = todos.filter((t) => !t.done).length;
  $("todo-count").textContent = todos.length ? `(${open} left)` : "";
}

$("todo-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const text = $("todo-input").value.trim();
  if (!text) return;
  todos.push({ id: Date.now(), text, done: false }); // timestamp = simple unique id
  $("todo-input").value = "";
  saveTodos(); renderTodos();
});

/* =====================================================
   5. QUICK LINKS
   Same pattern as the to-do list. The URL is validated: only
   http/https allowed, which blocks "javascript:" links.
   ===================================================== */
const DEFAULT_LINKS = [
  { id: 1, name: "GitHub", url: "https://github.com" },
  { id: 2, name: "MDN Web Docs", url: "https://developer.mozilla.org" },
  { id: 3, name: "YouTube", url: "https://youtube.com" },
];
let links = store.get("dash.links", DEFAULT_LINKS);

function normalizeUrl(input) {
  const withProtocol = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  try {
    const url = new URL(withProtocol);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

function renderLinks() {
  const list = $("link-list");
  list.replaceChildren();

  links.forEach((link) => {
    const li = document.createElement("li");

    const a = document.createElement("a");
    a.href = link.url;
    a.textContent = link.name;
    a.rel = "noopener noreferrer"; // stops the opened page from accessing this one

    const del = document.createElement("button");
    del.className = "del";
    del.type = "button";
    del.textContent = "×";
    del.setAttribute("aria-label", `Remove ${link.name}`);
    del.addEventListener("click", () => {
      links = links.filter((l) => l.id !== link.id);
      store.set("dash.links", links); renderLinks();
    });

    li.append(a, del);
    list.append(li);
  });
}

$("link-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const url = normalizeUrl($("link-url").value.trim());
  if (!url) { $("link-url").setCustomValidity("Enter a valid web address"); $("link-url").reportValidity(); return; }
  links.push({ id: Date.now(), name: $("link-name").value.trim(), url });
  store.set("dash.links", links);
  $("link-name").value = ""; $("link-url").value = "";
  renderLinks();
});
// Clear the custom error as soon as the user edits the field again
$("link-url").addEventListener("input", () => $("link-url").setCustomValidity(""));

/* =====================================================
   6. START-UP: draw everything once when the page loads
   ===================================================== */
renderTodos();
renderLinks();
loadWeather();
