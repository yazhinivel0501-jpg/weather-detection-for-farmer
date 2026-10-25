/**
 * Smart Weather Detection & Advisory System for Farmers
 * Agricultural Weather Engine & Dynamic Advisory Intelligence
 * With Multi-Language Support (11 Languages) & Farmer Authentication
 */

// Global Application State
let currentUnits = 'C'; // 'C' or 'F'
let currentChartMode = 'temperature'; // 'temperature' or 'rainfall'
let activeWeatherData = null;
let currentLanguage = localStorage.getItem('agri_language') || 'en';

// Helper to get translated string with fallback
function t(key) {
  if (window.TRANSLATIONS && window.TRANSLATIONS[currentLanguage] && window.TRANSLATIONS[currentLanguage][key]) {
    return window.TRANSLATIONS[currentLanguage][key];
  }
  if (window.TRANSLATIONS && window.TRANSLATIONS['en'] && window.TRANSLATIONS['en'][key]) {
    return window.TRANSLATIONS['en'][key];
  }
  return key;
}

// Built-in presets for major agricultural regions with rich fallback data
const AGRI_REGIONS = {
  thanjavur: {
    name: "Thanjavur (Cauvery Delta)",
    state: "Tamil Nadu",
    lat: 10.7870,
    lon: 79.1378,
    cropFocus: "Rice / Paddy, Pulses",
    soilMoisture: "38%",
    soilTemp: "27.4°C"
  },
  ludhiana: {
    name: "Ludhiana (Wheat Belt)",
    state: "Punjab",
    lat: 30.9010,
    lon: 75.8573,
    cropFocus: "Wheat, Mustard, Cotton",
    soilMoisture: "29%",
    soilTemp: "21.2°C"
  },
  nashik: {
    name: "Nashik (Horticulture Hub)",
    state: "Maharashtra",
    lat: 19.9975,
    lon: 73.7898,
    cropFocus: "Grapes, Onion, Vegetables",
    soilMoisture: "32%",
    soilTemp: "25.1°C"
  },
  guntur: {
    name: "Guntur (Krishna Delta)",
    state: "Andhra Pradesh",
    lat: 16.3067,
    lon: 80.4365,
    cropFocus: "Chilli, Paddy, Cotton",
    soilMoisture: "35%",
    soilTemp: "28.5°C"
  },
  bhopal: {
    name: "Bhopal (Central Plateau)",
    state: "Madhya Pradesh",
    lat: 23.2599,
    lon: 77.4126,
    cropFocus: "Soybean, Wheat, Gram",
    soilMoisture: "27%",
    soilTemp: "24.0°C"
  }
};

// Weather Code Interpretation for Agriculture
const WMO_CODES = {
  0: { label: "Clear Sky", icon: "sun" },
  1: { label: "Mainly Clear", icon: "sun-cloud" },
  2: { label: "Partly Cloudy", icon: "cloud-sun" },
  3: { label: "Overcast", icon: "cloud" },
  45: { label: "Foggy Mist", icon: "mist" },
  48: { label: "Depositing Rime Fog", icon: "mist" },
  51: { label: "Light Drizzle", icon: "cloud-drizzle" },
  53: { label: "Moderate Drizzle", icon: "cloud-drizzle" },
  55: { label: "Dense Drizzle", icon: "cloud-drizzle" },
  61: { label: "Slight Rain", icon: "cloud-rain" },
  63: { label: "Moderate Rain", icon: "cloud-rain" },
  65: { label: "Heavy Rain", icon: "cloud-rain" },
  80: { label: "Rain Showers", icon: "cloud-rain" },
  95: { label: "Thunderstorm", icon: "cloud-lightning" }
};

// Toast Notification Manager
function showToast(message, isError = false) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast-message ${isError ? 'toast-error' : ''}`;
  toast.innerHTML = `
    <span>${isError ? '⚠️' : '🌾'}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// SVG Icon Generator (clean agricultural & weather icons)
function getWeatherIconSvg(iconType, size = 48) {
  switch (iconType) {
    case 'sun':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
      </svg>`;
    case 'sun-cloud':
    case 'cloud-sun':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#52B788" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="M20 12h2"/><path d="m19.07 4.93-1.41 1.41"/>
        <path d="M15.5 12.5a4 4 0 0 0-4-4 4 4 0 0 0-3.9 3.1 3 3 0 0 0-2.6 3.4 3 3 0 0 0 3 2.5h7.5a3.5 3.5 0 0 0 0-7c-.3 0-.7 0-1 .1z" fill="rgba(82, 183, 136, 0.15)"/>
      </svg>`;
    case 'cloud':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#40916C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" fill="rgba(64, 145, 108, 0.15)"/>
      </svg>`;
    case 'cloud-rain':
    case 'cloud-drizzle':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#2B6CB0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/>
        <path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/>
      </svg>`;
    case 'cloud-lightning':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973"/>
        <path d="m13 10-3 5h4l-3 5" fill="#D97706"/>
      </svg>`;
    default:
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#40916C" stroke-width="2">
        <circle cx="12" cy="12" r="5"/>
      </svg>`;
  }
}

// Convert Celsius to current unit
function formatTemp(celsiusVal) {
  if (celsiusVal === undefined || celsiusVal === null) return '--°';
  if (currentUnits === 'F') {
    const f = Math.round((celsiusVal * 9) / 5 + 32);
    return `${f}°F`;
  }
  return `${Math.round(celsiusVal)}°C`;
}

// Format raw number only
function getTempNumber(celsiusVal) {
  if (celsiusVal === undefined || celsiusVal === null) return 0;
  if (currentUnits === 'F') {
    return Math.round((celsiusVal * 9) / 5 + 32);
  }
  return Math.round(celsiusVal);
}

// Scroll down to the forecast section showing weather with visual highlight pulse
function goToForecastAndWeather(highlight = true) {
  const target = document.getElementById('forecast-section') || document.getElementById('dashboard-view');
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (highlight) {
      target.classList.remove('highlight-pulse');
      void target.offsetWidth; // Trigger reflow for re-animation
      target.classList.add('highlight-pulse');
      setTimeout(() => {
        target.classList.remove('highlight-pulse');
      }, 1800);
    }
  }
}

// Show/Hide Instant Search Suggestions Dropdown
function showSearchDropdown() {
  const dropdown = document.getElementById('search-dropdown');
  if (dropdown) dropdown.style.display = 'block';
}

function hideSearchDropdown() {
  const dropdown = document.getElementById('search-dropdown');
  if (dropdown) dropdown.style.display = 'none';
}

// Multi-Language Switcher Implementation
function setLanguage(langCode, showToastNotification = false) {
  if (!window.TRANSLATIONS || !window.TRANSLATIONS[langCode]) {
    console.warn(`Language ${langCode} not found in TRANSLATIONS`);
    return;
  }

  currentLanguage = langCode;
  localStorage.setItem('agri_language', langCode);

  // Set HTML attributes
  document.documentElement.lang = langCode;
  document.documentElement.dir = (langCode === 'ur') ? 'rtl' : 'ltr';

  // Update navbar language label
  const langLabel = document.getElementById('current-lang-label');
  if (langLabel) {
    langLabel.textContent = window.TRANSLATIONS[langCode].langName || langCode.toUpperCase();
  }

  // Update active state in language dropdown
  document.querySelectorAll('.lang-option').forEach(opt => {
    if (opt.dataset.lang === langCode) {
      opt.classList.add('active');
    } else {
      opt.classList.remove('active');
    }
  });

  // Update all elements with data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (key && window.TRANSLATIONS[langCode][key]) {
      // If element has hero-title-el, keep the inner span
      if (el.id === 'hero-title-el') {
        el.innerHTML = window.TRANSLATIONS[langCode][key];
      } else {
        el.textContent = window.TRANSLATIONS[langCode][key];
      }
    }
  });

  // Update all elements with data-i18n-placeholder
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    if (key && window.TRANSLATIONS[langCode][key]) {
      el.placeholder = window.TRANSLATIONS[langCode][key];
    }
  });

  // Re-render active weather data with new translations
  if (activeWeatherData) {
    renderWeatherData(activeWeatherData);
  }

  if (showToastNotification) {
    const langName = window.TRANSLATIONS[langCode].langName;
    showToast(`Language set to ${langName} 🌐`);
  }
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  // 1. Setup multi-language from localStorage
  setLanguage(currentLanguage, false);

  // 2. Setup auth state
  checkFarmerAuthState();

  // 3. Setup DOM event listeners
  setupEventListeners();

  // 4. Load default location: Thanjavur
  loadAgriWeather('thanjavur');
});

// Authentication is checked by the Java backend session, not browser flags.
async function checkFarmerAuthState() {
  const loginBtn = document.getElementById('nav-login-btn');
  const userProfile = document.getElementById('nav-user-profile');
  let authenticated = false;
  try { const r = await fetch('/api/auth/me'); authenticated = r.ok; } catch (_) {}
  if (loginBtn) loginBtn.style.display = authenticated ? 'none' : 'inline-flex';
  if (userProfile) userProfile.style.display = authenticated ? 'flex' : 'none';
  return authenticated;
}

async function saveWeatherSnapshot(data) {
  try {
    const auth = await fetch('/api/auth/me');
    if (!auth.ok) return;
    const location = data?.regionMeta?.name || 'Unknown location';
    await fetch('/api/weather/save', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({location, ...data}) });
  } catch (e) { console.debug('Weather report was not saved.', e); }
}

// Setup DOM Event Listeners
function setupEventListeners() {
  // Unit toggle
  const unitBtn = document.getElementById('unit-toggle-btn');
  if (unitBtn) {
    unitBtn.addEventListener('click', () => {
      currentUnits = currentUnits === 'C' ? 'F' : 'C';
      unitBtn.innerHTML = `<span>Units:</span> <strong>°${currentUnits}</strong>`;
      if (activeWeatherData) {
        renderWeatherData(activeWeatherData);
      }
    });
  }

  // --- LANGUAGE SELECTOR ---
  const langBtn = document.getElementById('lang-select-btn');
  const langMenu = document.getElementById('lang-dropdown-menu');

  if (langBtn && langMenu) {
    langBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      langMenu.style.display = langMenu.style.display === 'none' ? 'block' : 'none';
    });

    document.querySelectorAll('.lang-option').forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        const chosen = opt.dataset.lang;
        setLanguage(chosen, true);
        langMenu.style.display = 'none';
      });
    });

    document.addEventListener('click', (e) => {
      const box = document.getElementById('lang-selector-box');
      if (box && !box.contains(e.target)) {
        langMenu.style.display = 'none';
      }
    });
  }

  // --- FARMER LOGIN & AUTHENTICATION ---
  const navLoginBtn = document.getElementById('nav-login-btn');
  const loginModal = document.getElementById('login-modal-backdrop');
  const loginModalClose = document.getElementById('login-modal-close');
  const loginForm = document.getElementById('farmer-login-form');
  const togglePassBtn = document.getElementById('toggle-password-btn');
  const passInput = document.getElementById('login-password');
  const eyeText = document.getElementById('eye-text');
  const demoFillBtn = document.getElementById('demo-fill-btn');
  const btnLogout = document.getElementById('btn-logout');

  // Forgot password modal elements
  const forgotModal = document.getElementById('forgot-modal-backdrop');
  const openForgotLink = document.getElementById('open-forgot-modal-link');
  const forgotModalClose = document.getElementById('forgot-modal-close');
  const backToLoginLink = document.getElementById('back-to-login-link');
  const forgotForm = document.getElementById('forgot-password-form');
  const registerModal = document.getElementById('register-modal-backdrop');
  const registerForm = document.getElementById('farmer-register-form');

  // Open Login Modal
  if (navLoginBtn && loginModal) {
    navLoginBtn.addEventListener('click', () => {
      loginModal.style.display = 'flex';
      const emailInput = document.getElementById('login-email');
      if (emailInput) emailInput.focus();
    });
  }

  // Close Login Modal
  if (loginModalClose && loginModal) {
    loginModalClose.addEventListener('click', () => {
      loginModal.style.display = 'none';
    });
  }

  // Close modals on backdrop click
  if (loginModal) {
    loginModal.addEventListener('click', (e) => {
      if (e.target === loginModal) loginModal.style.display = 'none';
    });
  }
  if (forgotModal) {
    forgotModal.addEventListener('click', (e) => {
      if (e.target === forgotModal) forgotModal.style.display = 'none';
    });
  }

  // Show/Hide Password Toggle
  if (togglePassBtn && passInput) {
    togglePassBtn.addEventListener('click', () => {
      const isPassword = passInput.type === 'password';
      passInput.type = isPassword ? 'text' : 'password';
      if (eyeText) {
        eyeText.textContent = isPassword ? t('hidePassword') : t('showPassword');
      }
    });
  }

  // Open/close registration while preserving the existing modal design.
  const openRegister = document.getElementById('open-register-link');
  const closeRegister = document.getElementById('register-modal-close');
  const backToLoginFromRegister = document.getElementById('back-to-login-from-register');
  if (openRegister) openRegister.addEventListener('click', e => { e.preventDefault(); if(loginModal) loginModal.style.display='none'; if(registerModal) registerModal.style.display='flex'; });
  if (closeRegister) closeRegister.addEventListener('click', () => registerModal.style.display='none');
  if (registerModal) registerModal.addEventListener('click', e => { if(e.target===registerModal) registerModal.style.display='none'; });
  if (backToLoginFromRegister) backToLoginFromRegister.addEventListener('click', e => { e.preventDefault(); registerModal.style.display='none'; if(loginModal) loginModal.style.display='flex'; });

  if (registerForm) registerForm.addEventListener('submit', async e => {
    e.preventDefault();
    const payload = { name:document.getElementById('register-name').value.trim(), email:document.getElementById('register-email').value.trim(), password:document.getElementById('register-password').value };
    try {
      const res = await fetch('/api/auth/register', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const body = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(body.detail || body.message || 'Registration failed. Please check your details.');
      registerModal.style.display='none'; registerForm.reset(); await checkFarmerAuthState();
      showToast('Account created successfully. Welcome to AgriWeather!');
      const dash=document.getElementById('dashboard-view'); if(dash) dash.scrollIntoView({behavior:'smooth',block:'start'});
    } catch(err) { showToast(err.message || 'Could not register. Please try again.', true); }
  });

  // Authenticate against the Java backend.
  if (loginForm) loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const emailInput=document.getElementById('login-email');
    if(!emailInput?.value || !passInput?.value) { showToast('Please enter both email and password.', true); return; }
    try {
      const res=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:emailInput.value.trim(),password:passInput.value})});
      const body=await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(body.detail || body.message || 'Login failed. Check your email and password.');
      loginModal.style.display='none'; await checkFarmerAuthState(); showToast(`Welcome, ${body.name || 'farmer'}!`);
      const dash=document.getElementById('dashboard-view'); if(dash) dash.scrollIntoView({behavior:'smooth',block:'start'});
    } catch(err) { showToast(err.message || 'Unable to log in. Please try again.', true); }
  });

  // Forgot Password Transitions
  if (openForgotLink && forgotModal && loginModal) {
    openForgotLink.addEventListener('click', (e) => {
      e.preventDefault();
      loginModal.style.display = 'none';
      forgotModal.style.display = 'flex';
    });
  }

  if (forgotModalClose && forgotModal) {
    forgotModalClose.addEventListener('click', () => {
      forgotModal.style.display = 'none';
    });
  }

  if (backToLoginLink && forgotModal && loginModal) {
    backToLoginLink.addEventListener('click', (e) => {
      e.preventDefault();
      forgotModal.style.display = 'none';
      loginModal.style.display = 'flex';
    });
  }

  if (forgotForm) {
    forgotForm.addEventListener('submit', (e) => {
      e.preventDefault();
      e.preventDefault();
      showToast('Password reset email is not configured yet. Please contact the project administrator.', true);
    });
  }

  // Logout Button
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      fetch('/api/auth/logout', {method:'POST'}).finally(() => { checkFarmerAuthState(); showToast(t('logoutSuccess')); });
    });
  }

  // --- HERO SEARCH FORM & VIEW FORECAST TRIGGER ---
  const searchBtn = document.getElementById('hero-search-btn');
  const searchInput = document.getElementById('hero-search-input');

  const executeSearch = () => {
    hideSearchDropdown();
    const q = searchInput ? searchInput.value.trim() : '';
    goToForecastAndWeather(true);
    if (q) {
      searchCustomCity(q, true);
    }
  };

  if (searchBtn) {
    searchBtn.addEventListener('click', (e) => {
      e.preventDefault();
      executeSearch();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('focus', () => showSearchDropdown());
    searchInput.addEventListener('click', (e) => {
      e.stopPropagation();
      showSearchDropdown();
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        executeSearch();
      } else if (e.key === 'Escape') {
        hideSearchDropdown();
        if (loginModal) loginModal.style.display = 'none';
        if (forgotModal) forgotModal.style.display = 'none';
      }
    });
  }

  // Dropdown Quick Pick Items
  document.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const q = item.dataset.query;
      if (searchInput) searchInput.value = q;
      hideSearchDropdown();
      
      const lowerKey = q.toLowerCase();
      if (AGRI_REGIONS[lowerKey]) {
        loadAgriWeather(lowerKey, true);
      } else {
        searchCustomCity(q, true);
      }
    });
  });

  // Close search dropdown when clicking outside
  document.addEventListener('click', (e) => {
    const wrapper = document.getElementById('hero-search-wrapper');
    if (wrapper && !wrapper.contains(e.target)) {
      hideSearchDropdown();
    }
  });

  // Preset Chips
  document.querySelectorAll('.preset-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const key = chip.dataset.region;
      if (AGRI_REGIONS[key]) {
        loadAgriWeather(key, true);
      }
    });
  });

  // Chart Tab Buttons
  const tempChartBtn = document.getElementById('chart-tab-temp');
  const rainChartBtn = document.getElementById('chart-tab-rain');
  if (tempChartBtn && rainChartBtn) {
    tempChartBtn.addEventListener('click', () => {
      currentChartMode = 'temperature';
      tempChartBtn.classList.add('active');
      rainChartBtn.classList.remove('active');
      renderChart(activeWeatherData);
    });
    rainChartBtn.addEventListener('click', () => {
      currentChartMode = 'rainfall';
      rainChartBtn.classList.add('active');
      tempChartBtn.classList.remove('active');
      renderChart(activeWeatherData);
    });
  }

  // Sidebar navigation smooth scroll
  document.querySelectorAll('.sidebar-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const targetId = btn.dataset.target;
      if (targetId) {
        const el = document.getElementById(targetId);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

// Fetch Weather for known region or fallback
async function loadAgriWeather(regionKey, shouldScroll = false) {
  const region = AGRI_REGIONS[regionKey] || AGRI_REGIONS['thanjavur'];
  updateLocationHeaders(region.name, region.state, region.cropFocus);

  // Update sensor simulation values
  const soilMoistureEl = document.getElementById('sensor-soil-moisture');
  const soilTempEl = document.getElementById('sensor-soil-temp');
  if (soilMoistureEl) soilMoistureEl.textContent = region.soilMoisture;
  if (soilTempEl) soilTempEl.textContent = region.soilTemp;

  if (shouldScroll) {
    goToForecastAndWeather(true);
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${region.lat}&longitude=${region.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,surface_pressure&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("API response not ok");
    const data = await res.json();
    data.regionMeta = region;
    activeWeatherData = data;
    renderWeatherData(data);
    saveWeatherSnapshot(data);
  } catch (err) {
    console.warn("Could not fetch live Open-Meteo data, using offline agronomic model:", err);
    useMockWeatherData(region);
  }
}

// Search Any City Globally via Open-Meteo Geocoding API
async function searchCustomCity(query, shouldScroll = true) {
  if (shouldScroll) {
    goToForecastAndWeather(true);
  }

  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
    const geoRes = await fetch(geoUrl);
    const geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      alert(`Location "${query}" not found. Please try another farming district or city.`);
      return;
    }

    const place = geoData.results[0];
    const customMeta = {
      name: place.name,
      state: place.admin1 || place.country,
      lat: place.latitude,
      lon: place.longitude,
      cropFocus: "General Agricultural Crops",
      soilMoisture: "31%",
      soilTemp: "24.5°C"
    };

    updateLocationHeaders(customMeta.name, customMeta.state, customMeta.cropFocus);

    const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,surface_pressure&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum&timezone=auto`;
    const fRes = await fetch(forecastUrl);
    const data = await fRes.json();
    data.regionMeta = customMeta;
    activeWeatherData = data;
    renderWeatherData(data);
    saveWeatherSnapshot(data);

    if (shouldScroll) {
      goToForecastAndWeather(true);
    }
  } catch (e) {
    console.error("Geocoding search failed:", e);
    alert("Unable to reach weather servers. Please verify internet connection.");
  }
}

// Fallback Mock Data generator for 100% offline resilience
function useMockWeatherData(region) {
  const mockData = {
    regionMeta: region,
    current: {
      temperature_2m: 29.2,
      apparent_temperature: 31.5,
      relative_humidity_2m: 68,
      precipitation: 0.2,
      weather_code: 2,
      wind_speed_10m: 11.4,
      surface_pressure: 1012.8
    },
    daily: {
      time: [
        "2026-09-15", "2026-09-16", "2026-09-17", "2026-09-18", "2026-09-19", "2026-09-20", "2026-09-21"
      ],
      weather_code: [2, 1, 3, 61, 80, 0, 1],
      temperature_2m_max: [31.5, 32.2, 30.1, 28.5, 27.8, 30.4, 31.8],
      temperature_2m_min: [24.1, 24.5, 23.8, 22.9, 22.4, 23.5, 24.0],
      precipitation_probability_max: [15, 10, 35, 75, 60, 5, 12],
      precipitation_sum: [0.0, 0.0, 1.2, 14.6, 8.4, 0.0, 0.2]
    }
  };
  activeWeatherData = mockData;
  renderWeatherData(mockData);
}

// Update location titles in Hero and Header
function updateLocationHeaders(cityName, stateName, cropFocus) {
  const heroLocEl = document.getElementById('hero-location-name');
  const heroSubLocEl = document.getElementById('hero-location-sub');
  const dashLocEl = document.getElementById('dashboard-location-title');

  if (heroLocEl) heroLocEl.textContent = cityName;
  if (heroSubLocEl) heroSubLocEl.textContent = `${stateName} • Focus: ${cropFocus}`;
  if (dashLocEl) dashLocEl.textContent = `${cityName}, ${stateName}`;
}

// Render complete weather datasets to the UI
function renderWeatherData(data) {
  const cur = data.current;
  const code = cur.weather_code || 0;
  const wmoMeta = WMO_CODES[code] || { label: "Fair", icon: "sun-cloud" };

  // Localized weather condition label and agro description
  const localizedLabel = (window.TRANSLATIONS && window.TRANSLATIONS[currentLanguage] && window.TRANSLATIONS[currentLanguage].wmoCodes && window.TRANSLATIONS[currentLanguage].wmoCodes[code])
    ? window.TRANSLATIONS[currentLanguage].wmoCodes[code]
    : wmoMeta.label;

  const localizedAgro = (window.TRANSLATIONS && window.TRANSLATIONS[currentLanguage] && window.TRANSLATIONS[currentLanguage].wmoAgro && window.TRANSLATIONS[currentLanguage].wmoAgro[code])
    ? window.TRANSLATIONS[currentLanguage].wmoAgro[code]
    : "Optimal solar radiation for photosynthesis and transplanting.";

  // 1. Hero Weather Card Elements
  const heroTemp = document.getElementById('hero-temp-val');
  const heroCond = document.getElementById('hero-cond-val');
  const heroIcon = document.getElementById('hero-weather-icon');
  const heroHumidity = document.getElementById('hero-metric-humidity');
  const heroWind = document.getElementById('hero-metric-wind');
  const heroRainProb = document.getElementById('hero-metric-rain');

  if (heroTemp) heroTemp.textContent = formatTemp(cur.temperature_2m);
  if (heroCond) heroCond.textContent = localizedLabel;
  if (heroIcon) heroIcon.innerHTML = getWeatherIconSvg(wmoMeta.icon, 46);
  if (heroHumidity) heroHumidity.textContent = `${Math.round(cur.relative_humidity_2m)}%`;
  if (heroWind) heroWind.textContent = `${Math.round(cur.wind_speed_10m)} km/h`;
  
  const todayRainProb = (data.daily && data.daily.precipitation_probability_max) ? data.daily.precipitation_probability_max[0] : 10;
  if (heroRainProb) heroRainProb.textContent = `${todayRainProb}%`;

  // 2. Dashboard Prominent Temperature Card
  const dashTemp = document.getElementById('dash-temp-val');
  const dashFeels = document.getElementById('dash-feels-like');
  const dashCondText = document.getElementById('dash-condition-text');
  const dashWeatherIcon = document.getElementById('dash-weather-icon');
  const dashAgroSuitability = document.getElementById('dash-agro-suitability');

  if (dashTemp) dashTemp.textContent = formatTemp(cur.temperature_2m);
  if (dashFeels) dashFeels.textContent = `${t('feelsLike')} ${formatTemp(cur.apparent_temperature)}`;
  if (dashCondText) dashCondText.textContent = localizedLabel;
  if (dashWeatherIcon) dashWeatherIcon.innerHTML = getWeatherIconSvg(wmoMeta.icon, 52);
  if (dashAgroSuitability) dashAgroSuitability.textContent = localizedAgro;

  // 3. Rainfall Card
  const rainAmountEl = document.getElementById('dash-rain-val');
  const rainProbEl = document.getElementById('dash-rain-prob');
  const rainBarEl = document.getElementById('dash-rain-bar');
  const rainSum = (data.daily && data.daily.precipitation_sum) ? data.daily.precipitation_sum[0] : (cur.precipitation || 0);

  if (rainAmountEl) rainAmountEl.textContent = `${rainSum.toFixed(1)}`;
  if (rainProbEl) rainProbEl.textContent = `${todayRainProb}%`;
  if (rainBarEl) rainBarEl.style.width = `${Math.min(100, Math.max(8, todayRainProb))}%`;

  // 4. Humidity Card
  const humValEl = document.getElementById('dash-humidity-val');
  const humBarEl = document.getElementById('dash-humidity-bar');
  const humStatusEl = document.getElementById('dash-humidity-status');
  const humVal = Math.round(cur.relative_humidity_2m);

  if (humValEl) humValEl.textContent = `${humVal}`;
  if (humBarEl) humBarEl.style.width = `${humVal}%`;
  if (humStatusEl) {
    if (humVal > 80) humStatusEl.textContent = t('humidityHigh');
    else if (humVal < 40) humStatusEl.textContent = t('humidityLow');
    else humStatusEl.textContent = t('humidityOptimal');
  }

  // 5. Dynamic Agro-Meteorological Weather Alert
  renderWeatherAlert(cur, todayRainProb, rainSum);

  // 6. 7-Day Forecast Cards
  render7DayForecast(data.daily);

  // 7. Weather Trend Chart
  renderChart(data);

  // 8. Farming Recommendation Cards
  renderFarmingAdvisories(cur, todayRainProb, rainSum);
}

// Generate Dynamic Weather Alert
function renderWeatherAlert(current, rainProb, rainSum) {
  const alertCard = document.getElementById('agro-weather-alert');
  const alertTitle = document.getElementById('alert-title');
  const alertDesc = document.getElementById('alert-desc');
  const alertTag = document.getElementById('alert-tag');

  if (!alertCard || !alertTitle || !alertDesc) return;

  if (rainProb >= 65 || rainSum >= 10) {
    alertCard.style.borderLeftColor = "#DC2626";
    alertTitle.innerHTML = `<span>${t('alertRainTitle')}</span>`;
    alertDesc.textContent = t('alertRainDesc');
    if (alertTag) alertTag.textContent = t('alertRainTag');
  } else if (current.relative_humidity_2m > 78 && current.temperature_2m >= 25) {
    alertCard.style.borderLeftColor = "#D97706";
    alertTitle.innerHTML = `<span>${t('alertPestTitle')}</span>`;
    alertDesc.textContent = t('alertPestDesc');
    if (alertTag) alertTag.textContent = t('alertPestTag');
  } else if (current.wind_speed_10m > 20) {
    alertCard.style.borderLeftColor = "#D97706";
    alertTitle.innerHTML = `<span>${t('alertWindTitle')}</span>`;
    alertDesc.textContent = t('alertWindDesc');
    if (alertTag) alertTag.textContent = t('alertWindTag');
  } else {
    alertCard.style.borderLeftColor = "#10B981";
    alertTitle.innerHTML = `<span>${t('alertOptimalTitle')}</span>`;
    alertDesc.textContent = t('alertOptimalDesc');
    if (alertTag) alertTag.textContent = t('alertOptimalTag');
  }
}

// Render 7-Day Forecast Grid
function render7DayForecast(daily) {
  const container = document.getElementById('forecast-cards-container');
  if (!container || !daily || !daily.time) return;

  container.innerHTML = '';
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = 0; i < Math.min(7, daily.time.length); i++) {
    const d = new Date(daily.time[i]);
    const dayName = i === 0 ? t('today') : daysOfWeek[d.getDay()];
    const dateStr = `${d.getDate()} ${months[d.getMonth()]}`;
    const code = daily.weather_code[i] || 0;
    const wmoMeta = WMO_CODES[code] || { label: "Fair", icon: "sun-cloud" };
    const maxT = daily.temperature_2m_max[i];
    const minT = daily.temperature_2m_min[i];
    const rainP = daily.precipitation_probability_max[i] || 0;

    // Agri Suitability Tag with localization
    let agriTag = t('tagGoodSowing');
    if (rainP > 60) agriTag = t('tagPauseSpray');
    else if (maxT > 34) agriTag = t('tagIrrigateEarly');
    else if (rainP < 15 && maxT < 32) agriTag = t('tagOptimalHarvest');
    else agriTag = t('tagFieldReady');

    const card = document.createElement('div');
    card.className = `forecast-day-card ${i === 0 ? 'active-day' : ''}`;
    card.innerHTML = `
      <div class="forecast-day-name">${dayName}</div>
      <div class="forecast-date">${dateStr}</div>
      <div class="forecast-icon-box">${getWeatherIconSvg(wmoMeta.icon, 34)}</div>
      <div class="forecast-temps">
        <span class="forecast-max-temp">${formatTemp(maxT)}</span>
        <span class="forecast-min-temp">${formatTemp(minT)}</span>
      </div>
      <div class="forecast-rain-prob">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        <span>${rainP}% ${t('rain')}</span>
      </div>
      <div class="forecast-farming-tag" title="${agriTag}">${agriTag}</div>
    `;
    container.appendChild(card);
  }
}

// Render Farming Recommendation Cards
function renderFarmingAdvisories(current, rainProb, rainSum) {
  // 1. Wheat Farming Card
  const wheatBadge = document.getElementById('advisory-wheat-badge');
  const wheatText = document.getElementById('advisory-wheat-text');
  const wheatParam = document.getElementById('advisory-wheat-param');
  const temp = current.temperature_2m;

  if (wheatBadge && wheatText && wheatParam) {
    if (temp >= 15 && temp <= 26) {
      wheatBadge.textContent = t('wheatOptimalBadge');
      wheatBadge.className = "advisory-status-badge badge-optimal";
      wheatText.textContent = t('wheatOptimalText');
      wheatParam.textContent = t('wheatTilleringFavorable');
    } else if (temp > 26) {
      wheatBadge.textContent = t('wheatStressBadge');
      wheatBadge.className = "advisory-status-badge badge-caution";
      wheatText.textContent = t('wheatStressText');
      wheatParam.textContent = t('wheatCoolingRecommended');
    } else {
      wheatBadge.textContent = t('wheatColdBadge');
      wheatBadge.className = "advisory-status-badge badge-favorable";
      wheatText.textContent = t('wheatColdText');
      wheatParam.textContent = t('wheatRootActive');
    }
  }

  // 2. Rice / Paddy Farming Card
  const riceBadge = document.getElementById('advisory-rice-badge');
  const riceText = document.getElementById('advisory-rice-text');
  const riceParam = document.getElementById('advisory-rice-param');

  if (riceBadge && riceText && riceParam) {
    if (rainProb > 60 || rainSum > 8) {
      riceBadge.textContent = t('riceRainBadge');
      riceBadge.className = "advisory-status-badge badge-action";
      riceText.textContent = t('riceRainText');
      riceParam.textContent = t('riceDepthRain');
    } else {
      riceBadge.textContent = t('riceOptimalBadge');
      riceBadge.className = "advisory-status-badge badge-optimal";
      riceText.textContent = t('riceOptimalText');
      riceParam.textContent = t('riceDepthStandard');
    }
  }

  // 3. Irrigation Card
  const irrBadge = document.getElementById('advisory-irr-badge');
  const irrText = document.getElementById('advisory-irr-text');
  const irrParam = document.getElementById('advisory-irr-param');

  if (irrBadge && irrText && irrParam) {
    if (rainProb >= 50) {
      irrBadge.textContent = t('irrPostponeBadge');
      irrBadge.className = "advisory-status-badge badge-action";
      irrText.textContent = t('irrPostponeText');
      irrParam.textContent = t('irrSavingsMsg');
    } else {
      irrBadge.textContent = t('irrDueBadge');
      irrBadge.className = "advisory-status-badge badge-optimal";
      irrText.textContent = t('irrDueText');
      irrParam.textContent = t('irrTimingMorning');
    }
  }

  // 4. Sowing Card
  const sowBadge = document.getElementById('advisory-sow-badge');
  const sowText = document.getElementById('advisory-sow-text');
  const sowParam = document.getElementById('advisory-sow-param');

  if (sowBadge && sowText && sowParam) {
    if (rainSum > 12) {
      sowBadge.textContent = t('sowDelayBadge');
      sowBadge.className = "advisory-status-badge badge-caution";
      sowText.textContent = t('sowDelayText');
      sowParam.textContent = t('sowSeedbedWet');
    } else {
      sowBadge.textContent = t('sowGoodBadge');
      sowBadge.className = "advisory-status-badge badge-optimal";
      sowText.textContent = t('sowGoodText');
      sowParam.textContent = t('sowSuitabilityHigh');
    }
  }

  // 5. Harvesting Card
  const harvBadge = document.getElementById('advisory-harv-badge');
  const harvText = document.getElementById('advisory-harv-text');
  const harvParam = document.getElementById('advisory-harv-param');

  if (harvBadge && harvText && harvParam) {
    if (rainProb > 40) {
      harvBadge.textContent = t('harvUnfavBadge');
      harvBadge.className = "advisory-status-badge badge-caution";
      harvText.textContent = t('harvUnfavText');
      harvParam.textContent = t('harvRiskModerate');
    } else {
      harvBadge.textContent = t('harvIdealBadge');
      harvBadge.className = "advisory-status-badge badge-optimal";
      harvText.textContent = t('harvIdealText');
      harvParam.textContent = t('harvTargetMoisture');
    }
  }

  // 6. Crop Protection Card
  const protBadge = document.getElementById('advisory-prot-badge');
  const protText = document.getElementById('advisory-prot-text');
  const protParam = document.getElementById('advisory-prot-param');

  if (protBadge && protText && protParam) {
    if (current.wind_speed_10m > 15 || rainProb > 30) {
      protBadge.textContent = t('protPauseBadge');
      protBadge.className = "advisory-status-badge badge-action";
      protText.textContent = t('protPauseText');
      protParam.textContent = t('protHazardElevated');
    } else {
      protBadge.textContent = t('protSafeBadge');
      protBadge.className = "advisory-status-badge badge-optimal";
      protText.textContent = t('protSafeText');
      protParam.textContent = t('protSprayEfficacyHigh');
    }
  }
}

// Render Interactive SVG / Canvas Weather Trend Chart
function renderChart(data) {
  const canvas = document.getElementById('weather-trend-chart');
  if (!canvas || !data || !data.daily || !data.daily.time) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.parentElement.clientWidth;
  const height = canvas.parentElement.clientHeight || 280;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, width, height);

  const days = data.daily.time.slice(0, 7);
  const paddingLeft = 45;
  const paddingRight = 25;
  const paddingTop = 30;
  const paddingBottom = 40;
  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (currentChartMode === 'temperature') {
    const maxVals = data.daily.temperature_2m_max.slice(0, 7).map(v => getTempNumber(v));
    const minVals = data.daily.temperature_2m_min.slice(0, 7).map(v => getTempNumber(v));
    const allVals = [...maxVals, ...minVals];
    const minBound = Math.floor(Math.min(...allVals) - 2);
    const maxBound = Math.ceil(Math.max(...allVals) + 2);
    const range = Math.max(1, maxBound - minBound);

    ctx.strokeStyle = 'rgba(45, 106, 79, 0.1)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    for (let i = 0; i <= 4; i++) {
      const yVal = minBound + (range / 4) * i;
      const yPos = paddingTop + plotHeight - (i / 4) * plotHeight;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, yPos);
      ctx.lineTo(width - paddingRight, yPos);
      ctx.stroke();

      ctx.fillStyle = '#4A6356';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.round(yVal)}°`, paddingLeft - 8, yPos + 4);
    }
    ctx.setLineDash([]);

    const stepX = plotWidth / (days.length - 1);
    const maxPoints = maxVals.map((val, idx) => ({
      x: paddingLeft + idx * stepX,
      y: paddingTop + plotHeight - ((val - minBound) / range) * plotHeight,
      val: val
    }));
    const minPoints = minVals.map((val, idx) => ({
      x: paddingLeft + idx * stepX,
      y: paddingTop + plotHeight - ((val - minBound) / range) * plotHeight,
      val: val
    }));

    const grad = ctx.createLinearGradient(0, paddingTop, 0, height - paddingBottom);
    grad.addColorStop(0, 'rgba(64, 145, 108, 0.35)');
    grad.addColorStop(1, 'rgba(64, 145, 108, 0.02)');

    ctx.beginPath();
    ctx.moveTo(maxPoints[0].x, maxPoints[0].y);
    for (let i = 1; i < maxPoints.length; i++) {
      const prev = maxPoints[i - 1];
      const curr = maxPoints[i];
      const cx = (prev.x + curr.x) / 2;
      ctx.bezierCurveTo(cx, prev.y, cx, curr.y, curr.x, curr.y);
    }
    ctx.lineTo(maxPoints[maxPoints.length - 1].x, height - paddingBottom);
    ctx.lineTo(maxPoints[0].x, height - paddingBottom);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(maxPoints[0].x, maxPoints[0].y);
    for (let i = 1; i < maxPoints.length; i++) {
      const prev = maxPoints[i - 1];
      const curr = maxPoints[i];
      const cx = (prev.x + curr.x) / 2;
      ctx.bezierCurveTo(cx, prev.y, cx, curr.y, curr.x, curr.y);
    }
    ctx.strokeStyle = '#2D6A4F';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(minPoints[0].x, minPoints[0].y);
    for (let i = 1; i < minPoints.length; i++) {
      const prev = minPoints[i - 1];
      const curr = minPoints[i];
      const cx = (prev.x + curr.x) / 2;
      ctx.bezierCurveTo(cx, prev.y, cx, curr.y, curr.x, curr.y);
    }
    ctx.strokeStyle = '#74C69D';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    maxPoints.forEach((pt, i) => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.strokeStyle = '#1B4332';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = '#1B4332';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${pt.val}°`, pt.x, pt.y - 8);

      const d = new Date(days[i]);
      ctx.fillStyle = '#4A6356';
      ctx.font = '11px sans-serif';
      ctx.fillText(i === 0 ? t('today') : daysOfWeek[d.getDay()], pt.x, height - paddingBottom + 18);
    });

  } else {
    const rainSums = data.daily.precipitation_sum.slice(0, 7);
    const maxRain = Math.max(15, Math.ceil(Math.max(...rainSums) * 1.3));

    ctx.strokeStyle = 'rgba(45, 106, 79, 0.1)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (let i = 0; i <= 3; i++) {
      const yVal = (maxRain / 3) * i;
      const yPos = paddingTop + plotHeight - (i / 3) * plotHeight;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, yPos);
      ctx.lineTo(width - paddingRight, yPos);
      ctx.stroke();

      ctx.fillStyle = '#4A6356';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${yVal.toFixed(0)} mm`, paddingLeft - 8, yPos + 4);
    }
    ctx.setLineDash([]);

    const barWidth = Math.min(36, (plotWidth / days.length) * 0.55);
    const stepX = plotWidth / days.length;

    rainSums.forEach((rain, i) => {
      const x = paddingLeft + i * stepX + (stepX - barWidth) / 2;
      const barH = (rain / maxRain) * plotHeight;
      const y = paddingTop + plotHeight - barH;

      const bGrad = ctx.createLinearGradient(0, y, 0, y + barH);
      bGrad.addColorStop(0, '#52B788');
      bGrad.addColorStop(1, '#2D6A4F');

      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, Math.max(4, barH), [6, 6, 0, 0]);
      ctx.fill();

      ctx.fillStyle = '#1B4332';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${rain.toFixed(1)}`, x + barWidth / 2, y - 6);

      const d = new Date(days[i]);
      ctx.fillStyle = '#4A6356';
      ctx.font = '11px sans-serif';
      ctx.fillText(i === 0 ? t('today') : daysOfWeek[d.getDay()], x + barWidth / 2, height - paddingBottom + 18);
    });
  }
}

// Window resize listener
window.addEventListener('resize', () => {
  if (activeWeatherData) {
    renderChart(activeWeatherData);
  }
});
