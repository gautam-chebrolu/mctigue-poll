import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

/**
 * Firebase config (yours is already filled in)
 * NOTE: Keep databaseURL — RTDB needs it.
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

// LocalStorage keys
const VOTED_KEY = "mcteague_poll_voted_v1";
const KEVIN_URL_KEY = "mcteague_kevin_photo_url_v1";

// DOM
const els = {
  form: document.getElementById("pollForm"),
  voteBtn: document.getElementById("voteBtn"),
  status: document.getElementById("status"),
  totalVotes: document.getElementById("totalVotes"),

  counts: {
    hasselhoff: document.getElementById("count-hasselhoff"),
    chad: document.getElementById("count-chad"),
    ferrell: document.getElementById("count-ferrell"),
    trick: document.getElementById("count-trick")
  },

  bars: {
    hasselhoff: document.getElementById("bar-hasselhoff"),
    chad: document.getElementById("bar-chad"),
    ferrell: document.getElementById("bar-ferrell"),
    trick: document.getElementById("bar-trick")
  },

  pcts: {
    hasselhoff: document.getElementById("pct-hasselhoff"),
    chad: document.getElementById("pct-chad"),
    ferrell: document.getElementById("pct-ferrell"),
    trick: document.getElementById("pct-trick")
  },

  // Kevin photo controls (optional; your HTML currently comments these out)
  kevinPhoto: document.getElementById("kevinPhoto"),
  kevinUrl: document.getElementById("kevinUrl"),
  setKevinUrl: document.getElementById("setKevinUrl"),

  // Share UI
  shareUrl: document.getElementById("shareUrl"),
  copyShare: document.getElementById("copyShare"),
  nativeShare: document.getElementById("nativeShare")
};

function setStatus(msg, kind = "") {
  if (!els.status) return;
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
  const trick = safeNumber(data?.trick);

  const total = hasselhoff + chad + ferrell + trick;

  // counts
  if (els.counts.hasselhoff) els.counts.hasselhoff.textContent = String(hasselhoff);
  if (els.counts.chad) els.counts.chad.textContent = String(chad);
  if (els.counts.ferrell) els.counts.ferrell.textContent = String(ferrell);
  if (els.counts.trick) els.counts.trick.textContent = String(trick);
  if (els.totalVotes) els.totalVotes.textContent = String(total);

  const pct = (n) => (total === 0 ? 0 : Math.round((n / total) * 100));

  const ph = pct(hasselhoff);
  const pc = pct(chad);
  const pf = pct(ferrell);
  const pt = pct(trick);

  // bars widths
  if (els.bars.hasselhoff) els.bars.hasselhoff.style.width = ph + "%";
  if (els.bars.chad) els.bars.chad.style.width = pc + "%";
  if (els.bars.ferrell) els.bars.ferrell.style.width = pf + "%";
  if (els.bars.trick) els.bars.trick.style.width = pt + "%";

  // % labels
  if (els.pcts.hasselhoff) els.pcts.hasselhoff.textContent = ph + "%";
  if (els.pcts.chad) els.pcts.chad.textContent = pc + "%";
  if (els.pcts.ferrell) els.pcts.ferrell.textContent = pf + "%";
  if (els.pcts.trick) els.pcts.trick.textContent = pt + "%";
}

async function voteFor(choice) {
  const choiceRef = ref(db, `${POLL_PATH}/${choice}`);

  await runTransaction(choiceRef, (current) => {
    const n = safeNumber(current);
    return n + 1;
  });

  markVoted();
}

function setupKevinPhotoControls() {
  // If your HTML has no controls (currently commented out), do nothing.
  if (!els.kevinPhoto) return;

  // Load saved URL if present
  const savedUrl = localStorage.getItem(KEVIN_URL_KEY);
  if (savedUrl) els.kevinPhoto.src = savedUrl;

  // If controls exist, wire them
  els.setKevinUrl?.addEventListener("click", () => {
    const url = (els.kevinUrl?.value || "").trim();
    if (!url) return;
    localStorage.setItem(KEVIN_URL_KEY, url);
    els.kevinPhoto.src = url;
    setStatus("Updated Kevin’s photo URL (saved locally).", "good");
  });

  // Fallback if the image path is missing
  els.kevinPhoto.addEventListener("error", () => {
    els.kevinPhoto.src =
      "data:image/svg+xml;charset=utf-8," +
      encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="800">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#e5e7eb"/>
              <stop offset="1" stop-color="#f8fafc"/>
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#g)"/>
          <circle cx="400" cy="320" r="120" fill="#cbd5e1"/>
          <rect x="220" y="460" width="360" height="220" rx="110" fill="#cbd5e1"/>
          <text x="50%" y="92%" dominant-baseline="middle" text-anchor="middle"
                fill="#6b7280" font-family="system-ui, -apple-system, Segoe UI, Roboto"
                font-size="26">
            Add a valid Kevin photo path/URL
          </text>
        </svg>
      `);
  });
}

function setupShare() {
  // If share UI is missing, skip quietly
  if (!els.shareUrl || !els.copyShare || !els.nativeShare) {
    console.warn("Share UI missing. Check IDs: shareUrl, copyShare, nativeShare");
    return;
  }

  const url = window.location.href;
  els.shareUrl.textContent = url;

  // Copy link
  els.copyShare.addEventListener("click", async () => {
    try {
      // Clipboard API only works on https:// (or http://localhost)
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
        setStatus("Link copied ✅", "good");
      } else {
        // Universal fallback
        window.prompt("Copy this link:", url);
        setStatus("Copy the link from the prompt ✅", "good");
      }
    } catch (e) {
      console.error("Copy failed:", e);
      window.prompt("Copy this link:", url);
      setStatus("Copy the link from the prompt ✅", "good");
    }
  });

  // Native share
  els.nativeShare.addEventListener("click", async () => {
    try {
      if (!navigator.share) {
        window.prompt("Sharing not supported here. Copy this link:", url);
        setStatus("Sharing not supported — copy the link ✅", "good");
        return;
      }

      await navigator.share({
        title: "What is Kevin McTigue's true identity?",
        text: "Vote in this live poll:",
        url
      });

      // Some browsers return after share sheet closes
      setStatus("Share sheet opened ✅", "good");
    } catch (e) {
      // user cancel is normal; don’t show an error
      console.log("Share cancelled or failed:", e);
    }
  });

  // Optional: hide Share button on unsupported browsers
  if (!navigator.share) {
    els.nativeShare.style.display = "none";
  }
}

async function main() {
  // Auth state
  onAuthStateChanged(auth, (user) => {
    if (!user) return;
    // No initialization needed; transactions will create keys as votes come in
    setStatus("");
  });

  // Sign in
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
  if (els.form) {
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

      if (els.voteBtn) els.voteBtn.disabled = true;
      try {
        await voteFor(String(pick)); // hasselhoff | chad | ferrell | trick
        setStatus("Vote recorded. ✅", "good");
      } catch (err) {
        console.error(err);
        setStatus("Couldn’t submit vote. Check Firebase rules/config.", "bad");
      } finally {
        if (els.voteBtn) els.voteBtn.disabled = false;
      }
    });
  }

  // If already voted, show message (but still show live results)
  if (alreadyVoted()) {
    setStatus("You already voted on this device.", "bad");
  }

  setupKevinPhotoControls();
  setupShare();
}

main();
