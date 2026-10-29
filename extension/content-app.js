/**
 * 运行在「简历工坊」页面里的桥。
 * - lead：扩展把抓到的岗位发进来（页面用 postMessage 接）
 * - profile：扩展来取一份最小档案，用于在招聘网站上填表
 *
 * 档案只从本页 localStorage 读取、只回给扩展的 background，不落扩展存储。
 */
function readProfile() {
  try {
    const raw = window.localStorage.getItem("resume-workshop:v1");
    if (!raw) return null;
    const resume = JSON.parse(raw);
    if (!resume || typeof resume !== "object") return null;
    const basic = resume.basic || {};
    const intent = resume.intent || {};
    const profile = {
      name: String(basic.name || "").trim(),
      phone: String(basic.phone || "").trim(),
      email: String(basic.email || "").trim(),
      city: String(intent.targetCity || basic.city || "").trim(),
      role: String(intent.targetRole || basic.headline || "").trim(),
      summary: String(basic.summary || "").trim(),
    };
    return Object.values(profile).some(Boolean) ? profile : null;
  } catch {
    return null;
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message) return false;

  if (message.type === "lead") {
    window.postMessage(
      {
        source: "resume-workshop-extension",
        type: "lead",
        payload: message.lead,
      },
      window.location.origin,
    );
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === "profile") {
    const profile = readProfile();
    sendResponse(
      profile
        ? { ok: true, profile }
        : { ok: false, error: "简历里还没有可填写的姓名 / 联系方式" },
    );
    return false;
  }

  return false;
});
