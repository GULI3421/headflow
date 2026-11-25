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
  hasHydrated: boolean;
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
          .flatMap((value): CartItem[] => {
            if (typeof value !== "object" || value === null || Array.isArray(value)) {
              return [];
            }

            const item = value as Record<string, unknown>;
            if (typeof item.id !== "string" || !item.id.trim()) return [];
            const separatorIndex = item.id.indexOf("::");
            const id = item.id;
            const legacyProductId = separatorIndex >= 0 ? id.slice(0, separatorIndex) : id;
            const productIdValue = typeof item.productId === "string" && item.productId.trim()
              ? item.productId.trim()
              : legacyProductId;
            const productId = productIdValue.split("::", 1)[0];
            if (!productId) return [];
            const legacyVariant = separatorIndex >= 0 ? id.slice(separatorIndex + 2) : "";
            const variantPower = typeof item.variantPower === "string" && item.variantPower.trim()
              ? item.variantPower
              : legacyVariant || undefined;
            const stockQuantity =
              typeof item.stockQuantity === "number" && Number.isFinite(item.stockQuantity)
                ? Math.max(0, Math.floor(item.stockQuantity))
                : undefined;
            const storedQuantity = Number(item.quantity);
            if (Number.isFinite(storedQuantity) && storedQuantity <= 0) return [];
            const quantity = Math.max(1, Math.floor(Number.isFinite(storedQuantity) ? storedQuantity : 1));
            const safeQuantity = stockQuantity === undefined ? quantity : Math.min(quantity, stockQuantity);

            return [{
              id,
              name: typeof item.name === "string" ? item.name : "",
              price: typeof item.price === "number" && Number.isFinite(item.price) && item.price >= 0 ? item.price : 0,
              productId,
              variantPower,
              stockQuantity,
              quantity: safeQuantity,
            }];
          })
          .filter((item) => item.quantity > 0)
      : [];
  } catch (error) {
    console.warn("Unable to read the saved cart; using an empty cart.", error);
    return [];
  }
}

function writeCartItems(items: CartItem[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      cartStorageKey,
      JSON.stringify(items.map((item) => ({ id: item.id, name: item.name, price: item.price, productId: item.productId, variantPower: item.variantPower, stockQuantity: item.stockQuantity, quantity: item.quantity }))),
    );
  } catch (error) {
    console.error("Unable to persist the cart to localStorage.", error);
  }
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  hasHydrated: false,
  hydrateCart: () => {
    if (get().hasHydrated) return;
    set({ items: readCartItems(), hasHydrated: true });
  },
  addItem: (product) =>
    set((state) => {
      const currentItems = state.hasHydrated ? state.items : readCartItems();
      const variantPower = product.variantPower;
      const productId = variantPower ? product.id.split("::")[0] : product.id;
      const stockQuantity =
        typeof product.stockQuantity === "number" && Number.isFinite(product.stockQuantity)
          ? Math.max(0, Math.floor(product.stockQuantity))
          : undefined;
      if (stockQuantity === 0) return { items: currentItems, hasHydrated: true };

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
      return { items: nextItems, hasHydrated: true };
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
      return { items: nextItems, hasHydrated: true };
    }),
  removeItem: (productId) =>
    set((state) => {
      const nextItems = state.items.filter((item) => item.id !== productId);

      writeCartItems(nextItems);
      return { items: nextItems, hasHydrated: true };
    }),
  clearCart: () => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(cartStorageKey);
      } catch (error) {
        console.error("Unable to clear the saved cart from localStorage.", error);
      }
    }
    set({ items: [], hasHydrated: true });
  },
  count: () => get().items.reduce((total, item) => total + item.quantity, 0),
}));

type CartStorageWindow = Window & {
  __heatflowCartStorageHandler?: (event: StorageEvent) => void;
};

if (typeof window !== "undefined") {
  const cartWindow = window as CartStorageWindow;
  if (cartWindow.__heatflowCartStorageHandler) {
    window.removeEventListener("storage", cartWindow.__heatflowCartStorageHandler);
  }
  const storageHandler = (event: StorageEvent) => {
    if (event.key === cartStorageKey || event.key === null) {
      useCartStore.setState({ items: readCartItems(), hasHydrated: true });
    }
  };
  cartWindow.__heatflowCartStorageHandler = storageHandler;
  window.addEventListener("storage", storageHandler);
}
