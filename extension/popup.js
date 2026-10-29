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

let lastDiagnosis = null;

document.getElementById("diagnose").addEventListener("click", async () => {
  const tab = await activeTab();
  if (!tab || !tab.id) {
    setResult("没有可用的标签页", "error");
    return;
  }

  let report = null;
  try {
    report = await chrome.tabs.sendMessage(tab.id, { type: "diagnose" });
  } catch {
    report = null;
  }
  if (!report || !report.ok) {
    setResult("当前页面没有诊断脚本：确认是支持的站点且扩展已启用", "error");
    return;
  }

  const sources = report.trace.sources;
  const hits = report.selectorHits
    .filter((item) => item.count > 0)
    .map((item) => `${item.selector}(${item.count})`);
  const lines = [
    `站点：${report.trace.host}${report.trace.hasRule ? "" : "（未配置规则）"}`,
    `岗位：${report.lead.role || "（空）"} ← ${sources.role || "无"}`,
    `公司：${report.lead.company || "（空）"} ← ${sources.company || "无"}`,
    `JD：${report.lead.jdLength} 字 ← ${sources.jd || "无"}`,
    `JSON-LD：${report.trace.jsonLd ? "有" : "无"}`,
    `命中选择器：${hits.join("、") || "无"}`,
    `标题：${report.headings.join(" / ") || "无"}`,
  ];

  const pre = $("diag");
  pre.textContent = lines.join("\n");
  pre.hidden = false;
  $("diagActions").hidden = false;
  lastDiagnosis = report;
  setResult("诊断完成，可复制结果", "ok");
});

document.getElementById("copyDiag").addEventListener("click", async () => {
  if (!lastDiagnosis) return;
  try {
    await navigator.clipboard.writeText(JSON.stringify(lastDiagnosis, null, 2));
    setResult("诊断结果已复制", "ok");
  } catch {
    setResult("复制失败，请手动选中", "error");
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
