import { getSession, signUpWithPassword } from "./supabase.js";

const form = document.getElementById("register-form");
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
  const confirmPassword = formData.get("confirm-password");

  if (password !== confirmPassword) {
    setMessage("Passwords do not match.");
    setLoading(false);
    return;
  }

  try {
    const { session } = await signUpWithPassword(email, password);

    if (session) {
      window.location.assign("./index.html");
      return;
    }

    setMessage("Account created. Log in to continue.", true);
  } catch (error) {
    setMessage(error.message);
  } finally {
    setLoading(false);
  }
});

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? "Creating..." : "Create Account";
}

function setMessage(text, isSuccess = false) {
  message.classList.toggle("success", isSuccess);
  message.textContent = text;
}

async function redirectIfSignedIn() {
  const { session } = await getSession();
  if (session) {
    window.location.assign("./index.html");
  }
}
