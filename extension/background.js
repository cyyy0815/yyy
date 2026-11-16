/**
 * 后台：把岗位投递给「简历工坊」页面。
 *
 * 不保存岗位内容，只做一个搬运工：
 * popup → background → app 页面里的 content script（再 postMessage 给页面）。
 */
const DEFAULT_APP_URL = "http://localhost:3000";
const DELIVER_ATTEMPTS = 12;
const DELIVER_INTERVAL_MS = 400;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getAppUrl() {
  const { appUrl } = await chrome.storage.local.get("appUrl");
  return (appUrl || DEFAULT_APP_URL).replace(/\/+$/, "");
}

async function findAppTab(appUrl) {
  const tabs = await chrome.tabs.query({});
  return (
    tabs.find((tab) => tab.url && tab.url.startsWith(appUrl)) ?? null
  );
}

async function waitForTabComplete(tabId, timeoutMs = 15000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab.status === "complete") return true;
    } catch {
      return false;
    }
    await sleep(300);
  }
  return false;
}

async function deliver(tabId, lead) {
  for (let attempt = 0; attempt < DELIVER_ATTEMPTS; attempt += 1) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, {
        type: "lead",
        lead,
      });
      if (response && response.ok) return true;
    } catch {
      // content script 还没注入（页面刚打开）时继续重试
    }
    await sleep(DELIVER_INTERVAL_MS);
  }
  return false;
}

async function sendToApp(lead) {
  if (!lead || typeof lead.jd !== "string" || !lead.jd.trim()) {
    return { ok: false, error: "没有可发送的岗位内容" };
  }

  const appUrl = await getAppUrl();
  let tab = await findAppTab(appUrl);
  let created = false;

  if (!tab) {
    tab = await chrome.tabs.create({ url: appUrl, active: true });
    created = true;
  } else {
    await chrome.tabs.update(tab.id, { active: true });
  }

  if (created) {
    await waitForTabComplete(tab.id);
  }

  const ok = await deliver(tab.id, lead);
  return ok
    ? { ok: true }
    : {
        ok: false,
        error: "没能连上简历工坊页面：确认应用已打开、地址一致，然后重试",
      };
}

async function fillActiveTab(tabId) {
  const appUrl = await getAppUrl();
  const appTab = await findAppTab(appUrl);
  if (!appTab) {
    return {
      ok: false,
      error: "先打开简历工坊页面，扩展要从那里读取姓名与联系方式",
    };
  }

  let profileResponse = null;
  try {
    profileResponse = await chrome.tabs.sendMessage(appTab.id, {
      type: "profile",
    });
  } catch {
    return { ok: false, error: "没能从简历工坊读取档案：刷新应用页后重试" };
  }

  if (!profileResponse || !profileResponse.ok || !profileResponse.profile) {
    return {
      ok: false,
      error: (profileResponse && profileResponse.error) || "没有可填写的档案",
    };
  }

  try {
    return await chrome.tabs.sendMessage(tabId, {
      type: "fill",
      profile: profileResponse.profile,
    });
  } catch {
    return { ok: false, error: "当前标签页不支持填表（可能不是投递表单）" };
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "autofill") {
    fillActiveTab(message.tabId).then(sendResponse);
    return true; // 异步响应
  }

  if (message?.type === "send-lead") {
    sendToApp(message.lead).then(sendResponse);
    return true; // 异步响应
  }

  if (message?.type === "get-app-url") {
    getAppUrl().then(sendResponse);
    return true;
  }

  if (message?.type === "set-app-url") {
    const url = typeof message.url === "string" ? message.url.trim() : "";
    chrome.storage.local
      .set({ appUrl: url || DEFAULT_APP_URL })
      .then(() => sendResponse({ ok: true }));
    return true;
  }

  return false;
});
