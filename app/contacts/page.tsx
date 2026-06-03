"use client";

import { motion } from "framer-motion";
import { ID } from "appwrite";
import { Instagram, MapPin, MessageCircle, Phone, Send } from "lucide-react";
import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { useClientMounted } from "@/components/use-client-mounted";
import { appwriteConfig, databases } from "@/src/lib/appwrite";
import "@/src/i18n/config";

const fadeIn = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

const phones = [
  { label: "+996 (708) 605-281", href: "tel:+996708605281", whatsapp: "https://wa.me/996708605281" },
  { label: "+996 (700) 851-996", href: "tel:+996700851996", whatsapp: "https://wa.me/996700851996" },
  { label: "+996 (500) 039-452", href: "tel:+996500039452", whatsapp: "https://wa.me/996500039452" },
];

const mapEmbedUrl =
  "https://yandex.ru/map-widget/v1/?ll=74.594735%2C42.898015&z=17&mode=search&text=%D0%A6%D0%B5%D0%BD%D1%82%D1%80%20%D0%BE%D1%82%D0%BE%D0%BF%D0%BB%D0%B5%D0%BD%D0%B8%D1%8F%2C%20%D0%A2%D0%BE%D0%B3%D0%BE%D0%BB%D0%BE%D0%BA%20%D0%9C%D0%BE%D0%BB%D0%B4%D0%BE%20324";

export default function ContactsPage() {
  const { t } = useTranslation();
  const mounted = useClientMounted();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    message: "",
  });
  const [submitStatus, setSubmitStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitStatus("loading");

    try {
      await databases.createDocument({
        databaseId: appwriteConfig.databaseId,
        collectionId: appwriteConfig.leadsCollectionId,
        documentId: ID.unique(),
        data: {
          name: formData.name,
          phone: formData.phone,
          message: formData.message,
        },
      });

      try {
        await fetch("/api/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            phone: formData.phone,
            message: formData.message,
            type: t("contacts.telegramType"),
          }),
        });
      } catch (telegramError) {
        console.error("Failed to send Telegram contact notification", telegramError);
      }

      setFormData({ name: "", phone: "", message: "" });
      setSubmitStatus("success");
    } catch (error) {
      console.error("Failed to submit contact form", error);
      setSubmitStatus("error");
    }
  }

  if (!mounted) {
    return null;
  }

  return (
    <section className="relative overflow-hidden bg-white pt-28 text-slate-900 dark:bg-[#0a0a0a] dark:text-white md:pt-32">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,77,0,0.10),rgba(255,255,255,0.72)_34%,rgba(255,255,255,0.98)_72%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(255,79,0,0.22),rgba(15,15,15,0.42)_34%,rgba(15,15,15,0.98)_72%)]" />
      <div className="industrial-grid pointer-events-none absolute inset-0" />

      <div className="container-shell relative z-10 pb-20 pt-16 md:pb-28 md:pt-24">
        <motion.div
          animate="visible"
          className="max-w-3xl"
          initial="hidden"
          transition={{ duration: 0.65, ease: "easeOut" }}
          variants={fadeIn}
        >
          <span className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm font-bold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white/82">
            <Send size={16} className="text-[#FF4F00]" aria-hidden />
            {t("contacts.eyebrow")}
          </span>
          <h1 className="mt-5 text-3xl font-black leading-[1.05] tracking-normal text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
            {t("contacts.title")}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 dark:text-gray-400 sm:text-lg">
            {t("contacts.description")}
          </p>
        </motion.div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-8">
          <motion.div
            className="grid gap-4"
            initial="hidden"
            transition={{ duration: 0.6, ease: "easeOut", staggerChildren: 0.08 }}
            variants={fadeIn}
            viewport={{ once: true, amount: 0.25 }}
            whileInView="visible"
          >
            <motion.article
              className="rounded-2xl border border-gray-200 bg-gray-100 p-6 shadow-xl shadow-black/5 backdrop-blur transition hover:border-[#FF4D00]/50 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:shadow-black/20 dark:hover:border-[#FF4F00]/50 dark:hover:bg-white/[0.08]"
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              variants={fadeIn}
              whileHover={{ y: -4 }}
            >
              <div className="flex items-center gap-3">
                <div className="grid size-12 place-items-center rounded-md bg-[#FF4D00] text-white shadow-[0_0_24px_rgba(255,77,0,0.28)]">
                  <Phone size={24} aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-black uppercase text-[#FF4F00]">{t("contacts.phones")}</p>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">{t("contacts.callOrWhatsapp")}</h2>
                </div>
              </div>
              

              <div className="mt-6 grid gap-3">
                {phones.map((phone) => (
                  <div
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-white/5"
                    key={phone.href}
                  >
                    <a className="font-bold text-slate-900 transition hover:text-[#FF4D00] dark:text-white dark:hover:text-[#FF4F00]" href={phone.href}>
                      {phone.label}
                    </a>
                    <a
                      aria-label={t("contacts.writeWhatsapp", { phone: phone.label })}
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-[#FF4F00]/35 px-3 text-xs font-black uppercase text-[#FF4F00] transition hover:bg-[#FF4F00] hover:text-white"
                      href={phone.whatsapp}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <MessageCircle size={16} aria-hidden />
                      {t("common.whatsapp")}
                    </a>
                  </div>
                ))}
              </div>
            </motion.article>

            <motion.a
            
              className="rounded-2xl border border-gray-200 bg-gray-100 p-6 shadow-xl shadow-black/5 backdrop-blur transition hover:border-[#FF4D00]/50 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:shadow-black/20 dark:hover:border-[#FF4F00]/50 dark:hover:bg-white/[0.08]"
              href="https://www.instagram.com/centr__otopleniya__kg/"
              rel="noreferrer"
              target="_blank"
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              variants={fadeIn}
              whileHover={{ y: -4 }}
            >
              <div className="flex items-center gap-3">
                <div className="grid size-12 place-items-center rounded-md border border-gray-200 bg-white text-[#FF4D00] dark:border-white/10 dark:bg-white/5 dark:text-[#FF4F00]">
                  <Instagram size={24} aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-black uppercase text-[#FF4F00]">Instagram</p>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">@centr__otopleniya__kg</h2>
                </div>
              </div>
            </motion.a>

            <motion.article
              className="rounded-2xl border border-gray-200 bg-gray-100 p-6 shadow-xl shadow-black/5 backdrop-blur transition hover:border-[#FF4D00]/50 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:shadow-black/20 dark:hover:border-[#FF4F00]/50 dark:hover:bg-white/[0.08]"
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              variants={fadeIn}
              whileHover={{ y: -4 }}
            >
              <div className="flex items-center gap-3">
                <div className="grid size-12 place-items-center rounded-md border border-gray-200 bg-white text-[#FF4D00] dark:border-white/10 dark:bg-white/5 dark:text-[#FF4F00]">
                  <MapPin size={24} aria-hidden />
                  
                </div>
                <div>
                  <p className="text-sm font-black uppercase text-[#FF4F00]">{t("contacts.address")}</p>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">{t("contacts.addressValue")}</h2>
                </div>
              </div>
            </motion.article>
          </motion.div>

          <motion.div
            className="grid gap-6"
            initial="hidden"
            transition={{ duration: 0.65, ease: "easeOut", delay: 0.08 }}
            variants={fadeIn}
            viewport={{ once: true, amount: 0.2 }}
            whileInView="visible"
          >
            <div className="relative z-0 isolate h-full min-h-[450px] w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 shadow-xl shadow-black/5 dark:border-white/10 dark:bg-white/5 dark:shadow-black/20">
              <iframe
                allowFullScreen
                className="relative z-0 h-full min-h-[450px] w-full rounded-2xl border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={mapEmbedUrl}
                title={t("contacts.mapTitle")}
                width="100%"
                height="100%"
              />
            </div>

            <form
              className="rounded-2xl border border-gray-200 bg-gray-100 p-6 shadow-xl shadow-black/5 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-black/20"
              onSubmit={handleSubmit}
            >
              <div className="flex items-center gap-3">
                <div className="grid size-12 place-items-center rounded-md bg-[#FF4D00] text-white shadow-[0_0_24px_rgba(255,77,0,0.28)]">
                  <Send size={22} aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-black uppercase text-[#FF4F00]">{t("contacts.feedback")}</p>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">{t("contacts.leaveRequest")}</h2>
                </div>
              </div>

              <div className="mt-6 grid gap-4">
                <input
                  className="h-12 w-full rounded-md border border-gray-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#FF4D00] focus:shadow-[0_0_0_3px_rgba(255,77,0,0.16)] dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/40"
                  name="name"
                  onChange={(event) => setFormData((value) => ({ ...value, name: event.target.value }))}
                  placeholder={t("contacts.form.name")}
                  required
                  type="text"
                  value={formData.name}
                />
                <input
                  className="h-12 w-full rounded-md border border-gray-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#FF4D00] focus:shadow-[0_0_0_3px_rgba(255,77,0,0.16)] dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/40"
                  name="phone"
                  onChange={(event) => setFormData((value) => ({ ...value, phone: event.target.value }))}
                  placeholder={t("contacts.form.phone")}
                  required
                  type="tel"
                  value={formData.phone}
                />
                <textarea
                  className="min-h-32 w-full resize-none rounded-md border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#FF4D00] focus:shadow-[0_0_0_3px_rgba(255,77,0,0.16)] dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/40"
                  name="message"
                  onChange={(event) => setFormData((value) => ({ ...value, message: event.target.value }))}
                  placeholder={t("contacts.form.message")}
                  value={formData.message}
                />
              </div>

              {submitStatus === "success" && (
                <p className="mt-4 rounded-md border border-green-500/25 bg-green-500/10 px-3 py-2 text-sm font-bold text-green-700 dark:text-green-300">
                  {t("contacts.form.success")}
                </p>
              )}
              {submitStatus === "error" && (
                <p className="mt-4 rounded-md border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-700 dark:text-red-300">
                  {t("contacts.form.error")}
                </p>
              )}

              <motion.button
                className="mt-5 inline-flex h-13 w-full items-center justify-center gap-2 rounded-md bg-[#FF4D00] px-6 text-sm font-black uppercase tracking-normal text-white transition hover:bg-[#e64800] disabled:cursor-not-allowed disabled:opacity-65"
                disabled={submitStatus === "loading"}
                transition={{ type: "spring", stiffness: 320, damping: 22 }}
                type="submit"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                {submitStatus === "loading" ? t("contacts.form.loading") : t("contacts.form.submit")}
                {submitStatus === "loading" ? (
                  <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
                ) : (
                  <Send size={18} aria-hidden />
                )}
              </motion.button>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
