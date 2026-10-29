const $ = (id) => document.getElementById(id);

const fields = {
  company: $("company"),
  role: $("role"),
  jd: $("jd"),
};

function setStatus(text) {
  $("status").textContent = text;
}

function setResult(text, tone = "") {
  const node = $("result");
  node.textContent = text;
  node.dataset.tone = tone;
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function scan() {
  setStatus("正在读取当前页面…");
  const tab = await activeTab();
  if (!tab || !tab.id) {
    setStatus("没有可用的标签页");
    return;
  }

  let response = null;
  try {
    response = await chrome.tabs.sendMessage(tab.id, { type: "extract" });
  } catch {
    response = null;
  }

  if (!response || !response.ok) {
    setStatus("当前页面不受支持：可以直接粘贴 JD 后发送");
    return;
  }

  const lead = response.lead || {};
  fields.company.value = lead.company || "";
  fields.role.value = lead.role || "";
  fields.jd.value = lead.jd || "";
  setStatus(
    lead.jd ? "已抓取，确认无误后发送" : "没有抓到 JD，请在下面粘贴",
  );
}

async function send() {
  const lead = {
    company: fields.company.value.trim(),
    role: fields.role.value.trim(),
    jd: fields.jd.value.trim(),
  };
  if (!lead.jd) {
    setResult("JD 不能为空", "error");
    return;
  }

  $("send").disabled = true;
  setResult("发送中…");
  let response = null;
  try {
    response = await chrome.runtime.sendMessage({ type: "send-lead", lead });
  } catch {
    response = null;
  }
  $("send").disabled = false;

  if (response && response.ok) {
    setResult("已发送，回到简历工坊确认导入即可", "ok");
    setStatus("已发送");
  } else {
    setResult(
      (response && response.error) || "发送失败：确认简历工坊页面已打开",
      "error",
    );
  }
}

document.getElementById("send").addEventListener("click", send);
document.getElementById("rescan").addEventListener("click", scan);

document.getElementById("fill").addEventListener("click", async () => {
  const tab = await activeTab();
  if (!tab || !tab.id) {
    setResult("没有可用的标签页", "error");
    return;
  }
  setResult("正在填充当前页面…");
  let response = null;
  try {
    response = await chrome.runtime.sendMessage({
      type: "autofill",
      tabId: tab.id,
    });
  } catch {
    response = null;
  }

  if (response && response.ok) {
    const missing = response.missing && response.missing.length
      ? `；未找到：${response.missing.join("、")}`
      : "";
    setResult(`已填写：${response.filled.join("、")}${missing}`, "ok");
  } else {
    setResult((response && response.error) || "填充失败", "error");
  }
});

document.getElementById("copy").addEventListener("click", async () => {
  const text = fields.jd.value.trim();
  if (!text) {
    setResult("JD 为空", "error");
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    setResult("JD 已复制", "ok");
  } catch {
    setResult("复制失败，请手动选中", "error");
  }
});

document.getElementById("saveUrl").addEventListener("click", async () => {
  const url = $("appUrl").value.trim();
  await chrome.runtime.sendMessage({ type: "set-app-url", url });
  setResult("应用地址已保存", "ok");
});

(async () => {
  const appUrl = await chrome.runtime.sendMessage({ type: "get-app-url" });
  $("appUrl").value = appUrl;
  await scan();
})();
