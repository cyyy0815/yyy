import { describe, expect, it } from "vitest";
import {
  parseSseStream,
  UpstreamError,
  type UpstreamEvent,
} from "../ai/deepseek";

function streamFrom(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

async function collect(
  chunks: string[],
  signal = new AbortController().signal,
): Promise<UpstreamEvent[]> {
  const events: UpstreamEvent[] = [];
  for await (const event of parseSseStream(streamFrom(chunks), signal)) {
    events.push(event);
  }
  return events;
}

describe("parseSseStream", () => {
  it("跨 chunk 拼接事件并输出文本与 usage", async () => {
    const events = await collect([
      'data: {"choices":[{"delta":{"content":"你"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"好"}}]}\r\n\r\n',
      'data: {"usage":{"prompt_tokens":3,"completion_tokens":2}}\n\n',
      "data: [DONE]\n\n",
    ]);

    expect(events).toEqual([
      { type: "text", text: "你" },
      { type: "text", text: "好" },
      {
        type: "usage",
        usage: { prompt_tokens: 3, completion_tokens: 2 },
      },
    ]);
  });

  it("一个事件被拆成多个网络分片也能解析", async () => {
    const events = await collect([
      'data: {"choices":[{"delta":',
      '{"content":"前半"}}]}\n',
      "\n",
      'data: {"choices":[{"delta":{"content":"后半"}}]}\n\n',
      "data: [DONE]\n\n",
    ]);

    expect(events).toEqual([
      { type: "text", text: "前半" },
      { type: "text", text: "后半" },
    ]);
  });

  it("忽略 reasoning_content、空 choices 与无法解析的块", async () => {
    const events = await collect([
      'data: {"choices":[{"delta":{"reasoning_content":"思考中"}}]}\n\n',
      "data: not-json\n\n",
      "data: \n\n",
      'data: {"choices":[]}\n\n',
      'data: {"choices":[{"delta":{"content":"正文"}}]}\n\n',
      "data: [DONE]\n\n",
    ]);

    expect(events).toEqual([{ type: "text", text: "正文" }]);
  });

  it("[DONE] 之后不再读取后续事件", async () => {
    const events = await collect([
      'data: {"choices":[{"delta":{"content":"前"}}]}\n\n',
      "data: [DONE]\n\n",
      'data: {"choices":[{"delta":{"content":"不应出现"}}]}\n\n',
    ]);

    expect(events).toEqual([{ type: "text", text: "前" }]);
  });

  it("空响应体抛出 UpstreamError", async () => {
    const iterator = parseSseStream(null, new AbortController().signal);
    await expect(iterator.next()).rejects.toBeInstanceOf(UpstreamError);
  });

  it("中止信号会让流停止", async () => {
    const controller = new AbortController();
    controller.abort(new Error("client_aborted"));
    const iterator = parseSseStream(streamFrom([]), controller.signal);

    await expect(iterator.next()).rejects.toThrow("client_aborted");
  });
});
