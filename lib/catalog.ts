export const subcategoryMap: Record<string, string[]> = {
  "Котлы": [
    "Газовые",
    "Электрические",
    "Твердотопливные",
  ],
  "Радиаторы": [
    "Алюминиевые",
    "Биметаллические",
    "Панельные",
    "Вертикальные",
    "Чугунные",
  ],
  "Комплектующие и фитинги": [
    "Для радиаторов",
    "Трубы и отводы кованные",
    "Чугунные фитинги",
    "Резьбовые соединения (Сгоны)",
    "Запорная арматура (Краны)",
  ],
  "Оборудование и автоматика": [
    "Группы безопасности и насосы",
    "Распределительные системы",
  ],
  "Теплый пол": [
    "Трубы для теплого пола",
    "Коллекторы и комплектующие",
  ],
  "Буферные резервуары": [
    "Бойлеры косвенного нагрева",
    "Буферные емкости",
  ],
  "Фанкойлы": [
    "Настенные",
    "Кассетные",
  ],
  "Тепловые насосы": [
    "Воздух-Вода",
    "Геотермальные",
  ],
};

export const catalogCategories = Object.keys(subcategoryMap);

export function categoryHref(category: string) {
  return `/catalog?category=${encodeURIComponent(category)}#products`;
}

export function subcategoryHref(category: string, subcategory: string) {
  const params = new URLSearchParams({ category, subcategory });
  return `/catalog?${params.toString()}#products`;
}
