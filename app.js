import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  runTransaction,
  get,
  set
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

/**
 * 1) Create a Firebase project
 * 2) Enable Anonymous auth
 * 3) Create a Realtime Database
 * 4) Paste your config below
 */
const firebaseConfig = {
  apiKey: "AIzaSyCMEBcxWjvvBe5YDL2oZ8hgIdfp3GsU_4o",
  authDomain: "mctigue-poll.firebaseapp.com",
  projectId: "mctigue-poll",
  storageBucket: "mctigue-poll.firebasestorage.app",
  messagingSenderId: "580730011665",
  appId: "1:580730011665:web:7e3c8adfbe1d596f9ab1b0",
  measurementId: "G-Q3Y6LHQHD9",
  databaseURL: "https://mctigue-poll-default-rtdb.firebaseio.com/"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// Poll location
const POLL_PATH = "polls/kevin/lookalike";
const pollRef = ref(db, POLL_PATH);

const els = {
  form: document.getElementById("pollForm"),
  voteBtn: document.getElementById("voteBtn"),
  status: document.getElementById("status"),
  totalVotes: document.getElementById("totalVotes"),
  counts: {
    hasselhoff: document.getElementById("count-hasselhoff"),
    chad: document.getElementById("count-chad"),
    ferrell: document.getElementById("count-ferrell"),
    trick: document.getElementById("count-trick"),
  },
  bars: {
    hasselhoff: document.getElementById("bar-hasselhoff"),
    chad: document.getElementById("bar-chad"),
    ferrell: document.getElementById("bar-ferrell"),
    trick: document.getElementById("bar-trick"),
  },
  kevinPhoto: document.getElementById("kevinPhoto"),
  kevinUrl: document.getElementById("kevinUrl"),
  setKevinUrl: document.getElementById("setKevinUrl"),
  pcts: {
    hasselhoff: document.getElementById("pct-hasselhoff"),
    chad: document.getElementById("pct-chad"),
    ferrell: document.getElementById("pct-ferrell"),
    trick: document.getElementById("pct-trick"),
  },
    shareUrl: document.getElementById("shareUrl"),
    copyShare: document.getElementById("copyShare"),
    nativeShare: document.getElementById("nativeShare"),
};

const VOTED_KEY = "mcteague_poll_voted_v1";
const KEVIN_URL_KEY = "mcteague_kevin_photo_url_v1";

function setStatus(msg, kind = "") {
  els.status.className = "status " + kind;
  els.status.textContent = msg || "";
}

function alreadyVoted() {
  return localStorage.getItem(VOTED_KEY) === "1";
}

function markVoted() {
  localStorage.setItem(VOTED_KEY, "1");
}

function safeNumber(x) {
  return typeof x === "number" && Number.isFinite(x) ? x : 0;
}

function renderResults(data) {
  const hasselhoff = safeNumber(data?.hasselhoff);
  const chad = safeNumber(data?.chad);
  const ferrell = safeNumber(data?.ferrell);
  const trick = safeNumber(data?.trick)
  const total = hasselhoff + chad + ferrell + trick;

  // counts
  els.counts.hasselhoff.textContent = String(hasselhoff);
  els.counts.chad.textContent = String(chad);
  els.counts.ferrell.textContent = String(ferrell);
  els.counts.trick.textContent = String(trick);
  els.totalVotes.textContent = String(total);

  // bars
    const pct = (n) => (total === 0 ? 0 : Math.round((n / total) * 100));

    const ph = pct(hasselhoff);
    const pc = pct(chad);
    const pf = pct(ferrell);
    const pt = pct(trick);

    els.bars.hasselhoff.style.width = ph + "%";
    els.bars.chad.style.width = pc + "%";
    els.bars.ferrell.style.width = pf + "%";
    els.bars.trick.style.width = pt + "%";

    els.pcts.hasselhoff.textContent = ph + "%";
    els.pcts.chad.textContent = pc + "%";
    els.pcts.ferrell.textContent = pf + "%";
    els.pcts.trick.textContent = pt + "%";

}

async function ensureInitialized() {
  const snap = await get(pollRef);
  if (!snap.exists()) {
    await set(pollRef, { hasselhoff: 0, chad: 0, ferrell: 0 });
  }
}

async function voteFor(choice) {
  const choiceRef = ref(db, `${POLL_PATH}/${choice}`);

  await runTransaction(choiceRef, (current) => {
    const n = safeNumber(current);
    return n + 1;
  });

  markVoted();
}

function loadKevinPhotoPreference() {
  const savedUrl = localStorage.getItem(KEVIN_URL_KEY);
  if (savedUrl) {
    els.kevinPhoto.src = savedUrl;
  }
}

function setupKevinPhotoControls() {
  loadKevinPhotoPreference();
  els.setKevinUrl.addEventListener("click", () => {
    const url = (els.kevinUrl.value || "").trim();
    if (!url) return;
    localStorage.setItem(KEVIN_URL_KEY, url);
    els.kevinPhoto.src = url;
    setStatus("Updated Kevin’s photo URL (saved locally).", "good");
  });

  // If ./public/kevin.jpg is missing, show a nicer fallback
  els.kevinPhoto.addEventListener("error", () => {
    els.kevinPhoto.src =
      "data:image/svg+xml;charset=utf-8," +
      encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="800">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#1b1f2a"/>
              <stop offset="1" stop-color="#0f1118"/>
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#g)"/>
          <circle cx="400" cy="320" r="120" fill="#232635"/>
          <rect x="220" y="460" width="360" height="220" rx="110" fill="#232635"/>
          <text x="50%" y="92%" dominant-baseline="middle" text-anchor="middle"
                fill="#8b90a1" font-family="system-ui, -apple-system, Segoe UI, Roboto"
                font-size="26">
            Add ./public/kevin.jpg or paste a URL
          </text>
        </svg>
      `);
  });
}

async function main() {
  // Sign in anonymously for basic rate-limiting in rules
  onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    await ensureInitialized();
    setStatus("");
  });

  try {
    await signInAnonymously(auth);
  } catch (e) {
    console.error(e);
    setStatus("Auth error. Check Firebase Anonymous Auth is enabled.", "bad");
  }

  // Live results subscription
  onValue(pollRef, (snap) => {
    renderResults(snap.val() || {});
  });

  // Vote handler
  els.form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setStatus("");

    if (alreadyVoted()) {
      setStatus("You already voted on this device.", "bad");
      return;
    }

    const formData = new FormData(els.form);
    const pick = formData.get("pick");
    if (!pick) return;

    els.voteBtn.disabled = true;
    try {
      await voteFor(pick);
      setStatus("Vote recorded. ✅", "good");
    } catch (err) {
      console.error(err);
      setStatus("Couldn’t submit vote. Check Firebase rules/config.", "bad");
    } finally {
      els.voteBtn.disabled = false;
    }
  });

  // Disable vote button if already voted
  if (alreadyVoted()) {
    setStatus("You already voted on this device.", "bad");
  }

  setupKevinPhotoControls();

  // Share link (uses current page URL)
const url = window.location.href;
if (els.shareUrl) els.shareUrl.textContent = url;

// Copy link button
els.copyShare?.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(url);
    setStatus("Link copied ✅", "good");
  } catch (e) {
    // fallback
    const ta = document.createElement("textarea");
    ta.value = url;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    setStatus("Link copied ✅", "good");
  }
});

// Native share (mobile + supported desktop)
els.nativeShare?.addEventListener("click", async () => {
  if (!navigator.share) {
    setStatus("Sharing not supported here — use Copy link.", "bad");
    return;
  }
  try {
    await navigator.share({
      title: "Who does Kevin McTeague look like?",
      text: "Vote in this live poll:",
      url
    });
  } catch (e) {
    // user cancelled is fine
  }
});

if (!navigator.share && els.nativeShare) els.nativeShare.style.display = "none";

}

main();
