const API_BASE_URL = window.APP_CONFIG?.API_BASE_URL || "http://127.0.0.1:5000";
const storageKey = "resolveai_token";

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const authMessage = document.getElementById("authMessage");
const tabs = document.querySelectorAll(".tab");
const userBox = document.getElementById("userBox");
const userEmail = document.getElementById("userEmail");
const logoutBtn = document.getElementById("logoutBtn");
const questionInput = document.getElementById("questionInput");
const solveBtn = document.getElementById("solveBtn");
const subjectBadge = document.getElementById("subjectBadge");
const resultTitle = document.getElementById("resultTitle");
const resultAnswer = document.getElementById("resultAnswer");
const stepsList = document.getElementById("stepsList");
const historyList = document.getElementById("historyList");
const chartTitle = document.getElementById("chartTitle");
const chartCanvas = document.getElementById("chartCanvas");
const ctx = chartCanvas.getContext("2d");

function getToken() {
  return localStorage.getItem(storageKey);
}

function setToken(token) {
  localStorage.setItem(storageKey, token);
}

function clearToken() {
  localStorage.removeItem(storageKey);
}

function setAuthMode(mode) {
  tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === mode));
  loginForm.classList.toggle("hidden", mode !== "login");
  registerForm.classList.toggle("hidden", mode !== "register");
  authMessage.textContent = "";
}

function setMessage(message, isError = true) {
  authMessage.textContent = message;
  authMessage.style.color = isError ? "#b33e2d" : "#2f6c54";
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Erro ao processar a requisicao.");
  }

  return data;
}

function subjectLabel(subject) {
  const labels = {
    matematica: "Matematica",
    fisica: "Fisica",
    texto: "Texto",
  };
  return labels[subject] || "Aguardando";
}

function drawEmptyChart(message) {
  ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
  ctx.fillStyle = "#74695f";
  ctx.font = "20px IBM Plex Mono";
  ctx.fillText(message, 28, 48);
}

function drawGraph(graph) {
  if (!graph || !graph.points || graph.points.length < 2) {
    chartTitle.textContent = "Sem funcao detectada ainda.";
    drawEmptyChart("Sem grafico para esta resposta.");
    return;
  }

  chartTitle.textContent = graph.title;
  ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);

  const width = chartCanvas.width;
  const height = chartCanvas.height;
  const padding = 50;
  const xs = graph.points.map((point) => point.x);
  const ys = graph.points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const xRange = maxX - minX || 1;
  const yRange = maxY - minY || 1;

  const projectX = (value) => padding + ((value - minX) / xRange) * (width - padding * 2);
  const projectY = (value) => height - padding - ((value - minY) / yRange) * (height - padding * 2);

  ctx.strokeStyle = "rgba(24, 32, 28, 0.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, height / 2);
  ctx.lineTo(width - padding, height / 2);
  ctx.moveTo(width / 2, padding);
  ctx.lineTo(width / 2, height - padding);
  ctx.stroke();

  ctx.strokeStyle = "#d75f39";
  ctx.lineWidth = 3;
  ctx.beginPath();
  graph.points.forEach((point, index) => {
    const px = projectX(point.x);
    const py = projectY(point.y);
    if (index === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  });
  ctx.stroke();

  ctx.fillStyle = "#2f6c54";
  graph.points.forEach((point) => {
    const px = projectX(point.x);
    const py = projectY(point.y);
    ctx.beginPath();
    ctx.arc(px, py, 3.5, 0, Math.PI * 2);
    ctx.fill();
  });
}

function renderSteps(steps) {
  stepsList.innerHTML = "";
  (steps || []).forEach((step) => {
    const li = document.createElement("li");
    li.textContent = step;
    stepsList.appendChild(li);
  });
}

function renderResult(data) {
  subjectBadge.textContent = subjectLabel(data.subject);
  resultTitle.textContent = data.title;
  resultAnswer.textContent = `Resposta final: ${data.answer}`;
  renderSteps(data.steps);
  drawGraph(data.graph);
}

function renderHistory(items) {
  historyList.innerHTML = "";
  if (!items.length) {
    historyList.innerHTML = '<p class="empty-state">Seu historico salvo vai aparecer aqui.</p>';
    return;
  }

  items.forEach((item) => {
    const article = document.createElement("article");
    article.className = "history-item";
    article.innerHTML = `
      <h3>${item.subject.toUpperCase()}</h3>
      <p><strong>Pergunta:</strong> ${item.question}</p>
      <p><strong>Resposta:</strong> ${item.answer}</p>
    `;
    article.addEventListener("click", () => renderResult(item));
    historyList.appendChild(article);
  });
}

function setLoggedInState(user) {
  userBox.classList.remove("hidden");
  userEmail.textContent = user.email;
  loginForm.classList.add("hidden");
  registerForm.classList.add("hidden");
}

function setLoggedOutState() {
  userBox.classList.add("hidden");
  setAuthMode("login");
  subjectBadge.textContent = "Aguardando";
  resultTitle.textContent = "A resposta aparece aqui";
  resultAnswer.textContent = "Entre com sua conta para começar.";
  stepsList.innerHTML = "";
  historyList.innerHTML = '<p class="empty-state">Seu historico salvo vai aparecer aqui.</p>';
  drawEmptyChart("Faca login para usar o grafico.");
}

async function bootstrapAuth() {
  const token = getToken();
  if (!token) {
    setLoggedOutState();
    return;
  }

  try {
    const user = await apiFetch("/api/auth/me", { method: "GET" });
    setLoggedInState(user);
    const history = await apiFetch("/api/history", { method: "GET" });
    renderHistory(history);
    if (history.length) {
      renderResult(history[0]);
    } else {
      drawEmptyChart("Resolva uma funcao para ver o grafico.");
    }
  } catch (error) {
    clearToken();
    setLoggedOutState();
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
    setToken(data.token);
    setLoggedInState(data.user);
    setMessage("Login realizado com sucesso.", false);
    const history = await apiFetch("/api/history", { method: "GET" });
    renderHistory(history);
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
    setToken(data.token);
    setLoggedInState(data.user);
    setMessage("Conta criada com sucesso.", false);
    renderHistory([]);
    drawEmptyChart("Resolva uma funcao para ver o grafico.");
  } catch (error) {
    setMessage(error.message, true);
  }
});

logoutBtn.addEventListener("click", () => {
  clearToken();
  setLoggedOutState();
});

solveBtn.addEventListener("click", async () => {
  const question = questionInput.value.trim();
  if (!question) {
    resultTitle.textContent = "Digite uma questao primeiro";
    resultAnswer.textContent = "Sem enunciado, nao tem como resolver.";
    renderSteps([]);
    drawEmptyChart("Aguardando uma funcao.");
    return;
  }

  if (!getToken()) {
    resultTitle.textContent = "Login necessario";
    resultAnswer.textContent = "Entre na sua conta para usar a IA e salvar o historico.";
    renderSteps([]);
    drawEmptyChart("Faca login para continuar.");
    return;
  }

  solveBtn.disabled = true;
  solveBtn.textContent = "Resolvendo...";

  try {
    const data = await apiFetch("/api/solve", {
      method: "POST",
      body: JSON.stringify({ question }),
    });
    renderResult(data);
    const history = await apiFetch("/api/history", { method: "GET" });
    renderHistory(history);
  } catch (error) {
    resultTitle.textContent = "Erro";
    resultAnswer.textContent = error.message;
    renderSteps([]);
    drawEmptyChart("Nao foi possivel montar o grafico.");
  } finally {
    solveBtn.disabled = false;
    solveBtn.textContent = "Resolver com IA";
  }
});

drawEmptyChart("Faca login para usar o grafico.");
bootstrapAuth();
