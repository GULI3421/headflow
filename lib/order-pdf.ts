import type { TDocumentDefinitions } from "pdfmake/interfaces";

export type OrderPdfLine = {
  name: string;
  variant?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type OrderPdfData = {
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerComment: string;
  items: OrderPdfLine[];
  total: number;
};

export type OrderSummaryPdfData = {
  orderNumber: string;
  createdAt: string;
  items: Pick<OrderPdfLine, "name" | "variant" | "quantity">[];
  total: number;
};

function formatMoney(value: number) {
  return `${value.toLocaleString("ru-RU")} сом`;
}

export function getOrderPdfFilename(orderNumber: string) {
  const safeOrderNumber = orderNumber
    .normalize("NFKC")
    .replace(/[<>:"\/\\|?*\u0000-\u001F]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-. ]+|[-. ]+$/g, "")
    .slice(0, 100)
    .replace(/[. ]+$/g, "");

  if (!safeOrderNumber) throw new Error("Не удалось сформировать имя PDF: отсутствует номер заказа.");
  return `Zakaz-${safeOrderNumber}.pdf`;
}

export function createOrderPdfDefinition(order: OrderPdfData): TDocumentDefinitions {
  return {
    pageSize: "A4",
    pageMargins: [40, 42, 40, 48],
    defaultStyle: {
      font: "Roboto",
      fontSize: 9,
      color: "#202124",
    },
    styles: {
      brand: {
        fontSize: 19,
        bold: true,
        color: "#151515",
      },
      subtitle: {
        fontSize: 9,
        color: "#666666",
        margin: [0, 4, 0, 18],
      },
      title: {
        fontSize: 16,
        bold: true,
        margin: [0, 0, 0, 10],
      },
      section: {
        fontSize: 11,
        bold: true,
        margin: [0, 18, 0, 8],
      },
      tableHeader: {
        bold: true,
        color: "#FFFFFF",
        fillColor: "#202124",
      },
      total: {
        fontSize: 13,
        bold: true,
        color: "#E94B00",
        margin: [0, 12, 0, 0],
      },
    },
    content: [
      { text: "ЦЕНТР ОТОПЛЕНИЯ", style: "brand" },
      { text: "Бишкек · Телефон / WhatsApp: +996 (708) 605-281", style: "subtitle" },
      { text: "Заказ", style: "title" },
      {
        columns: [
          { text: [{ text: "Номер заказа: ", bold: true }, order.orderNumber] },
          {
            text: [
              { text: "Дата и время: ", bold: true },
              new Date(order.createdAt).toLocaleString("ru-RU", { timeZone: "Asia/Bishkek" }),
            ],
            alignment: "right",
          },
        ],
      },
      { text: "Данные клиента", style: "section" },
      {
        table: {
          widths: [105, "*"],
          body: [
            [{ text: "Имя", bold: true }, order.customerName],
            [{ text: "Телефон", bold: true }, order.customerPhone],
            ...(order.customerComment
              ? [[{ text: "Адрес / комментарий", bold: true }, order.customerComment]]
              : []),
          ],
        },
        layout: "noBorders",
      },
      { text: "Товары", style: "section" },
      {
        table: {
          headerRows: 1,
          keepWithHeaderRows: 1,
          dontBreakRows: true,
          widths: ["*", 76, 38, 78, 82],
          body: [
            [
              { text: "Наименование", style: "tableHeader" },
              { text: "Вариант", style: "tableHeader" },
              { text: "Кол-во", style: "tableHeader", alignment: "center" },
              { text: "Цена за шт.", style: "tableHeader", alignment: "right" },
              { text: "Сумма", style: "tableHeader", alignment: "right" },
            ],
            ...order.items.map((item) => [
              { text: item.name },
              { text: item.variant || "—" },
              { text: String(item.quantity), alignment: "center" as const },
              { text: formatMoney(item.unitPrice), alignment: "right" as const },
              { text: formatMoney(item.lineTotal), alignment: "right" as const },
            ]),
          ],
        },
        layout: {
          hLineColor: () => "#E4E4E7",
          vLineColor: () => "#E4E4E7",
          paddingLeft: () => 7,
          paddingRight: () => 7,
          paddingTop: () => 8,
          paddingBottom: () => 8,
        },
      },
      {
        columns: [
          { text: "ИТОГО", style: "total" },
          { text: formatMoney(order.total), style: "total", alignment: "right" },
        ],
      },
    ],
  };
}

export function createOrderSummaryPdfDefinition(order: OrderSummaryPdfData): TDocumentDefinitions {
  return {
    pageSize: "A4",
    pageMargins: [40, 42, 40, 48],
    defaultStyle: {
      font: "Roboto",
      fontSize: 9,
      color: "#202124",
    },
    styles: {
      brand: {
        fontSize: 19,
        bold: true,
        color: "#151515",
      },
      subtitle: {
        fontSize: 9,
        color: "#666666",
        margin: [0, 4, 0, 18],
      },
      title: {
        fontSize: 16,
        bold: true,
        margin: [0, 0, 0, 10],
      },
      section: {
        fontSize: 11,
        bold: true,
        margin: [0, 18, 0, 8],
      },
      tableHeader: {
        bold: true,
        color: "#FFFFFF",
        fillColor: "#202124",
      },
      total: {
        fontSize: 13,
        bold: true,
        color: "#E94B00",
        margin: [0, 12, 0, 0],
      },
    },
    content: [
      { text: "ЦЕНТР ОТОПЛЕНИЯ", style: "brand" },
      { text: "Бланк заказа · краткая копия без персональных данных", style: "subtitle" },
      { text: "Заказ", style: "title" },
      {
        columns: [
          { text: [{ text: "Номер заказа: ", bold: true }, order.orderNumber] },
          {
            text: [
              { text: "Дата и время: ", bold: true },
              new Date(order.createdAt).toLocaleString("ru-RU", { timeZone: "Asia/Bishkek" }),
            ],
            alignment: "right",
          },
        ],
      },
      { text: "Состав заказа", style: "section" },
      {
        table: {
          headerRows: 1,
          keepWithHeaderRows: 1,
          dontBreakRows: true,
          widths: ["*", 110, 50],
          body: [
            [
              { text: "Наименование", style: "tableHeader" },
              { text: "Вариант", style: "tableHeader" },
              { text: "Кол-во", style: "tableHeader", alignment: "center" },
            ],
            ...order.items.map((item) => [
              { text: item.name },
              { text: item.variant || "—" },
              { text: String(item.quantity), alignment: "center" as const },
            ]),
          ],
        },
        layout: {
          hLineColor: () => "#E4E4E7",
          vLineColor: () => "#E4E4E7",
          paddingLeft: () => 7,
          paddingRight: () => 7,
          paddingTop: () => 8,
          paddingBottom: () => 8,
        },
      },
      {
        columns: [
          { text: "ИТОГО", style: "total" },
          { text: formatMoney(order.total), style: "total", alignment: "right" },
        ],
      },
    ],
  };
}

async function downloadPdf(definition: TDocumentDefinitions, orderNumber: string) {
  const [pdfMakeModule, pdfFontsModule] = await Promise.all([
    import("pdfmake/build/pdfmake"),
    import("pdfmake/build/vfs_fonts"),
  ]);
  const pdfMake = pdfMakeModule.default;
  const pdfFonts = pdfFontsModule.default;
  pdfMake.addVirtualFileSystem(pdfFonts);
  await pdfMake.createPdf(definition).download(getOrderPdfFilename(orderNumber));
}

export async function downloadOrderPdf(order: OrderPdfData) {
  await downloadPdf(createOrderPdfDefinition(order), order.orderNumber);
}

export async function downloadOrderSummaryPdf(order: OrderSummaryPdfData) {
  await downloadPdf(createOrderSummaryPdfDefinition(order), order.orderNumber);
}
