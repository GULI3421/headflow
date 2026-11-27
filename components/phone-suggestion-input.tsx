"use client";

import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { normalizePhone, validatePhone } from "@/lib/phone";

const storageKey = "heatflow:phone-suggestions";
const countryCodes = [
  { id: "kg", name: "Кыргызстан", flag: "🇰🇬", prefix: "+996" },
  { id: "kz", name: "Казахстан", flag: "🇰🇿", prefix: "+7" },
  { id: "ru", name: "Россия", flag: "🇷🇺", prefix: "+7" },
  { id: "uz", name: "Узбекистан", flag: "🇺🇿", prefix: "+998" },
  { id: "tj", name: "Таджикистан", flag: "🇹🇯", prefix: "+992" },
  { id: "us", name: "США", flag: "🇺🇸", prefix: "+1" },
  { id: "gb", name: "Великобритания", flag: "🇬🇧", prefix: "+44" },
  { id: "de", name: "Германия", flag: "🇩🇪", prefix: "+49" },
  { id: "tr", name: "Турция", flag: "🇹🇷", prefix: "+90" },
  { id: "cn", name: "Китай", flag: "🇨🇳", prefix: "+86" },
  { id: "in", name: "Индия", flag: "🇮🇳", prefix: "+91" },
  { id: "ae", name: "ОАЭ", flag: "🇦🇪", prefix: "+971" },
  { id: "fr", name: "Франция", flag: "🇫🇷", prefix: "+33" },
  { id: "kr", name: "Южная Корея", flag: "🇰🇷", prefix: "+82" },
];
const maxSavedPhones = 5;

type PhoneSuggestion = {
  id: string;
  label: string;
  value: string;
};

type PhoneSuggestionInputProps = {
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  "aria-label": string;
  autoComplete?: string;
  className: string;
  id?: string;
  onBlur?: () => void;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  value: string;
};

function readSavedPhones() {
  if (typeof window === "undefined") return [];

  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]");
    if (!Array.isArray(saved)) return [];

    return saved.flatMap((phone): string[] => {
      if (typeof phone !== "string" || validatePhone(phone)) return [];
      return [normalizePhone(phone)];
    });
  } catch (error) {
    console.warn("Unable to read saved phone suggestions.", error);
    return [];
  }
}

export function rememberPhoneSuggestion(value: string) {
  if (typeof window === "undefined") return;

  const phone = normalizePhone(value);
  try {
    const savedPhones = readSavedPhones().filter((saved) => saved !== phone);
    window.localStorage.setItem(storageKey, JSON.stringify([phone, ...savedPhones].slice(0, maxSavedPhones)));
  } catch (error) {
    console.warn("Unable to save phone suggestion.", error);
  }
}

function phoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function PhoneSuggestionInput({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  "aria-label": ariaLabel,
  autoComplete = "tel",
  className,
  id,
  onBlur,
  onChange,
  placeholder,
  required,
  value,
}: PhoneSuggestionInputProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [savedPhones, setSavedPhones] = useState<string[]>([]);

  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, []);

  const queryDigits = phoneDigits(value);
  const countrySuggestions: PhoneSuggestion[] = countryCodes
    .filter((country) => !queryDigits || phoneDigits(country.prefix).startsWith(queryDigits))
    .map((country) => ({
      id: `country-${country.id}`,
      label: `${country.flag} ${country.name} ${country.prefix}`,
      value: `${country.prefix} `,
    }));
  const savedPhoneSuggestions: PhoneSuggestion[] = savedPhones
    .filter((phone) => !queryDigits || phoneDigits(phone).startsWith(queryDigits) || phoneDigits(phone).includes(queryDigits))
    .map((phone, index) => ({ id: `saved-${index}-${phone}`, label: phone, value: phone }));
  const suggestions = [...countrySuggestions, ...savedPhoneSuggestions];

  function chooseSuggestion(suggestion: string) {
    onChange(suggestion);
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
    requestAnimationFrame(() => {
      const input = inputRef.current;
      input?.setSelectionRange(suggestion.length, suggestion.length);
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (event.key === "ArrowDown" && suggestions.length > 0) {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) => (index + 1) % suggestions.length);
      return;
    }

    if (event.key === "ArrowUp" && suggestions.length > 0) {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) => index <= 0 ? suggestions.length - 1 : index - 1);
      return;
    }

    if (event.key === "Enter" && isOpen && activeIndex >= 0 && suggestions[activeIndex]) {
      event.preventDefault();
      chooseSuggestion(suggestions[activeIndex].value);
    }
  }

  return (
    <div className="relative" ref={rootRef}>
      <input
        ref={inputRef}
        aria-activedescendant={isOpen && activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined}
        aria-autocomplete="list"
        aria-controls={listId}
        aria-describedby={ariaDescribedBy}
        aria-expanded={isOpen && suggestions.length > 0}
        aria-haspopup="listbox"
        aria-invalid={ariaInvalid}
        aria-label={ariaLabel}
        autoComplete={autoComplete}
        className={className}
        id={id}
        onBlur={() => {
          setIsOpen(false);
          setActiveIndex(-1);
          onBlur?.();
        }}
        onChange={(event) => {
          onChange(event.target.value);
          setActiveIndex(-1);
          setIsOpen(true);
        }}
        onFocus={() => {
          setSavedPhones(readSavedPhones());
          setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        role="combobox"
        type="tel"
        value={value}
      />
      {isOpen && suggestions.length > 0 && (
        <div
          className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-zinc-200 bg-white p-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
          id={listId}
          role="listbox"
        >
          {suggestions.map((suggestion, index) => (
            <button
              aria-selected={index === activeIndex}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                index === activeIndex
                  ? "bg-orange-500/15 text-orange-700 dark:text-orange-300"
                  : "text-zinc-800 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
              }`}
              id={`${listId}-option-${index}`}
              key={suggestion.id}
              onClick={() => chooseSuggestion(suggestion.value)}
              onMouseDown={(event) => event.preventDefault()}
              role="option"
              type="button"
            >
              {suggestion.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
