/* =====================================================
   app.js — MediCheck Application Logic
   Organised into sections:
   1.  App state & page list
   2.  Page navigation
   3.  Progress bar
   4.  Toast notifications
   5.  Theme toggle
   6.  Step 1 — Login / Sign Up
   7.  Step 2 — Personal Info
   8.  Step 3 — Symptoms
   9.  Step 4 — Description
   10. Step 5 — Test suggestions
   11. Step 6 — Hospital finder
   12. Step 7 — Star rating & review
   13. PDF report download
   14. Restart & auto-save
   15. App initialisation
   ===================================================== */


/* ===== 1. APP STATE & PAGE LIST ===== */

// All page IDs in order
const PAGES = [
  'page-login',
  'page-info',
  'page-quest',
  'page-desc',
  'page-tests',
  'page-hospitals',
  'page-review',
  'page-done'
];

// Tracks which page (index) is currently visible
let currentPage = 0;

// Whether the user is signing up (true) or signing in (false)
let isNewUser = false;

// OTP state for new account creation
let otpSent = false;
let otpCode  = '';

// User's chosen star rating
let userRating = 0;

// All the data collected during the flow
let state = {
  email:       '',
  name:        '',
  age:         '',
  gender:      '',
  phone:       '',
  city:        '',
  symptoms:    [],   // array of symptom labels selected by user
  stress:      3,
  other:       '',
  description: '',
  tests:       [],   // array of recommended test names
  rating:      0,
  feedback:    ''
};

// Hospital sorting preference
let currentSortKey  = 'rating';
let currentCity     = 'auto';
let currentHospitals = [];  // the currently displayed hospital list
let userLocation     = null; // { lat, lng } if geolocation was allowed


/* ===== 2. PAGE NAVIGATION ===== */

// Show a specific page by its ID; hide all others
function showPage(id) {
  PAGES.forEach(p => document.getElementById(p).classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
  renderProgress();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  saveToLocalStorage();

  // Trigger hospital setup when that page becomes visible
  if (id === 'page-hospitals') initHospitalPage();
}

// Navigate to a named page
function goTo(id) {
  currentPage = PAGES.indexOf(id);
  showPage(id);
}

// Go back one page
function goBack() {
  if (currentPage > 0) {
    currentPage--;
    showPage(PAGES[currentPage]);
  }
}


/* ===== 3. PROGRESS BAR ===== */

// Rebuild the row of coloured step dots and update the label
function renderProgress() {
  const stepsEl = document.getElementById('progress-steps');
  const labelEl = document.getElementById('progress-label');

  // Build one dot per page (skip the last "done" page)
  stepsEl.innerHTML = PAGES.slice(0, -1).map((_, i) => {
    let cls = '';
    if (i < currentPage)  cls = 'done';
    if (i === currentPage) cls = 'active';
    return `<div class="step-dot ${cls}"></div>`;
  }).join('');

  labelEl.textContent = `Step ${currentPage + 1} of ${PAGES.length}`;
}


/* ===== 4. TOAST NOTIFICATIONS ===== */

// Show a brief message at the bottom of the screen
function showToast(message, duration = 2800) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}


/* ===== 5. THEME TOGGLE ===== */

function toggleTheme() {
  document.documentElement.classList.toggle('dark');
  const btn = document.getElementById('theme-btn');
  const isDark = document.documentElement.classList.contains('dark');
  btn.textContent = isDark ? '☀ Light' : '🌙 Dark';
}


/* ===== 6. STEP 1 — LOGIN / SIGN UP ===== */

// Switch between "Sign in" and "Create account" modes
function toggleNewUser() {
  isNewUser = !isNewUser;
  document.getElementById('confirm-section').classList.toggle('hidden', !isNewUser);
  document.getElementById('otp-section').classList.toggle('hidden', !isNewUser);
  document.getElementById('toggle-user-btn').textContent = isNewUser
    ? 'Already have an account? Sign in'
    : 'New here? Create account';
  document.querySelector('#page-login h2').textContent = isNewUser
    ? 'Create account 🚀'
    : 'Welcome back 👋';
}

// Validate email format while the user types
function checkEmail() {
  const email  = document.getElementById('login-email').value;
  const errEl  = document.getElementById('login-email-err');
  const valid  = /^\S+@\S+\.\S+$/.test(email);
  if (email && !valid) {
    errEl.textContent = 'Please enter a valid email';
    errEl.classList.remove('hidden');
  } else {
    errEl.classList.add('hidden');
  }
}

// Generate and "send" a demo OTP
function sendOTP() {
  const email = document.getElementById('login-email').value;
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    showToast('⚠️ Enter a valid email first');
    return;
  }
  otpCode = String(Math.floor(100000 + Math.random() * 900000));
  otpSent = true;

  const msgEl = document.getElementById('otp-msg');
  msgEl.textContent = `✓ OTP sent to ${email} — (Demo OTP: ${otpCode})`;
  msgEl.classList.remove('hidden');
  document.getElementById('send-otp-btn').textContent = 'Resend';
  showToast('📧 OTP sent!');
}

// Handle the "Continue" button on the login page
function handleLogin() {
  const email    = document.getElementById('login-email').value;
  const password = document.getElementById('login-pass').value;
  const statusEl = document.getElementById('login-status');

  // Basic validation
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    statusEl.textContent = '⚠️ Enter a valid email';
    statusEl.classList.remove('hidden');
    return;
  }
  if (password.length < 6) {
    statusEl.textContent = '⚠️ Password must be at least 6 characters';
    statusEl.classList.remove('hidden');
    return;
  }

  // Extra checks for new accounts
  if (isNewUser) {
    const confirm = document.getElementById('login-pass2').value;
    if (password !== confirm) {
      statusEl.textContent = '⚠️ Passwords do not match';
      statusEl.classList.remove('hidden');
      return;
    }
    if (!otpSent) {
      statusEl.textContent = '⚠️ Please send and verify OTP first';
      statusEl.classList.remove('hidden');
      return;
    }
    const enteredOtp = document.getElementById('otp-input').value;
    if (enteredOtp !== otpCode) {
      statusEl.textContent = '⚠️ Invalid OTP code';
      statusEl.classList.remove('hidden');
      return;
    }
  }

  // All good — save email and go to profile page
  state.email = email;
  document.getElementById('p-email').value = email;
  statusEl.classList.add('hidden');
  showToast('✅ Logged in successfully!');
  currentPage = 1;
  showPage('page-info');
}


/* ===== 7. STEP 2 — PERSONAL INFO ===== */

function saveInfo() {
  const name   = document.getElementById('p-name').value.trim();
  const age    = document.getElementById('p-age').value;
  const gender = document.getElementById('p-gender').value;
  const phone  = document.getElementById('p-phone').value.trim();
  const city   = document.getElementById('p-city').value.trim();

  if (!name || !age || !gender || !phone || !city) {
    showToast('⚠️ Please fill in all fields');
    return;
  }

  state = { ...state, name, age, gender, phone, city };
  saveToLocalStorage();
  showToast('✅ Profile saved!');
  currentPage = 2;
  showPage('page-quest');
  buildSymptomList();
}


/* ===== 8. STEP 3 — SYMPTOMS ===== */

// All available symptoms
const SYMPTOM_OPTIONS = [
  { id: 'fever',    label: 'Fever',       emoji: '🌡️' },
  { id: 'headache', label: 'Headache',    emoji: '🤕' },
  { id: 'bodypain', label: 'Body Pain',   emoji: '💪' },
  { id: 'bp',       label: 'BP Issues',   emoji: '🩺' },
  { id: 'diabetes', label: 'Diabetes',    emoji: '🍬' },
  { id: 'fatigue',  label: 'Fatigue',     emoji: '😴' },
  { id: 'sleep',    label: 'Sleep Issues',emoji: '🛌' },
  { id: 'chest',    label: 'Chest Pain',  emoji: '💔' },
  { id: 'cough',    label: 'Cough',       emoji: '😷' },
  { id: 'nausea',   label: 'Nausea',      emoji: '🤢' },
];

// Build the symptom checklist HTML
function buildSymptomList() {
  const listEl = document.getElementById('symptom-list');
  listEl.innerHTML = SYMPTOM_OPTIONS.map(s => `
    <div class="check-row" id="row-${s.id}" onclick="toggleSymptom('${s.id}')">
      <span class="emoji">${s.emoji}</span>
      <span>${s.label}</span>
      <input type="checkbox" id="sym-${s.id}" style="width:18px; height:18px; pointer-events:none;"/>
    </div>
  `).join('');
}

// Toggle a symptom checkbox when its row is clicked
function toggleSymptom(id) {
  const checkbox = document.getElementById('sym-' + id);
  const row      = document.getElementById('row-' + id);
  checkbox.checked = !checkbox.checked;
  row.classList.toggle('selected', checkbox.checked);
}

// Collect selected symptoms and move on
function saveSymptoms() {
  state.symptoms = SYMPTOM_OPTIONS
    .filter(s => document.getElementById('sym-' + s.id)?.checked)
    .map(s => s.label);

  state.stress = document.getElementById('stress').value;
  state.other  = document.getElementById('other-symptoms').value;

  saveToLocalStorage();
  currentPage = 3;
  showPage('page-desc');
}


/* ===== 9. STEP 4 — DESCRIPTION ===== */

function saveDesc() {
  const desc = document.getElementById('desc-text').value.trim();
  if (!desc) {
    showToast('⚠️ Please describe your symptoms');
    return;
  }
  state.description = desc;
  saveToLocalStorage();
  suggestTests();
  currentPage = 4;
  showPage('page-tests');
}


/* ===== 10. STEP 5 — TEST SUGGESTIONS ===== */

// All tests with the symptom keywords that trigger them
const ALL_TESTS = [
  { id: 'cbc',     name: 'CBC Test',          icon: '🩸', desc: 'Complete Blood Count',      keywords: ['fever', 'fatigue', 'body pain', 'cough'] },
  { id: 'thyroid', name: 'Thyroid Panel',      icon: '🦋', desc: 'TSH, T3, T4 levels',        keywords: ['fatigue', 'sleep', 'weight'] },
  { id: 'bp',      name: 'BP Check',           icon: '💓', desc: 'Blood Pressure',             keywords: ['bp', 'chest', 'headache'] },
  { id: 'sugar',   name: 'Sugar Test',         icon: '🍭', desc: 'Fasting Blood Glucose',      keywords: ['diabetes', 'fatigue', 'nausea'] },
  { id: 'ecg',     name: 'ECG',                icon: '📈', desc: 'Heart Activity',             keywords: ['chest', 'bp', 'fatigue'] },
  { id: 'xray',    name: 'X-Ray',              icon: '🦴', desc: 'Bone & Chest Imaging',       keywords: ['chest', 'body pain', 'cough'] },
  { id: 'mri',     name: 'MRI Scan',           icon: '🧲', desc: 'Detailed Imaging',           keywords: ['headache', 'body pain', 'stress'] },
  { id: 'urine',   name: 'Urine Analysis',     icon: '💧', desc: 'Kidney & UTI check',         keywords: ['fever', 'fatigue', 'nausea'] },
  { id: 'liver',   name: 'Liver Panel',        icon: '🫀', desc: 'Liver function tests',       keywords: ['fatigue', 'nausea', 'fever'] },
  { id: 'vitamin', name: 'Vitamin D & B12',    icon: '🌞', desc: 'Deficiency check',           keywords: ['fatigue', 'body pain', 'sleep'] },
];

// Match tests to the user's selected symptoms and description text
function suggestTests() {
  const symptomsLower = state.symptoms.map(s => s.toLowerCase());
  const descLower     = state.description.toLowerCase();

  const matched = ALL_TESTS.filter(test =>
    test.keywords.some(keyword =>
      symptomsLower.some(s => s.includes(keyword)) || descLower.includes(keyword)
    )
  );

  // Fall back to first 4 tests if nothing matched
  const testsToShow = matched.length ? matched : ALL_TESTS.slice(0, 4);
  state.tests = testsToShow.map(t => t.name);

  // Render test cards
  document.getElementById('test-grid-container').innerHTML = testsToShow.map(t => `
    <div class="test-card">
      <div class="test-icon">${t.icon}</div>
      <div class="test-name">${t.name}</div>
      <div class="test-desc">${t.desc}</div>
    </div>
  `).join('');
}


/* ===== 11. STEP 6 — HOSPITAL FINDER ===== */

// Hospital data for 12 Indian cities
const HOSPITALS = {
  mumbai: [
    { name: 'Apollo Hospitals',        rating: 4.8, reviews: 2340, cost: 1200, phone: '+91-22-4234 3434', address: 'Tardeo, Mumbai',         lat: 18.9647, lng: 72.8258 },
    { name: 'Lilavati Hospital',        rating: 4.6, reviews: 1820, cost: 800,  phone: '+91-22-2675 1000', address: 'Bandra, Mumbai',         lat: 19.0547, lng: 72.8278 },
    { name: 'Kokilaben Hospital',       rating: 4.7, reviews: 2100, cost: 1500, phone: '+91-22-3066 9999', address: 'Andheri, Mumbai',        lat: 19.1245, lng: 72.8325 },
    { name: 'Fortis Hospital Mulund',   rating: 4.5, reviews: 1650, cost: 950,  phone: '+91-22-6127 0000', address: 'Mulund, Mumbai',         lat: 19.1714, lng: 72.9561 },
    { name: 'Hiranandani Hospital',     rating: 4.4, reviews: 1390, cost: 700,  phone: '+91-22-2576 3300', address: 'Powai, Mumbai',          lat: 19.1200, lng: 72.9069 },
    { name: 'Breach Candy Hospital',    rating: 4.9, reviews: 890,  cost: 2000, phone: '+91-22-2367 2888', address: 'Breach Candy, Mumbai',   lat: 18.9700, lng: 72.8079 },
  ],
  pune: [
    { name: 'Ruby Hall Clinic',          rating: 4.7, reviews: 2200, cost: 1100, phone: '+91-20-6645 5555', address: 'Sassoon Road, Pune',    lat: 18.5245, lng: 73.8672 },
    { name: 'Jehangir Hospital',         rating: 4.6, reviews: 1900, cost: 1000, phone: '+91-20-6681 5000', address: 'Sassoon Road, Pune',    lat: 18.5195, lng: 73.8710 },
    { name: 'Deenanath Mangeshkar',      rating: 4.8, reviews: 2100, cost: 900,  phone: '+91-20-4015 1000', address: 'Erandwane, Pune',       lat: 18.5089, lng: 73.8272 },
    { name: 'Sahyadri Hospital',         rating: 4.5, reviews: 1600, cost: 850,  phone: '+91-20-6721 3000', address: 'Deccan, Pune',          lat: 18.5186, lng: 73.8394 },
  ],
  nagpur: [
    { name: 'KIMS Kingsway Hospital',    rating: 4.6, reviews: 1800, cost: 900,  phone: '+91-712-660 0600', address: 'Nagpur',                lat: 21.1458, lng: 79.0882 },
    { name: 'Orange City Hospital',      rating: 4.5, reviews: 1500, cost: 800,  phone: '+91-712-272 7272', address: 'Nagpur',                lat: 21.1498, lng: 79.0786 },
    { name: 'Alexis Multispecialty',     rating: 4.4, reviews: 1200, cost: 750,  phone: '+91-712-301 1111', address: 'Nagpur',                lat: 21.1260, lng: 79.0724 },
  ],
  nashik: [
    { name: 'Wockhardt Hospital Nashik', rating: 4.5, reviews: 1100, cost: 850,  phone: '+91-253-660 3222', address: 'Nashik',                lat: 19.9975, lng: 73.7898 },
    { name: 'Ratnadeep Hospital',        rating: 4.4, reviews: 900,  cost: 700,  phone: '+91-253-231 6644', address: 'Nashik',                lat: 19.9890, lng: 73.7772 },
    { name: 'Ashoka Medicover Hospital', rating: 4.5, reviews: 1000, cost: 900,  phone: '+91-253-660 7700', address: 'Nashik',                lat: 20.0112, lng: 73.7843 },
  ],
  bangalore: [
    { name: 'Manipal Hospital',          rating: 4.7, reviews: 3200, cost: 1300, phone: '+91-80-2502 4444', address: 'HAL Airport Road, Bangalore', lat: 12.9620, lng: 77.6450 },
    { name: 'Apollo Bannerghatta',       rating: 4.6, reviews: 2800, cost: 1200, phone: '+91-80-2630 4050', address: 'Bannerghatta, Bangalore',     lat: 12.8993, lng: 77.5978 },
    { name: 'Narayana Health City',      rating: 4.8, reviews: 3500, cost: 1000, phone: '+91-80-7122 2200', address: 'Bommasandra, Bangalore',      lat: 12.8273, lng: 77.6785 },
    { name: 'Fortis Hospital Bangalore', rating: 4.5, reviews: 2400, cost: 1100, phone: '+91-80-6621 4444', address: 'Cunningham Road, Bangalore',  lat: 12.9873, lng: 77.5987 },
  ],
  delhi: [
    { name: 'AIIMS Delhi',               rating: 4.9, reviews: 8500, cost: 200,  phone: '+91-11-2659 3788', address: 'Ansari Nagar, New Delhi',    lat: 28.5665, lng: 77.2100 },
    { name: 'Max Super Speciality',      rating: 4.7, reviews: 4100, cost: 1500, phone: '+91-11-2651 5050', address: 'Saket, New Delhi',           lat: 28.5244, lng: 77.2090 },
    { name: 'Apollo Hospital Delhi',     rating: 4.6, reviews: 3600, cost: 1400, phone: '+91-11-2692 5858', address: 'Sarita Vihar, New Delhi',    lat: 28.5346, lng: 77.2947 },
    { name: 'Sir Ganga Ram Hospital',    rating: 4.7, reviews: 3800, cost: 1300, phone: '+91-11-2575 0000', address: 'Rajinder Nagar, New Delhi',  lat: 28.6380, lng: 77.1907 },
    { name: 'Safdarjung Hospital',       rating: 4.4, reviews: 5200, cost: 100,  phone: '+91-11-2616 5060', address: 'Ansari Nagar, New Delhi',    lat: 28.5682, lng: 77.2009 },
  ],
  kolkata: [
    { name: 'AMRI Hospitals',            rating: 4.6, reviews: 2400, cost: 1000, phone: '+91-33-6680 0000', address: 'Salt Lake, Kolkata',         lat: 22.5726, lng: 88.4117 },
    { name: 'Apollo Gleneagles',         rating: 4.7, reviews: 2800, cost: 1300, phone: '+91-33-2320 3040', address: 'Canal Circular Rd, Kolkata', lat: 22.5458, lng: 88.3832 },
    { name: 'Medica Superspecialty',     rating: 4.5, reviews: 1900, cost: 950,  phone: '+91-33-6652 0000', address: 'Mukundapur, Kolkata',        lat: 22.5008, lng: 88.3848 },
  ],
  hyderabad: [
    { name: 'Apollo Hyderabad',          rating: 4.8, reviews: 4200, cost: 1500, phone: '+91-40-2360 7777', address: 'Jubilee Hills, Hyderabad',   lat: 17.4234, lng: 78.4074 },
    { name: 'Yashoda Hospital',          rating: 4.6, reviews: 3100, cost: 1100, phone: '+91-40-4567 4567', address: 'Somajiguda, Hyderabad',      lat: 17.4333, lng: 78.4552 },
    { name: 'AIG Hospitals',             rating: 4.8, reviews: 2900, cost: 1300, phone: '+91-40-4244 2222', address: 'Gachibowli, Hyderabad',      lat: 17.4291, lng: 78.3578 },
  ],
  chennai: [
    { name: 'Apollo Chennai',            rating: 4.8, reviews: 5100, cost: 1600, phone: '+91-44-2829 0200', address: 'Greams Road, Chennai',       lat: 13.0595, lng: 80.2490 },
    { name: 'Fortis Malar Hospital',     rating: 4.6, reviews: 2700, cost: 1200, phone: '+91-44-4289 2222', address: 'Adyar, Chennai',             lat: 13.0042, lng: 80.2543 },
    { name: 'MIOT International',        rating: 4.7, reviews: 3200, cost: 1400, phone: '+91-44-4200 2288', address: 'Manapakkam, Chennai',        lat: 13.0202, lng: 80.1765 },
  ],
  ahmedabad: [
    { name: 'Apollo Ahmedabad',          rating: 4.7, reviews: 2900, cost: 1300, phone: '+91-79-6670 1800', address: 'Bhat, Ahmedabad',            lat: 23.0880, lng: 72.5070 },
    { name: 'Zydus Hospital',            rating: 4.8, reviews: 3400, cost: 1400, phone: '+91-79-6619 0200', address: 'Thaltej, Ahmedabad',         lat: 23.0560, lng: 72.5060 },
    { name: 'Sterling Hospital',         rating: 4.5, reviews: 2200, cost: 1000, phone: '+91-79-4000 6000', address: 'Gurukul, Ahmedabad',         lat: 23.0445, lng: 72.5552 },
  ],
  surat: [
    { name: 'Kiran Hospital',            rating: 4.6, reviews: 1800, cost: 900,  phone: '+91-261-422 7000', address: 'Majura Gate, Surat',         lat: 21.1944, lng: 72.8245 },
    { name: 'Sunshine Global Hospital',  rating: 4.7, reviews: 2100, cost: 1100, phone: '+91-261-403 6100', address: 'Vadodara Highway, Surat',    lat: 21.2097, lng: 72.8411 },
    { name: 'Nirali Hospital',           rating: 4.5, reviews: 1400, cost: 800,  phone: '+91-261-273 5555', address: 'Athwa Gate, Surat',          lat: 21.1702, lng: 72.8312 },
  ],
  jaipur: [
    { name: 'Fortis Escorts Jaipur',     rating: 4.7, reviews: 2600, cost: 1200, phone: '+91-141-254 7000', address: 'JLN Marg, Jaipur',           lat: 26.8994, lng: 75.8201 },
    { name: 'Narayana Multispeciality',  rating: 4.6, reviews: 2100, cost: 950,  phone: '+91-141-477 3838', address: 'Sector 28, Jaipur',          lat: 26.9200, lng: 75.8000 },
    { name: 'Eternal Hospital',          rating: 4.6, reviews: 1700, cost: 1000, phone: '+91-141-310 0000', address: 'Jagatpura, Jaipur',          lat: 26.8271, lng: 75.8574 },
  ],
};

// Approximate centre coordinates for each city (used for nearest-city detection)
const CITY_CENTRES = {
  mumbai:    { lat: 19.0760, lng: 72.8777 },
  pune:      { lat: 18.5204, lng: 73.8567 },
  nagpur:    { lat: 21.1458, lng: 79.0882 },
  nashik:    { lat: 19.9975, lng: 73.7898 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  delhi:     { lat: 28.6139, lng: 77.2090 },
  kolkata:   { lat: 22.5726, lng: 88.3639 },
  hyderabad: { lat: 17.3850, lng: 78.4867 },
  chennai:   { lat: 13.0827, lng: 80.2707 },
  ahmedabad: { lat: 23.0225, lng: 72.5714 },
  surat:     { lat: 21.1702, lng: 72.8311 },
  jaipur:    { lat: 26.9124, lng: 75.7873 },
};

// Straight-line distance between two lat/lng points in kilometres
function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Called when the hospital page first loads
function initHospitalPage() {
  buildCityTabs();
  detectNearestCity();
}

// Build the city filter pill buttons
function buildCityTabs() {
  const tabsEl = document.getElementById('city-tabs');
  const cities = Object.keys(HOSPITALS);

  tabsEl.innerHTML =
    `<button class="city-tab ${currentCity === 'auto' ? 'active' : ''}" onclick="selectCity('auto', this)">📍 Auto-detect</button>` +
    cities.map(c =>
      `<button class="city-tab ${currentCity === c ? 'active' : ''}" onclick="selectCity('${c}', this)">${capitalise(c)}</button>`
    ).join('');
}

function capitalise(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// When user clicks a city tab
function selectCity(city, btn) {
  currentCity = city;
  document.querySelectorAll('.city-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  if (city === 'auto') {
    detectNearestCity();
  } else {
    document.getElementById('nearest-banner').classList.add('hidden');
    currentHospitals = [...HOSPITALS[city]];
    sortAndRender();
  }
}

// Try to get the user's location; fall back to their profile city
function detectNearestCity() {
  if (!navigator.geolocation) {
    showToast('⚠️ Geolocation not supported');
    fallbackToProfileCity();
    return;
  }

  showToast('📍 Detecting your location...', 3000);

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };

      // Find the closest city centre
      let nearestCity = null;
      let minDist = Infinity;
      Object.entries(CITY_CENTRES).forEach(([city, coords]) => {
        const dist = getDistanceKm(userLocation.lat, userLocation.lng, coords.lat, coords.lng);
        if (dist < minDist) { minDist = dist; nearestCity = city; }
      });

      // Add distance-from-user to each hospital in that city and sort nearest first
      currentHospitals = HOSPITALS[nearestCity].map(h => ({
        ...h,
        _dist: getDistanceKm(userLocation.lat, userLocation.lng, h.lat, h.lng)
      })).sort((a, b) => a._dist - b._dist);

      const banner = document.getElementById('nearest-banner');
      banner.textContent = `📍 Nearest hospitals — ${capitalise(nearestCity)} (${Math.round(minDist)} km from you)`;
      banner.classList.remove('hidden');

      renderHospitals();
      showToast(`✅ Showing hospitals in ${capitalise(nearestCity)}!`);
    },
    () => {
      showToast('⚠️ Location denied — using your profile city');
      fallbackToProfileCity();
    }
  );
}

// If geolocation is unavailable, guess city from profile
function fallbackToProfileCity() {
  const cityLower = (state.city || '').toLowerCase();
  const matched   = Object.keys(HOSPITALS).find(c => cityLower.includes(c));
  currentHospitals = matched
    ? [...HOSPITALS[matched]]
    : Object.values(HOSPITALS).flat();
  sortAndRender();
}

// Sort currentHospitals by the chosen key and re-render
function sortAndRender() {
  if (currentSortKey === 'rating')  currentHospitals.sort((a, b) => b.rating  - a.rating);
  if (currentSortKey === 'cost')    currentHospitals.sort((a, b) => a.cost    - b.cost);
  if (currentSortKey === 'reviews') currentHospitals.sort((a, b) => b.reviews - a.reviews);
  renderHospitals();
}

// Called when a sort button is clicked
function sortHospitals(key, btn) {
  currentSortKey = key;
  document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  sortAndRender();
}

// Render hospital cards into the list
function renderHospitals() {
  const listEl = document.getElementById('hospital-list');

  listEl.innerHTML = currentHospitals.map(h => {
    const filledStars = '★'.repeat(Math.round(h.rating));
    const emptyStars  = '☆'.repeat(5 - Math.round(h.rating));
    const mapsUrl     = `https://www.google.com/maps/search/?api=1&query=${h.lat},${h.lng}`;
    const costClass   = h.cost < 1000 ? 'badge-green' : 'badge-warn';
    const distText    = h._dist ? `<span>🚗 ${h._dist < 1 ? '<1' : Math.round(h._dist)} km away</span>` : '';

    return `
      <div class="hospital-card">
        <div class="hosp-top">
          <div>
            <div class="hosp-name">${h.name}</div>
            <div class="stars">${filledStars}${emptyStars}
              <span style="color:var(--text2); font-size:12px;"> ${h.rating} · ${h.reviews.toLocaleString()} reviews</span>
            </div>
          </div>
          <span class="badge ${costClass}">₹${h.cost}</span>
        </div>
        <div class="hosp-meta">
          <span>📞 ${h.phone}</span>
          <span>📍 ${h.address}</span>
          ${distText}
        </div>
        <a class="btn-map" href="${mapsUrl}" target="_blank">🗺 Open in Maps</a>
      </div>
    `;
  }).join('');
}


/* ===== 12. STEP 7 — STAR RATING & REVIEW ===== */

function rate(n) {
  userRating = n;
  state.rating = n;
  document.querySelectorAll('.star-btn').forEach((btn, i) => {
    btn.textContent = i < n ? '★' : '☆';
    btn.classList.toggle('lit', i < n);
  });
}

function submitReview() {
  if (!userRating) {
    showToast('⚠️ Please rate your experience');
    return;
  }
  state.feedback = document.getElementById('feedback-text').value;
  saveToLocalStorage();
  showToast('🎉 Thank you for your feedback!');
  currentPage = 7;
  showPage('page-done');
}


/* ===== 13. PDF REPORT DOWNLOAD ===== */

function downloadReport() {
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const pageW = 210, margin = 20, contentW = pageW - margin * 2;
    let y = margin;

    // Blue header bar
    doc.setFillColor(21, 101, 192);
    doc.rect(0, 0, pageW, 38, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('MediCheck', margin, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Health Report', margin, 28);
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, pageW - margin, 28, { align: 'right' });

    y = 50;

    // Helper: draw a section heading
    function sectionHeading(title) {
      doc.setFillColor(240, 244, 249);
      doc.roundedRect(margin, y, contentW, 7, 2, 2, 'F');
      doc.setTextColor(21, 101, 192);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(title, margin + 4, y + 5);
      y += 13;
    }

    // Helper: draw a label + value row
    function row(label, value) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(74, 98, 116);
      doc.text(label + ':', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(26, 43, 64);
      const lines = doc.splitTextToSize(String(value), contentW - 45);
      doc.text(lines, margin + 45, y);
      y += 7 * lines.length;
    }

    // Personal info section
    sectionHeading('PERSONAL INFORMATION');
    row('Full Name', state.name  || '—');
    row('Age',       state.age   ? state.age + ' years' : '—');
    row('Gender',    state.gender || '—');
    row('Phone',     state.phone  || '—');
    row('City',      state.city   || '—');
    row('Email',     state.email  || '—');

    y += 4;

    // Symptoms section
    sectionHeading('SYMPTOMS & HEALTH DATA');
    row('Symptoms',    state.symptoms.join(', ') || 'None selected');
    row('Stress Level', `${state.stress}/10`);
    if (state.other) row('Other', state.other);

    y += 4;

    // Description section
    sectionHeading('SYMPTOM DESCRIPTION');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(26, 43, 64);
    const descLines = doc.splitTextToSize(state.description || 'No description provided.', contentW);
    doc.text(descLines, margin, y);
    y += 7 * descLines.length + 4;

    // Recommended tests section
    sectionHeading('RECOMMENDED TESTS');
    const testsToList = state.tests.length ? state.tests : ['No tests suggested.'];
    testsToList.forEach((test, i) => {
      doc.setFillColor(232, 240, 250);
      doc.roundedRect(margin, y - 4, contentW, 8, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(21, 101, 192);
      doc.text(`${i + 1}.`, margin + 2, y + 1);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(26, 43, 64);
      doc.text(test, margin + 10, y + 1);
      y += 10;
    });

    y += 4;
    if (y > 260) { doc.addPage(); y = margin; }

    // Feedback section
    sectionHeading('USER FEEDBACK');
    row('Rating',   `${state.rating}/5 ${'★'.repeat(state.rating)}`);
    if (state.feedback) row('Feedback', state.feedback);

    // Disclaimer footer
    doc.setFillColor(230, 81, 0);
    doc.rect(0, 283, pageW, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text(
      '⚠ DISCLAIMER: This report is AI-assisted and does not constitute medical advice. Always consult a registered physician.',
      pageW / 2, 289, { align: 'center' }
    );

    doc.save('medicheck_health_report.pdf');
    showToast('📥 PDF downloaded!');

  } catch (err) {
    // Fallback: plain text file
    console.error('PDF error:', err);
    const lines = [
      '=== MediCheck Health Report ===',
      `Name: ${state.name}`,    `Age: ${state.age}`,
      `Gender: ${state.gender}`, `Phone: ${state.phone}`,
      `City: ${state.city}`,    `Email: ${state.email}`,
      '',
      `Symptoms: ${state.symptoms.join(', ') || 'None'}`,
      `Stress: ${state.stress}/10`, `Other: ${state.other || '—'}`,
      '',
      `Description: ${state.description}`,
      '',
      `Tests: ${state.tests.join(', ')}`,
      '',
      `Rating: ${state.rating}/5`, `Feedback: ${state.feedback || '—'}`,
      '',
      `Generated: ${new Date().toLocaleString()}`
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'medicheck_report.txt';
    a.click();
    showToast('📥 Report downloaded (text)!');
  }
}


/* ===== 14. RESTART & AUTO-SAVE ===== */

// Save current state to localStorage so progress survives a page refresh
function saveToLocalStorage() {
  localStorage.setItem('hc_state',   JSON.stringify(state));
  localStorage.setItem('hc_page',    currentPage);
}

// Restore saved state on page load
function loadFromLocalStorage() {
  try {
    const savedState = localStorage.getItem('hc_state');
    const savedPage  = localStorage.getItem('hc_page');
    if (savedState) {
      state = { ...state, ...JSON.parse(savedState) };
      showToast('💾 Progress restored!');
    }
    if (savedPage && parseInt(savedPage) > 0) {
      currentPage = parseInt(savedPage);
      renderProgress();
      showPage(PAGES[currentPage]);
    }
  } catch (e) {
    // If storage is corrupt, just ignore it
  }
}

// Clear everything and go back to the login page
function restart() {
  localStorage.removeItem('hc_state');
  localStorage.removeItem('hc_page');
  state = {
    email: '', name: '', age: '', gender: '', phone: '', city: '',
    symptoms: [], stress: 3, other: '', description: '',
    tests: [], rating: 0, feedback: ''
  };
  currentPage = 0;
  showPage('page-login');
}

// Auto-save every 10 seconds (captures any unsaved textarea changes)
setInterval(() => {
  if (currentPage > 0) {
    state.description = document.getElementById('desc-text')?.value     || state.description;
    state.other       = document.getElementById('other-symptoms')?.value || state.other;
    saveToLocalStorage();
  }
}, 10000);


/* ===== 15. APP INITIALISATION ===== */

// Character counter for the description textarea
document.getElementById('desc-text').addEventListener('input', function () {
  const len = this.value.length;
  document.getElementById('desc-char').textContent = `${Math.min(len, 500)} / 500`;
  if (len > 500) this.value = this.value.slice(0, 500);
});

// Kick everything off
renderProgress();
loadFromLocalStorage();
