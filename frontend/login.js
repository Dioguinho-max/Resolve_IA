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
const appLoadingOverlay = document.getElementById("appLoadingOverlay");
const loadingTitle = document.getElementById("loadingTitle");
const loadingCopy = document.getElementById("loadingCopy");
const loadingSteps = document.getElementById("loadingSteps");

let csrfToken = "";
const authModeContent = {
  login: {
    eyebrow: "BOM TER VOCÊ AQUI",
    title: "Seu próximo passo começa aqui.",
    subtitle: "Entre na sua conta e continue de onde parou.",
  },
  register: {
    eyebrow: "Cadastro",
    title: "Vamos começar?",
    subtitle: "Crie sua conta para salvar descobertas e acompanhar sua evolução.",
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

function setPageLoading(isLoading, options = {}) {
  if (!appLoadingOverlay) {
    return;
  }

  const {
    title = "Preparando seu acesso",
    copy = "Conectando sua conta e abrindo o painel de estudos.",
    steps = ["Conta", "Sessao", "Painel"],
  } = options;

  if (loadingTitle) {
    loadingTitle.textContent = title;
  }
  if (loadingCopy) {
    loadingCopy.textContent = copy;
  }
  if (loadingSteps) {
    loadingSteps.innerHTML = "";
    steps.forEach((step) => {
      const item = document.createElement("span");
      item.textContent = step;
      loadingSteps.appendChild(item);
    });
  }

  document.body.classList.toggle("is-loading", isLoading);
  appLoadingOverlay.classList.toggle("hidden", !isLoading);
  appLoadingOverlay.setAttribute("aria-hidden", String(!isLoading));
}

function setAuthControlsDisabled(isDisabled) {
  document
    .querySelectorAll(".auth-form input, .auth-form button, .tab")
    .forEach((control) => {
      control.disabled = isDisabled;
    });
}

function setAuthMode(mode) {
  tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === mode);
    tab.setAttribute("aria-pressed", String(tab.dataset.tab === mode));
  });
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
  authMessage.style.color = isError ? "#ff9b9b" : "#8ee5b9";
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

document.querySelectorAll("[data-auth-mode]").forEach((link) => {
  link.addEventListener("click", () => {
    setAuthMode(link.dataset.authMode);
    document.getElementById("registerEmail").focus({ preventScroll: true });
  });
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  setAuthControlsDisabled(true);
  setPageLoading(true, {
    title: "Abrindo seu painel",
    copy: "Validando sua conta e carregando seu espaco de estudos.",
    steps: ["Login", "Sessao", "Painel"],
  });
  try {
    const data = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    csrfToken = data.csrf_token || "";
    window.location.replace("./app.html");
  } catch (error) {
    setPageLoading(false);
    setAuthControlsDisabled(false);
    setMessage(error.message, true);
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value;

  setAuthControlsDisabled(true);
  setPageLoading(true, {
    title: "Criando sua conta",
    copy: "Preparando seu perfil para salvar historico, categorias e progresso.",
    steps: ["Cadastro", "Sessao", "Painel"],
  });
  try {
    const data = await apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    csrfToken = data.csrf_token || "";
    window.location.replace("./app.html");
  } catch (error) {
    setPageLoading(false);
    setAuthControlsDisabled(false);
    setMessage(error.message, true);
  }
});

forgotPasswordBtn.addEventListener("click", async () => {
  const email = recoverEmail.value.trim();
  if (!email) {
    setMessage("Informe o email da conta para gerar o codigo.", true);
    return;
  }

  setAuthControlsDisabled(true);
  setPageLoading(true, {
    title: "Gerando codigo",
    copy: "Criando um codigo de recuperacao para voce redefinir a senha.",
    steps: ["Email", "Codigo", "Senha"],
  });
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
  } finally {
    setPageLoading(false);
    setAuthControlsDisabled(false);
  }
});

resetPasswordBtn.addEventListener("click", async () => {
  const token = resetTokenInput.value.trim();
  const password = resetPasswordInput.value;
  if (!token || !password) {
    setMessage("Preencha o codigo e a nova senha.", true);
    return;
  }

  setAuthControlsDisabled(true);
  setPageLoading(true, {
    title: "Redefinindo senha",
    copy: "Confirmando o codigo e atualizando seu acesso.",
    steps: ["Codigo", "Senha", "Pronto"],
  });
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
  } finally {
    setPageLoading(false);
    setAuthControlsDisabled(false);
  }
});

initializeTheme();
setAuthMode("login");
bootstrapAuth();
