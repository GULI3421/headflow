"use client";

import { Box, ShieldCheck, Truck, Wrench } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useClientMounted } from "@/components/use-client-mounted";
import "@/src/i18n/config";

const advantages = [
  {
    key: "warranty",
    icon: ShieldCheck,
  },
  {
    key: "turnkey",
    icon: Wrench,
  },
  {
    key: "delivery",
    icon: Truck,
  },
  {
    key: "directSupply",
    icon: Box,
  },
];

export function AdvantagesSection() {
  const { t } = useTranslation();
  const mounted = useClientMounted();

  if (!mounted) {
    return null;
  }

  return (
    <section className="bg-[#F7F7F4] py-10 text-[#151515] dark:bg-[#0F0F0F] dark:text-white md:py-14">
      <div className="container-shell grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {advantages.map((advantage) => {
          const Icon = advantage.icon;

          return (
            <div
              className="group flex min-h-28 items-center gap-4 rounded-md border border-black/10 bg-white p-5 transition duration-300 hover:border-[#FF4D00]/60 hover:shadow-[0_0_30px_rgba(255,77,0,0.14)] dark:border-white/10 dark:bg-[#151515] dark:hover:border-[#FF4F00]/60"
              key={advantage.key}
            >
              <div className="grid size-11 shrink-0 place-items-center rounded-md border border-black/10 bg-black/5 text-[#FF4D00] transition group-hover:bg-[#FF4D00] group-hover:text-white dark:border-white/10 dark:bg-white/5 dark:text-[#FF4F00]">
                <Icon size={22} aria-hidden />
              </div>
              <h2 className="text-base font-black leading-tight text-[#151515] dark:text-white">{t(`advantages.${advantage.key}`)}</h2>
            </div>
          );
        })}
      </div>
    </section>
  );
}
