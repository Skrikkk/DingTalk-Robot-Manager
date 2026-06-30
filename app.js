const STORAGE_KEY = "robot-sender-ui-state-v1";

const iconMap = {
  search: "search",
  plus: "plus",
  copy: "copy",
  save: "save",
  "shield-check": "shield-check",
  "file-plus": "file-plus-2",
  "user-plus": "user-plus",
  minimize: "minus",
  maximize: "square",
  close: "x",
  play: "play",
  download: "download",
  trash: "trash-2",
  folder: "folder-open",
  file: "file",
  at: "at-sign"
};

let contextRobotId = null;

const providerMeta = {
  dingtalk: { label: "钉钉", hint: "oapi.dingtalk.com", color: "#2563eb" },
  feishu: { label: "飞书", hint: "open.feishu.cn", color: "#0ea5e9" },
  wecom: { label: "企业微信", hint: "qyapi.weixin.qq.com", color: "#1d4ed8" }
};

const initialState = {
  activeProvider: "all",
  selectedId: "dds-daily",
  sendMode: "once",
  robots: [
    {
      id: "dds-daily",
      name: "DDS Daily Update",
      provider: "dingtalk",
      icon: "D",
      note: "价格与合约文件更新",
      webhook: "https://oapi.dingtalk.com/robot/send?access_token=xxxxxxxx",
      credentials: {
        appKey: "",
        appSecret: "",
        userId: "",
        deptId: "",
        testAt: "",
        environment: "生产"
      },
      permissions: {
        webhook: true,
        sendText: true,
        uploadFile: false,
        mentions: true,
        schedule: true
      },
      task: {
        sendDate: todayISO(),
        sendTime: "09:30",
        repeatRule: "none",
        pattern: "{yyyyMMdd}",
        message: "DDS-TEST.\n{today_yymmdd}\n数据更新如下:",
        files: [
          { path: "D:/Work/Julien/00 F9价格上传/02 合约原文件/00 GL/GL TPEB 1st of 14th of July 2026.pdf", mode: "fixed", pattern: "" }
        ],
        mentions: [{ type: "userId", value: "411127371237758256" }]
      }
    },
    {
      id: "weekly-ops",
      name: "Ops Weekly Bot",
      provider: "feishu",
      icon: "O",
      note: "周报提醒",
      webhook: "https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxxxx",
      credentials: { appKey: "", appSecret: "", userId: "", deptId: "", testAt: "", environment: "测试" },
      permissions: { webhook: true, sendText: true, uploadFile: false, mentions: false, schedule: true },
      task: {
        sendDate: todayISO(),
        sendTime: "17:00",
        repeatRule: "weekly",
        pattern: "",
        message: "Weekly update\n请查收本周汇总。",
        files: [],
        mentions: []
      }
    },
    {
      id: "finance-alert",
      name: "Finance Alert",
      provider: "wecom",
      icon: "F",
      note: "费用审批提醒",
      webhook: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxxxxxxx",
      credentials: { appKey: "", appSecret: "", userId: "", deptId: "", testAt: "", environment: "生产" },
      permissions: { webhook: true, sendText: true, uploadFile: false, mentions: true, schedule: false },
      task: {
        sendDate: todayISO(),
        sendTime: "10:00",
        repeatRule: "weekday",
        pattern: "",
        message: "费用数据已更新，请确认。",
        files: [],
        mentions: [{ type: "mobile", value: "13800000000" }]
      }
    }
  ]
};

let state = loadState();

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : structuredClone(initialState);
  } catch {
    return structuredClone(initialState);
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function selectedRobot() {
  return state.robots.find((robot) => robot.id === state.selectedId) || state.robots[0];
}

function renderIcons() {
  document.querySelectorAll("[data-icon]").forEach((node) => {
    const key = node.dataset.icon;
    node.innerHTML = "";
    node.setAttribute("data-lucide", iconMap[key] || key);
  });
  window.lucide?.createIcons({
    attrs: {
      width: 18,
      height: 18,
      "stroke-width": 2
    }
  });
}

function detectProvider(webhook) {
  if (/oapi\.dingtalk\.com/i.test(webhook)) return "dingtalk";
  if (/open\.feishu\.cn|larksuite/i.test(webhook)) return "feishu";
  if (/qyapi\.weixin\.qq\.com/i.test(webhook)) return "wecom";
  return null;
}

function renderRobotList() {
  const query = document.querySelector("#robotSearch").value.trim().toLowerCase();
  const list = document.querySelector("#robotList");
  list.innerHTML = "";
  state.robots
    .filter((robot) => state.activeProvider === "all" || robot.provider === state.activeProvider)
    .filter((robot) => `${robot.name} ${robot.note} ${robot.webhook}`.toLowerCase().includes(query))
    .forEach((robot) => {
      const button = document.createElement("button");
      button.className = `robot-item ${robot.id === state.selectedId ? "active" : ""}`;
      button.type = "button";
      button.innerHTML = `
        ${robotAvatarHTML(robot)}
        <div class="robot-meta">
          <strong>${escapeHTML(robot.name)}</strong>
          <span>${escapeHTML(robot.note || providerMeta[robot.provider].label)}</span>
        </div>
        <span class="provider-chip">${providerMeta[robot.provider].label}</span>
      `;
      button.addEventListener("click", () => {
        state.selectedId = robot.id;
        persist();
        renderAll();
      });
      button.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        state.selectedId = robot.id;
        contextRobotId = robot.id;
        persist();
        renderAll();
        openContextMenu(event.clientX, event.clientY);
      });
      list.appendChild(button);
    });
}

function renderProviderTabs() {
  document.querySelectorAll(".provider-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.provider === state.activeProvider);
  });
}

function renderForm() {
  const robot = selectedRobot();
  const meta = providerMeta[robot.provider];

  setValue("selectedProvider", meta.label, "text");
  setValue("selectedRobotName", robot.name, "text");
  setValue("appKey", robot.credentials.appKey);
  setValue("appSecret", robot.credentials.appSecret);
  setValue("userId", robot.credentials.userId);
  setValue("deptId", robot.credentials.deptId);
  setValue("testAt", robot.credentials.testAt);
  setValue("environment", robot.credentials.environment);
  setValue("sendDate", robot.task.sendDate);
  setValue("sendTime", robot.task.sendTime);
  setValue("repeatRule", robot.task.repeatRule);
  setValue("patternInput", robot.task.pattern);
  setValue("messageBody", robot.task.message);

  const badge = document.querySelector("#webhookBadge");
  const detected = detectProvider(robot.webhook);
  badge.className = `status-badge ${detected ? "ok" : "warn"}`;
  badge.textContent = detected ? `识别为${providerMeta[detected].label}` : "待识别";

  renderPermissions(robot);
  renderFiles(robot);
  renderMentions(robot);
  renderSegmented();
  renderPreview(robot);
}

function renderPermissions(robot) {
  const items = [
    ["webhook", "Webhook 格式", "识别平台域名和 token 参数"],
    ["sendText", "发送消息", "无权限时无法推送文本"],
    ["uploadFile", "上传附件", "无权限时仅能发送文本或外链"],
    ["mentions", "@ 人", "无权限时 @ 列表会被忽略"],
    ["schedule", "定时任务", "无权限时需要外部计划任务"]
  ];
  const wrap = document.querySelector("#permissionList");
  wrap.innerHTML = items
    .map(([key, title, desc]) => {
      const ok = robot.permissions[key];
      return `
        <div class="permission-item">
          <span class="status-badge ${ok ? "ok" : "warn"}">${ok ? "OK" : "!"}</span>
          <div><strong>${title}</strong><span>${desc}</span></div>
        </div>
      `;
    })
    .join("");
}

function renderFiles(robot) {
  const wrap = document.querySelector("#fileList");
  wrap.innerHTML = "";
  robot.task.files.forEach((file, index) => {
    const row = document.createElement("div");
    row.className = "file-row";
    row.innerHTML = `
      <input value="${escapeAttr(file.path)}" data-file-field="path" data-index="${index}" placeholder="D:/path/report-{yyyyMMdd}.pdf" />
      <select data-file-field="mode" data-index="${index}">
        <option value="fixed" ${file.mode === "fixed" ? "selected" : ""}>固定文件</option>
        <option value="date-template" ${file.mode === "date-template" ? "selected" : ""}>日期模板</option>
        <option value="regex" ${file.mode === "regex" ? "selected" : ""}>正则匹配</option>
      </select>
      <input value="${escapeAttr(file.pattern || "")}" data-file-field="pattern" data-index="${index}" placeholder="可选规则" />
      <button class="mini-button" type="button" title="选择文件" data-browse-file="${index}" style="color: var(--primary)"><span data-icon="folder"></span></button>
      <button class="mini-button" type="button" title="删除附件" data-remove-file="${index}"><span data-icon="trash"></span></button>
      <input type="file" data-file-picker="${index}" hidden />
    `;
    wrap.appendChild(row);
  });
}

function renderMentions(robot) {
  const wrap = document.querySelector("#mentionList");
  wrap.innerHTML = "";
  robot.task.mentions.forEach((mention, index) => {
    const row = document.createElement("div");
    row.className = "mention-row";
    row.innerHTML = `
      <select data-mention-field="type" data-index="${index}">
        <option value="userId" ${mention.type === "userId" ? "selected" : ""}>userId</option>
        <option value="mobile" ${mention.type === "mobile" ? "selected" : ""}>手机号</option>
        <option value="all" ${mention.type === "all" ? "selected" : ""}>所有人</option>
      </select>
      <input value="${escapeAttr(mention.value)}" data-mention-field="value" data-index="${index}" placeholder="输入 @ 对象" />
      <button class="mini-button" type="button" title="删除 @ 人" data-remove-mention="${index}"><span data-icon="trash"></span></button>
    `;
    wrap.appendChild(row);
  });
}

function renderSegmented() {
  document.querySelectorAll(".segmented button").forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === state.sendMode);
  });
}

function renderPreview(robot) {
  document.querySelector("#previewIcon").textContent = robot.icon;
  document.querySelector("#previewIcon").style.background = providerMeta[robot.provider].color;
  document.querySelector("#previewIcon").style.color = "#fff";
  if (robot.iconPath) {
    document.querySelector("#previewIcon").innerHTML = `<img alt="" src="${fileURL(robot.iconPath)}" />`;
  }
  document.querySelector("#previewTitle").textContent = robot.name;
  document.querySelector("#previewMessage").textContent = renderTokens(robot.task.message);
  document.querySelector("#scheduleSummary").textContent = scheduleText(robot);

  document.querySelector("#previewFiles").innerHTML = robot.task.files
    .map((file) => `<span class="pill"><span data-icon="file"></span><span>${escapeHTML(file.path || "未选择文件")}</span></span>`)
    .join("");
  document.querySelector("#previewMentions").innerHTML = robot.task.mentions
    .map((mention) => `<span class="pill"><span data-icon="at"></span><span>@${escapeHTML(mention.value || mention.type)}</span></span>`)
    .join("");

  const validations = [];
  if (!detectProvider(robot.webhook)) validations.push(["warn", "Webhook 未识别平台，仍可保存但需要手动确认。"]);
  if (!robot.permissions.sendText) validations.push(["warn", "无发送消息权限，将无法推送文本。"]);
  if (robot.task.files.length && !robot.permissions.uploadFile) validations.push(["warn", "无上传附件权限，附件发送可能失败。"]);
  if (!validations.length) validations.push(["ok", "当前配置满足基础发送条件。"]);
  document.querySelector("#validationMessages").innerHTML = validations
    .map(([type, text]) => `<div class="validation-item ${type}">${text}</div>`)
    .join("");
}

function scheduleText(robot) {
  const rule = robot.task.repeatRule;
  const time = `${robot.task.sendDate || "未定日期"} ${robot.task.sendTime || "未定时间"}`;
  if (state.sendMode === "once" || rule === "none") return `单次 ${time}`;
  const labels = { daily: "每天", weekday: "工作日", weekly: "每周", monthly: "每月", cron: "Cron" };
  return `${labels[rule] || "定期"} ${robot.task.sendTime || ""}`;
}

function renderTokens(text) {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return String(text || "")
    .replaceAll("{today_yymmdd}", `${yy}${mm}${dd}`)
    .replaceAll("{yyMMdd}", `${yy}${mm}${dd}`)
    .replaceAll("{yyyyMMdd}", `${yyyy}${mm}${dd}`)
    .replaceAll("{yyyy-MM-dd}", `${yyyy}-${mm}-${dd}`);
}

function setValue(id, value, mode = "value") {
  const el = document.querySelector(`#${id}`);
  if (!el) return;
  if (mode === "text") el.textContent = value || "";
  else el.value = value || "";
}

function updateSelected(mutator, rerender = true) {
  const robot = selectedRobot();
  mutator(robot);
  persist();
  if (rerender) {
    renderAll();
  } else {
    refreshLiveRegions(robot);
  }
}

function refreshLiveRegions(robot) {
  const meta = providerMeta[robot.provider];
  setValue("selectedProvider", meta.label, "text");
  setValue("selectedRobotName", robot.name, "text");
  const badge = document.querySelector("#webhookBadge");
  const detected = detectProvider(robot.webhook);
  badge.className = `status-badge ${detected ? "ok" : "warn"}`;
  badge.textContent = detected ? `识别为${providerMeta[detected].label}` : "待识别";
  renderPreview(robot);
  renderIcons();
}

function robotAvatarHTML(robot) {
  if (robot.iconPath) {
    return `<div class="robot-avatar image-avatar" style="background:${providerMeta[robot.provider].color}"><img alt="" src="${fileURL(robot.iconPath)}" /></div>`;
  }
  return `<div class="robot-avatar" style="background:${providerMeta[robot.provider].color}; color:white">${escapeHTML(robot.icon)}</div>`;
}

function fileURL(path) {
  return `file:///${String(path).replace(/\\/g, "/").replace(/^\/+/, "")}`;
}

function openContextMenu(x, y) {
  const menu = document.querySelector("#robotContextMenu");
  menu.hidden = false;
  const { innerWidth, innerHeight } = window;
  const width = 190;
  const height = 230;
  menu.style.left = `${Math.min(x, innerWidth - width - 10)}px`;
  menu.style.top = `${Math.min(y, innerHeight - height - 10)}px`;
}

function closeContextMenu() {
  document.querySelector("#robotContextMenu").hidden = true;
}

function contextRobot() {
  return state.robots.find((robot) => robot.id === contextRobotId) || selectedRobot();
}

function openProfileModal(robot = selectedRobot()) {
  contextRobotId = robot.id;
  setValue("profileName", robot.name);
  setValue("profileProvider", robot.provider);
  setValue("profileNote", robot.note);
  setValue("profileWebhook", robot.webhook);
  document.querySelector("#profileModal").hidden = false;
  renderIcons();
}

function closeProfileModal() {
  document.querySelector("#profileModal").hidden = true;
}

async function chooseRobotIcon(robot) {
  if (window.robotDesktop?.chooseFiles) {
    const paths = await window.robotDesktop.chooseFiles();
    if (!paths?.length) return;
    robot.iconPath = paths[0];
    robot.icon = " ";
  } else {
    const value = prompt("输入图标字母或图片路径", robot.iconPath || robot.icon || "R");
    if (!value) return;
    if (/\.(png|jpe?g|gif|webp|svg)$/i.test(value)) {
      robot.iconPath = value;
      robot.icon = " ";
    } else {
      robot.iconPath = "";
      robot.icon = value.slice(0, 2).toUpperCase();
    }
  }
  persist();
  renderAll();
}

function wireEvents() {
  document.querySelector("#robotSearch").addEventListener("input", renderRobotList);
  document.addEventListener("click", (event) => {
    if (!event.target.closest("#robotContextMenu")) {
      closeContextMenu();
    }
  });
  document.querySelectorAll(".provider-tab").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeProvider = button.dataset.provider;
      persist();
      renderAll();
    });
  });

  document.querySelector("#addRobotBtn").addEventListener("click", () => {
    const id = `robot-${Date.now()}`;
    state.robots.unshift({
      id,
      name: "New Robot",
      provider: "dingtalk",
      icon: "R",
      note: "",
      webhook: "",
      credentials: { appKey: "", appSecret: "", userId: "", deptId: "", testAt: "", environment: "测试" },
      permissions: { webhook: false, sendText: false, uploadFile: false, mentions: false, schedule: true },
      task: { sendDate: todayISO(), sendTime: "09:00", repeatRule: "none", pattern: "", message: "", files: [], mentions: [] }
    });
    state.selectedId = id;
    persist();
    renderAll();
  });

  document.querySelector("#duplicateRobotBtn").addEventListener("click", () => {
    const copy = structuredClone(selectedRobot());
    copy.id = `robot-${Date.now()}`;
    copy.name = `${copy.name} Copy`;
    state.robots.unshift(copy);
    state.selectedId = copy.id;
    persist();
    renderAll();
    toast("已复制配置", "新机器人已添加到列表顶部。");
  });

  document.querySelector("#saveRobotBtn").addEventListener("click", () => {
    persist();
    toast("已保存", "配置已保存到浏览器 localStorage。");
  });

  document.querySelector("#runCheckBtn").addEventListener("click", () => {
    updateSelected((robot) => {
      const detected = detectProvider(robot.webhook);
      robot.permissions.webhook = Boolean(detected);
      robot.permissions.sendText = Boolean(detected);
      robot.permissions.uploadFile = robot.provider === "dingtalk" && Boolean(robot.credentials.appKey && robot.credentials.appSecret);
      robot.permissions.mentions = Boolean(detected && robot.credentials.testAt);
    });
    const robot = selectedRobot();
    if (!robot.permissions.uploadFile) {
      toast("权限提示", "无对应上传附件权限，将无法发送本地附件；你可以忽略并继续配置。");
    } else {
      toast("检查完成", "基础发送与附件上传参数已填写。");
    }
  });

  [
    ["appKey", (robot, value) => (robot.credentials.appKey = value)],
    ["appSecret", (robot, value) => (robot.credentials.appSecret = value)],
    ["userId", (robot, value) => (robot.credentials.userId = value)],
    ["deptId", (robot, value) => (robot.credentials.deptId = value)],
    ["testAt", (robot, value) => (robot.credentials.testAt = value)],
    ["environment", (robot, value) => (robot.credentials.environment = value)],
    ["sendDate", (robot, value) => (robot.task.sendDate = value)],
    ["sendTime", (robot, value) => (robot.task.sendTime = value)],
    ["repeatRule", (robot, value) => (robot.task.repeatRule = value)],
    ["patternInput", (robot, value) => (robot.task.pattern = value)],
    ["messageBody", (robot, value) => (robot.task.message = value)]
  ].forEach(([id, setter]) => {
    document.querySelector(`#${id}`).addEventListener("input", (event) => {
      updateSelected((robot) => setter(robot, event.target.value), false);
    });
  });

  document.querySelector("#robotContextMenu").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-context-action]");
    if (!button) return;
    const action = button.dataset.contextAction;
    const robot = contextRobot();
    closeContextMenu();
    if (action === "profile") {
      openProfileModal(robot);
    }
    if (action === "rename") {
      const value = prompt("重命名机器人", robot.name);
      if (value) updateSelected((selected) => (selected.name = value.trim() || selected.name));
    }
    if (action === "icon") {
      await chooseRobotIcon(robot);
    }
    if (action === "type") {
      const value = prompt("修改类型：dingtalk / feishu / wecom", robot.provider);
      if (providerMeta[value]) updateSelected((selected) => (selected.provider = value));
    }
    if (action === "note") {
      const value = prompt("备注", robot.note || "");
      if (value !== null) updateSelected((selected) => (selected.note = value));
    }
    if (action === "delete") {
      if (state.robots.length <= 1) {
        toast("无法删除", "至少需要保留一个机器人。");
        return;
      }
      if (!confirm(`删除机器人「${robot.name}」？`)) return;
      state.robots = state.robots.filter((item) => item.id !== robot.id);
      state.selectedId = state.robots[0].id;
      persist();
      renderAll();
    }
  });

  document.querySelector("#closeProfileModal").addEventListener("click", closeProfileModal);
  document.querySelector("#cancelProfileBtn").addEventListener("click", closeProfileModal);
  document.querySelector("#profileModal").addEventListener("click", (event) => {
    if (!event.target.closest(".modal-panel")) {
      closeProfileModal();
    }
  });
  document.querySelector("#profileIconBtn").addEventListener("click", async () => {
    await chooseRobotIcon(contextRobot());
    openProfileModal(contextRobot());
  });
  document.querySelector("#saveProfileBtn").addEventListener("click", () => {
    const robot = contextRobot();
    robot.name = document.querySelector("#profileName").value.trim() || robot.name;
    robot.provider = document.querySelector("#profileProvider").value;
    robot.note = document.querySelector("#profileNote").value;
    robot.webhook = document.querySelector("#profileWebhook").value;
    const detected = detectProvider(robot.webhook);
    if (detected) robot.provider = detected;
    state.selectedId = robot.id;
    persist();
    closeProfileModal();
    renderAll();
  });

  document.querySelector(".segmented").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-mode]");
    if (!button) return;
    state.sendMode = button.dataset.mode;
    if (state.sendMode === "recurring" && selectedRobot().task.repeatRule === "none") {
      selectedRobot().task.repeatRule = "daily";
    }
    persist();
    renderAll();
  });

  document.querySelector("#addFileBtn").addEventListener("click", () => {
    updateSelected((robot) => robot.task.files.push({ path: "", mode: "fixed", pattern: "" }));
  });

  document.querySelector("#addMentionBtn").addEventListener("click", () => {
    updateSelected((robot) => robot.task.mentions.push({ type: "userId", value: "" }));
  });

  document.body.addEventListener("input", (event) => {
    const fileField = event.target.dataset.fileField;
    const mentionField = event.target.dataset.mentionField;
    if (fileField) {
      updateSelected((robot) => {
        robot.task.files[Number(event.target.dataset.index)][fileField] = event.target.value;
      }, false);
    }
    if (mentionField) {
      updateSelected((robot) => {
        robot.task.mentions[Number(event.target.dataset.index)][mentionField] = event.target.value;
      }, false);
    }
  });

  document.body.addEventListener("click", (event) => {
    const removeFile = event.target.closest("[data-remove-file]");
    const removeMention = event.target.closest("[data-remove-mention]");
    const browseFile = event.target.closest("[data-browse-file]");
    if (browseFile) {
      if (window.robotDesktop?.chooseFiles) {
        window.robotDesktop.chooseFiles().then((paths) => {
          if (!paths?.length) return;
          updateSelected((robot) => {
            const index = Number(browseFile.dataset.browseFile);
            robot.task.files[index].path = paths[0];
            paths.slice(1).forEach((path) => robot.task.files.push({ path, mode: "fixed", pattern: "" }));
          });
        });
      } else {
        document.querySelector(`[data-file-picker="${browseFile.dataset.browseFile}"]`)?.click();
      }
    }
    if (removeFile) {
      updateSelected((robot) => robot.task.files.splice(Number(removeFile.dataset.removeFile), 1));
    }
    if (removeMention) {
      updateSelected((robot) => robot.task.mentions.splice(Number(removeMention.dataset.removeMention), 1));
    }
  });

  document.body.addEventListener("change", (event) => {
    const picker = event.target.closest("[data-file-picker]");
    if (!picker || !picker.files?.length) return;
    const file = picker.files[0];
    updateSelected((robot) => {
      robot.task.files[Number(picker.dataset.filePicker)].path = file.name;
    });
  });

  document.querySelector("#dryRunBtn").addEventListener("click", () => {
    toast("模拟发送", "已完成 UI 侧检查；真实接口会在后续版本接入。");
  });

  document.querySelector(".window-controls").addEventListener("click", (event) => {
    const button = event.target.closest("[data-window-action]");
    if (!button || !window.robotDesktop) return;
    const action = button.dataset.windowAction;
    window.robotDesktop[action]?.();
  });

  document.querySelector("#exportBtn").addEventListener("click", () => {
    const payload = JSON.stringify(selectedRobot(), null, 2);
    const blob = new Blob([payload], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedRobot().name.replace(/\s+/g, "-")}-task.json`;
    link.click();
    URL.revokeObjectURL(url);
  });
}

function toast(title, message) {
  const host = document.querySelector("#toastHost");
  const node = document.createElement("div");
  node.className = "toast";
  node.innerHTML = `<strong>${escapeHTML(title)}</strong><p>${escapeHTML(message)}</p>`;
  host.appendChild(node);
  setTimeout(() => node.remove(), 4200);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function escapeAttr(value) {
  return escapeHTML(value).replaceAll("\n", " ");
}

function renderAll() {
  renderProviderTabs();
  renderRobotList();
  renderForm();
  renderIcons();
}

wireEvents();
renderAll();
