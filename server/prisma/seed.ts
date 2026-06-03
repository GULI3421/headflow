import { prisma } from "../src/prisma";

const categories = [
  {
    name_ru: "Котлы",
    name_ky: "Казандыктар",
    name_en: "Boilers",
    i18nKey: "boilers",
    slug: "boilers",
  },
  {
    name_ru: "Радиаторы",
    name_ky: "Радиаторлор",
    name_en: "Radiators",
    i18nKey: "radiators",
    slug: "radiators",
  },
  {
    name_ru: "Теплый пол",
    name_ky: "Жылуу пол",
    name_en: "Underfloor heating",
    i18nKey: "underfloor",
    slug: "underfloor-heating",
  },
];

const products = [
  {
    i18nKey: "prothermElectricBoiler",
    title_ru: "Электрический котел Protherm",
    title_ky: "Protherm электр казандыгы",
    title_en: "Protherm electric boiler",
    description_ru: "Электрический котел для основного или резервного отопления частного дома.",
    description_ky: "Жеке үйдү негизги же резервдик жылытуу үчүн электр казандыгы.",
    description_en: "Electric boiler for primary or backup heating in a private home.",
    brand: "Protherm",
    badgeKey: "new",
    energyClass: "A+",
    pressure: "3 bar",
    power: "12 kW",
    price: 299000,
    stock: 8,
    imageUrl: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=900&q=82",
    categorySlug: "boilers",
  },
  {
    i18nKey: "vaillantGasBoiler",
    title_ru: "Газовый котел Vaillant",
    title_ky: "Vaillant газ казандыгы",
    title_en: "Vaillant gas boiler",
    description_ru: "Настенный газовый котел для стабильного отопления и горячего водоснабжения.",
    description_ky: "Туруктуу жылытуу жана ысык суу үчүн дубалга орнотулуучу газ казандыгы.",
    description_en: "Wall-mounted gas boiler for stable heating and domestic hot water.",
    brand: "Vaillant",
    badgeKey: "inStock",
    energyClass: "A++",
    pressure: "3 bar",
    power: "24 kW",
    price: 189000,
    stock: 12,
    imageUrl: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=900&q=82",
    categorySlug: "boilers",
  },
  {
    i18nKey: "royalThermoRadiator",
    title_ru: "Радиатор Royal Thermo",
    title_ky: "Royal Thermo радиатору",
    title_en: "Royal Thermo radiator",
    description_ru: "Радиатор отопления с высокой теплоотдачей и аккуратным дизайном.",
    description_ky: "Жогорку жылуулук берүүчү жана тыкан дизайндагы жылытуу радиатору.",
    description_en: "Heating radiator with high heat output and a clean design.",
    brand: "Royal Thermo",
    badgeKey: "inStock",
    energyClass: "A",
    pressure: "20 bar",
    power: "171 W",
    price: 15500,
    stock: 36,
    imageUrl: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=82",
    categorySlug: "radiators",
  },
  {
    i18nKey: "underfloorHeatingKit",
    title_ru: "Комплект теплого пола Valtec",
    title_ky: "Valtec жылуу пол комплекти",
    title_en: "Valtec underfloor heating kit",
    description_ru: "Готовый комплект для водяного теплого пола с трубой, коллектором и регулировкой.",
    description_ky: "Түтүк, коллектор жана жөнгө салуу менен суу жылуу полу үчүн даяр комплект.",
    description_en: "Ready-made hydronic underfloor heating kit with pipe, manifold, and controls.",
    brand: "Valtec",
    badgeKey: "new",
    energyClass: "A",
    pressure: "6 bar",
    power: "120 W/m2",
    price: 42000,
    stock: 18,
    imageUrl: "https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?auto=format&fit=crop&w=900&q=82",
    categorySlug: "underfloor-heating",
  },
];

async function main() {
  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name_ru: category.name_ru,
        name_ky: category.name_ky,
        name_en: category.name_en,
        i18nKey: category.i18nKey,
      },
      create: category,
    });
  }

  for (const product of products) {
    const category = await prisma.category.findUniqueOrThrow({
      where: { slug: product.categorySlug },
    });

    await prisma.product.upsert({
      where: { i18nKey: product.i18nKey },
      update: {
        title_ru: product.title_ru,
        title_ky: product.title_ky,
        title_en: product.title_en,
        description_ru: product.description_ru,
        description_ky: product.description_ky,
        description_en: product.description_en,
        brand: product.brand,
        badgeKey: product.badgeKey,
        energyClass: product.energyClass,
        pressure: product.pressure,
        power: product.power,
        price: product.price,
        stock: product.stock,
        imageUrl: product.imageUrl,
        categoryId: category.id,
      },
      create: {
        i18nKey: product.i18nKey,
        title_ru: product.title_ru,
        title_ky: product.title_ky,
        title_en: product.title_en,
        description_ru: product.description_ru,
        description_ky: product.description_ky,
        description_en: product.description_en,
        brand: product.brand,
        badgeKey: product.badgeKey,
        energyClass: product.energyClass,
        pressure: product.pressure,
        power: product.power,
        price: product.price,
        stock: product.stock,
        imageUrl: product.imageUrl,
        categoryId: category.id,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
