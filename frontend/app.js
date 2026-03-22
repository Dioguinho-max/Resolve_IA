const API_BASE_URL = window.APP_CONFIG?.API_BASE_URL || "http://127.0.0.1:5000";
const storageKey = "resolveai_token";

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const recoverForm = document.getElementById("recoverForm");
const authEyebrow = document.getElementById("authEyebrow");
const authTitle = document.getElementById("authTitle");
const authSubtitle = document.getElementById("authSubtitle");
const authMessage = document.getElementById("authMessage");
const tabs = document.querySelectorAll(".tab");
const userBox = document.getElementById("userBox");
const userEmail = document.getElementById("userEmail");
const logoutBtn = document.getElementById("logoutBtn");
const confirmModal = document.getElementById("confirmModal");
const confirmModalTag = document.getElementById("confirmModalTag");
const confirmModalTitle = document.getElementById("confirmModalTitle");
const confirmModalCopy = document.getElementById("confirmModalCopy");
const confirmModalCancelBtn = document.getElementById("confirmModalCancelBtn");
const confirmModalActionBtn = document.getElementById("confirmModalActionBtn");
const questionInput = document.getElementById("questionInput");
const solveBtn = document.getElementById("solveBtn");
const newQuestionBtn = document.getElementById("newQuestionBtn");
const copyAnswerBtn = document.getElementById("copyAnswerBtn");
const solveLoading = document.getElementById("solveLoading");
const generalNotice = document.getElementById("generalNotice");
const modeChips = document.querySelectorAll(".mode-chip");
const subjectBadge = document.getElementById("subjectBadge");
const resultTitle = document.getElementById("resultTitle");
const resultAnswer = document.getElementById("resultAnswer");
const stepsList = document.getElementById("stepsList");
const historyList = document.getElementById("historyList");
const historySearch = document.getElementById("historySearch");
const historyFilter = document.getElementById("historyFilter");
const historyPrevBtn = document.getElementById("historyPrevBtn");
const historyNextBtn = document.getElementById("historyNextBtn");
const historyPageInfo = document.getElementById("historyPageInfo");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const recoverEmail = document.getElementById("recoverEmail");
const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");
const resetTokenInput = document.getElementById("resetToken");
const resetPasswordInput = document.getElementById("resetPassword");
const resetPasswordBtn = document.getElementById("resetPasswordBtn");
const chartTitle = document.getElementById("chartTitle");
const chartCanvas = document.getElementById("chartCanvas");
const ctx = chartCanvas.getContext("2d");

let selectedMode = "math";
let currentResult = null;
let historyQuery = { page: 1, pageSize: 8, subject: "", q: "" };
let historyPagination = { page: 1, total_pages: 1 };
let graphState = { zoom: 1 };
let confirmModalAction = null;

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

function getToken() {
  return localStorage.getItem(storageKey);
}

function setToken(token) {
  localStorage.setItem(storageKey, token);
}

function clearToken() {
  localStorage.removeItem(storageKey);
}

function openConfirmModal({ tag = "Confirmacao", title, copy, actionLabel = "Confirmar", onConfirm }) {
  confirmModalTag.textContent = tag;
  confirmModalTitle.textContent = title;
  confirmModalCopy.textContent = copy;
  confirmModalActionBtn.textContent = actionLabel;
  confirmModalAction = onConfirm;
  confirmModal.classList.remove("hidden");
  confirmModal.setAttribute("aria-hidden", "false");
  confirmModalCancelBtn.focus();
}

function closeConfirmModal(returnFocusElement = null) {
  if (document.activeElement === confirmModalActionBtn || document.activeElement === confirmModalCancelBtn) {
    (returnFocusElement || logoutBtn).focus();
  }
  confirmModal.classList.add("hidden");
  confirmModal.setAttribute("aria-hidden", "true");
  confirmModalAction = null;
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
    geral: "Geral",
  };
  return labels[subject] || "Aguardando";
}

function apiPathForMode(mode) {
  const paths = {
    math: "/api/solve/math",
    physics: "/api/solve/physics",
    general: "/api/solve/general",
  };
  return paths[mode] || "/api/solve/math";
}

function setLoading(isLoading) {
  solveLoading.classList.toggle("hidden", !isLoading);
  solveBtn.disabled = isLoading;
  newQuestionBtn.disabled = isLoading;
  solveBtn.textContent = isLoading ? "Resolvendo..." : "Resolver com IA";
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
  const padding = 52;
  const xs = graph.points.map((point) => point.x);
  const ys = graph.points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const xMid = (minX + maxX) / 2;
  const yMid = (minY + maxY) / 2;
  const xRange = ((maxX - minX) || 1) / graphState.zoom;
  const yRange = ((maxY - minY) || 1) / graphState.zoom;
  const visibleMinX = xMid - xRange / 2;
  const visibleMaxX = xMid + xRange / 2;
  const visibleMinY = yMid - yRange / 2;
  const visibleMaxY = yMid + yRange / 2;

  const projectX = (value) => padding + ((value - visibleMinX) / (visibleMaxX - visibleMinX || 1)) * (width - padding * 2);
  const projectY = (value) => height - padding - ((value - visibleMinY) / (visibleMaxY - visibleMinY || 1)) * (height - padding * 2);

  ctx.strokeStyle = "rgba(24, 32, 28, 0.1)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const xPos = padding + ((width - padding * 2) / 4) * i;
    const yPos = padding + ((height - padding * 2) / 4) * i;
    ctx.beginPath();
    ctx.moveTo(xPos, padding);
    ctx.lineTo(xPos, height - padding);
    ctx.moveTo(padding, yPos);
    ctx.lineTo(width - padding, yPos);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(24, 32, 28, 0.22)";
  ctx.beginPath();
  ctx.moveTo(projectX(0), padding);
  ctx.lineTo(projectX(0), height - padding);
  ctx.moveTo(padding, projectY(0));
  ctx.lineTo(width - padding, projectY(0));
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
  currentResult = data;
  subjectBadge.textContent = subjectLabel(data.subject);
  resultTitle.textContent = data.title || `Resposta ${subjectLabel(data.subject).toLowerCase()}`;
  resultAnswer.textContent = `Resposta final: ${data.answer || "Sem resposta disponivel."}`;
  generalNotice.classList.toggle("hidden", data.subject !== "geral");
  copyAnswerBtn.classList.remove("hidden");
  renderSteps(data.steps || []);
  graphState.zoom = 1;
  drawGraph(data.graph || null);
}

function buildHistoryParams() {
  const params = new URLSearchParams({
    page: String(historyQuery.page),
    page_size: String(historyQuery.pageSize),
  });
  if (historyQuery.subject) {
    params.set("subject", historyQuery.subject);
  }
  if (historyQuery.q) {
    params.set("q", historyQuery.q);
  }
  return params.toString();
}

async function loadHistory() {
  const data = await apiFetch(`/api/history?${buildHistoryParams()}`, { method: "GET" });
  historyPagination = data.pagination;
  renderHistory(data.items);
  historyPageInfo.textContent = `Pagina ${historyPagination.page} de ${historyPagination.total_pages}`;
  historyPrevBtn.disabled = historyPagination.page <= 1;
  historyNextBtn.disabled = historyPagination.page >= historyPagination.total_pages;
  return data;
}

async function deleteHistoryItem(historyId) {
  await apiFetch(`/api/history/${historyId}`, { method: "DELETE" });
  if (currentResult?.id === historyId || currentResult?.history_id === historyId) {
    resetWorkspaceAfterClear();
  }
  const maxPageAfterDelete = Math.max(1, historyPagination.total_pages || 1);
  if (historyQuery.page > maxPageAfterDelete) {
    historyQuery.page = maxPageAfterDelete;
  }
  await loadHistory();
}

function renderHistory(items) {
  historyList.innerHTML = "";
  if (!items.length) {
    historyList.innerHTML = '<p class="empty-state">Nenhum item encontrado para esse filtro.</p>';
    return;
  }

  items.forEach((item) => {
    const article = document.createElement("article");
    article.className = "history-item";
    article.innerHTML = `
      <div class="history-top">
        <h3>${subjectLabel(item.subject)}</h3>
        <div class="history-actions">
          <span class="history-date">${new Date(item.created_at).toLocaleString("pt-BR")}</span>
          <button class="history-delete secondary" type="button" data-id="${item.id}">Excluir</button>
        </div>
      </div>
      <p><strong>Pergunta:</strong> ${item.question}</p>
      <p><strong>Resposta:</strong> ${item.answer}</p>
    `;
    article.addEventListener("click", () => renderResult(item));
    article.querySelector(".history-delete").addEventListener("click", async (event) => {
      event.stopPropagation();
      openConfirmModal({
        tag: "Historico",
        title: "Excluir este item?",
        copy: "Essa resposta sera removida do seu historico e nao podera ser recuperada depois.",
        actionLabel: "Excluir item",
        onConfirm: async () => {
          await deleteHistoryItem(item.id);
        },
      });
    });
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
  resultAnswer.textContent = "Entre com sua conta para comecar.";
  stepsList.innerHTML = "";
  historyList.innerHTML = '<p class="empty-state">Seu historico salvo vai aparecer aqui.</p>';
  historyPageInfo.textContent = "Pagina 1 de 1";
  copyAnswerBtn.classList.add("hidden");
  generalNotice.classList.add("hidden");
  currentResult = null;
  drawEmptyChart("Faca login para usar o grafico.");
}

function resetWorkspaceAfterClear() {
  subjectBadge.textContent = "Aguardando";
  resultTitle.textContent = "Historico limpo";
  resultAnswer.textContent = "Seu historico foi apagado. Faca uma nova pergunta para gerar uma resposta.";
  stepsList.innerHTML = "";
  copyAnswerBtn.classList.add("hidden");
  generalNotice.classList.add("hidden");
  currentResult = null;
  graphState.zoom = 1;
  drawEmptyChart("Nenhum grafico salvo no historico.");
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
    const historyData = await loadHistory();
    if (historyData.items.length) {
      renderResult(historyData.items[0]);
    } else {
      drawEmptyChart("Resolva uma funcao para ver o grafico.");
    }
  } catch (error) {
    clearToken();
    setLoggedOutState();
  }
}

function debounce(fn, delay = 350) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => setAuthMode(tab.dataset.tab));
});

modeChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    selectedMode = chip.dataset.mode;
    modeChips.forEach((item) => item.classList.toggle("active", item === chip));
  });
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
    const historyData = await loadHistory();
    if (historyData.items.length) {
      renderResult(historyData.items[0]);
    }
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
    historyQuery.page = 1;
    await loadHistory();
    drawEmptyChart("Resolva uma funcao para ver o grafico.");
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

logoutBtn.addEventListener("click", () => {
  openConfirmModal({
    tag: "Confirmacao",
    title: "Deseja sair da sua conta?",
    copy: "Voce pode entrar novamente a qualquer momento com seu email e senha.",
    actionLabel: "Sair agora",
    onConfirm: () => {
      clearToken();
      setLoggedOutState();
    },
  });
});

confirmModalCancelBtn.addEventListener("click", () => {
  closeConfirmModal();
});

confirmModalActionBtn.addEventListener("click", async () => {
  const action = confirmModalAction;
  closeConfirmModal();
  if (action) {
    await action();
  }
});

confirmModal.addEventListener("click", (event) => {
  if (event.target === confirmModal) {
    closeConfirmModal();
  }
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

  setLoading(true);
  try {
    const data = await apiFetch(apiPathForMode(selectedMode), {
      method: "POST",
      body: JSON.stringify({ question }),
    });
    renderResult(data);
    historyQuery.page = 1;
    await loadHistory();
  } catch (error) {
    resultTitle.textContent = "Erro";
    resultAnswer.textContent = error.message;
    renderSteps([]);
    drawEmptyChart("Nao foi possivel montar o grafico.");
  } finally {
    setLoading(false);
  }
});

newQuestionBtn.addEventListener("click", () => {
  questionInput.value = "";
  questionInput.focus();
});

copyAnswerBtn.addEventListener("click", async () => {
  if (!currentResult) {
    return;
  }

  const text = `${currentResult.title}\n\n${currentResult.answer}\n\n${(currentResult.steps || []).join("\n")}`;
  await navigator.clipboard.writeText(text);
  copyAnswerBtn.textContent = "Copiado";
  setTimeout(() => {
    copyAnswerBtn.textContent = "Copiar resposta";
  }, 1400);
});

historyFilter.addEventListener("change", async () => {
  historyQuery.subject = historyFilter.value;
  historyQuery.page = 1;
  await loadHistory();
});

historySearch.addEventListener(
  "input",
  debounce(async () => {
    historyQuery.q = historySearch.value.trim();
    historyQuery.page = 1;
    await loadHistory();
  }),
);

historyPrevBtn.addEventListener("click", async () => {
  if (historyQuery.page <= 1) {
    return;
  }
  historyQuery.page -= 1;
  await loadHistory();
});

historyNextBtn.addEventListener("click", async () => {
  if (historyQuery.page >= historyPagination.total_pages) {
    return;
  }
  historyQuery.page += 1;
  await loadHistory();
});

clearHistoryBtn.addEventListener("click", async () => {
  openConfirmModal({
    tag: "Historico",
    title: "Apagar todo o historico?",
    copy: "Todas as consultas salvas serao removidas da sua conta. Essa acao nao pode ser desfeita.",
    actionLabel: "Apagar tudo",
    onConfirm: async () => {
      clearHistoryBtn.disabled = true;
      try {
        await apiFetch("/api/history", { method: "DELETE" });
        historyQuery.page = 1;
        await loadHistory();
        resetWorkspaceAfterClear();
      } catch (error) {
        resultTitle.textContent = "Nao foi possivel apagar";
        resultAnswer.textContent = error.message;
        renderSteps([]);
      } finally {
        clearHistoryBtn.disabled = false;
      }
    },
  });
});

chartCanvas.addEventListener("wheel", (event) => {
  if (!currentResult?.graph) {
    return;
  }
  event.preventDefault();
  graphState.zoom = Math.min(4, Math.max(1, graphState.zoom + (event.deltaY < 0 ? 0.2 : -0.2)));
  drawGraph(currentResult.graph);
});

drawEmptyChart("Faca login para usar o grafico.");
bootstrapAuth();
