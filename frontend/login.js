const API_BASE_URL = window.APP_CONFIG?.API_BASE_URL || "http://127.0.0.1:5000";

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const recoverForm = document.getElementById("recoverForm");
const authEyebrow = document.getElementById("authEyebrow");
const authTitle = document.getElementById("authTitle");
const authSubtitle = document.getElementById("authSubtitle");
const authMessage = document.getElementById("authMessage");
const tabs = document.querySelectorAll(".tab");
const recoverEmail = document.getElementById("recoverEmail");
const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");
const resetTokenInput = document.getElementById("resetToken");
const resetPasswordInput = document.getElementById("resetPassword");
const resetPasswordBtn = document.getElementById("resetPasswordBtn");

let csrfToken = "";
const authModeContent = {
  login: {
    eyebrow: "Acesso",
    title: "Entrar na sua conta",
    subtitle: "Use seu email e senha para abrir o painel e continuar seus estudos.",
  },
  register: {
    eyebrow: "Cadastro",
    title: "Criar uma conta nova",
    subtitle: "Abra sua conta para salvar historico, organizar perguntas e acompanhar respostas da IA.",
  },
  recover: {
    eyebrow: "Recuperacao",
    title: "Redefinir sua senha",
    subtitle: "Gere um codigo, confirme sua identidade e escolha uma nova senha sem sair do app.",
  },
};

function initializeTheme() {
  document.body.dataset.theme = "dark";
}

function setAuthMode(mode) {
  tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === mode));
  loginForm.classList.toggle("hidden", mode !== "login");
  registerForm.classList.toggle("hidden", mode !== "register");
  recoverForm.classList.toggle("hidden", mode !== "recover");
  loginForm.classList.toggle("active-form", mode === "login");
  registerForm.classList.toggle("active-form", mode === "register");
  recoverForm.classList.toggle("active-form", mode === "recover");
  const content = authModeContent[mode] || authModeContent.login;
  authEyebrow.textContent = content.eyebrow;
  authTitle.textContent = content.title;
  authSubtitle.textContent = content.subtitle;
  authMessage.textContent = "";
}

function setMessage(message, isError = true) {
  authMessage.textContent = message;
  authMessage.style.color = isError ? "#b33e2d" : "#2f6c54";
}

async function apiFetch(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  const method = (options.method || "GET").toUpperCase();
  if (csrfToken && !["GET", "HEAD", "OPTIONS"].includes(method)) {
    headers["X-CSRF-TOKEN"] = csrfToken;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Erro ao processar a requisicao.");
  }

  return data;
}

async function bootstrapAuth() {
  try {
    const user = await apiFetch("/api/auth/me", { method: "GET" });
    if (user.authenticated) {
      window.location.replace("./app.html");
    }
  } catch (_error) {
    return;
  }
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => setAuthMode(tab.dataset.tab));
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  try {
    const data = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    csrfToken = data.csrf_token || "";
    window.location.replace("./app.html");
  } catch (error) {
    setMessage(error.message, true);
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value;

  try {
    const data = await apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    csrfToken = data.csrf_token || "";
    window.location.replace("./app.html");
  } catch (error) {
    setMessage(error.message, true);
  }
});

forgotPasswordBtn.addEventListener("click", async () => {
  const email = recoverEmail.value.trim();
  if (!email) {
    setMessage("Informe o email da conta para gerar o codigo.", true);
    return;
  }

  try {
    const data = await apiFetch("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    setMessage(data.message || "Codigo gerado com sucesso.", false);
    if (data.reset_token) {
      resetTokenInput.value = data.reset_token;
    }
  } catch (error) {
    setMessage(error.message, true);
  }
});

resetPasswordBtn.addEventListener("click", async () => {
  const token = resetTokenInput.value.trim();
  const password = resetPasswordInput.value;
  if (!token || !password) {
    setMessage("Preencha o codigo e a nova senha.", true);
    return;
  }

  try {
    const data = await apiFetch("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });
    setMessage(data.message || "Senha redefinida com sucesso.", false);
    resetTokenInput.value = "";
    resetPasswordInput.value = "";
    setAuthMode("login");
  } catch (error) {
    setMessage(error.message, true);
  }
});

initializeTheme();
setAuthMode("login");
bootstrapAuth();
