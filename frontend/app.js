const API_BASE_URL = window.APP_CONFIG?.API_BASE_URL || "http://127.0.0.1:5000";

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const recoverForm = document.getElementById("recoverForm");
const authEyebrow = document.getElementById("authEyebrow");
const authTitle = document.getElementById("authTitle");
const authSubtitle = document.getElementById("authSubtitle");
const authMessage = document.getElementById("authMessage");
const themeToggleBtn = document.getElementById("themeToggleBtn");
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
const favoriteResultBtn = document.getElementById("favoriteResultBtn");
const exportImageBtn = document.getElementById("exportImageBtn");
const exportPdfBtn = document.getElementById("exportPdfBtn");
const resultCategoryInput = document.getElementById("resultCategoryInput");
const saveCategoryBtn = document.getElementById("saveCategoryBtn");
const solveLoading = document.getElementById("solveLoading");
const generalNotice = document.getElementById("generalNotice");
const modeChips = document.querySelectorAll(".mode-chip");
const subjectBadge = document.getElementById("subjectBadge");
const resultTitle = document.getElementById("resultTitle");
const resultAnswer = document.getElementById("resultAnswer");
const stepsList = document.getElementById("stepsList");
const historyList = document.getElementById("historyList");
const historySearch = document.getElementById("historySearch");
const historyCategoryFilter = document.getElementById("historyCategoryFilter");
const historyFilter = document.getElementById("historyFilter");
const historyFavoritesOnly = document.getElementById("historyFavoritesOnly");
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
const historyPanel = document.querySelector(".history-panel");
const ctx = chartCanvas.getContext("2d");

let selectedMode = "math";
let currentResult = null;
let historyQuery = { page: 1, pageSize: 8, subject: "", q: "", category: "", favorites: false };
let historyPagination = { page: 1, total_pages: 1 };
let graphState = { zoom: 1 };
let confirmModalAction = null;
let isAuthenticated = false;
let csrfToken = "";
let answerAnimationToken = 0;
let currentTheme = "light";
let lastAutoScrollAt = 0;

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

function applyTheme(theme) {
  currentTheme = theme === "dark" ? "dark" : "light";
  document.body.dataset.theme = currentTheme;
  if (themeToggleBtn) {
    themeToggleBtn.textContent = currentTheme === "dark" ? "Modo claro" : "Modo escuro";
  }
  if (currentResult?.graph) {
    drawGraph(currentResult.graph);
  } else {
    drawEmptyChart(isAuthenticated ? "Resolva uma funcao para ver o grafico." : "Faca login para usar o grafico.");
  }
}

function initializeTheme() {
  const storedTheme = window.localStorage.getItem("resolveai-theme");
  if (storedTheme === "dark" || storedTheme === "light") {
    applyTheme(storedTheme);
    return;
  }

  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(prefersDark ? "dark" : "light");
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
  if (isAuthenticated) {
    tabs.forEach((tab) => tab.classList.remove("active"));
    authMessage.textContent = "";
    return;
  }

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
    if (response.status === 401) {
      setLoggedOutState();
    }
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

function keepResultInView(force = false) {
  const now = Date.now();
  if (!force && now - lastAutoScrollAt < 90) {
    return;
  }
  lastAutoScrollAt = now;
  resultTitle.scrollIntoView({ behavior: "smooth", block: "start" });
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function captureHistoryViewportAnchor() {
  return historyPanel ? historyPanel.getBoundingClientRect().top : null;
}

function restoreHistoryViewportAnchor(anchorTop) {
  if (anchorTop == null || !historyPanel) {
    return;
  }
  const nextTop = historyPanel.getBoundingClientRect().top;
  const delta = nextTop - anchorTop;
  if (Math.abs(delta) > 1) {
    window.scrollBy({ top: delta, left: 0, behavior: "auto" });
  }
}

function lockHistoryHeight() {
  historyList.style.minHeight = `${historyList.offsetHeight}px`;
  historyList.classList.add("history-height-lock");
}

async function releaseHistoryHeightLock() {
  const nextHeight = historyList.scrollHeight;
  historyList.style.minHeight = `${nextHeight}px`;
  await wait(280);
  historyList.style.minHeight = "";
  historyList.classList.remove("history-height-lock");
}

async function animateHistoryClear() {
  const items = Array.from(historyList.querySelectorAll(".history-item"));
  lockHistoryHeight();
  if (!items.length) {
    historyList.classList.add("history-clearing");
    await wait(220);
    historyList.classList.remove("history-clearing");
    return;
  }

  historyList.classList.add("history-clearing");
  items.forEach((item, index) => {
    item.style.setProperty("--history-exit-delay", `${index * 45}ms`);
    item.classList.add("history-item-removing");
  });

  await wait(Math.min(520, 220 + items.length * 45));
  historyList.classList.remove("history-clearing");
}

function drawEmptyChart(message) {
  ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
  ctx.fillStyle = currentTheme === "dark" ? "#c0c8bf" : "#74695f";
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
  const gridStroke = currentTheme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(24, 32, 28, 0.1)";
  const axisStroke = currentTheme === "dark" ? "rgba(255, 255, 255, 0.18)" : "rgba(24, 32, 28, 0.22)";
  const graphStroke = currentTheme === "dark" ? "#f18a45" : "#d75f39";
  const graphFill = currentTheme === "dark" ? "#68b394" : "#2f6c54";

  const projectX = (value) => padding + ((value - visibleMinX) / (visibleMaxX - visibleMinX || 1)) * (width - padding * 2);
  const projectY = (value) => height - padding - ((value - visibleMinY) / (visibleMaxY - visibleMinY || 1)) * (height - padding * 2);

  ctx.strokeStyle = gridStroke;
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

  ctx.strokeStyle = axisStroke;
  ctx.beginPath();
  ctx.moveTo(projectX(0), padding);
  ctx.lineTo(projectX(0), height - padding);
  ctx.moveTo(padding, projectY(0));
  ctx.lineTo(width - padding, projectY(0));
  ctx.stroke();

  ctx.strokeStyle = graphStroke;
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

  ctx.fillStyle = graphFill;
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

function animateText(element, text, animationToken) {
  element.classList.add("typing");
  element.textContent = "";
  keepResultInView(true);

  const content = text || "";
  if (!content) {
    element.classList.remove("typing");
    return Promise.resolve();
  }

  const totalDuration = Math.min(2200, Math.max(700, content.length * 18));
  const stepDelay = Math.max(14, Math.round(totalDuration / content.length));

  return new Promise((resolve) => {
    let index = 0;
    const tick = () => {
      if (animationToken !== answerAnimationToken) {
        element.classList.remove("typing");
        resolve();
        return;
      }

      index += 1;
      element.textContent = content.slice(0, index);
      keepResultInView();
      if (index >= content.length) {
        element.classList.remove("typing");
        keepResultInView(true);
        resolve();
        return;
      }
      window.setTimeout(tick, stepDelay);
    };

    window.setTimeout(tick, stepDelay);
  });
}

function animateSteps(steps, animationToken) {
  stepsList.innerHTML = "";
  (steps || []).forEach((step, index) => {
    const li = document.createElement("li");
    li.textContent = step;
    li.className = "step-enter";
    li.style.animationDelay = `${index * 110}ms`;
    if (animationToken !== answerAnimationToken) {
      return;
    }
    stepsList.appendChild(li);
    window.setTimeout(() => {
      if (animationToken === answerAnimationToken) {
        keepResultInView();
      }
    }, index * 110);
  });
}

function renderResult(data) {
  answerAnimationToken += 1;
  const animationToken = answerAnimationToken;
  currentResult = {
    ...data,
    history_id: data.history_id || data.id || null,
    is_favorite: Boolean(data.is_favorite),
    category: data.category || "",
  };
  subjectBadge.textContent = subjectLabel(data.subject);
  resultTitle.textContent = data.title || `Resposta ${subjectLabel(data.subject).toLowerCase()}`;
  const answerText = `Resposta final: ${data.answer || "Sem resposta disponivel."}`;
  resultAnswer.textContent = "";
  generalNotice.classList.toggle("hidden", data.subject !== "geral");
  copyAnswerBtn.disabled = false;
  exportImageBtn.disabled = false;
  exportPdfBtn.disabled = false;
  favoriteResultBtn.disabled = !currentResult.history_id;
  saveCategoryBtn.disabled = !currentResult.history_id;
  resultCategoryInput.disabled = !currentResult.history_id;
  favoriteResultBtn.textContent = currentResult.is_favorite ? "Desfavoritar" : "Favoritar";
  resultCategoryInput.value = currentResult.category;
  stepsList.innerHTML = "";
  graphState.zoom = 1;
  drawGraph(data.graph || null);
  keepResultInView(true);
  animateText(resultAnswer, answerText, animationToken).then(() => {
    if (animationToken !== answerAnimationToken) {
      return;
    }
    animateSteps(data.steps || [], animationToken);
  });
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
  if (historyQuery.category) {
    params.set("category", historyQuery.category);
  }
  if (historyQuery.favorites) {
    params.set("favorites", "1");
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

async function updateHistoryItem(historyId, payload) {
  const updatedItem = await apiFetch(`/api/history/${historyId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  if (currentResult?.id === historyId || currentResult?.history_id === historyId) {
    currentResult = { ...currentResult, ...updatedItem, history_id: updatedItem.id };
    favoriteResultBtn.textContent = updatedItem.is_favorite ? "Desfavoritar" : "Favoritar";
    resultCategoryInput.value = updatedItem.category || "";
  }

  await loadHistory();
  return updatedItem;
}

function renderHistory(items) {
  historyList.innerHTML = "";
  if (!items.length) {
    const emptyState = document.createElement("p");
    emptyState.className = "empty-state";
    emptyState.textContent = "Nenhum item encontrado para esse filtro.";
    historyList.appendChild(emptyState);
    return;
  }

  items.forEach((item) => {
    const article = document.createElement("article");
    article.className = "history-item";

    const top = document.createElement("div");
    top.className = "history-top";

    const title = document.createElement("h3");
    title.textContent = subjectLabel(item.subject);

    const actions = document.createElement("div");
    actions.className = "history-actions";

    const date = document.createElement("span");
    date.className = "history-date";
    date.textContent = new Date(item.created_at).toLocaleString("pt-BR");

    const deleteButton = document.createElement("button");
    deleteButton.className = "history-delete secondary";
    deleteButton.type = "button";
    deleteButton.textContent = "Excluir";

    const favoriteButton = document.createElement("button");
    favoriteButton.className = `history-favorite secondary${item.is_favorite ? " active" : ""}`;
    favoriteButton.type = "button";
    favoriteButton.textContent = item.is_favorite ? "Favorito" : "Favoritar";

    const question = document.createElement("p");
    const questionStrong = document.createElement("strong");
    questionStrong.textContent = "Pergunta:";
    question.append(questionStrong, ` ${item.question}`);

    const answer = document.createElement("p");
    const answerStrong = document.createElement("strong");
    answerStrong.textContent = "Resposta:";
    answer.append(answerStrong, ` ${item.answer}`);

    const category = document.createElement("p");
    category.className = "history-category";
    category.textContent = item.category ? `Categoria: ${item.category}` : "Sem categoria";

    actions.append(date, favoriteButton, deleteButton);
    top.append(title, actions);
    article.append(top, category, question, answer);

    article.addEventListener("click", () => renderResult(item));
    favoriteButton.addEventListener("click", async (event) => {
      event.stopPropagation();
      const updatedItem = await updateHistoryItem(item.id, { is_favorite: !item.is_favorite });
      item.is_favorite = updatedItem.is_favorite;
      item.category = updatedItem.category || "";
    });
    deleteButton.addEventListener("click", async (event) => {
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

function setLoggedInState(user, nextCsrfToken = "") {
  isAuthenticated = true;
  csrfToken = nextCsrfToken || user.csrf_token || csrfToken;
  userBox.classList.remove("hidden");
  userEmail.textContent = user.email;
  loginForm.classList.add("hidden");
  registerForm.classList.add("hidden");
  recoverForm.classList.add("hidden");
}

function setLoggedOutState() {
  isAuthenticated = false;
  csrfToken = "";
  userBox.classList.add("hidden");
  setAuthMode("login");
  subjectBadge.textContent = "Aguardando";
  resultTitle.textContent = "A resposta aparece aqui";
  resultAnswer.textContent = "Entre com sua conta para comecar.";
  stepsList.innerHTML = "";
  historyList.innerHTML = '<p class="empty-state">Seu historico salvo vai aparecer aqui.</p>';
  historyPageInfo.textContent = "Pagina 1 de 1";
  copyAnswerBtn.disabled = true;
  exportImageBtn.disabled = true;
  exportPdfBtn.disabled = true;
  favoriteResultBtn.disabled = true;
  saveCategoryBtn.disabled = true;
  resultCategoryInput.disabled = true;
  generalNotice.classList.add("hidden");
  resultCategoryInput.value = "";
  currentResult = null;
  drawEmptyChart("Faca login para usar o grafico.");
}

function resetWorkspaceAfterClear() {
  subjectBadge.textContent = "Aguardando";
  resultTitle.textContent = "Historico limpo";
  resultAnswer.textContent = "Seu historico foi apagado. Faca uma nova pergunta para gerar uma resposta.";
  stepsList.innerHTML = "";
  copyAnswerBtn.disabled = true;
  exportImageBtn.disabled = true;
  exportPdfBtn.disabled = true;
  favoriteResultBtn.disabled = true;
  saveCategoryBtn.disabled = true;
  resultCategoryInput.disabled = true;
  generalNotice.classList.add("hidden");
  resultCategoryInput.value = "";
  currentResult = null;
  graphState.zoom = 1;
  drawEmptyChart("Nenhum grafico salvo no historico.");
}

function showIdleWorkspace(message = "Escolha uma consulta no historico ou faca uma nova pergunta para gerar uma resposta.") {
  answerAnimationToken += 1;
  currentResult = null;
  subjectBadge.textContent = "Aguardando";
  resultTitle.textContent = "A resposta aparece aqui";
  resultAnswer.textContent = message;
  stepsList.innerHTML = "";
  generalNotice.classList.add("hidden");
  copyAnswerBtn.disabled = true;
  exportImageBtn.disabled = true;
  exportPdfBtn.disabled = true;
  favoriteResultBtn.disabled = true;
  favoriteResultBtn.textContent = "Favoritar";
  saveCategoryBtn.disabled = true;
  resultCategoryInput.disabled = true;
  resultCategoryInput.value = "";
  graphState.zoom = 1;
  drawEmptyChart("Selecione um item do historico ou faca uma nova pergunta.");
}

function buildExportTitle() {
  const subject = currentResult?.subject ? subjectLabel(currentResult.subject) : "Resposta";
  return `${subject} - ResolveAI`;
}

function buildExportMarkup() {
  if (!currentResult) {
    return "";
  }

  const category = currentResult.category ? `<p><strong>Categoria:</strong> ${currentResult.category}</p>` : "";
  const steps = (currentResult.steps || []).map((step) => `<li>${step}</li>`).join("");
  return `
    <article>
      <h1>${buildExportTitle()}</h1>
      <p><strong>Pergunta:</strong> ${currentResult.question || ""}</p>
      ${category}
      <p><strong>Resposta:</strong> ${currentResult.answer || ""}</p>
      <h2>Passos</h2>
      <ol>${steps}</ol>
    </article>
  `;
}

function exportCurrentResultAsPdf() {
  if (!currentResult) {
    return;
  }

  const printableMarkup = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>${buildExportTitle()}</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; margin: 32px; color: #1f1f1f; }
        article { max-width: 820px; margin: 0 auto; }
        h1 { margin-bottom: 18px; }
        h2 { margin-top: 28px; }
        p, li { line-height: 1.7; }
        ol { padding-left: 24px; }
      </style>
    </head>
    <body>${buildExportMarkup()}</body>
    </html>
  `;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const frameDocument = iframe.contentWindow?.document;
  if (!frameDocument || !iframe.contentWindow) {
    iframe.remove();
    return;
  }

  frameDocument.open();
  frameDocument.write(printableMarkup);
  frameDocument.close();

  window.setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    window.setTimeout(() => iframe.remove(), 1200);
  }, 300);
}

function exportCurrentResultAsImage() {
  if (!currentResult) {
    return;
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const width = 1400;
  const padding = 70;
  const lineHeight = 42;
  const sections = [
    buildExportTitle(),
    "",
    `Pergunta: ${currentResult.question || ""}`,
    currentResult.category ? `Categoria: ${currentResult.category}` : "",
    `Resposta: ${currentResult.answer || ""}`,
    "",
    "Passos:",
    ...(currentResult.steps || []).map((step, index) => `${index + 1}. ${step}`),
  ].filter((line, index, all) => line || (index > 0 && all[index - 1] !== ""));

  const height = Math.max(920, padding * 2 + sections.length * lineHeight + 80);
  canvas.width = width;
  canvas.height = height;

  context.fillStyle = "#f7f1e7";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#1f261f";
  context.font = "bold 34px 'Segoe UI'";

  let y = padding;
  sections.forEach((line, index) => {
    if (index === 0) {
      context.fillStyle = "#d75f39";
      context.font = "bold 38px 'Segoe UI'";
    } else if (line === "Passos:") {
      context.fillStyle = "#2f6c54";
      context.font = "bold 30px 'Segoe UI'";
    } else {
      context.fillStyle = "#1f261f";
      context.font = "24px 'Segoe UI'";
    }

    const words = line.split(" ");
    let currentLine = "";
    words.forEach((word) => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (context.measureText(testLine).width > width - padding * 2) {
        context.fillText(currentLine, padding, y);
        y += lineHeight;
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine || !line) {
      context.fillText(currentLine, padding, y);
      y += lineHeight;
    }
  });

  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = `${buildExportTitle().replace(/\s+/g, "-").toLowerCase()}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function bootstrapAuth() {
  try {
    const user = await apiFetch("/api/auth/me", { method: "GET" });
    if (!user.authenticated) {
      setLoggedOutState();
      return;
    }
    setLoggedInState(user, user.csrf_token);
    const historyData = await loadHistory();
    if (historyData.items.length) {
      showIdleWorkspace();
    } else {
      drawEmptyChart("Resolva uma funcao para ver o grafico.");
    }
  } catch (error) {
    setLoggedOutState();
  }
}

async function ensureAuthenticatedSession() {
  const user = await apiFetch("/api/auth/me", { method: "GET" });
  if (!user.authenticated) {
    setLoggedOutState();
    throw new Error("Sua sessao expirou. Faca login novamente.");
  }
  setLoggedInState(user, user.csrf_token);
  return user;
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

themeToggleBtn?.addEventListener("click", () => {
  const nextTheme = currentTheme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
  window.localStorage.setItem("resolveai-theme", nextTheme);
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
    setLoggedInState(data.user, data.csrf_token);
    setMessage("Login realizado com sucesso.", false);
    const historyData = await loadHistory();
    if (historyData.items.length) {
      showIdleWorkspace();
    } else {
      drawEmptyChart("Resolva uma funcao para ver o grafico.");
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
    setLoggedInState(data.user, data.csrf_token);
    setMessage("Conta criada com sucesso.", false);
    historyQuery.page = 1;
    await loadHistory();
    showIdleWorkspace("Conta pronta. Faca sua primeira pergunta para gerar uma resposta.");
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
      apiFetch("/api/auth/logout", { method: "POST" })
        .catch(() => null)
        .finally(() => {
          setLoggedOutState();
        });
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

  if (!isAuthenticated) {
    resultTitle.textContent = "Login necessario";
    resultAnswer.textContent = "Entre na sua conta para usar a IA e salvar o historico.";
    renderSteps([]);
    drawEmptyChart("Faca login para continuar.");
    return;
  }

  setLoading(true);
  try {
    await ensureAuthenticatedSession();
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

favoriteResultBtn.addEventListener("click", async () => {
  if (!currentResult?.history_id) {
    return;
  }
  await ensureAuthenticatedSession();
  const updated = await updateHistoryItem(currentResult.history_id, {
    is_favorite: !currentResult.is_favorite,
  });
  currentResult = { ...currentResult, ...updated, history_id: updated.id };
  favoriteResultBtn.textContent = updated.is_favorite ? "Desfavoritar" : "Favoritar";
});

saveCategoryBtn.addEventListener("click", async () => {
  if (!currentResult?.history_id) {
    return;
  }
  await ensureAuthenticatedSession();
  const updated = await updateHistoryItem(currentResult.history_id, {
    category: resultCategoryInput.value.trim(),
  });
  currentResult = { ...currentResult, ...updated, history_id: updated.id };
});

exportPdfBtn.addEventListener("click", () => {
  exportCurrentResultAsPdf();
});

exportImageBtn.addEventListener("click", () => {
  exportCurrentResultAsImage();
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

historyFavoritesOnly.addEventListener("change", async () => {
  historyQuery.favorites = historyFavoritesOnly.checked;
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

historyCategoryFilter.addEventListener(
  "input",
  debounce(async () => {
    historyQuery.category = historyCategoryFilter.value.trim();
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
      const viewportAnchor = captureHistoryViewportAnchor();
      try {
        await ensureAuthenticatedSession();
        await animateHistoryClear();
        await apiFetch("/api/history", { method: "DELETE" });
        historyQuery.page = 1;
        await loadHistory();
        await releaseHistoryHeightLock();
        resetWorkspaceAfterClear();
        restoreHistoryViewportAnchor(viewportAnchor);
      } catch (error) {
        await releaseHistoryHeightLock();
        restoreHistoryViewportAnchor(viewportAnchor);
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
initializeTheme();
bootstrapAuth();
