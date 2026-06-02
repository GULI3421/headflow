import { categoryHref } from "@/lib/catalog";

export type Product = {
  id: string;
  i18nKey?: string;
  name: string;
  brand: string;
  category: string;
  subcategory?: string;
  price: number;
  image: string;
  badgeKey: "inStock" | "new";
  badge: string;
  energyClass: string;
  pressure: string;
  power: string;
  description: string;
};

export const products: Product[] = [
  {
    id: "vaillant-gas-boiler",
    i18nKey: "vaillantGasBoiler",
    name: "Газовый котел",
    brand: "Vaillant",
    category: "Boilers",
    price: 189000,
    image:
      "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=900&q=82",
    badgeKey: "inStock",
    badge: "В наличии",
    energyClass: "A++",
    pressure: "3 bar",
    power: "24 kW",
    description: "Настенный газовый котел для стабильного отопления дома.",
  },
  {
    id: "protherm-electric-boiler",
    i18nKey: "prothermElectricBoiler",
    name: "Электрический котел",
    brand: "Protherm",
    category: "Boilers",
    price: 299000,
    image:
      "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=900&q=82",
    badgeKey: "new",
    badge: "New",
    energyClass: "A+",
    pressure: "3 bar",
    power: "12 kW",
    description: "Электрический котел для основного или резервного отопления.",
  },
  {
    id: "royal-thermo-radiator",
    i18nKey: "royalThermoRadiator",
    name: "Радиатор отопления",
    brand: "Royal Thermo",
    category: "Radiators",
    price: 15500,
    image:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=82",
    badgeKey: "inStock",
    badge: "В наличии",
    energyClass: "A",
    pressure: "20 bar",
    power: "171 W",
    description: "Радиатор с высокой теплоотдачей и аккуратным дизайном.",
  },
  {
    id: "heat-pump-premium",
    i18nKey: "heatPumpPremium",
    name: "Тепловой насос",
    brand: "Premium Heat",
    category: "HeatPumps",
    price: 450000,
    image:
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=900&q=82",
    badgeKey: "new",
    badge: "New",
    energyClass: "A++",
    pressure: "8 bar",
    power: "16 kW",
    description: "Энергоэффективный насос для современного отопления и ГВС.",
  },
];

export const categories = [
  {
    i18nKey: "boilers",
    title: "Котлы",
    href: categoryHref("Котлы"),
    summary: "Газовые, электрические и твердотопливные котлы с подбором по реальной теплопотере объекта.",
    image:
      "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=900&q=82",
  },
  {
    i18nKey: "radiators",
    title: "Радиаторы",
    href: categoryHref("Радиаторы"),
    summary: "Панельные, вертикальные и дизайн-радиаторы с проверенной теплоотдачей и рабочим давлением.",
    image:
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=82",
  },
  {
    i18nKey: "underfloor",
    title: "Теплый пол",
    href: categoryHref("Теплый пол"),
    summary: "Коллекторы, трубы, терморегуляторы и комплектующие для полноценной системы теплого пола.",
    image:
      "https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?auto=format&fit=crop&w=900&q=82",
  },
];
