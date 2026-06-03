"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Calculator, Heart, MapPin, Menu, Phone, Search, ShoppingCart, X } from "lucide-react";
import "@/src/i18n/config";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useClientMounted } from "@/components/use-client-mounted";
import { categoryHref } from "@/lib/catalog";
import type { Product } from "@/lib/products";
import { listProductDocuments, mapAppwriteProduct } from "@/src/lib/appwrite";
import { useCartStore } from "@/store/cart-store";
import { useFavorites } from "@/store/use-favorites";

const menu = [
  { labelKey: "header.nav.boilers", href: categoryHref("Котлы") },
  { labelKey: "header.nav.radiators", href: categoryHref("Радиаторы") },
  { labelKey: "header.nav.underfloor", href: categoryHref("Теплый пол") },
  { labelKey: "header.nav.installation", href: "/installation" },
];

export function Header() {
  const mounted = useClientMounted();
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const desktopSearchRef = useRef<HTMLFormElement>(null);
  const mobileSearchRef = useRef<HTMLFormElement>(null);
  const cartCount = useCartStore((state) => state.count());
  const hydrateCart = useCartStore((state) => state.hydrateCart);
  const { favorites } = useFavorites();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    if (mounted) {
      hydrateCart();
    }
  }, [hydrateCart, mounted]);

  useEffect(() => {
    if (!mounted) return;

    let ignore = false;

    async function loadProducts() {
      try {
        const response = await listProductDocuments();

        if (ignore) return;

        setProducts(response.documents.map((product) => mapAppwriteProduct(product, i18n.language)));
      } catch {
        if (!ignore) {
          setProducts([]);
        }
      }
    }

    loadProducts();

    return () => {
      ignore = true;
    };
  }, [i18n.language, mounted]);

  useEffect(() => {
    if (!mounted || pathname !== "/catalog") return;

    const params = new URLSearchParams(window.location.search);
    setQuery(params.get("search") ?? "");
    setSearchOpen(false);
  }, [mounted, pathname]);

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      const target = event.target as Node;

      if (desktopSearchRef.current?.contains(target) || mobileSearchRef.current?.contains(target)) {
        return;
      }

      setSearchOpen(false);
    }

    document.addEventListener("mousedown", handleDocumentClick);

    return () => document.removeEventListener("mousedown", handleDocumentClick);
  }, []);

  useEffect(() => {
    if (!mounted || pathname !== "/catalog") return;

    const timeoutId = window.setTimeout(() => {
      const searchQuery = query.trim();
      const params = new URLSearchParams(window.location.search);

      if (searchQuery) {
        params.set("search", searchQuery);
      } else {
        params.delete("search");
      }

      const nextQuery = params.toString();
      router.replace(nextQuery ? `/catalog?${nextQuery}#products` : "/catalog#products", { scroll: false });
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [mounted, pathname, query, router]);

  const suggestions = useMemo(
    () =>
      query.length < 2
        ? []
        : products.filter((product) => product.name.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchOpen(false);

    const searchQuery = query.trim();
    if (searchQuery) {
      router.push(`/catalog?search=${encodeURIComponent(searchQuery)}#products`);
    }
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    setSearchOpen(value.length >= 2);
  }

  function closeSearchResults() {
    setSearchOpen(false);
  }

  if (!mounted) {
    return null;
  }

  return (
    <header className="sticky top-0 z-[999] w-full border-b border-zinc-200 bg-white text-zinc-950 shadow-xl shadow-black/10 dark:border-zinc-800 dark:bg-black dark:text-white dark:shadow-black/20">
      <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-xs text-zinc-600 dark:border-zinc-800/60 dark:bg-zinc-900/50 dark:text-zinc-400">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <span className="inline-flex items-center gap-2 whitespace-nowrap">
              <MapPin size={14} className="text-[#FF4F00]" aria-hidden />
              {t("header.city")}
            </span>
            <a className="hidden items-center gap-2 whitespace-nowrap font-semibold text-zinc-700 transition hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white sm:inline-flex" href="tel:+996708605281">
              <Phone size={14} className="text-[#FF4F00]" aria-hidden />
              +996 (708) 605-281
            </a>
          </div>

          <nav className="hidden shrink-0 items-center gap-4 font-semibold md:flex" aria-label="Дополнительная навигация">
            <Link className="transition hover:text-zinc-950 dark:hover:text-white" href="/about">
              {t("header.about")}
            </Link>
            <Link className="transition hover:text-zinc-950 dark:hover:text-white" href="/contacts">
              {t("header.contacts")}
            </Link>
            <a className="text-[#FF4F00] transition hover:text-zinc-950 dark:hover:text-white" href="/price.pdf" rel="noreferrer" target="_blank">
              {t("header.downloadPrice")}
            </a>
          </nav>
        </div>
      </div>

      <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-3 px-4 py-3 lg:gap-5">
        <Link href="/" className="flex min-w-fit items-center gap-3" aria-label={t("common.brand")}>
          <Image
            alt={t("common.brand")}
            className="object-contain"
            height={44}
            priority
            src="/assets/logo.png"
            width={44}
          />
          <div className="block leading-none">
            <span className="block text-base font-black uppercase text-zinc-950 dark:text-white sm:text-xl">ЦЕНТР</span>
            <span className="mt-1 block text-xs font-bold uppercase tracking-widest text-[#FF4F00]">
              ОТОПЛЕНИЯ
            </span>
          </div>
        </Link>

        <nav className="hidden shrink-0 items-center gap-0.5 xl:flex">
          {menu.map((item, index) => (
            <Link
              className="rounded-md px-2.5 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-black/5 hover:text-zinc-950 dark:text-white/78 dark:hover:bg-white/10 dark:hover:text-white"
              href={item.href}
              key={`${item.labelKey}-${index}-${item.href}`}
            >
              {t(item.labelKey)}
            </Link>
          ))}
        </nav>

        <form className="relative hidden min-w-[240px] flex-1 md:block xl:max-w-2xl" onSubmit={handleSearch} ref={desktopSearchRef}>
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input
            aria-label={t("header.searchLabel")}
            className="h-12 w-full rounded-md border border-zinc-200 bg-zinc-50 pl-11 pr-4 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-[#FF4F00] focus:bg-white dark:border-zinc-700 dark:bg-zinc-900/75 dark:text-white dark:placeholder:text-zinc-500 dark:focus:bg-zinc-900"
            onChange={(event) => handleQueryChange(event.target.value)}
            onFocus={() => setSearchOpen(query.length >= 2)}
            placeholder="Поиск отопительного оборудования..."
            value={query}
          />
          {searchOpen && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-14 z-[999] overflow-hidden rounded-md border border-zinc-200 bg-white text-zinc-950 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 dark:text-white">
              {suggestions.map((product, index) => (
                <Link
                  className="flex items-center justify-between px-4 py-3 text-sm transition hover:bg-zinc-100 dark:hover:bg-zinc-900"
                  href={`/product/${product.id}`}
                  key={`${product.id}-${index}`}
                  onClick={closeSearchResults}
                >
                  <span className="font-semibold">{product.name}</span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-500">{product.power}</span>
                </Link>
              ))}
            </div>
          )}
        </form>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            className="hidden h-10 items-center gap-2 rounded-md border border-[#FF4F00]/70 px-3 text-xs font-black uppercase text-[#FF4F00] transition hover:bg-[#FF4F00] hover:text-white lg:inline-flex"
            href="/calculator"
          >
            <Calculator size={16} aria-hidden />
            {t("header.calculator")}
          </Link>

          <div className="hidden items-center gap-2 lg:flex">
            <LanguageSwitcher />
            <ThemeSwitcher />
          </div>

          <Link className="relative grid size-10 place-items-center rounded-md bg-black/5 transition hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15" href="/favorites" aria-label="Избранное">
            <Heart size={20} aria-hidden />
            {favorites.length > 0 && (
              <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-red-500 text-xs font-black text-white">
                {favorites.length}
              </span>
            )}
          </Link>

          <Link className="relative grid size-10 place-items-center rounded-md bg-black/5 transition hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15" href="/cart" aria-label={t("header.cart")}>
            <ShoppingCart size={20} aria-hidden />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-[#FF4F00] text-xs font-black text-white">
                {cartCount}
              </span>
            )}
          </Link>
        </div>

        <button
          className="grid size-10 place-items-center rounded-md bg-black/5 transition hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 xl:hidden"
          onClick={() => setMenuOpen((value) => !value)}
          aria-label={t("header.openMenu")}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {menuOpen && (
        <div className="relative z-[999] border-t border-zinc-200 bg-white px-4 pb-5 text-zinc-950 dark:border-zinc-800 dark:bg-black dark:text-white xl:hidden">
          <div className="mx-auto grid max-w-7xl gap-2 py-2">
            <form className="relative my-2 md:hidden" onSubmit={handleSearch} ref={mobileSearchRef}>
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input
                aria-label={t("header.searchLabel")}
                className="h-12 w-full rounded-md border border-zinc-200 bg-zinc-50 pl-11 pr-4 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-[#FF4F00] dark:border-zinc-700 dark:bg-zinc-900/75 dark:text-white dark:placeholder:text-zinc-500"
                onChange={(event) => handleQueryChange(event.target.value)}
                onFocus={() => setSearchOpen(query.length >= 2)}
                placeholder="Поиск отопительного оборудования..."
                value={query}
              />
            </form>
            {menu.map((item, index) => (
              <Link
                className="rounded-md py-3 text-base font-bold"
                href={item.href}
                key={`${item.labelKey}-${index}-${item.href}`}
                onClick={() => setMenuOpen(false)}
              >
                {t(item.labelKey)}
              </Link>
            ))}
            <Link className="flex items-center gap-2 rounded-md py-3 text-base font-bold text-[#FF4F00]" href="/calculator" onClick={() => setMenuOpen(false)}>
              <Calculator size={18} aria-hidden />
              {t("header.calculator")}
            </Link>
            <div className="flex items-center gap-2 py-2 lg:hidden">
              <LanguageSwitcher />
              <ThemeSwitcher />
            </div>
            <div className="mt-2 border-t border-black/10 pt-3 dark:border-white/10">
              <Link className="block rounded-md py-2 text-sm font-semibold text-zinc-600 dark:text-white/70" href="/about">
                {t("header.about")}
              </Link>
              <Link className="block rounded-md py-2 text-sm font-semibold text-zinc-600 dark:text-white/70" href="/contacts">
                {t("header.contacts")}
              </Link>
              <a className="block rounded-md py-2 text-sm font-semibold text-[#FF4F00]" href="/price.pdf" rel="noreferrer" target="_blank">
                {t("header.downloadPrice")}
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
