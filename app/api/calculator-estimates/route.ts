import { CalculatorEstimateStatus, TelegramDeliveryStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import {
  calculateHeatingEstimate,
  type HeatingEstimateInput,
} from "@/lib/heating-estimate";
import { prisma } from "@/src/lib/prisma";
import { sendTelegramNotification } from "@/src/lib/telegram-notification";

export const runtime = "nodejs";

const insulationLevels = ["poor", "standard", "high"] as const;
const heatingSources = ["none", "gas", "electric", "solidFuel"] as const;
const deliveryModes = ["none", "bishkek", "region"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseParameters(value: unknown): HeatingEstimateInput | null {
  if (!isRecord(value)) return null;
  const { area, windows, ceilingHeight, insulation, heatingSource, includeChimney, includeUnderfloor, deliveryMode, includeInstallation } = value;
  if (
    typeof area !== "number" || !Number.isFinite(area) || area < 1 || area > 5000
    || typeof windows !== "number" || !Number.isInteger(windows) || windows < 1 || windows > 100
    || typeof ceilingHeight !== "number" || !Number.isFinite(ceilingHeight) || ceilingHeight < 2 || ceilingHeight > 6
    || typeof insulation !== "string" || !insulationLevels.includes(insulation as (typeof insulationLevels)[number])
    || typeof heatingSource !== "string" || !heatingSources.includes(heatingSource as (typeof heatingSources)[number])
    || typeof deliveryMode !== "string" || !deliveryModes.includes(deliveryMode as (typeof deliveryModes)[number])
    || typeof includeChimney !== "boolean"
    || typeof includeUnderfloor !== "boolean"
    || typeof includeInstallation !== "boolean"
  ) {
    return null;
  }

  return {
    area,
    windows,
    ceilingHeight,
    insulation: insulation as HeatingEstimateInput["insulation"],
    heatingSource: heatingSource as HeatingEstimateInput["heatingSource"],
    includeChimney,
    includeUnderfloor,
    deliveryMode: deliveryMode as HeatingEstimateInput["deliveryMode"],
    includeInstallation,
  };
}

function formatMoney(value: number) {
  return `${Math.round(value).toLocaleString("ru-RU")} KGS`;
}

function createBreakdown(input: HeatingEstimateInput, estimate: ReturnType<typeof calculateHeatingEstimate>) {
  const extras = [
    estimate.chimneyCost > 0 ? `Дымоход: ${formatMoney(estimate.chimneyCost)}` : "",
    estimate.underfloorCost > 0 ? `Тёплый пол: ${formatMoney(estimate.underfloorCost)}` : "",
    estimate.deliveryCost > 0 ? `Доставка (${input.deliveryMode}): ${formatMoney(estimate.deliveryCost)}` : "",
  ].filter(Boolean);

  return [
    {
      label: "Котёл",
      detail: input.heatingSource === "none"
        ? "Не выбран"
        : `${input.heatingSource}, ${estimate.recommendedBoilerKilowatts} кВт`,
      amount: estimate.boilerCost,
    },
    {
      label: "Радиаторы",
      detail: `${estimate.windows} шт., ${estimate.sectionsPerRadiator} секций на радиатор; всего ${estimate.totalSections} секций`,
      amount: estimate.radiatorsCost,
    },
    { label: "Трубы", detail: `${estimate.pipeMeters} м`, amount: estimate.pipesCost },
    {
      label: "Фитинги и аксессуары",
      detail: `${estimate.ballValves} кранов, ${estimate.brackets} кронштейнов, ${estimate.airVents} воздухоотводчиков`,
      amount: estimate.accessoriesCost,
    },
    { label: "Дополнительные опции", detail: extras.join("; ") || "Не включены", amount: estimate.extrasCost },
    {
      label: "Монтаж",
      detail: input.includeInstallation ? "Включён" : "Не включён",
      amount: estimate.installationCost,
    },
  ];
}

function createTelegramMessage(
  estimateId: string,
  name: string,
  phone: string,
  input: HeatingEstimateInput,
  estimate: ReturnType<typeof calculateHeatingEstimate>,
  breakdown: ReturnType<typeof createBreakdown>,
) {
  const insulationLabels = { poor: "слабое", standard: "стандартное", high: "хорошее" };
  const sourceLabels = { none: "не выбран", gas: "газ", electric: "электричество", solidFuel: "твёрдое топливо" };
  const deliveryLabels = { none: "нет", bishkek: "Бишкек", region: "регион" };
  const options = [
    input.includeChimney ? "дымоход" : "",
    input.includeUnderfloor ? "тёплый пол" : "",
    input.includeInstallation ? "монтаж" : "",
  ].filter(Boolean);

  return [
    "🔔 Новая смета с калькулятора",
    `🆔 Заявка: ${estimateId}`,
    `👤 Имя: ${name}`,
    `📞 Телефон: ${phone}`,
    "",
    `📐 Площадь: ${input.area} м²; окон: ${input.windows}; высота потолка: ${input.ceilingHeight} м`,
    `🧱 Утепление: ${insulationLabels[input.insulation]}; отопление: ${sourceLabels[input.heatingSource]}`,
    `🚚 Доставка: ${deliveryLabels[input.deliveryMode]}; опции: ${options.join(", ") || "без монтажа и дополнительных опций"}`,
    "",
    "📋 Детализация:",
    ...breakdown.map((item) => `• ${item.label}: ${item.detail} — ${formatMoney(item.amount)}`),
    `💰 Итого: ${formatMoney(estimate.grandTotal)}`,
  ].join("\n");
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Тело запроса должно содержать корректный JSON." }, { status: 400 });
    }
    console.error("Failed to read calculator estimate request", error);
    return NextResponse.json({ error: "Не удалось прочитать заявку." }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Ожидался объект с данными сметы." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const parameters = parseParameters(body.parameters);
  if (!name || name.length > 120 || !phone || phone.length > 40 || !parameters) {
    return NextResponse.json({ error: "Проверьте имя, телефон и параметры расчёта." }, { status: 400 });
  }

  const estimate = calculateHeatingEstimate(parameters);
  const breakdown = createBreakdown(parameters, estimate);

  let savedEstimate: { id: string; createdAt: Date };
  try {
    savedEstimate = await prisma.calculatorEstimate.create({
      data: {
        name,
        phone,
        totalAmount: estimate.grandTotal,
        parameters,
        breakdown,
        status: CalculatorEstimateStatus.NEW,
        telegramStatus: TelegramDeliveryStatus.PENDING,
      },
      select: { id: true, createdAt: true },
    });
  } catch (error) {
    const errorDetails = isRecord(error) ? error : {};
    const details = {
      name: error instanceof Error ? error.name : undefined,
      message: error instanceof Error ? error.message : String(error),
      code: errorDetails.code,
      meta: errorDetails.meta,
      stack: error instanceof Error ? error.stack : undefined,
    };
    console.error("Failed to persist calculator estimate", {
      error,
      ...details,
    });
    return NextResponse.json({
      error: "Не удалось сохранить смету. Попробуйте отправить её ещё раз.",
      ...(process.env.NODE_ENV !== "production" ? { details } : {}),
    }, { status: 500 });
  }

  const message = createTelegramMessage(savedEstimate.id, name, phone, parameters, estimate, breakdown);
  let delivery: Awaited<ReturnType<typeof sendTelegramNotification>>;
  try {
    delivery = await sendTelegramNotification(message);
  } catch (error) {
    console.error("Calculator estimate saved but Telegram notification threw an error", {
      estimateId: savedEstimate.id,
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : undefined,
      code: isRecord(error) ? error.code : undefined,
      meta: isRecord(error) ? error.meta : undefined,
    });
    delivery = { delivered: false, error: "Не удалось выполнить запрос к Telegram." };
  }

  if (delivery.delivered) {
    try {
      await prisma.calculatorEstimate.update({
        where: { id: savedEstimate.id },
        data: {
          telegramStatus: TelegramDeliveryStatus.SENT,
          telegramError: null,
          telegramSentAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Calculator estimate was sent to Telegram but delivery status could not be saved", {
        estimateId: savedEstimate.id,
        error,
      });
      return NextResponse.json({
        saved: true,
        estimateId: savedEstimate.id,
        createdAt: savedEstimate.createdAt,
        telegramStatus: TelegramDeliveryStatus.PENDING,
        message: `Смета №${savedEstimate.id} сохранена. Уведомление отправлено, но статус отправки не удалось записать.`,
      }, { status: 201 });
    }

    return NextResponse.json({
      saved: true,
      estimateId: savedEstimate.id,
      createdAt: savedEstimate.createdAt,
      telegramStatus: TelegramDeliveryStatus.SENT,
    }, { status: 201 });
  }

  console.error("Calculator estimate saved but Telegram notification failed", {
    estimateId: savedEstimate.id,
    error: delivery.error,
  });
  try {
    await prisma.calculatorEstimate.update({
      where: { id: savedEstimate.id },
      data: {
        telegramStatus: TelegramDeliveryStatus.FAILED,
        telegramError: delivery.error,
      },
    });
  } catch (error) {
    console.error("Failed to save calculator estimate Telegram delivery error", {
      estimateId: savedEstimate.id,
      deliveryError: delivery.error,
      error,
    });
  }

  return NextResponse.json({
    saved: true,
    estimateId: savedEstimate.id,
    createdAt: savedEstimate.createdAt,
    telegramStatus: TelegramDeliveryStatus.FAILED,
    message: `Смета №${savedEstimate.id} сохранена, но уведомление в Telegram не отправлено. ${delivery.error}`,
  }, { status: 201 });
}
