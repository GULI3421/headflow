"use client";

import { create } from "zustand";
import type { Product } from "@/lib/products";

const cartStorageKey = "cart";

type CartItem = Pick<Product, "id" | "name" | "price"> & {
  quantity: number;
};

type CartStore = {
  items: CartItem[];
  addItem: (product: Product) => void;
  updateQuantity: (productId: string, quantity: number) => void;
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
          .map((item) => ({
            id: item.id,
            name: item.name ?? "",
            price: Number(item.price) || 0,
            quantity: Math.max(1, Number(item.quantity) || 1),
          }))
      : [];
  } catch {
    return [];
  }
}

function writeCartItems(items: CartItem[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    cartStorageKey,
    JSON.stringify(items.map((item) => ({ id: item.id, name: item.name, price: item.price, quantity: item.quantity }))),
  );
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  hydrateCart: () => set({ items: readCartItems() }),
  addItem: (product) =>
    set((state) => {
      const currentItems = state.items.length > 0 ? state.items : readCartItems();
      const existing = currentItems.find((item) => item.id === product.id);
      const nextItems = existing
        ? currentItems.map((item) =>
            item.id === product.id
              ? { ...item, name: product.name, price: product.price, quantity: item.quantity + 1 }
              : item,
          )
        : [
            ...currentItems,
            {
              id: product.id,
              name: product.name,
              price: product.price,
              quantity: 1,
            },
          ];

      writeCartItems(nextItems);
      return { items: nextItems };
    }),
  updateQuantity: (productId, quantity) =>
    set((state) => {
      const nextItems = state.items.map((item) =>
        item.id === productId ? { ...item, quantity: Math.max(1, quantity) } : item,
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
