/**
 * 本地 DeepSeek mock，用于不消耗真实额度的全链路自测。
 *
 * 用法：
 *   node scripts/mock-deepseek.mjs
 *   # 另开终端，把 .env.local 改为：
 *   #   DEEPSEEK_API_KEY=test
 *   #   DEEPSEEK_MODEL=mock
 *   #   DEEPSEEK_BASE_URL=http://127.0.0.1:8787
 *
 * 环境变量：
 *   MOCK_PORT=8787        监听端口
 *   MOCK_DELAY_MS=25      每个字符的间隔
 *   MOCK_FAIL=429         强制失败（401 / 429 / 500 / hang / slow）
 */
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_PORT ?? 8787);
const DELAY = Number(process.env.MOCK_DELAY_MS ?? 25);
const FAIL = process.env.MOCK_FAIL ?? "";

const SAMPLES = {
  summary:
    "3 年前端开发经验，主导中后台平台重构，将首屏加载时间降低 40%。熟悉 React 与 TypeScript，能独立负责从需求评审到上线交付的完整流程。带过 3 人小组，推动组件库与工程规范落地。",
  experience:
    "主导中后台平台重构，拆分巨石模块并引入按需加载，首屏加载时间降低 40%。\n设计统一组件库与主题方案，覆盖 12 个业务页面，重复开发量减少约 30%。\n带领 3 人小组推进性能专项，建立 Lighthouse 与错误监控基线。",
  project:
    "负责数据看板项目的前端架构与核心图表开发，支撑日均 20 万次访问。\n引入虚拟滚动与增量渲染，长列表滚动帧率稳定在 55fps 以上。\n沉淀图表配置协议，业务方接入成本从 2 天缩短到 2 小时。",
};

const FULL_RESUME = JSON.stringify({
  headline: "前端工程师",
  city: "上海",
  summary:
    "3 年前端开发经验，主导中后台平台重构，将首屏加载时间降低 40%。熟悉 React 与 TypeScript，能独立负责从需求评审到上线交付的完整流程。",
  intent: {
    targetRole: "前端工程师",
    targetCity: "上海",
    experience: "3-5 年",
  },
  educations: [
    {
      school: "示例大学",
      major: "计算机科学与技术",
      degree: "本科",
      start: "2017.09",
      end: "2021.06",
      gpa: "",
      ranking: "",
      courses: "",
      honors: "",
    },
  ],
  experiences: [
    {
      company: "示例科技",
      role: "前端工程师",
      start: "2021.07",
      end: "至今",
      description: SAMPLES.experience,
    },
  ],
  projects: [
    {
      name: "数据看板",
      role: "前端负责人",
      start: "2022.03",
      end: "2023.06",
      description: SAMPLES.project,
      link: "",
    },
  ],
  skills: ["React", "TypeScript", "Node.js"],
});

function pickSample(body) {
  const text = (body.messages ?? []).map((m) => m.content ?? "").join("\n");
  if (text.includes("结构化中文简历")) return FULL_RESUME;
  if (text.includes("个人简介")) return SAMPLES.summary;
  if (text.includes("工作经历")) return SAMPLES.experience;
  if (text.includes("项目经历")) return SAMPLES.project;
  return SAMPLES.summary;
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

function sendError(res, status, message) {
  sendJson(res, status, {
    error: { message, type: "mock_error", code: status },
  });
}

function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("payload_too_large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function streamText(res, text, includeUsage) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  const created = Math.floor(Date.now() / 1000);
  const chunk = (delta, finishReason = null) =>
    `data: ${JSON.stringify({
      id: "mock-chat",
      object: "chat.completion.chunk",
      created,
      model: "mock",
      choices: [{ index: 0, delta, finish_reason: finishReason }],
    })}\n\n`;

  let index = 0;
  let closed = false;
  res.on("close", () => {
    closed = true;
  });

  const timer = setInterval(() => {
    if (closed) {
      clearInterval(timer);
      return;
    }
    if (index >= text.length) {
      clearInterval(timer);
      res.write(chunk({}, "stop"));
      if (includeUsage) {
        res.write(
          `data: ${JSON.stringify({
            id: "mock-chat",
            object: "chat.completion.chunk",
            created,
            model: "mock",
            choices: [],
            usage: {
              prompt_tokens: 120,
              completion_tokens: text.length,
              total_tokens: 120 + text.length,
            },
          })}\n\n`,
        );
      }
      res.end("data: [DONE]\n\n");
      return;
    }
    res.write(chunk({ content: text[index++] }));
  }, DELAY);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);

  if (req.method === "GET" && url.pathname === "/models") {
    return sendJson(res, 200, {
      object: "list",
      data: [{ id: "mock", object: "model", owned_by: "mock" }],
    });
  }

  if (req.method !== "POST" || url.pathname !== "/chat/completions") {
    return sendError(res, 404, "not_found");
  }

  if (!req.headers.authorization) {
    return sendError(res, 401, "missing_api_key");
  }

  if (FAIL === "401") return sendError(res, 401, "mock_unauthorized");
  if (FAIL === "429") return sendError(res, 429, "mock_rate_limited");
  if (FAIL === "500") return sendError(res, 500, "mock_internal_error");
  if (FAIL === "hang") return; // 保持连接，用于测试超时

  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch (error) {
    return sendError(
      res,
      error.message === "payload_too_large" ? 413 : 400,
      error.message,
    );
  }

  const text = pickSample(body);
  console.log(
    `POST /chat/completions stream=${body.stream === true} chars=${text.length}`,
  );

  if (FAIL === "slow") {
    setTimeout(() => streamText(res, text, body.stream_options?.include_usage), 3000);
    return;
  }

  streamText(res, text, body.stream_options?.include_usage);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`mock-deepseek listening on http://127.0.0.1:${PORT}`);
  if (FAIL) console.log(`MOCK_FAIL=${FAIL}`);
});
