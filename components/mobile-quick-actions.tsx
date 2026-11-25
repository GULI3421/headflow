"use client";

import Link from "next/link";
import { Home, LayoutGrid, MessageCircle, ShoppingCart } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import "@/src/i18n/config";
import { useClientMounted } from "@/components/use-client-mounted";
import { useCartStore } from "@/store/cart-store";

export function MobileQuickActions() {
  const mounted = useClientMounted();
  const cartCount = useCartStore((state) => state.count());
  const hydrateCart = useCartStore((state) => state.hydrateCart);
  const { t } = useTranslation();

  useEffect(() => {
    if (mounted) {
      hydrateCart();
    }
  }, [hydrateCart, mounted]);

  if (!mounted) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#0F0F0F]/95 px-3 py-2 text-white shadow-2xl backdrop-blur md:hidden">
      <div className="grid grid-cols-4 gap-2">
        <Link className="flex h-[52px] flex-col items-center justify-center gap-1 rounded-md text-[11px] font-bold text-white/72 transition hover:bg-white/10 hover:text-white" href="/">
          <Home size={19} aria-hidden />
          {t("mobileNav.home")}
        </Link>
        <Link className="flex h-[52px] flex-col items-center justify-center gap-1 rounded-md text-[11px] font-bold text-white/72 transition hover:bg-white/10 hover:text-white" href="/catalog">
          <LayoutGrid size={19} aria-hidden />
          {t("mobileNav.catalog")}
        </Link>
        <Link className="relative flex h-[52px] flex-col items-center justify-center gap-1 rounded-md bg-[#FF4F00] text-[11px] font-black text-white" href="/cart">
          <ShoppingCart size={19} aria-hidden />
          {t("mobileNav.cart")}
          {cartCount > 0 && (
            <span className="absolute right-3 top-1 grid size-5 place-items-center rounded-full bg-white text-[10px] font-black text-[#FF4F00]">
              {cartCount}
            </span>
          )}
        </Link>
        <a className="flex h-[52px] flex-col items-center justify-center gap-1 rounded-md text-[11px] font-bold text-white/72 transition hover:bg-white/10 hover:text-white" href="https://wa.me/996555001122">
          <MessageCircle size={19} aria-hidden />
          WhatsApp
        </a>
      </div>
    </div>
  );
}
