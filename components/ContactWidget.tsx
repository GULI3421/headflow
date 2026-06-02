"use client";

import { MessageCircle, Send, X } from "lucide-react";
import { useState } from "react";

const whatsappUrl = "https://wa.me/996708605281";
const telegramUrl = process.env.NEXT_PUBLIC_TELEGRAM_URL || "https://t.me/centr_otopleniya_kg_bot";

export function ContactWidget() {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="fixed bottom-24 right-4 z-50 md:bottom-6"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {open && (
        <div className="mb-3 grid w-56 gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/95 p-3 text-white shadow-2xl shadow-black/35 backdrop-blur">
          <a
            className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-3 text-sm font-bold transition hover:border-[#FF4F00] hover:bg-zinc-800"
            href={whatsappUrl}
            rel="noreferrer"
            target="_blank"
          >
            <MessageCircle className="text-[#FF4F00]" size={18} aria-hidden />
            WhatsApp Chat
          </a>
          <a
            className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-3 text-sm font-bold transition hover:border-[#FF4F00] hover:bg-zinc-800"
            href={telegramUrl}
            rel="noreferrer"
            target="_blank"
          >
            <Send className="text-[#FF4F00]" size={18} aria-hidden />
            Telegram Chat
          </a>
        </div>
      )}

      <button
        aria-label={open ? "Закрыть контакты" : "Открыть контакты"}
        className="grid size-14 place-items-center rounded-full bg-[#FF4F00] text-white shadow-[0_0_0_8px_rgba(255,79,0,0.12),0_14px_36px_rgba(255,79,0,0.32)] transition hover:bg-[#e64800]"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span className="absolute size-14 animate-ping rounded-full bg-[#FF4F00]/25" aria-hidden />
        {open ? <X size={22} aria-hidden /> : <MessageCircle size={23} aria-hidden />}
      </button>
    </div>
  );
}
