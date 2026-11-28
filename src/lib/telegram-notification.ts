type TelegramResult = { delivered: true } | { delivered: false; error: string };

function cleanEnvValue(value: string | undefined) {
  return value?.trim().replace(/^["']|["']$/g, "").trim() ?? "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function sendTelegramNotification(text: string): Promise<TelegramResult> {
  const token = cleanEnvValue(process.env.TELEGRAM_BOT_TOKEN);
  const chatId = cleanEnvValue(process.env.TELEGRAM_CHAT_ID);
  if (!token || !chatId) {
    return { delivered: false, error: "Не настроены переменные окружения Telegram." };
  }
  if (!/^\d+:[A-Za-z0-9_-]+$/.test(token) || (!/^-?\d+$/.test(chatId) && !/^@[A-Za-z0-9_]{5,}$/.test(chatId))) {
    return { delivered: false, error: "Некорректно настроены TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID." };
  }
  if (chatId === token.split(":", 1)[0]) {
    return { delivered: false, error: "TELEGRAM_CHAT_ID совпадает с ID бота; укажите ID чата-получателя." };
  }
  if (text.length > 4096) {
    return { delivered: false, error: "Сообщение превышает лимит Telegram в 4096 символов." };
  }

  let response: Response;
  try {
    response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return {
      delivered: false,
      error: timedOut
        ? "Telegram не ответил вовремя."
        : "Не удалось связаться с Telegram.",
    };
  }

  let result: unknown;
  try {
    result = await response.json();
  } catch {
    return { delivered: false, error: "Telegram вернул некорректный ответ." };
  }

  const payload = isRecord(result) ? result : {};
  if (!response.ok || payload.ok !== true) {
    const description = typeof payload.description === "string"
      ? payload.description
      : response.statusText || "Неизвестная ошибка Telegram.";
    return { delivered: false, error: `Ошибка Telegram API (${response.status}): ${description}` };
  }

  return { delivered: true };
}
