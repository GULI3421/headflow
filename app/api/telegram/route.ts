export const runtime = "nodejs";

type TelegramPayload = {
  name?: unknown;
  phone?: unknown;
  message?: unknown;
  items?: unknown;
  total?: unknown;
  type?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asText(value: unknown, fallback = "") {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : fallback;
}

function cleanEnvValue(value: string | undefined) {
  return value?.trim().replace(/^["']|["']$/g, "").trim() ?? "";
}

function describeCredential(variable: string, value: string) {
  return {
    variable,
    source: "process.env (Next.js-resolved)",
    present: Boolean(value),
    length: value.length,
  };
}

function describeChatId(chatId: string, token: string) {
  const botId = token.split(":", 1)[0];
  const diagnostics = {
    length: chatId.length,
    isSameAsBotId: Boolean(botId && chatId === botId),
  };

  return chatId.length > 4
    ? { ...diagnostics, firstTwo: chatId.slice(0, 2), lastTwo: chatId.slice(-2) }
    : diagnostics;
}

export async function POST(req: Request) {
  let body: unknown;

  try {
    body = await req.json();
  } catch (error) {
    console.error("Telegram API: request body is not valid JSON", error);
    return Response.json({ success: false, error: "Некорректное тело запроса." }, { status: 400 });
  }

  if (!isRecord(body)) {
    return Response.json({ success: false, error: "Ожидался объект с данными заявки." }, { status: 400 });
  }

  const payload = body as TelegramPayload;
  const token = cleanEnvValue(process.env.TELEGRAM_BOT_TOKEN);
  const chatId = cleanEnvValue(process.env.TELEGRAM_CHAT_ID);
  console.info(`Telegram API: resolved configuration ${JSON.stringify({
    cwd: process.cwd(),
    envResolution: "Next.js: pre-set process.env > .env.development.local > .env.local > .env.development > .env",
    token: describeCredential("TELEGRAM_BOT_TOKEN", token),
    chatId: {
      ...describeCredential("TELEGRAM_CHAT_ID", chatId),
      ...describeChatId(chatId, token),
    },
  })}`);
  const missingVariables = [
    !token && "TELEGRAM_BOT_TOKEN",
    !chatId && "TELEGRAM_CHAT_ID",
  ].filter(Boolean);

  if (missingVariables.length) {
    console.error("Telegram API: required environment variables are missing", { missingVariables });
    return Response.json(
      {
        success: false,
        error: `Не настроены переменные окружения Telegram: ${missingVariables.join(", ")}.`,
        code: "TELEGRAM_CONFIG_MISSING",
      },
      { status: 503 },
    );
  }

  if (!token || !chatId) {
    return Response.json({ success: false, error: "Не настроены переменные окружения Telegram." }, { status: 503 });
  }

  if (!/^\d+:[A-Za-z0-9_-]+$/.test(token)) {
    console.error("Telegram API: TELEGRAM_BOT_TOKEN has an invalid format");
    return Response.json(
      {
        success: false,
        error: "Переменная TELEGRAM_BOT_TOKEN имеет неверный формат.",
        code: "TELEGRAM_CONFIG_INVALID",
      },
      { status: 503 },
    );
  }

  if (!/^-?\d+$/.test(chatId) && !/^@[A-Za-z0-9_]{5,}$/.test(chatId)) {
    console.error("Telegram API: TELEGRAM_CHAT_ID has an invalid format");
    return Response.json(
      {
        success: false,
        error: "Переменная TELEGRAM_CHAT_ID должна содержать числовой ID чата или @username канала.",
        code: "TELEGRAM_CONFIG_INVALID",
      },
      { status: 503 },
    );
  }

  const chatIdDiagnostics = describeChatId(chatId, token);
  if (chatIdDiagnostics.isSameAsBotId) {
    console.error("Telegram API: refusing to send a message to the bot itself", chatIdDiagnostics);
    return Response.json(
      {
        success: false,
        error: "TELEGRAM_CHAT_ID совпадает с ID бота. Укажите ID чата получателя или группы.",
        code: "TELEGRAM_CHAT_ID_IS_BOT_ID",
      },
      { status: 503 },
    );
  }

  const name = asText(payload.name, "Не указано");
  const phone = asText(payload.phone, "Не указано");
  const requestType = asText(payload.type, "Заявка");
  const comment = asText(payload.message);
  const items = asText(payload.items);
  const total = asText(payload.total);

  let text = `🔔 Новая заявка с сайта (${requestType})\n\n👤 Имя: ${name}\n📞 Телефон: ${phone}\n`;
  if (comment) text += `💬 Комментарий: ${comment}\n`;
  if (items) {
    const label = /смет|estimate/i.test(requestType) ? "Смета" : "Товары";
    text += `\n📋 ${label}:\n${items}\n`;
  }
  if (total) text += `\n💰 Сумма: ${total} KGS`;

  if (text.length > 4096) {
    return Response.json(
      { success: false, error: "Сообщение слишком длинное для Telegram (максимум 4096 символов)." },
      { status: 413 },
    );
  }

  let telegramResponse: Response;
  try {
    console.info("Telegram API: sending message", chatIdDiagnostics);
    telegramResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    console.error("Telegram API: request to Telegram failed", {
      reason: error instanceof Error ? error.message : "Unknown network error",
      timedOut,
    });
    return Response.json(
      {
        success: false,
        error: timedOut
          ? "Telegram не ответил вовремя. Попробуйте отправить смету ещё раз."
          : "Не удалось связаться с Telegram. Проверьте соединение сервера.",
      },
      { status: timedOut ? 504 : 502 },
    );
  }

  let result: unknown;
  try {
    result = await telegramResponse.json();
  } catch (error) {
    console.error("Telegram API: Telegram returned invalid JSON", {
      status: telegramResponse.status,
      reason: error instanceof Error ? error.message : "Unknown response parsing error",
    });
    return Response.json(
      { success: false, error: "Telegram вернул некорректный ответ." },
      { status: 502 },
    );
  }

  const telegramResult = isRecord(result) ? result : {};
  if (!telegramResponse.ok || telegramResult.ok !== true) {
    const description = asText(telegramResult.description, telegramResponse.statusText || "Неизвестная ошибка Telegram.");
    const errorCode = typeof telegramResult.error_code === "number"
      ? telegramResult.error_code
      : telegramResponse.status;
    const clientStatus = [400, 401, 403].includes(errorCode) ? errorCode : 502;
    let errorMessage: string;

    if (errorCode === 400 && /chat not found/i.test(description)) {
      errorMessage = `Telegram не нашёл указанный chat_id. Проверьте TELEGRAM_CHAT_ID и доступ бота к чату. Ответ Telegram: ${description}`;
    } else if (errorCode === 401) {
      errorMessage = `Telegram отклонил токен бота (401 Unauthorized). Проверьте TELEGRAM_BOT_TOKEN. Ответ Telegram: ${description}`;
    } else if (errorCode === 403 && /bot can'?t send messages to the bot/i.test(description)) {
      errorMessage = `В TELEGRAM_CHAT_ID указан ID бота, а нужен ID получателя или группы. Для личного чата откройте бота уведомлений и нажмите /start. Ответ Telegram: ${description}`;
    } else if (errorCode === 403) {
      errorMessage = `Telegram запретил отправку (403 Forbidden). Укажите ID получателя или группы, а не ID бота; для личного чата получатель должен открыть бота и нажать /start. Также проверьте, что бот добавлен в чат и имеет право отправлять сообщения. Ответ Telegram: ${description}`;
    } else if (errorCode === 400) {
      errorMessage = `Telegram отклонил запрос (400 Bad Request). Ответ Telegram: ${description}`;
    } else {
      errorMessage = `Ошибка Telegram API (${telegramResponse.status}). Ответ Telegram: ${description}`;
    }

    console.error("Telegram API: Telegram rejected sendMessage", {
      httpStatus: telegramResponse.status,
      errorCode,
      description,
    });
    return Response.json(
      {
        success: false,
        error: errorMessage,
        code: "TELEGRAM_SEND_FAILED",
      },
      { status: clientStatus },
    );
  }

  console.info("Telegram API: notification sent", {
    type: requestType,
    hasPhone: Boolean(payload.phone),
    hasItems: Boolean(items),
  });
  return Response.json({ success: true });
}
