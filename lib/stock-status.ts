export const LOW_STOCK_THRESHOLD = 3;

export type StockStatusKey = "outOfStock" | "lowStock" | "inStock";

export function getStockStatus(stockQuantity: number) {
  const quantity = Number.isFinite(stockQuantity) ? stockQuantity : 0;

  if (quantity <= 0) {
    return {
      key: "outOfStock" as const,
      label: "Нет в наличии",
      className: "border-red-500/25 bg-red-500/10 text-red-500 dark:text-red-400",
      photoClassName: "border-red-400/35 text-red-300",
    };
  }

  if (quantity <= LOW_STOCK_THRESHOLD) {
    return {
      key: "lowStock" as const,
      label: `Мало (осталось ${quantity} шт.)`,
      className: "border-orange-500/25 bg-orange-500/10 text-orange-500 dark:text-orange-400",
      photoClassName: "border-orange-400/35 text-orange-300",
    };
  }

  return {
    key: "inStock" as const,
    label: `В наличии (${quantity} шт.)`,
    className: "border-green-500/25 bg-green-500/10 text-green-500 dark:text-green-400",
    photoClassName: "border-green-400/35 text-green-300",
  };
}
