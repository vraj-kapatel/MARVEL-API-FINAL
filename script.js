import {
  autocompleteCharacters,
  getSession,
  searchCharacters,
  signOut,
} from "./supabase.js";

// ─── Auth check ───────────────────────────────────────────────
const authGate = document.getElementById("auth-gate");
const app = document.getElementById("app");

bootstrap();

async function bootstrap() {
  const { session } = await getSession();

  if (!session) {
    // Show login/register gate, hide app
    authGate.style.display = "block";
    app.style.display = "none";
  } else {
    // Hide gate, show app
    authGate.style.display = "none";
    app.style.display = "block";
    initApp(session);
  }
}

/* ---- Skipping auth ---- */
// import { signOut } from "./supabase.js";

// const authGate = document.getElementById("auth-gate");
// const app = document.getElementById("app");

// // TEMP: skip auth
// authGate.style.display = "none";
// app.style.display = "block";
// initApp();

// ─── Logout ───────────────────────────────────────────────────
document.getElementById("logout-btn").addEventListener("click", async () => {
  await signOut();
  app.style.display = "none";
  authGate.style.display = "block";
});

// ─── Main app logic ───────────────────────────────────────────
function initApp(session) {
  const input = document.getElementById("input-box");
  const button = document.getElementById("submit-button");
  const showContainer = document.getElementById("show-container");
  const listContainer = document.querySelector(".list");

  function displayWords(value) {
    input.value = value;
    listContainer.innerHTML = "";
  }
  window.displayWords = displayWords;

  // Autocomplete
  input.addEventListener("keyup", async () => {
    listContainer.innerHTML = "";
    if (input.value.length < 4) return;

    try {
      const characters = await autocompleteCharacters(input.value);
      if (!characters.length) return;

      characters.forEach((result) => {
        let name = result.name;
        let div = document.createElement("div");
        div.style.cursor = "pointer";
        div.classList.add("autocomplete-items");
        div.setAttribute(
          "onclick",
          "displayWords('" + name.replace(/'/g, "\\'") + "')",
        );
        let word = "<b>" + name.substr(0, input.value.length) + "</b>";
        word += name.substr(input.value.length);
        div.innerHTML = `<p class="item">${word}</p>`;
        listContainer.appendChild(div);
      });
    } catch (err) {
      console.error("Autocomplete error:", err);
    }
  });

  // Search
  async function getResult() {
    if (input.value.trim().length < 1) {
      alert("Input cannot be blank");
      return;
    }
    showContainer.innerHTML = "";

    try {
      const characters = await searchCharacters(input.value);

      if (characters.length === 0) {
        showContainer.innerHTML = `<p style="color:#a0a0a6; text-align:center;">No character found for "${input.value}"</p>`;
        return;
      }

      const element = characters[0];
      showContainer.innerHTML = `<div class="card-container">
        <div class="container-character-image">
        <img src="${element.thumbnail_url}"/></div>
        <div class="character-name">${element.name}</div>
        <div class="character-description">${element.description || "No description available."}</div>
        </div>`;
    } catch (err) {
      console.error("Search error:", err);
      showContainer.innerHTML = `<p style="color:#a0a0a6; text-align:center;">Failed to fetch</p>`;
    }
  }

  button.addEventListener("click", getResult);

  // Auto search on load
  getResult();
}
