# Personal Dashboard

A custom browser start page with a live clock, weather, a to-do list, quick links, and a light/dark theme. Built with plain HTML, CSS and JavaScript. No frameworks, no build step.

## Features

- Clock, date and time-aware greeting (updates every second)
- Weather for your current location (OpenWeatherMap + browser geolocation)
- To-do list: add, check off, delete. Saved in your browser
- Quick links: add and remove your own. Saved in your browser
- Light/dark theme that follows your system setting and remembers your choice
- Responsive layout, keyboard-friendly, respects reduced-motion settings

## Tech stack

| Part | Tool |
|---|---|
| Structure | HTML5 |
| Styling | CSS (Grid, custom properties) |
| Logic | Vanilla JavaScript (ES6+) |
| Weather data | [OpenWeatherMap](https://openweathermap.org/api) free tier |
| Persistence | `localStorage` |
| Hosting | GitHub Pages |

## Project structure

```
personal-dashboard/
├── index.html   # page structure
├── style.css    # theme variables, layout, components
├── script.js    # clock, weather, to-do, links, theme
└── README.md
```

## Run it locally

1. Download or clone the project.
2. Serve it over `localhost`. Geolocation works on `localhost` and `https` only, so avoid opening the file by double-clicking:
   ```bash
   # Option A (Python)
   python3 -m http.server 8000

   # Option B (Node)
   npx serve
   ```
3. Open `http://localhost:8000`.

## Set up the weather

1. Create a free account at [openweathermap.org](https://openweathermap.org/api) and copy your key from **My API keys**.
2. Open the dashboard and paste the key into the weather panel.
3. Allow location access when the browser asks.

Notes:
- New keys can take up to **2 hours** to activate. Until then you'll see a "key was rejected" message.
- The key is saved only in your own browser's `localStorage`. It is never written into the code, so it won't leak into your GitHub repo.
- Weather is cached for 10 minutes to stay within the free-tier limits.

### Use it as your browser start page

- **Chrome/Edge:** Settings → On startup → Open a specific page → paste your Pages URL (and set it as the Home page too).
- **Firefox:** Settings → Home → Custom URLs → paste your Pages URL.

Note: `localStorage` is per-site and per-browser, so your tasks and links won't sync between devices.

## Customize

- **Colours:** edit the variables at the top of `style.css`.
- **Default links:** edit `DEFAULT_LINKS` in `script.js`.
- **Fahrenheit:** change `units=metric` to `units=imperial` in `fetchWeather()` and replace `°C` and `m/s` with `°F` and `mph`.

## Ideas for next steps

- Edit tasks in place and drag to reorder
- 5-day forecast using the OpenWeatherMap forecast endpoint
- Export/import data as JSON to move between browsers
- Turn it into an installable PWA with a manifest and service worker

## Author

Built by NIDHI. [GitHub](https://github.com/nidhi2426) · [LinkedIn](www.linkedin.com/in/nidhi-thota)
