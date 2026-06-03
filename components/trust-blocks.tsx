"use client";

import { motion } from "framer-motion";
import { ID } from "appwrite";
import { Award, ClipboardCheck, MapPinned, PhoneCall } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { useClientMounted } from "@/components/use-client-mounted";
import { appwriteConfig, databases } from "@/src/lib/appwrite";
import "@/src/i18n/config";

const installs = ["bishkekBoiler", "chuyUnderfloor", "bishkekRadiators"];

export function TrustBlocks() {
  const mounted = useClientMounted();
  const { t } = useTranslation();
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
            type: "callback",
          }),
        });
      } catch (telegramError) {
        console.error("Failed to send Telegram callback notification", telegramError);
      }

      setFormData({ name: "", phone: "", message: "" });
      setSubmitStatus("success");
    } catch (error) {
      console.error("Failed to submit consultation form", error);
      setSubmitStatus("error");
    }
  }

  if (!mounted) {
    return null;
  }

  return (
    <section className="bg-white py-16 md:py-24" id="consultation">
      <div className="container-shell grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <p className="text-sm font-black uppercase text-[#FF4F00]">{t("proof.eyebrow")}</p>
          <h2 className="mt-2 text-4xl font-black leading-tight md:text-5xl">
            {t("proof.title")}
          </h2>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-md border border-black/10 bg-[#F5F5F5] p-5">
              <MapPinned className="text-[#FF4F00]" size={28} aria-hidden />
              <h3 className="mt-4 text-xl font-black">{t("proof.installationMap")}</h3>
              <div className="mt-4 grid gap-3">
                {installs.map((install) => (
                  <motion.div
                    className="rounded-md bg-white p-3"
                    key={install}
                    whileHover={{ x: 4 }}
                    transition={{ type: "spring", stiffness: 300, damping: 22 }}
                  >
                    <p className="font-black">{t(`proof.installs.${install}.city`)}</p>
                    <p className="text-sm text-black/55">{t(`proof.installs.${install}.detail`)}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="rounded-md border border-black/10 bg-[#F5F5F5] p-5">
              <Award className="text-[#FF4F00]" size={28} aria-hidden />
              <h3 className="mt-4 text-xl font-black">{t("proof.certificates")}</h3>
              <p className="mt-3 text-sm leading-6 text-black/58">
                {t("proof.certificatesText")}
              </p>
            </div>

            <div className="rounded-md border border-black/10 bg-[#F5F5F5] p-5">
              <ClipboardCheck className="text-[#FF4F00]" size={28} aria-hidden />
              <h3 className="mt-4 text-xl font-black">{t("proof.projectChecks")}</h3>
              <p className="mt-3 text-sm leading-6 text-black/58">
                {t("proof.projectChecksText")}
              </p>
            </div>
          </div>
        </div>

        <form className="sticky top-28 h-fit rounded-md border border-black/10 bg-[#1A1A1A] p-5 text-white shadow-2xl" onSubmit={handleSubmit}>
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-md bg-[#FF4F00]">
              <PhoneCall size={21} aria-hidden />
            </div>
            <div>
              <p className="text-xs font-black uppercase text-white/45">{t("proof.consultation.eyebrow")}</p>
              <h3 className="text-xl font-black">{t("proof.consultation.title")}</h3>
            </div>
          </div>
          <input
            className="mt-5 h-12 w-full rounded-md border border-white/10 bg-white/10 px-4 text-sm outline-none placeholder:text-white/45 focus:border-[#FF4F00]"
            onChange={(event) => setFormData((value) => ({ ...value, name: event.target.value }))}
            placeholder={t("proof.consultation.name")}
            required
            value={formData.name}
          />
          <input
            className="mt-3 h-12 w-full rounded-md border border-white/10 bg-white/10 px-4 text-sm outline-none placeholder:text-white/45 focus:border-[#FF4F00]"
            onChange={(event) => setFormData((value) => ({ ...value, phone: event.target.value }))}
            placeholder={t("proof.consultation.phone")}
            required
            type="tel"
            value={formData.phone}
          />
          <textarea
            className="mt-3 min-h-28 w-full rounded-md border border-white/10 bg-white/10 px-4 py-3 text-sm outline-none placeholder:text-white/45 focus:border-[#FF4F00]"
            onChange={(event) => setFormData((value) => ({ ...value, message: event.target.value }))}
            placeholder={t("proof.consultation.details")}
            value={formData.message}
          />
          {submitStatus === "success" && (
            <p className="mt-3 rounded-md border border-green-400/25 bg-green-400/10 px-3 py-2 text-xs font-bold text-green-200">
              Заявка успешно отправлена! Мы свяжемся с вами.
            </p>
          )}
          {submitStatus === "error" && (
            <p className="mt-3 rounded-md border border-red-400/25 bg-red-400/10 px-3 py-2 text-xs font-bold text-red-200">
              Не удалось отправить заявку. Попробуйте еще раз.
            </p>
          )}
          <button
            className="mt-4 h-12 w-full rounded-md bg-[#FF4F00] text-sm font-black uppercase text-white hover:bg-[#e64800] disabled:cursor-not-allowed disabled:opacity-65"
            disabled={submitStatus === "loading"}
            type="submit"
          >
            {submitStatus === "loading" ? t("contacts.form.loading") : t("proof.consultation.button")}
          </button>
        </form>
      </div>
    </section>
  );
}
