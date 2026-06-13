import { NextRequest } from "next/server";
import { getSystemPrompt } from "@/lib/prompt";

/**
 * POST /api/generate
 *
 * 接收用户的原始经历 + 目标 JD，调用大模型 API，
 * 以流式（SSE）方式返回 AI 生成的 STAR 简历 Bullet Points。
 *
 * 支持所有 OpenAI 兼容接口的国内模型：
 * DeepSeek、智谱清言、Kimi、通义千问 等。
 */
export async function POST(request: NextRequest) {
  /* ---- 1. 解析请求 ---- */
  let experience: string;
  let jd: string;
  let style: string;

  try {
    const body = await request.json();
    experience = body.experience;
    jd = body.jd;
    style = body.style || "balanced";
  } catch {
    return new Response(JSON.stringify({ error: "请求格式错误，请提供 JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!experience?.trim() || !jd?.trim()) {
    return new Response(
      JSON.stringify({ error: "原始经历和目标 JD 都不能为空" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  /* ---- 2. 读取环境变量 ---- */
  const baseURL = process.env.AI_BASE_URL || "https://api.deepseek.com/v1";
  const apiKey = process.env.AI_API_KEY || "";
  const model = process.env.AI_MODEL || "deepseek-chat";

  if (!apiKey || apiKey === "sk-placeholder-replace-with-your-key") {
    return new Response(
      JSON.stringify({
        error:
          "API Key 未配置。请在 .env.local 中设置 AI_API_KEY。\n" +
          "获取 Key：https://platform.deepseek.com",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  /* ---- 3. 构造请求 ---- */
  const apiUrl = `${baseURL.replace(/\/$/, "")}/chat/completions`;

  const messages = [
    { role: "system", content: getSystemPrompt(style) },
    {
      role: "user",
      content: `【原始经历】\n${experience}\n\n【目标岗位 JD】\n${jd}\n\n请根据以上信息生成 STAR 法则 Bullet Points：`,
    },
  ];

  try {
    /* ---- 4. 调用大模型 API（非流式回退策略：优先流式，失败则非流式） ---- */
    const upstreamResp = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 2048,
        stream: true,
      }),
    });

    if (!upstreamResp.ok) {
      const errBody = await upstreamResp.text().catch(() => "");
      console.error("LLM API Error:", upstreamResp.status, errBody);
      return new Response(
        JSON.stringify({
          error: `模型 API 返回错误 (${upstreamResp.status})。请检查 API Key 和 Base URL 是否正确。`,
        }),
        {
          status: 502,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    /* ---- 5. 流式转发 ---- */
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = upstreamResp.body?.getReader();
        if (!reader) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "无法读取模型响应流" })}\n\n`
            )
          );
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            // 最后一个元素可能不完整，保留回 buffer
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data:")) continue;

              const dataStr = trimmed.slice(5).trim();
              if (dataStr === "[DONE]") {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                continue;
              }

              // 透传 SSE 数据块
              controller.enqueue(encoder.encode(`data: ${dataStr}\n\n`));
            }
          }

          // 处理 buffer 中剩余内容
          if (buffer.trim()) {
            const trimmed = buffer.trim();
            if (trimmed.startsWith("data:")) {
              const dataStr = trimmed.slice(5).trim();
              if (dataStr !== "[DONE]") {
                controller.enqueue(encoder.encode(`data: ${dataStr}\n\n`));
              }
            }
          }
        } catch (err) {
          console.error("Stream read error:", err);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "流式读取中断" })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("API route error:", err);
    return new Response(
      JSON.stringify({ error: "连接模型服务失败，请检查网络或 API 地址" }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
