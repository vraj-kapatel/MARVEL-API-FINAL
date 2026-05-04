import { getSession, signInWithPassword } from "./supabase.js";

const form = document.getElementById("login-form");
const message = document.getElementById("auth-message");
const submitButton = form.querySelector("button[type='submit']");

redirectIfSignedIn();

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setLoading(true);
  setMessage("");

  const formData = new FormData(form);
  const email = formData.get("email").trim();
  const password = formData.get("password");

  try {
    await signInWithPassword(email, password);
    window.location.assign("./index.html");
  } catch (error) {
    setMessage(error.message);
  } finally {
    setLoading(false);
  }
});

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? "Logging In..." : "Log In";
}

function setMessage(text) {
  message.classList.remove("success");
  message.textContent = text;
}

async function redirectIfSignedIn() {
  const { session } = await getSession();
  if (session) {
    window.location.assign("./index.html");
  }
}
