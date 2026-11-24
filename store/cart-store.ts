"use client";

import { create } from "zustand";
import type { Product } from "@/lib/products";

const cartStorageKey = "cart";

type CartItem = Pick<Product, "id" | "name" | "price"> & {
  quantity: number;
  productId: string;
  variantPower?: string;
  stockQuantity?: number;
};

type CartStore = {
  items: CartItem[];
  addItem: (product: Product) => void;
  updateQuantity: (productId: string, quantity: number, availableStock?: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  hydrateCart: () => void;
  count: () => number;
};

function readCartItems(): CartItem[] {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(cartStorageKey) ?? "[]");
    const rawItems = Array.isArray(parsed) ? parsed : parsed?.state?.items;

    return Array.isArray(rawItems)
      ? rawItems
          .filter((item): item is CartItem => typeof item?.id === "string")
          .map((item) => {
            const stockQuantity =
              typeof item.stockQuantity === "number" && Number.isFinite(item.stockQuantity)
                ? Math.max(0, Math.floor(item.stockQuantity))
                : undefined;
            const quantity = Math.max(1, Number(item.quantity) || 1);

            return {
              id: item.id,
              name: item.name ?? "",
              price: Number(item.price) || 0,
              productId: item.productId ?? item.id,
              variantPower: item.variantPower,
              stockQuantity,
              quantity: stockQuantity === undefined ? quantity : Math.min(quantity, stockQuantity),
            };
          })
          .filter((item) => item.quantity > 0)
      : [];
  } catch {
    return [];
  }
}

function writeCartItems(items: CartItem[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    cartStorageKey,
    JSON.stringify(items.map((item) => ({ id: item.id, name: item.name, price: item.price, productId: item.productId, variantPower: item.variantPower, stockQuantity: item.stockQuantity, quantity: item.quantity }))),
  );
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  hydrateCart: () => set({ items: readCartItems() }),
  addItem: (product) =>
    set((state) => {
      const currentItems = state.items.length > 0 ? state.items : readCartItems();
      const variantPower = product.variantPower;
      const productId = variantPower ? product.id.split("::")[0] : product.id;
      const stockQuantity =
        typeof product.stockQuantity === "number" && Number.isFinite(product.stockQuantity)
          ? Math.max(0, Math.floor(product.stockQuantity))
          : undefined;
      if (stockQuantity === 0) return { items: currentItems };

      const existing = currentItems.find((item) => item.id === product.id);
      const nextItems = existing
        ? currentItems.map((item) =>
            item.id === product.id
              ? {
                  ...item,
                  name: product.name,
                  price: product.price,
                  stockQuantity,
                  quantity: Math.min(item.quantity + 1, stockQuantity ?? Number.POSITIVE_INFINITY),
                }
              : item,
          )
        : [
            ...currentItems,
            {
              id: product.id,
              name: product.name,
              price: product.price,
              productId,
              variantPower,
              stockQuantity,
              quantity: 1,
            },
          ];

      writeCartItems(nextItems);
      return { items: nextItems };
    }),
  updateQuantity: (productId, quantity, availableStock) =>
    set((state) => {
      if (!Number.isFinite(quantity)) return state;
      const currentItem = state.items.find((item) => item.id === productId);
      if (!currentItem) return state;

      const stockLimit =
        typeof availableStock === "number" && Number.isFinite(availableStock)
          ? Math.max(0, Math.floor(availableStock))
          : currentItem.stockQuantity ?? Number.POSITIVE_INFINITY;
      const nextQuantity = Math.min(Math.floor(quantity), stockLimit);
      const nextItems = nextQuantity <= 0
        ? state.items.filter((item) => item.id !== productId)
        : state.items.map((item) =>
            item.id === productId
              ? {
                  ...item,
                  quantity: nextQuantity,
                  stockQuantity:
                    typeof availableStock === "number" && Number.isFinite(availableStock)
                      ? stockLimit
                      : item.stockQuantity,
                }
              : item,
          );

      writeCartItems(nextItems);
      return { items: nextItems };
    }),
  removeItem: (productId) =>
    set((state) => {
      const nextItems = state.items.filter((item) => item.id !== productId);

      writeCartItems(nextItems);
      return { items: nextItems };
    }),
  clearCart: () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(cartStorageKey);
    }
    set({ items: [] });
  },
  count: () => get().items.reduce((total, item) => total + item.quantity, 0),
}));
