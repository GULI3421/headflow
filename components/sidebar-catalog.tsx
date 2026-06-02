"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronRight,
  Database,
  Droplets,
  Flame,
  Grid3X3,
  Menu,
  Settings2,
  Thermometer,
  Wind,
  Wrench,
  X,
} from "lucide-react";
import { Fragment, useState } from "react";
import { useTranslation } from "react-i18next";
import { useClientMounted } from "@/components/use-client-mounted";
import { categoryHref, subcategoryHref, subcategoryMap } from "@/lib/catalog";
import "@/src/i18n/config";

type CatalogItem = {
  key: string;
  title: string;
  href: string;
  category?: string;
  icon: typeof Thermometer;
};

const catalogItems: CatalogItem[] = [
  { key: "boilers", title: "Котлы", href: categoryHref("Котлы"), category: "Котлы", icon: Flame },
  { key: "radiators", title: "Радиаторы", href: categoryHref("Радиаторы"), category: "Радиаторы", icon: Grid3X3 },
  {
    key: "fittings",
    title: "Комплектующие и фитинги",
    href: categoryHref("Комплектующие и фитинги"),
    category: "Комплектующие и фитинги",
    icon: Wrench,
  },
  {
    key: "equipmentAutomation",
    title: "Оборудование и автоматика",
    href: categoryHref("Оборудование и автоматика"),
    category: "Оборудование и автоматика",
    icon: Settings2,
  },
  { key: "underfloor", title: "Теплый пол", href: categoryHref("Теплый пол"), category: "Теплый пол", icon: Droplets },
  {
    key: "bufferTanks",
    title: "Буферные резервуары",
    href: categoryHref("Буферные резервуары"),
    category: "Буферные резервуары",
    icon: Database,
  },
  { key: "fancoils", title: "Фанкойлы", href: categoryHref("Фанкойлы"), category: "Фанкойлы", icon: Wind },
  {
    key: "heatPumps",
    title: "Тепловые насосы",
    href: categoryHref("Тепловые насосы"),
    category: "Тепловые насосы",
    icon: Thermometer,
  },
];

function SidebarItems({
  expanded,
  onNavigate,
}: {
  expanded: boolean;
  onNavigate?: () => void;
}) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const mounted = useClientMounted();
  const activeCategory = searchParams.get("category");
  const activeSubcategory = searchParams.get("subcategory");
  const activeItem = catalogItems.find((item) => item.category === activeCategory)?.key ?? null;

  function toggleCategory(category: string) {
    setExpandedCategories((value) =>
      value.includes(category) ? value.filter((item) => item !== category) : [...value, category],
    );
  }

  if (!mounted) {
    return null;
  }

  return (
    <nav className="grid gap-1" aria-label={t("sidebar.ariaLabel")}>
      {catalogItems.map((item) => {
        const Icon = item.icon;
        const isActive = (hoveredItem ?? activeItem) === item.key;
        const title = item.title;
        const subcategories = item.category ? subcategoryMap[item.category] ?? [] : [];
        const hasSubcategories = subcategories.length > 0;
        const subcategoriesExpanded = Boolean(item.category && expandedCategories.includes(item.category));

        return (
          <Fragment key={item.key}>
            <div
              className={`group relative flex h-12 items-center gap-3 overflow-hidden rounded-md text-[12px] font-semibold uppercase text-black/62 transition hover:bg-black/5 hover:text-black dark:text-white/70 dark:hover:bg-white/5 dark:hover:text-white ${
                expanded ? "px-3" : "justify-center px-0"
              }`}
              onMouseEnter={() => setHoveredItem(item.key)}
              onMouseLeave={() => setHoveredItem(null)}
              title={title}
            >
              <span
                className={`absolute left-0 top-2 h-8 w-0.5 rounded-full bg-[#FF4F00] transition ${
                  isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                }`}
              />
              <Link
                className={`flex min-w-0 flex-1 items-center gap-3 ${expanded ? "" : "justify-center"}`}
                href={item.href}
                onClick={() => {
                  setHoveredItem(null);
                  onNavigate?.();
                }}
              >
                <Icon className="shrink-0 text-[#FF4F00]" size={22} strokeWidth={1.9} aria-hidden />
                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.span
                      animate={{ opacity: 1, x: 0 }}
                      className="min-w-0 flex-1 whitespace-nowrap"
                      exit={{ opacity: 0, x: -8 }}
                      initial={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.16 }}
                    >
                      {title}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
              <AnimatePresence initial={false}>
                {expanded && hasSubcategories && item.category && (
                  <motion.button
                    animate={{ opacity: 1 }}
                    aria-expanded={subcategoriesExpanded}
                    aria-label={`${subcategoriesExpanded ? "Свернуть" : "Развернуть"} ${title}`}
                    className="grid size-8 shrink-0 place-items-center rounded-md text-black/35 transition hover:bg-black/5 hover:text-[#FF4F00] dark:text-white/35 dark:hover:bg-white/5"
                    exit={{ opacity: 0 }}
                    initial={{ opacity: 0 }}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      toggleCategory(item.category ?? "");
                    }}
                    transition={{ duration: 0.16 }}
                    type="button"
                  >
                    <ChevronRight
                      className={`transition ${subcategoriesExpanded ? "rotate-90" : ""}`}
                      size={15}
                      aria-hidden
                    />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
            <AnimatePresence initial={false}>
              {expanded && subcategoriesExpanded && (
                <motion.div
                  animate={{ height: "auto", opacity: 1 }}
                  className="ml-9 grid overflow-hidden border-l border-black/10 pl-3 dark:border-white/10"
                  exit={{ height: 0, opacity: 0 }}
                  initial={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <div className="grid gap-1 py-1">
                    {subcategories.map((subcategory) => {
                      const isSubcategoryActive = activeCategory === item.category && activeSubcategory === subcategory;

                      return (
                        <Link
                          className={`rounded-md px-2 py-2 text-[11px] font-bold text-black/55 transition hover:bg-black/5 hover:text-[#FF4F00] dark:text-white/55 dark:hover:bg-white/5 ${
                            isSubcategoryActive ? "bg-[#FF4F00]/10 text-[#FF4F00] dark:text-[#FF4F00]" : ""
                          }`}
                          href={subcategoryHref(item.category ?? "", subcategory)}
                          key={subcategory}
                          onClick={onNavigate}
                        >
                          {item.category === "Котлы" ? `${subcategory} котлы` : subcategory}
                        </Link>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Fragment>
        );
      })}
    </nav>
  );
}

export function SidebarCatalog() {
  const mounted = useClientMounted();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { t } = useTranslation();

  if (!mounted) {
    return null;
  }

  return (
    <>
      <motion.aside
        animate={{ width: isExpanded ? 280 : 70 }}
        className="fixed bottom-0 left-0 top-28 z-50 hidden overflow-hidden border-r border-black/10 bg-white px-2 py-4 text-[#151515] shadow-2xl shadow-black/10 dark:border-white/5 dark:bg-[#111111] dark:text-white lg:block"
        initial={false}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
      >
        <button
          className={`mb-5 flex h-12 items-center rounded-md bg-[#FF4F00] text-white shadow-[0_0_24px_rgba(255,79,0,0.24)] transition hover:bg-[#e64800] ${
            isExpanded ? "w-full justify-start gap-3 px-3" : "w-full justify-center"
          }`}
          onClick={() => setIsExpanded((value) => !value)}
          aria-label={isExpanded ? t("sidebar.collapse") : t("sidebar.expand")}
        >
          {isExpanded ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.span
                animate={{ opacity: 1, x: 0 }}
                className="text-[12px] font-black uppercase tracking-widest"
                exit={{ opacity: 0, x: -8 }}
                initial={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.16 }}
              >
                {t("sidebar.catalog")}
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        <div className="max-h-[calc(100vh-140px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
          <SidebarItems expanded={isExpanded} />
        </div>
      </motion.aside>

      <button
        className="fixed bottom-24 left-4 z-50 grid size-12 place-items-center rounded-md bg-[#FF4D00] text-white shadow-[0_0_24px_rgba(255,77,0,0.28)] lg:hidden"
        onClick={() => setIsMobileOpen(true)}
        aria-label={t("sidebar.open")}
      >
        <Menu size={22} aria-hidden />
      </button>

      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.button
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm lg:hidden"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              aria-label={t("sidebar.close")}
            />
            <motion.aside
              animate={{ x: 0 }}
              className="fixed bottom-0 left-0 top-0 z-50 w-[min(86vw,320px)] border-r border-black/10 bg-white bg-[linear-gradient(rgba(15,15,15,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(15,15,15,0.045)_1px,transparent_1px)] bg-[size:42px_42px] p-4 text-[#151515] shadow-2xl dark:border-white/10 dark:bg-[#111111] dark:bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] dark:text-white lg:hidden"
              exit={{ x: "-100%" }}
              initial={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
            >
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-[#FF4F00]">
                    {t("common.brand")}
                  </p>
                  <h2 className="mt-1 text-xl font-black text-[#151515] dark:text-white">{t("sidebar.catalog")}</h2>
                </div>
                <button
                  className="grid size-10 place-items-center rounded-md bg-black/5 text-[#151515] dark:bg-white/5 dark:text-white"
                  onClick={() => setIsMobileOpen(false)}
                  aria-label={t("sidebar.close")}
                >
                  <X size={20} aria-hidden />
                </button>
              </div>
              <div className="max-h-[calc(100vh-140px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                <SidebarItems expanded onNavigate={() => setIsMobileOpen(false)} />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
