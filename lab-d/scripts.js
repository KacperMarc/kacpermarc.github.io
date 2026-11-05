const API_KEY = "7ded80d91f2b280ec979100cc8bbba94";
const BASE_URL = "https://api.openweathermap.org/data/2.5";
const PARAMS = `units=metric&lang=pl&appid=${API_KEY}`;

const form = document.getElementById("search-form");
const input = document.getElementById("city-input");
const statusEl = document.getElementById("status");
const currentEl = document.getElementById("current");
const forecastSection = document.getElementById("forecast-section");
const forecastEl = document.getElementById("forecast");

form.addEventListener("submit", (event) => {
    event.preventDefault();
    const city = input.value.trim();
    if (!city) return;

    statusEl.textContent = "Pobieranie danych…";
    statusEl.classList.remove("error");

    getCurrentWeather(city);
    getForecast(city);
});

function getCurrentWeather(city) {
    const url = `${BASE_URL}/weather?q=${encodeURIComponent(city)}&${PARAMS}`;
    const xhr = new XMLHttpRequest();

    xhr.open("GET", url, true);
    xhr.responseType = "json";

    xhr.onload = function () {
        console.debug("Current weather:", xhr.response);
        if (xhr.status === 200) {
            renderCurrent(xhr.response);
            statusEl.textContent = "";
        } else {
            showError(xhr.response?.message || `Błąd ${xhr.status}`);
            currentEl.hidden = true;
        }
    };

    xhr.onerror = function () {
        showError("Błąd sieci – nie udało się pobrać bieżącej pogody.");
    };

    xhr.send();
}

function getForecast(city) {
    const url = `${BASE_URL}/forecast?q=${encodeURIComponent(city)}&${PARAMS}`;

    fetch(url)
        .then((response) => {
            if (!response.ok) {
                return response.json().then((err) => {
                    throw new Error(err.message || `Błąd ${response.status}`);
                });
            }
            return response.json();
        })
        .then((data) => {
            console.debug("Forecast:", data);
            renderForecast(data);
        })
        .catch((error) => {
            showError(error.message);
            forecastSection.hidden = true;
        });
}

function renderCurrent(data) {
    const w = data.weather[0];
    currentEl.innerHTML = `
        <div class="current-main">
            <img src="${iconUrl(w.icon, 4)}" alt="${w.description}">
            <div>
                <p class="place">${data.name}, ${data.sys.country}</p>
                <p class="temp">${Math.round(data.main.temp)}°C</p>
                <p class="desc">${w.description}</p>
                <p class="time">Teraz · ${formatDate(data.dt, data.timezone, true)}</p>
            </div>
        </div>
        <ul class="details">
            <li><span>Odczuwalna</span>${data.main.feels_like.toFixed(1)}°C</li>
            <li><span>Min / Max</span>${Math.round(data.main.temp_min)}° / ${Math.round(data.main.temp_max)}°</li>
            <li><span>Wilgotność</span>${data.main.humidity}%</li>
            <li><span>Ciśnienie</span>${data.main.pressure} hPa</li>
            <li><span>Wiatr</span>${data.wind.speed.toFixed(1)} m/s</li>
            <li><span>Zachmurzenie</span>${data.clouds.all}%</li>
        </ul>
    `;
    currentEl.hidden = false;
}

function renderForecast(data) {
    const tz = data.city.timezone;
    const days = {};

    data.list.forEach((item) => {
        const key = formatDate(item.dt, tz, false);
        (days[key] = days[key] || []).push(item);
    });

    forecastEl.innerHTML = Object.entries(days).map(([day, items]) => `
        <div class="day">
            <h3>${day}</h3>
            <div class="slots">
                ${items.map((item) => `
                    <article class="slot">
                        <p class="hour">${formatHour(item.dt, tz)}</p>
                        <img src="${iconUrl(item.weather[0].icon, 2)}" alt="${item.weather[0].description}">
                        <p class="slot-temp">${Math.round(item.main.temp)}°C</p>
                        <p class="slot-feel">odcz. ${Math.round(item.main.feels_like)}°C</p>
                        <p class="slot-desc">${item.weather[0].description}</p>
                    </article>
                `).join("")}
            </div>
        </div>
    `).join("");

    forecastSection.hidden = false;
}

function iconUrl(code, size) {
    return `https://openweathermap.org/img/wn/${code}@${size}x.png`;
}

function formatDate(dt, tz, withTime) {
    const d = new Date((dt + tz) * 1000);
    const opts = { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" };
    if (withTime) Object.assign(opts, { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleString("pl-PL", opts);
}

function formatHour(dt, tz) {
    return new Date((dt + tz) * 1000).toLocaleTimeString("pl-PL", {
        timeZone: "UTC", hour: "2-digit", minute: "2-digit"
    });
}

function showError(message) {
    statusEl.textContent = `⚠ ${message}`;
    statusEl.classList.add("error");
}

// kod wygenerowany za pomoca Claude
