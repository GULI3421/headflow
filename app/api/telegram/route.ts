import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const runtime = "nodejs";

function parseEnvLocal() {
  const envPath = join(process.cwd(), ".env.local");

  if (!existsSync(envPath)) return {};

  return readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .reduce<Record<string, string>>((values, line) => {
      const trimmedLine = line.trim();

      if (!trimmedLine || trimmedLine.startsWith("#")) return values;

      const separatorIndex = trimmedLine.indexOf("=");
      if (separatorIndex === -1) return values;

      const key = trimmedLine.slice(0, separatorIndex).trim();
      const rawValue = trimmedLine.slice(separatorIndex + 1).trim();
      values[key] = rawValue.replace(/^["']|["']$/g, "");

      return values;
    }, {});
}

function getServerEnvValue(key: string) {
  return process.env[key] || parseEnvLocal()[key] || "";
}

function cleanTelegramToken(value: string) {
  return value
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\r\n\t ]/g, "");
}

function cleanChatId(value: string) {
  return value
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "");
}

function maskValue(value: string) {
  if (!value) return "missing";
  if (value.length <= 8) return `${value.slice(0, 2)}***`;
  return `${value.slice(0, 6)}...${value.slice(-4)} (${value.length} chars)`;
}

function describeTelegramToken(value: string) {
  const [botId = "", secret = ""] = value.split(":");

  return {
    masked: maskValue(value),
    hasColon: value.includes(":"),
    botIdDigits: /^\d+$/.test(botId),
    botIdLength: botId.length,
    secretLength: secret.length,
    validCharacterSet: /^\d+:[A-Za-z0-9_-]+$/.test(value),
  };
}

export async function POST(req: Request) {
  try {
    let payload: {
      name?: string;
      phone?: string;
      message?: string;
      items?: string;
      total?: string | number;
      type?: string;
    };

    try {
      payload = await req.json();
    } catch (parseError) {
      console.error("Telegram API route: invalid JSON body", parseError);
      return Response.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
    }

    const rawToken = getServerEnvValue("TELEGRAM_BOT_TOKEN");
    const rawChatId = getServerEnvValue("TELEGRAM_CHAT_ID");
    const token = cleanTelegramToken(rawToken);
    const chatId = cleanChatId(rawChatId);

    console.log("Telegram API route: environment lookup", {
      token: maskValue(token),
      chatId: maskValue(chatId),
      processEnvHasToken: Boolean(process.env.TELEGRAM_BOT_TOKEN),
      processEnvHasChatId: Boolean(process.env.TELEGRAM_CHAT_ID),
      rawTokenLength: rawToken.length,
      cleanedTokenLength: token.length,
      tokenShape: describeTelegramToken(token),
    });

    if (!token || !chatId) {
      console.error("Telegram API route: missing environment variables", {
        hasToken: Boolean(token),
        hasChatId: Boolean(chatId),
        expectedKeys: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"],
      });

      return Response.json(
        { success: false, error: "Telegram credentials are not configured." },
        { status: 500 },
      );
    }

    const name = payload.name || "Не указано";
    const phone = payload.phone || "Не указано";
    const requestType = payload.type || "Заявка";
    const comment = payload.message || "";
    const items = payload.items || "";
    const total = payload.total || "";

    let text = `🔔 Новая заявка с сайта (${requestType})\n\n`;
    text += `👤 Имя: ${name}\n`;
    text += `📞 Телефон: ${phone}\n`;

    if (comment) {
      text += `💬 Комментарий: ${comment}\n`;
    }

    if (items) {
      text += `\n📦 Товары:\n${items}\n`;
    }

    if (total) {
      text += `\n💰 Сумма: ${total} KGS`;
    }

    console.log("Telegram API route: sending notification", {
      type: requestType,
      hasName: Boolean(payload.name),
      hasPhone: Boolean(payload.phone),
      hasItems: Boolean(items),
      hasTotal: Boolean(total),
      textLength: text.length,
    });

    const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
    });

    const responseText = await telegramResponse.text();

    if (!telegramResponse.ok) {
      console.error("Telegram API route: Telegram sendMessage failed", {
        status: telegramResponse.status,
        statusText: telegramResponse.statusText,
        responseText,
      });

      return Response.json(
        {
          success: false,
          error: "Telegram sendMessage failed.",
          status: telegramResponse.status,
          details: responseText,
        },
        { status: 502 },
      );
    }

    console.log("Telegram API route: notification sent successfully", {
      status: telegramResponse.status,
      responseText,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Telegram API route: unhandled failure", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown Telegram route error.",
      },
      { status: 500 },
    );
  }
}
