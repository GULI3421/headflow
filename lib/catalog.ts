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

export const categoryTranslationKeys: Record<string, string> = {
  "Котлы": "boilers",
  "Радиаторы": "radiators",
  "Комплектующие и фитинги": "fittings",
  "Оборудование и автоматика": "equipmentAutomation",
  "Теплый пол": "underfloor",
  "Буферные резервуары": "bufferTanks",
  "Фанкойлы": "fancoils",
  "Тепловые насосы": "heatPumps",
};

export const subcategoryTranslationKeys: Record<string, string> = {
  "Газовые": "gas",
  "Электрические": "electric",
  "Твердотопливные": "solidFuel",
  "Алюминиевые": "aluminum",
  "Биметаллические": "bimetallic",
  "Панельные": "panel",
  "Вертикальные": "vertical",
  "Чугунные": "castIron",
  "Для радиаторов": "forRadiators",
  "Трубы и отводы кованные": "forgedPipesAndBends",
  "Чугунные фитинги": "castIronFittings",
  "Резьбовые соединения (Сгоны)": "threadedConnections",
  "Запорная арматура (Краны)": "shutoffValves",
  "Группы безопасности и насосы": "safetyGroupsAndPumps",
  "Распределительные системы": "distributionSystems",
  "Трубы для теплого пола": "underfloorPipes",
  "Коллекторы и комплектующие": "manifoldsAndAccessories",
  "Бойлеры косвенного нагрева": "indirectWaterHeaters",
  "Буферные емкости": "bufferVessels",
  "Настенные": "wallMounted",
  "Кассетные": "cassette",
  "Воздух-Вода": "airWater",
  "Геотермальные": "geothermal",
};

export function categoryTranslationKey(category: string) {
  return categoryTranslationKeys[category] ? `catalog.categories.${categoryTranslationKeys[category]}` : "";
}

export function subcategoryTranslationKey(subcategory: string) {
  return subcategoryTranslationKeys[subcategory] ? `catalog.subcategories.${subcategoryTranslationKeys[subcategory]}` : "";
}

export function categoryHref(category: string) {
  return `/catalog?category=${encodeURIComponent(category)}#products`;
}

export function subcategoryHref(category: string, subcategory: string) {
  const params = new URLSearchParams({ category, subcategory });
  return `/catalog?${params.toString()}#products`;
}
