const API_BASE_URL = window.APP_CONFIG?.API_BASE_URL || "http://127.0.0.1:5000";

const userBox = document.getElementById("userBox");
const userEmail = document.getElementById("userEmail");
const profileName = document.getElementById("profileName");
const profileStatus = document.getElementById("profileStatus");
const profileImageInput = document.getElementById("profileImageInput");
const profileAvatarImage = document.getElementById("profileAvatarImage");
const profileAvatarFallback = document.getElementById("profileAvatarFallback");
const appUserInitialsBadge = document.getElementById("appUserInitialsBadge");
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
const responseToolsEmptyState = document.getElementById("responseToolsEmptyState");
const solveLoading = document.getElementById("solveLoading");
const generalNotice = document.getElementById("generalNotice");
const dashboardPeriodChips = document.querySelectorAll(".period-chip");
const subjectBadge = document.getElementById("subjectBadge");
const resultTitle = document.getElementById("resultTitle");
const resultAnswer = document.getElementById("resultAnswer");
const stepsList = document.getElementById("stepsList");
const dashboardQuestions = document.getElementById("dashboardQuestions");
const dashboardQuestionsMeta = document.getElementById("dashboardQuestionsMeta");
const dashboardActiveDays = document.getElementById("dashboardActiveDays");
const dashboardCurrentStreak = document.getElementById("dashboardCurrentStreak");
const dashboardBestStreak = document.getElementById("dashboardBestStreak");
const dashboardTopSubject = document.getElementById("dashboardTopSubject");
const dashboardTopCategory = document.getElementById("dashboardTopCategory");
const dashboardUsagePeriods = document.getElementById("dashboardUsagePeriods");
const dashboardWeeklyChart = document.getElementById("dashboardWeeklyChart");
const dashboardGoalValue = document.getElementById("dashboardGoalValue");
const dashboardGoalMeta = document.getElementById("dashboardGoalMeta");
const dashboardGoalProgress = document.getElementById("dashboardGoalProgress");
const dashboardGoalProgressLabel = document.getElementById("dashboardGoalProgressLabel");
const dashboardConsistencySummary = document.getElementById("dashboardConsistencySummary");
const dashboardConsistencyMeta = document.getElementById("dashboardConsistencyMeta");
const dashboardAlerts = document.getElementById("dashboardAlerts");
const dashboardCategoryProgress = document.getElementById("dashboardCategoryProgress");
const activityCalendarGrid = document.getElementById("activityCalendarGrid");
const activityCalendarSummary = document.getElementById("activityCalendarSummary");
const activityCalendarMonth = document.getElementById("activityCalendarMonth");
const historyList = document.getElementById("historyList");
const historySearch = document.getElementById("historySearch");
const historyCategoryFilter = document.getElementById("historyCategoryFilter");
const historyFavoritesOnly = document.getElementById("historyFavoritesOnly");
const historyPrevBtn = document.getElementById("historyPrevBtn");
const historyNextBtn = document.getElementById("historyNextBtn");
const historyPageInfo = document.getElementById("historyPageInfo");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const chartTitle = document.getElementById("chartTitle");
const chartInsights = document.getElementById("chartInsights");
const chartCanvas = document.getElementById("chartCanvas");
const historyPanel = document.querySelector(".history-panel");
const ctx = chartCanvas.getContext("2d");

let currentResult = null;
let historyQuery = { page: 1, pageSize: 2, subject: "", q: "", category: "", favorites: false };
let historyPagination = { page: 1, total_pages: 1 };
let graphState = { zoom: 1 };
let confirmModalAction = null;
let isAuthenticated = false;
let csrfToken = "";
let answerAnimationToken = 0;
let lastAutoScrollAt = 0;
let dashboardPeriod = "30d";
let currentTheme = "dark";
let currentUser = null;

function applyTheme() {
  currentTheme = "dark";
  document.body.dataset.theme = currentTheme;
  if (currentResult?.graph) {
    drawGraph(currentResult.graph);
  } else {
    drawEmptyChart(isAuthenticated ? "Resolva uma funcao para ver o grafico." : "Faca login para usar o grafico.");
  }
}

function initializeTheme() {
  applyTheme();
}

function getUserDisplayName(user) {
  if (!user?.email) {
    return "Usuario";
  }

  const baseName = user.email.split("@")[0] || "Usuario";
  return baseName
    .replace(/[._-]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getUserInitials(user) {
  const displayName = getUserDisplayName(user);
  const parts = displayName.split(" ").filter(Boolean);
  return (parts.slice(0, 2).map((part) => part.charAt(0)).join("") || "RA").toUpperCase();
}

function getProfileImageStorageKey(user) {
  return user?.id ? `resolveai-profile-image:${user.id}` : `resolveai-profile-image:${user?.email || "guest"}`;
}

function setProfileStatus(message = "") {
  if (profileStatus) {
    profileStatus.textContent = message;
  }
}

function renderProfileAvatar(photoDataUrl = "") {
  if (!profileAvatarImage || !profileAvatarFallback) {
    return;
  }

  const hasPhoto = Boolean(photoDataUrl);
  profileAvatarImage.src = hasPhoto ? photoDataUrl : "";
  profileAvatarImage.classList.toggle("hidden", !hasPhoto);
  profileAvatarFallback.classList.toggle("hidden", hasPhoto);
}

function loadStoredProfilePhoto(user) {
  try {
    return window.localStorage.getItem(getProfileImageStorageKey(user)) || "";
  } catch (error) {
    return "";
  }
}

function persistProfilePhoto(user, photoDataUrl) {
  try {
    const storageKey = getProfileImageStorageKey(user);
    if (photoDataUrl) {
      window.localStorage.setItem(storageKey, photoDataUrl);
    } else {
      window.localStorage.removeItem(storageKey);
    }
    return true;
  } catch (error) {
    return false;
  }
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
  return "Estudos";
}

function dashboardPeriodLabel(period) {
  const labels = {
    "7d": "ultimos 7 dias",
    "30d": "ultimos 30 dias",
    all: "geral",
  };
  return labels[period] || "periodo selecionado";
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

function buildEmptyStateMarkup({ kicker, title, copy, actionLabel = "", prompt = "" }) {
  const action = actionLabel && prompt
    ? `<button class="secondary empty-state-action" type="button" data-question-template="${prompt}">${actionLabel}</button>`
    : "";
  return `
    <article class="empty-state${action ? " empty-state-with-action" : ""}">
      <span class="empty-state-kicker">${kicker}</span>
      <strong>${title}</strong>
      <p>${copy}</p>
      ${action}
    </article>
  `;
}

function fillQuestionTemplate(prompt) {
  if (!prompt || !questionInput) {
    return;
  }
  questionInput.value = prompt;
  questionInput.focus();
  questionInput.scrollIntoView({ behavior: "smooth", block: "center" });
}

function setResponseToolsState(state = "idle") {
  if (!responseToolsEmptyState) {
    return;
  }

  const states = {
    idle: {
      kicker: "Depois da resposta",
      title: "As ferramentas ficam prontas quando a IA responder.",
      copy: "Voce podera favoritar, exportar, copiar ou salvar uma categoria para encontrar depois.",
    },
    ready: {
      kicker: "Resposta pronta",
      title: "Agora voce pode transformar esta resposta em material de revisao.",
      copy: "Favorite, copie, exporte ou salve uma categoria para organizar seu historico.",
    },
    cleared: {
      kicker: "Historico limpo",
      title: "As ferramentas foram pausadas ate a proxima resposta.",
      copy: "Envie uma nova pergunta para liberar exportacao, favoritos e categorias.",
    },
  };
  const content = states[state] || states.idle;
  responseToolsEmptyState.innerHTML = `
    <span class="empty-state-kicker">${content.kicker}</span>
    <strong>${content.title}</strong>
    <p>${content.copy}</p>
  `;
  responseToolsEmptyState.classList.toggle("is-ready", state === "ready");
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
  chartTitle.textContent = "Sem funcao detectada ainda.";
  if (chartInsights) {
    chartInsights.textContent = message;
  }
  ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
  const width = chartCanvas.width;
  const height = chartCanvas.height;
  const gridStroke = currentTheme === "dark" ? "rgba(255, 255, 255, 0.06)" : "rgba(24, 32, 28, 0.08)";
  const lineStroke = currentTheme === "dark" ? "rgba(122, 162, 255, 0.42)" : "rgba(47, 111, 148, 0.34)";
  const textFill = currentTheme === "dark" ? "#c8d1e4" : "#74695f";

  ctx.save();
  ctx.strokeStyle = gridStroke;
  ctx.lineWidth = 1;
  for (let x = 56; x < width; x += 92) {
    ctx.beginPath();
    ctx.moveTo(x, 36);
    ctx.lineTo(x, height - 36);
    ctx.stroke();
  }
  for (let y = 52; y < height; y += 64) {
    ctx.beginPath();
    ctx.moveTo(36, y);
    ctx.lineTo(width - 36, y);
    ctx.stroke();
  }

  ctx.setLineDash([8, 8]);
  ctx.strokeStyle = lineStroke;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(72, height - 92);
  ctx.bezierCurveTo(width * 0.32, 72, width * 0.62, height - 72, width - 76, 86);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = textFill;
  ctx.font = "18px IBM Plex Mono";
  ctx.fillText(message, 36, 48);
  ctx.font = "14px IBM Plex Mono";
  ctx.fillStyle = currentTheme === "dark" ? "rgba(200, 209, 228, 0.62)" : "rgba(116, 105, 95, 0.72)";
  ctx.fillText("Ex.: resolva f(x) = x^2 - 4 para ver raizes e curva.", 36, 76);
  ctx.restore();
}

function drawGraph(graph) {
  if (!graph || !graph.points || graph.points.length < 2) {
    drawEmptyChart("Sem grafico para esta resposta.");
    return;
  }

  chartTitle.textContent = graph.title;
  if (chartInsights) {
    chartInsights.textContent = graph.summary || "Grafico pronto com destaques visuais.";
  }
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
  const labelFill = currentTheme === "dark" ? "rgba(244, 247, 244, 0.74)" : "rgba(24, 32, 28, 0.68)";
  const symmetryStroke = currentTheme === "dark" ? "rgba(125, 190, 255, 0.7)" : "rgba(47, 111, 148, 0.65)";
  const highlightFill = {
    root: currentTheme === "dark" ? "#ffb454" : "#d75f39",
    vertex: currentTheme === "dark" ? "#7dd3fc" : "#2f8fb1",
    intercept: currentTheme === "dark" ? "#8ce99a" : "#2f6c54",
  };

  const projectX = (value) => padding + ((value - visibleMinX) / (visibleMaxX - visibleMinX || 1)) * (width - padding * 2);
  const projectY = (value) => height - padding - ((value - visibleMinY) / (visibleMaxY - visibleMinY || 1)) * (height - padding * 2);
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const formatTick = (value) => {
    const normalized = Math.abs(value) < 0.0001 ? 0 : value;
    const decimals = Number.isInteger(normalized) ? 0 : 1;
    return normalized.toFixed(decimals);
  };
  const drawHighlightLabel = (xPos, yPos, text, fillColor) => {
    ctx.save();
    ctx.font = "12px 'IBM Plex Mono'";
    const metrics = ctx.measureText(text);
    const labelWidth = metrics.width + 16;
    const labelHeight = 24;
    const boxX = clamp(xPos - labelWidth / 2, 12, width - labelWidth - 12);
    const boxY = clamp(yPos - 34, 12, height - labelHeight - 12);
    ctx.fillStyle = currentTheme === "dark" ? "rgba(12, 16, 19, 0.88)" : "rgba(247, 241, 231, 0.92)";
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, labelWidth, labelHeight, 10);
    ctx.fill();
    ctx.strokeStyle = fillColor;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = labelFill;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, boxX + labelWidth / 2, boxY + labelHeight / 2 + 0.5);
    ctx.restore();
  };
  const drawHighlightPoint = (point, fillColor, text) => {
    const px = projectX(point.x);
    const py = projectY(point.y);
    ctx.save();
    ctx.fillStyle = fillColor;
    ctx.strokeStyle = currentTheme === "dark" ? "#0c1013" : "#f7f1e7";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    drawHighlightLabel(px, py, text, fillColor);
  };

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

  ctx.fillStyle = labelFill;
  ctx.font = "12px 'IBM Plex Mono'";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (let i = 0; i <= 4; i += 1) {
    const tickValue = visibleMinX + ((visibleMaxX - visibleMinX) / 4) * i;
    const xPos = padding + ((width - padding * 2) / 4) * i;
    ctx.fillText(formatTick(tickValue), xPos, height - padding + 12);
  }

  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let i = 0; i <= 4; i += 1) {
    const tickValue = visibleMaxY - ((visibleMaxY - visibleMinY) / 4) * i;
    const yPos = padding + ((height - padding * 2) / 4) * i;
    ctx.fillText(formatTick(tickValue), padding - 10, yPos);
  }

  ctx.strokeStyle = axisStroke;
  ctx.beginPath();
  const axisX = clamp(projectX(0), padding, width - padding);
  const axisY = clamp(projectY(0), padding, height - padding);
  ctx.moveTo(axisX, padding);
  ctx.lineTo(axisX, height - padding);
  ctx.moveTo(padding, axisY);
  ctx.lineTo(width - padding, axisY);
  ctx.stroke();

  const axisOfSymmetry = graph.highlights?.axis_of_symmetry;
  if (axisOfSymmetry) {
    const symmetryX = projectX(axisOfSymmetry.x);
    ctx.save();
    ctx.setLineDash([7, 7]);
    ctx.strokeStyle = symmetryStroke;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(symmetryX, padding);
    ctx.lineTo(symmetryX, height - padding);
    ctx.stroke();
    ctx.restore();
  }

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

  (graph.highlights?.roots || []).forEach((rootPoint) => {
    drawHighlightPoint(rootPoint, highlightFill.root, `Raiz ${rootPoint.display}`);
  });

  if (graph.highlights?.y_intercept) {
    drawHighlightPoint(graph.highlights.y_intercept, highlightFill.intercept, `y ${graph.highlights.y_intercept.display_y}`);
  }

  if (graph.highlights?.vertex) {
    const vertex = graph.highlights.vertex;
    drawHighlightPoint(vertex, highlightFill.vertex, `V(${vertex.display_x}, ${vertex.display_y})`);
  }
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
  subjectBadge.textContent = "Chat de estudos";
  resultTitle.textContent = data.title || "Resposta da IA";
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
  setResponseToolsState("ready");
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

function resetDashboard() {
  dashboardQuestions.textContent = "0";
  dashboardQuestionsMeta.textContent = "Faca a primeira pergunta para acompanhar seu ritmo.";
  dashboardActiveDays.textContent = "0";
  dashboardCurrentStreak.textContent = "0d";
  dashboardBestStreak.textContent = "Melhor sequencia: 0 dias.";
  dashboardTopSubject.textContent = "Sem dados";
  dashboardTopCategory.textContent = "Categoria favorita: sem dados.";
  dashboardUsagePeriods.innerHTML = buildEmptyStateMarkup({
    kicker: "Sem consultas ainda",
    title: "Os comparativos aparecem quando voce comeca a estudar.",
    copy: "Faca uma pergunta e volte aqui para comparar 7 dias, 30 dias e geral.",
  });
  dashboardWeeklyChart.innerHTML = buildEmptyStateMarkup({
    kicker: "Evolucao semanal",
    title: "Seu grafico vai nascer das proximas consultas.",
    copy: "Cada resposta salva ajuda a mostrar seu ritmo por semana.",
  });
  dashboardGoalValue.textContent = "0/5";
  dashboardGoalMeta.textContent = "Faca consultas ao longo da semana para acompanhar sua meta.";
  dashboardGoalProgress.style.width = "0%";
  dashboardGoalProgressLabel.textContent = "0% da meta semanal.";
  dashboardConsistencySummary.textContent = "Sem dados de constancia.";
  dashboardConsistencyMeta.textContent = "Seu ritmo recente aparece depois das primeiras consultas.";
  dashboardAlerts.innerHTML = buildEmptyStateMarkup({
    kicker: "Alertas",
    title: "Nada para avisar por enquanto.",
    copy: "Quando houver ritmo, pausa ou meta proxima, o painel destaca aqui.",
  });
  dashboardCategoryProgress.innerHTML = buildEmptyStateMarkup({
    kicker: "Categorias",
    title: "Organize respostas por prova, revisao ou materia.",
    copy: "Depois de salvar uma categoria, seu progresso por tema aparece aqui.",
  });
  activityCalendarMonth.textContent = "Calendario de atividade";
  activityCalendarSummary.textContent = "Aguardando sua primeira consulta.";
  activityCalendarGrid.innerHTML = buildEmptyStateMarkup({
    kicker: "Primeiro registro",
    title: "Seu calendario comeca depois da primeira consulta.",
    copy: "Resolva uma pergunta para marcar atividade e acompanhar sua constancia.",
  });
}

function formatMonthLabel(date) {
  return date.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).replace(".", "");
}

function buildMonthlyCalendarEntries(activityCalendar) {
  const today = new Date();
  const activityMap = new Map(activityCalendar.map((entry) => [entry.day, entry.count]));
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const startOffset = (monthStart.getDay() + 6) % 7;
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - startOffset);

  const endOffset = 6 - ((monthEnd.getDay() + 6) % 7);
  const gridEnd = new Date(monthEnd);
  gridEnd.setDate(monthEnd.getDate() + endOffset);

  const days = [];
  const pointer = new Date(gridStart);
  while (pointer <= gridEnd) {
    const isoDay = `${pointer.getFullYear()}-${String(pointer.getMonth() + 1).padStart(2, "0")}-${String(pointer.getDate()).padStart(2, "0")}`;
    days.push({
      day: isoDay,
      dayNumber: pointer.getDate(),
      count: activityMap.get(isoDay) || 0,
      isCurrentMonth: pointer.getMonth() === today.getMonth(),
      isToday: isoDay === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`,
    });
    pointer.setDate(pointer.getDate() + 1);
  }

  return { monthLabel: formatMonthLabel(today), days };
}

function formatDashboardDayLabel(isoDay) {
  if (!isoDay) {
    return "sem registro recente";
  }

  const parsedDate = new Date(`${isoDay}T00:00:00`);
  return parsedDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function renderDashboard(data) {
  const summary = data.summary || {};
  const streak = data.study_streak || {};
  const usageByPeriod = data.usage_by_period || {};
  const weeklyEvolution = data.weekly_evolution || [];
  const weeklyGoal = data.weekly_goal || {};
  const consistency = data.consistency || {};
  const alerts = data.alerts || [];
  const categoryProgress = data.category_progress || [];

  dashboardQuestions.textContent = String(summary.questions || 0);
  dashboardQuestionsMeta.textContent = `${summary.favorites || 0} favoritos em ${dashboardPeriodLabel(data.selected_period)}.`;
  dashboardActiveDays.textContent = String(summary.active_days || 0);
  dashboardCurrentStreak.textContent = `${streak.current || 0}d`;
  dashboardBestStreak.textContent = `Melhor sequencia: ${streak.best || 0} dias.`;
  dashboardTopSubject.textContent = summary.top_subject ? subjectLabel(summary.top_subject) : "Sem dados";
  dashboardTopCategory.textContent = summary.top_category
    ? `Categoria favorita: ${summary.top_category}.`
    : "Categoria favorita: sem dados.";

  dashboardGoalValue.textContent = `${weeklyGoal.completed || 0}/${weeklyGoal.target || 0}`;
  dashboardGoalMeta.textContent = (weeklyGoal.remaining || 0) > 0
    ? `Faltam ${weeklyGoal.remaining} atividade(s) para fechar a meta desta semana.`
    : "Meta semanal concluida. Aproveite para revisar ou aprofundar um topico.";
  dashboardGoalProgress.style.width = `${weeklyGoal.progress_percent || 0}%`;
  dashboardGoalProgressLabel.textContent = `${weeklyGoal.progress_percent || 0}% da meta em ${weeklyGoal.week_label || "esta semana"}.`;

  dashboardConsistencySummary.textContent = (consistency.current_streak || 0) > 0
    ? `Sequencia atual: ${consistency.current_streak} dia(s).`
    : "Constancia ainda em construcao.";
  dashboardConsistencyMeta.textContent = `Ultima atividade: ${formatDashboardDayLabel(consistency.last_active_day)}. ${consistency.active_days_last_7d || 0} dia(s) ativos nos ultimos 7 dias.`;

  dashboardAlerts.innerHTML = "";
  if (!alerts.length) {
    dashboardAlerts.innerHTML = buildEmptyStateMarkup({
      kicker: "Alertas",
      title: "Nada para avisar por enquanto.",
      copy: "Quando houver ritmo, pausa ou meta proxima, o painel destaca aqui.",
    });
  } else {
    alerts.forEach((alert) => {
      const card = document.createElement("article");
      card.className = `dashboard-alert ${alert.tone || "info"}`;
      card.innerHTML = `
        <strong>${alert.title || "Alerta"}</strong>
        <p>${alert.message || ""}</p>
      `;
      dashboardAlerts.appendChild(card);
    });
  }

  dashboardCategoryProgress.innerHTML = "";
  if (!categoryProgress.length) {
    dashboardCategoryProgress.innerHTML = buildEmptyStateMarkup({
      kicker: "Categorias",
      title: "Organize respostas por prova, revisao ou materia.",
      copy: "Depois de salvar uma categoria, seu progresso por tema aparece aqui.",
    });
  } else {
    categoryProgress.forEach((entry) => {
      const item = document.createElement("article");
      item.className = "category-progress-item";
      item.innerHTML = `
        <div class="category-progress-top">
          <strong>${entry.category}</strong>
          <span>${entry.questions} consulta(s)</span>
        </div>
        <div class="category-progress-bar" aria-hidden="true">
          <span class="category-progress-fill" style="width: ${entry.share_percent || 0}%;"></span>
        </div>
        <div class="category-progress-meta">
          <span>${entry.share_percent || 0}% do periodo</span>
          <span>${entry.favorites || 0} favorito(s)</span>
        </div>
      `;
      dashboardCategoryProgress.appendChild(item);
    });
  }

  const activityCalendar = data.activity_calendar || [];
  const maxActivity = Math.max(...activityCalendar.map((entry) => entry.count), 0);
  const monthlyCalendar = buildMonthlyCalendarEntries(activityCalendar);
  activityCalendarMonth.textContent = monthlyCalendar.monthLabel;
  activityCalendarGrid.innerHTML = "";
  if (!monthlyCalendar.days.length) {
    activityCalendarGrid.innerHTML = buildEmptyStateMarkup({
      kicker: "Calendario",
      title: "Ainda nao ha dados para montar o calendario.",
      copy: "Use o agente de IA algumas vezes para criar seu mapa de atividade.",
    });
  } else {
    monthlyCalendar.days.forEach((entry) => {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = `activity-cell level-${Math.min(entry.count, 4)}${entry.isCurrentMonth ? "" : " is-outside"}${entry.isToday ? " is-today" : ""}${entry.count > 0 ? " is-active" : ""}`;
      cell.dataset.count = String(entry.count);
      cell.textContent = String(entry.dayNumber);
      if (entry.count > 0 && maxActivity > 0) {
        cell.style.opacity = `${0.22 + (entry.count / maxActivity) * 0.78}`;
      }
      cell.title = `${entry.day} - ${entry.count} atividade(s)`;
      activityCalendarGrid.appendChild(cell);
    });
  }
  const activeDays = activityCalendar.filter((entry) => entry.count > 0).length;
  activityCalendarSummary.textContent = `${activeDays} dias ativos nos ultimos 42 dias.`;

  dashboardUsagePeriods.innerHTML = "";
  ["7d", "30d", "all"].forEach((periodKey) => {
    const periodData = usageByPeriod[periodKey];
    if (!periodData) {
      return;
    }
    const card = document.createElement("article");
    card.className = `usage-period-card${periodKey === data.selected_period ? " active" : ""}`;
    card.innerHTML = `
      <p class="section-tag">${periodData.label}</p>
      <strong>${periodData.questions}</strong>
      <span>${periodData.active_days} dias ativos</span>
    `;
    dashboardUsagePeriods.appendChild(card);
  });

  dashboardWeeklyChart.innerHTML = "";
  if (!weeklyEvolution.length) {
    dashboardWeeklyChart.innerHTML = buildEmptyStateMarkup({
      kicker: "Evolucao semanal",
      title: "Ainda nao ha volume suficiente para o grafico.",
      copy: "Suas proximas consultas vao preencher este comparativo automaticamente.",
    });
    return;
  }

  const maxValue = Math.max(...weeklyEvolution.map((point) => point.questions), 1);
  weeklyEvolution.forEach((point) => {
    const bar = document.createElement("article");
    bar.className = "weekly-bar-card";

    const value = document.createElement("strong");
    value.className = "weekly-bar-value";
    value.textContent = String(point.questions);

    const meter = document.createElement("div");
    meter.className = "weekly-bar-meter";

    const fill = document.createElement("span");
    fill.className = "weekly-bar-fill";
    fill.style.height = `${Math.max(8, (point.questions / maxValue) * 100)}%`;

    const label = document.createElement("span");
    label.className = "weekly-bar-label";
    label.textContent = point.label;

    meter.appendChild(fill);
    bar.append(value, meter, label);
    dashboardWeeklyChart.appendChild(bar);
  });
}
async function loadDashboard() {
  const data = await apiFetch(`/api/dashboard?period=${dashboardPeriod}`, { method: "GET" });
  renderDashboard(data);
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
  await loadDashboard();
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
    historyList.innerHTML = buildEmptyStateMarkup({
      kicker: historyQuery.q || historyQuery.category || historyQuery.favorites ? "Nenhum resultado" : "Historico vazio",
      title: historyQuery.q || historyQuery.category || historyQuery.favorites
        ? "Nao encontrei consultas com esse filtro."
        : "Suas consultas salvas vao aparecer aqui.",
      copy: historyQuery.q || historyQuery.category || historyQuery.favorites
        ? "Ajuste a busca, remova filtros ou salve novas respostas com categorias."
        : "Comece por uma pergunta simples e use categoria ou favorito para encontrar depois.",
      actionLabel: historyQuery.q || historyQuery.category || historyQuery.favorites ? "" : "Usar exemplo",
      prompt: "Resolva 2*x + 3 = 11 passo a passo",
    });
    return;
  }

  items.forEach((item) => {
    const article = document.createElement("article");
    article.className = "history-item";

    const top = document.createElement("div");
    top.className = "history-top";

    const title = document.createElement("h3");
    title.textContent = item.category || "Consulta salva";

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
  currentUser = user;
  csrfToken = nextCsrfToken || user.csrf_token || csrfToken;
  userBox.classList.remove("hidden");
  const displayName = getUserDisplayName(user);
  const initials = getUserInitials(user);
  if (profileName) {
    profileName.textContent = displayName;
  }
  userEmail.textContent = user.email;
  if (profileAvatarFallback) {
    profileAvatarFallback.textContent = initials;
  }
  if (appUserInitialsBadge) {
    appUserInitialsBadge.textContent = initials;
  }
  renderProfileAvatar(loadStoredProfilePhoto(user));
  setProfileStatus("");
}

function setLoggedOutState() {
  isAuthenticated = false;
  currentUser = null;
  csrfToken = "";
  userBox.classList.add("hidden");
  window.location.replace("./");
}

function resetWorkspaceAfterClear() {
  subjectBadge.textContent = "Chat de estudos";
  resultTitle.textContent = "Historico limpo";
  resultAnswer.textContent = "Seu historico foi apagado. Faca uma nova pergunta para gerar uma resposta e reconstruir seu painel.";
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
  setResponseToolsState("cleared");
  graphState.zoom = 1;
  drawEmptyChart("Nenhum grafico salvo no historico.");
}

function showIdleWorkspace(message = "Digite uma pergunta ou use uma sugestao acima para gerar sua primeira resposta.") {
  answerAnimationToken += 1;
  currentResult = null;
  subjectBadge.textContent = "Chat de estudos";
  resultTitle.textContent = "Comece por uma pergunta";
  resultAnswer.textContent = message;
  renderSteps([
    "Escolha um objetivo: resolver, revisar ou planejar.",
    "Envie uma pergunta objetiva para a IA.",
    "Salve categoria ou favorito quando a resposta for util.",
  ]);
  generalNotice.classList.add("hidden");
  copyAnswerBtn.disabled = true;
  exportImageBtn.disabled = true;
  exportPdfBtn.disabled = true;
  favoriteResultBtn.disabled = true;
  favoriteResultBtn.textContent = "Favoritar";
  saveCategoryBtn.disabled = true;
  resultCategoryInput.disabled = true;
  resultCategoryInput.value = "";
  setResponseToolsState("idle");
  graphState.zoom = 1;
  drawEmptyChart("Pergunte sobre uma funcao para gerar um grafico.");
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
    await loadDashboard();
    showIdleWorkspace(historyData.items.length
      ? "Escolha uma consulta no historico ou faca uma nova pergunta para gerar uma resposta."
      : "Use uma sugestao acima ou digite sua primeira pergunta para comecar.");
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

profileImageInput?.addEventListener("change", () => {
  const file = profileImageInput.files?.[0];
  if (!file || !currentUser) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    setProfileStatus("Escolha uma imagem valida.");
    profileImageInput.value = "";
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    setProfileStatus("A imagem deve ter ate 2 MB.");
    profileImageInput.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const result = typeof reader.result === "string" ? reader.result : "";
    renderProfileAvatar(result);
    const persisted = persistProfilePhoto(currentUser, result);
    setProfileStatus(persisted ? "Foto atualizada neste navegador." : "Nao foi possivel salvar a foto.");
    profileImageInput.value = "";
  };
  reader.onerror = () => {
    setProfileStatus("Nao foi possivel carregar a imagem.");
    profileImageInput.value = "";
  };
  reader.readAsDataURL(file);
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

document.addEventListener("click", (event) => {
  const templateButton = event.target.closest("[data-question-template]");
  if (!templateButton) {
    return;
  }
  fillQuestionTemplate(templateButton.dataset.questionTemplate);
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
    const data = await apiFetch("/api/solve", {
      method: "POST",
      body: JSON.stringify({ question }),
    });
    renderResult(data);
    historyQuery.page = 1;
    await loadHistory();
    await loadDashboard();
  } catch (error) {
    resultTitle.textContent = "Erro";
    resultAnswer.textContent = error.message;
    renderSteps([]);
    drawEmptyChart("Nao foi possivel montar o grafico.");
  } finally {
    if (isAuthenticated) {
      setLoading(false);
    }
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
  await loadDashboard();
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
  await loadDashboard();
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

dashboardPeriodChips.forEach((chip) => {
  chip.addEventListener("click", async () => {
    if (dashboardPeriod === chip.dataset.period) {
      return;
    }
    dashboardPeriod = chip.dataset.period;
    dashboardPeriodChips.forEach((item) => item.classList.toggle("active", item === chip));
    if (isAuthenticated) {
      await loadDashboard();
    }
  });
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
        await loadDashboard();
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
resetDashboard();
setResponseToolsState("idle");
initializeTheme();
bootstrapAuth();





