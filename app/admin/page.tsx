"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ClipboardEvent as ReactClipboardEvent, type DragEvent, FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, FileText, ImagePlus, Loader2, Package, PackageCheck, PackageX, Pencil, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { getProductImageUrl } from "@/src/lib/appwrite";
import {
  createProduct,
  deleteProduct,
  getProductDocument,
  listAdminProductDocuments,
  type ProductDocument,
  updateProduct,
} from "@/src/lib/products-api";
import { useClientMounted } from "@/components/use-client-mounted";
import { catalogCategories, subcategoryMap } from "@/lib/catalog";
import { getStockStatus, LOW_STOCK_THRESHOLD } from "@/lib/stock-status";
import { AdminOrdersPanel } from "./orders-panel";

type ProductImageFormItem = {
  id: string;
  type: "file" | "value";
  value: string;
  file?: File;
  previewUrl: string;
};

type PowerVariantForm = { power: string; price: string; oldPrice: string; stockQuantity: string };
type ProductPdfForm = { url: string; fileName: string; file: File | null };

type ProductFormState = {
  title: string;
  price: string;
  old_price: string;
  stock: string;
  powerVariants: PowerVariantForm[];
  category: string;
  subcategory: string;
  description: string;
  powerOptions: string[];
  images: ProductImageFormItem[];
  specs: string[];
  specKeyInput: string;
  specValueInput: string;
  documentation: {
    certificate: ProductPdfForm;
    passport: ProductPdfForm;
  };
};

type AdminUser = { email: string };

const boilerPowerOptions = [
  "4 кВт",
  "6 кВт",
  "8 кВт",
  "10 кВт",
  "12 кВт",
  "13 кВт",
  "14 кВт",
  "16 кВт",
  "18 кВт",
  "20 кВт",
  "24 кВт",
  "25 кВт",
  "30 кВт",
  "32 кВт",
  "34 кВт",
  "35 кВт",
  "40 кВт",
  "42 кВт",
  "48 кВт",
  "49 кВт",
  "50 кВт",
  "60 кВт",
  "80 кВт",
  "116 кВт",
  "233 кВт",
];

function createEmptyForm(): ProductFormState {
  return {
    title: "",
    price: "",
    old_price: "",
    stock: "0",
    powerVariants: [],
    category: "Котлы",
    subcategory: "",
    description: "",
    powerOptions: [],
    images: [],
    specs: [],
    specKeyInput: "",
    specValueInput: "",
    documentation: {
      certificate: { url: "", fileName: "", file: null },
      passport: { url: "", fileName: "", file: null },
    },
  };
}

function productTitle(product: ProductDocument) {
  return product.title_ru || product.title_ky || "Без названия";
}

function formatMoney(value: number) {
  return `${Number(value).toLocaleString("ru-RU")} сом`;
}

function productStock(product: ProductDocument) {
  const quantity = Number(product.stockQuantity ?? product.stock ?? 0);
  return Number.isFinite(quantity) ? quantity : 0;
}

function getAttentionReasons(product: ProductDocument) {
  const reasons: string[] = [];
  const stock = productStock(product);
  if (stock <= 0) reasons.push("Нет в наличии");
  else if (stock <= LOW_STOCK_THRESHOLD) reasons.push("Мало остатка");

  if (normalizeImageIds(product.image_id).length === 0 && !product.imageUrl) reasons.push("Нет фото");
  if (!product.certificateUrl && !product.passportUrl) reasons.push("Нет документов");

  return reasons;
}

function normalizeImageIds(imageId: string | string[] | undefined) {
  if (!imageId) return [];
  return Array.isArray(imageId) ? imageId.filter(Boolean) : [imageId].filter(Boolean);
}

function normalizeStringArray(value: unknown) {
  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }

  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
    : [];
}

function isProductImageReference(imageId: string) {
  if (!imageId) return false;
  if (imageId.startsWith("/uploads/")) return true;
  if (/^(https?:)?\/\//.test(imageId) || imageId.startsWith("/")) return false;
  return true;
}

function productToForm(product: ProductDocument): ProductFormState {
  return {
    title: productTitle(product),
    price: String(product.price ?? ""),
    old_price: String(product.oldPrice ?? product.old_price ?? ""),
    stock: String(product.stockQuantity ?? product.stock ?? 0),
    powerVariants: Array.isArray(product.powerVariants) ? product.powerVariants.map((variant) => ({
      power: variant.power,
      price: String(variant.price),
      oldPrice: variant.oldPrice == null ? "" : String(variant.oldPrice),
      stockQuantity: String(variant.stockQuantity),
    })) : normalizeStringArray(product.power_options).map((power) => ({ power, price: String(product.price), oldPrice: "", stockQuantity: String(product.stockQuantity ?? product.stock ?? 0) })),
    category: product.category && catalogCategories.includes(product.category) ? product.category : "Котлы",
    subcategory:
      product.subcategory && subcategoryMap[product.category]?.includes(product.subcategory)
        ? product.subcategory
        : "",
    description: product.description ?? "",
    powerOptions: normalizeStringArray(product.power_options),
    images: normalizeImageIds(product.image_id)
      .filter(isProductImageReference)
      .slice(0, 3)
      .map((imageId) => ({
        id: crypto.randomUUID(),
        type: "value",
        value: imageId,
        previewUrl: getProductImageUrl(imageId),
      })),
    specs: normalizeStringArray(product.specs),
    specKeyInput: "",
    specValueInput: "",
    documentation: {
      certificate: {
        url: product.certificateUrl ?? "",
        fileName: product.certificateFileName ?? "",
        file: null,
      },
      passport: {
        url: product.passportUrl ?? "",
        fileName: product.passportFileName ?? "",
        file: null,
      },
    },
  };
}

function revokeLocalImagePreviews(images: ProductImageFormItem[]) {
  images.forEach((image) => {
    if (image.type === "file") {
      URL.revokeObjectURL(image.previewUrl);
    }
  });
}

function getDataErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Произошла непредвиденная ошибка.";
}

function getApiErrorMessage(error: unknown) {
  const message = getDataErrorMessage(error);
  const translations: Record<string, string> = {
    "Title, category, and a valid price are required.": "Укажите название, категорию и корректную цену товара.",
    "Title is required.": "Укажите название товара.",
    "Category is required.": "Выберите категорию товара.",
    "Price must be a valid non-negative number.": "Цена должна быть целым неотрицательным числом.",
    "Old price must be a valid non-negative number.": "Старая цена должна быть неотрицательным числом.",
    "Stock must be a non-negative whole number.": "Остаток должен быть целым неотрицательным числом.",
    "Unable to create product.": "Не удалось добавить товар в каталог.",
    "Unable to update product.": "Не удалось сохранить изменения товара.",
    "Unable to delete product.": "Не удалось удалить товар.",
    "Product not found.": "Товар не найден.",
  };
  return translations[message] ?? message;
}

export default function AdminPage() {
  const mounted = useClientMounted();
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [products, setProducts] = useState<ProductDocument[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "inStock" | "lowStock" | "outOfStock">("all");
  const [notice, setNotice] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductDocument | null>(null);
  const initializedProductRoute = useRef("");
  const [form, setForm] = useState<ProductFormState>(createEmptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [priceList, setPriceList] = useState<{ title: string; fileUrl: string; updatedAt: string } | null>(null);
  const [priceListFile, setPriceListFile] = useState<File | null>(null);
  const [priceListTitle, setPriceListTitle] = useState("");
  const [priceListError, setPriceListError] = useState("");
  const [priceListSaving, setPriceListSaving] = useState(false);

  const isEditing = Boolean(editingProduct);
  const isDashboard = pathname === "/admin";
  const isProductsPage = pathname === "/admin/products";
  const isOrdersPage = pathname === "/admin/orders";
  const isPriceListPage = pathname === "/admin/price-list";
  const isProductFormPage = pathname === "/admin/products/new" || /^\/admin\/products\/[^/]+$/.test(pathname);
  const routeProductId = pathname.startsWith("/admin/products/") && pathname !== "/admin/products/new"
    ? pathname.slice("/admin/products/".length)
    : null;
  const availableSubcategories = subcategoryMap[form.category] ?? [];

  const sortedProducts = useMemo(
    () => [...products].sort((first, second) => productTitle(first).localeCompare(productTitle(second), "ru")),
    [products],
  );
  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("ru");
    return sortedProducts.filter((product) => {
      const stockStatus = getStockStatus(productStock(product)).key;
      const matchesCategory = !categoryFilter || product.category.trim().toLocaleLowerCase("ru") === categoryFilter.trim().toLocaleLowerCase("ru");
      const searchable = [product.title_ru, product.title_ky, product.title_en]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("ru");
      const matchesStock = stockFilter === "all" || stockStatus === stockFilter;
      return matchesCategory && matchesStock && (!query || searchable.includes(query));
    });
  }, [categoryFilter, searchQuery, sortedProducts, stockFilter]);

  const inventoryStats = useMemo(() => {
    return products.reduce(
      (stats, product) => {
        const stock = productStock(product);
        stats.total += 1;
        if (stock <= 0) stats.outOfStock += 1;
        else if (stock <= LOW_STOCK_THRESHOLD) stats.lowStock += 1;
        else stats.inStock += 1;
        return stats;
      },
      { total: 0, inStock: 0, lowStock: 0, outOfStock: 0 },
    );
  }, [products]);

  const attentionProducts = useMemo(
    () => sortedProducts
      .filter((product) => getAttentionReasons(product).length > 0)
      .sort((first, second) => productStock(first) - productStock(second)),
    [sortedProducts],
  );

  useEffect(() => {
    if (!mounted) return;

    async function loadSession() {
      try {
        const response = await fetch("/api/admin/session", { cache: "no-store" });
        if (!response.ok) throw new Error("Не удалось проверить сессию администратора.");
        const result = await response.json() as { user: AdminUser | null };
        setUser(result.user);
      } catch (error) {
      console.error("Не удалось проверить сессию администратора", error);
        setUser(null);
        setLoginError("Не удалось проверить сессию. Обновите страницу или попробуйте позже.");
      } finally {
        setAuthLoading(false);
      }
    }

    loadSession();
  }, [mounted]);

  useEffect(() => {
    if (!mounted || !user) return;
    loadProducts();
    loadPriceList();
  }, [mounted, user]);

  useEffect(() => {
    if (!mounted || pathname !== "/admin" || !window.location.hash) return;
    const legacyRoutes: Record<string, string> = {
      "#orders": "/admin/orders",
      "#products": "/admin/products",
      "#products-table": "/admin/products",
      "#price-list": "/admin/price-list",
    };
    const destination = legacyRoutes[window.location.hash];
    if (destination) router.replace(destination);
  }, [mounted, pathname, router]);

  useEffect(() => {
    if (!isProductsPage) return;
    const filter = new URLSearchParams(window.location.search).get("stock");
    setStockFilter(filter === "inStock" || filter === "lowStock" || filter === "outOfStock" ? filter : "all");
  }, [isProductsPage]);

  useEffect(() => {
    if (!isProductFormPage) {
      initializedProductRoute.current = "";
      setModalOpen(false);
      return;
    }
    if (!user || productsLoading || initializedProductRoute.current === pathname) return;

    if (!routeProductId) {
      initializedProductRoute.current = pathname;
      setEditingProduct(null);
      setForm(createEmptyForm());
      setProductsError("");
      setModalOpen(true);
      return;
    }

    const product = products.find((item) => item.id === routeProductId);
    if (product) {
      initializedProductRoute.current = pathname;
      setEditingProduct(product);
      setForm(productToForm(product));
      setProductsError("");
      setModalOpen(true);
      return;
    }

    setModalOpen(false);
    let active = true;
    void getProductDocument(routeProductId).then((loadedProduct) => {
      if (!active) return;
      initializedProductRoute.current = pathname;
      setEditingProduct(loadedProduct);
      setForm(productToForm(loadedProduct));
      setProductsError("");
      setModalOpen(true);
    }).catch((error: unknown) => {
      if (active) {
        initializedProductRoute.current = pathname;
        setProductsError(`Не удалось загрузить товар: ${getApiErrorMessage(error)}`);
      }
    });
    return () => {
      active = false;
    };
  }, [isProductFormPage, pathname, products, productsLoading, routeProductId, user]);

  async function loadPriceList() {
    try {
      const response = await fetch("/api/prices", { cache: "no-store" });
      if (!response.ok) throw new Error("Не удалось проверить прайс-лист. Перезапустите dev-сервер и обновите страницу.");
      const data = await response.json() as { priceList: typeof priceList };
      setPriceList(data.priceList);
      setPriceListError("");
    } catch (error) {
      setPriceList(null);
      setPriceListError(error instanceof Error ? error.message : "Не удалось проверить прайс-лист.");
    }
  }

  useEffect(() => {
    if (!modalOpen) return;

    function handleWindowPaste(event: ClipboardEvent) {
      addClipboardImages(event.clipboardData);
    }

    window.addEventListener("paste", handleWindowPaste);

    return () => window.removeEventListener("paste", handleWindowPaste);
  }, [modalOpen]);

  async function loadProducts() {
    setProductsLoading(true);
    setProductsError("");

    try {
      const response = await listAdminProductDocuments();

      setProducts(response.documents);
    } catch (error) {
      setProducts([]);
      setProductsError(`Не удалось загрузить товары: ${getDataErrorMessage(error)}`);
    } finally {
      setProductsLoading(false);
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError("");
    setAuthLoading(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json() as { user?: AdminUser; error?: string };
      if (!response.ok || !result.user) {
        throw new Error(result.error || "Не удалось выполнить вход.");
      }
      setUser(result.user);
      setPassword("");
    } catch (error) {
      console.error("Не удалось выполнить вход", error);
      setLoginError(error instanceof Error ? error.message : "Не удалось выполнить вход.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    try {
      const response = await fetch("/api/admin/logout", { method: "POST" });
      if (!response.ok) throw new Error("Не удалось завершить сессию.");
      setUser(null);
      setProducts([]);
    } catch (error) {
      console.error("Не удалось завершить сессию", error);
      setProductsError(error instanceof Error ? error.message : "Не удалось завершить сессию.");
    }
  }

  function openEditModal(product: ProductDocument) {
    router.push(`/admin/products/${encodeURIComponent(product.id)}`);
  }

  function closeModal() {
    if (saving) return;
    revokeLocalImagePreviews(form.images);
    setModalOpen(false);
    setEditingProduct(null);
    setForm(createEmptyForm());
    router.push("/admin/products");
  }

  function setProductPdf(key: "certificate" | "passport", file: File | null) {
    if (!file) return;
    setForm((value) => ({
      ...value,
      documentation: {
        ...value.documentation,
        [key]: { ...value.documentation[key], file, fileName: file.name },
      },
    }));
  }

  function removeProductPdf(key: "certificate" | "passport") {
    setForm((value) => ({
      ...value,
      documentation: {
        ...value.documentation,
        [key]: { url: "", fileName: "", file: null },
      },
    }));
  }

  function addImageFiles(files: Iterable<File> | null) {
    if (!files) return;

    const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));

    if (imageFiles.length === 0) return;

    setForm((value) => {
      const availableSlots = 3 - value.images.length;
      if (availableSlots <= 0) return value;

      const nextImages = imageFiles.slice(0, availableSlots).map((file) => ({
        id: crypto.randomUUID(),
        type: "file" as const,
        value: "",
        file,
        previewUrl: URL.createObjectURL(file),
      }));

      return {
        ...value,
        images: [...value.images, ...nextImages],
      };
    });
  }

  function addClipboardImages(clipboardData: DataTransfer | null) {
    if (!clipboardData) return;

    const pastedFiles = Array.from(clipboardData.files).filter((file) => file.type.startsWith("image/"));

    if (pastedFiles.length > 0) {
      addImageFiles(pastedFiles);
      return;
    }

    const itemFiles = Array.from(clipboardData.items)
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item, index) => {
        const file = item.getAsFile();
        if (file) return file;

        const blob = item.getAsFile();
        return blob ? new File([blob], `pasted-image-${Date.now()}-${index}.png`, { type: item.type }) : null;
      })
      .filter((file): file is File => Boolean(file));

    addImageFiles(itemFiles);
  }

  function handlePaste(event: ReactClipboardEvent<HTMLFormElement>) {
    const hasImage =
      Array.from(event.clipboardData.files).some((file) => file.type.startsWith("image/")) ||
      Array.from(event.clipboardData.items).some((item) => item.kind === "file" && item.type.startsWith("image/"));

    if (!hasImage) return;

    event.preventDefault();
    event.stopPropagation();
    addClipboardImages(event.clipboardData);
  }

  function handleImageDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    addImageFiles(event.dataTransfer.files);
  }

  function handleImageDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
  }

  function removeImage(imageId: string) {
    const imageToRemove = form.images.find((image) => image.id === imageId);
    if (imageToRemove?.type === "file") {
      URL.revokeObjectURL(imageToRemove.previewUrl);
    }

    setForm((value) => ({
      ...value,
      images: value.images.filter((image) => image.id !== imageId),
    }));
  }

  function addSpec() {
    const specKey = form.specKeyInput.trim();
    const specValue = form.specValueInput.trim();
    if (!specKey || !specValue) return;

    const spec = `${specKey}: ${specValue}`;

    setForm((value) => ({
      ...value,
      specs: value.specs.includes(spec) ? value.specs : [...value.specs, spec],
      specKeyInput: "",
      specValueInput: "",
    }));
  }

  function removeSpec(spec: string) {
    setForm((value) => ({
      ...value,
      specs: value.specs.filter((item) => item !== spec),
    }));
  }

  function handleSpecInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addSpec();
  }

  function handleCategoryChange(category: string) {
    setForm((value) => ({
      ...value,
      category,
      subcategory: subcategoryMap[category]?.includes(value.subcategory) ? value.subcategory : "",
      powerOptions: category === "Котлы" ? value.powerOptions : [],
      powerVariants: category === "Котлы" ? value.powerVariants : [],
    }));
  }

  function setBoilerPowerSelected(powerOption: string, checked: boolean) {
    setForm((value) => ({
      ...value,
      powerOptions: checked
        ? Array.from(new Set([...value.powerOptions, powerOption]))
        : value.powerOptions.filter((option) => option !== powerOption),
      powerVariants: checked
        ? [...value.powerVariants, { power: powerOption, price: value.price, oldPrice: "", stockQuantity: "0" }]
        : value.powerVariants.filter((variant) => variant.power !== powerOption),
    }));
  }

  async function uploadPriceList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    if (!priceListFile || !priceListTitle.trim()) return;
    setPriceListSaving(true);
    setPriceListError("");
    try {
      const body = new FormData();
      body.set("file", priceListFile);
      body.set("title", priceListTitle.trim());
      const response = await fetch("/api/admin/prices", { method: "POST", body });
      const result = await response.json() as { priceList?: typeof priceList; error?: string };
      if (!response.ok || !result.priceList) throw new Error(result.error || "Не удалось загрузить прайс-лист.");
      setPriceList(result.priceList);
      setPriceListFile(null);
      setPriceListTitle("");
      formElement.reset();
    } catch (error) {
      setPriceListError(getDataErrorMessage(error));
    } finally {
      setPriceListSaving(false);
    }
  }

  async function uploadImagesIfNeeded() {
    const imageIds: string[] = [];
    const imageUrls: string[] = [];

    for (const image of form.images) {
      if (image.type === "value") {
        imageIds.push(image.value);
        imageUrls.push(image.value.startsWith("/") || /^(https?:)?\/\//.test(image.value)
          ? image.value
          : getProductImageUrl(image.value));
        continue;
      }

      if (!image.file) continue;

      const body = new FormData();
      body.set("file", image.file);
      const response = await fetch("/api/admin/uploads", {
        method: "POST",
        body,
      });
      const result = await response.json().catch(() => null) as { url?: string; error?: string } | null;
      if (!response.ok || !result?.url) {
        throw new Error(result?.error || `Не удалось загрузить фотографию (${response.status}).`);
      }

      imageIds.push(result.url);
      imageUrls.push(result.url);
    }

    return { imageIds, imageUrls };
  }

  async function uploadPdfIfNeeded(document: ProductPdfForm) {
    if (!document.file) {
      return { url: document.url || null, fileName: document.fileName || null };
    }

    const body = new FormData();
    body.set("file", document.file);
    const response = await fetch("/api/admin/docs", { method: "POST", body });
    const result = await response.json().catch(() => null) as {
      url?: string;
      fileName?: string;
      error?: string;
    } | null;
    if (!response.ok || !result?.url || !result.fileName) {
      throw new Error(result?.error || `Не удалось загрузить PDF (${response.status}).`);
    }
    return { url: result.url, fileName: result.fileName };
  }

  async function handleSaveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setProductsError("");
    setNotice("");

    try {
      const uploadResult = await uploadImagesIfNeeded();
      const [certificate, passport] = await Promise.all([
        uploadPdfIfNeeded(form.documentation.certificate),
        uploadPdfIfNeeded(form.documentation.passport),
      ]);
      const imageIds = normalizeStringArray(uploadResult.imageIds);
      const imageUrl = uploadResult.imageUrls.find(Boolean) ?? "";
      const formData: {
        title_ru: string;
        price: string;
        old_price: string;
        stock: string;
        image_id: string | string[];
        imageUrl: string;
        category: string;
        subcategory: string;
        description: string;
        power_options: string | string[];
        specs: unknown;
      } = {
        title_ru: form.title.trim(),
        price: form.price,
        old_price: form.old_price,
        stock: form.stock,
        image_id: imageIds,
        imageUrl,
        category: form.category.trim(),
        subcategory: form.subcategory.trim(),
        description: form.description.trim(),
        power_options: form.powerOptions,
        specs: form.specs,
      };

      let formattedSpecs = "";
      if (formData.specs) {
        if (typeof formData.specs === "string") {
          formattedSpecs = formData.specs;
        } else if (Array.isArray(formData.specs)) {
          formattedSpecs = formData.specs.join(", ");
        } else if (typeof formData.specs === "object") {
          formattedSpecs = JSON.stringify(formData.specs);
        }
      }

      const productPayload = {
        title_ru: formData.title_ru,
        price: Number(formData.price),
        oldPrice: form.old_price && form.old_price.trim() !== "" ? Number(form.old_price) : null,
        old_price: form.old_price && form.old_price.trim() !== "" ? Number(form.old_price) : null,
        stock: form.powerVariants.length ? form.powerVariants.reduce((total, variant) => total + Number(variant.stockQuantity), 0) : Number(formData.stock),
        stockQuantity: form.powerVariants.length ? form.powerVariants.reduce((total, variant) => total + Number(variant.stockQuantity), 0) : Number(formData.stock),
        powerVariants: form.powerVariants.map((variant) => ({ power: variant.power, price: Number(variant.price), oldPrice: variant.oldPrice ? Number(variant.oldPrice) : null, stockQuantity: Number(variant.stockQuantity) })),
        category: formData.category,
        subcategory: formData.subcategory,
        description: formData.description,
        imageUrl: String(formData.imageUrl || ""),
        certificateUrl: certificate.url,
        certificateFileName: certificate.fileName,
        passportUrl: passport.url,
        passportFileName: passport.fileName,

        image_id: !formData.image_id || formData.image_id === ""
          ? []
          : (typeof formData.image_id === "string" ? [formData.image_id] : formData.image_id),

        power_options: typeof formData.power_options === "string"
          ? formData.power_options.split(",").map((item: string) => item.trim()).filter(Boolean)
          : (Array.isArray(formData.power_options) ? formData.power_options : []),

        specs: String(formattedSpecs || "").slice(0, 65535),
      };

      if (editingProduct) {
        const updatedProduct = await updateProduct(editingProduct.id, {
          ...productPayload,
          specs: String(formattedSpecs || "").slice(0, 65535),
        });

        setProducts((value) => value.map((product) => (product.id === updatedProduct.id ? updatedProduct : product)));
      } else {
        const createdProduct = await createProduct({
          ...productPayload,
          specs: String(formattedSpecs || "").slice(0, 65535),
        });

        setProducts((value) => [createdProduct, ...value]);
      }

      setNotice(editingProduct ? "Изменения сохранены." : "Товар добавлен в каталог.");
      setProductsError("");
      setModalOpen(false);
      setEditingProduct(null);
      revokeLocalImagePreviews(form.images);
      setForm(createEmptyForm());
      router.push("/admin/products");
    } catch (error) {
      console.error("Не удалось сохранить товар", error);
      setProductsError(`Не удалось сохранить товар: ${getApiErrorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteProduct(product: ProductDocument) {
    const confirmed = window.confirm(`Удалить товар "${productTitle(product)}"?`);
    if (!confirmed) return;

    setDeletingId(product.id);
    setProductsError("");

    try {
      await deleteProduct(product.id);

      setProducts((value) => value.filter((item) => item.id !== product.id));
      setProductsError("");
      setNotice("Товар удалён.");

    } catch (error) {
      console.error("Не удалось удалить товар", error);
      setProductsError(`Не удалось удалить товар: ${getApiErrorMessage(error)}`);
    } finally {
      setDeletingId(null);
    }
  }

  if (!mounted || authLoading) {
    return (
      <main className="min-h-screen bg-[#F7F7F4] pt-32 text-[#151515] dark:bg-[#0F0F0F] dark:text-white">
        <div className="container-shell flex min-h-[60vh] items-center justify-center">
          <Loader2 className="animate-spin text-[#FF4F00]" size={32} aria-hidden />
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#F7F7F4] pt-32 text-[#151515] dark:bg-[#0F0F0F] dark:text-white">
        <div className="container-shell flex min-h-[70vh] items-center justify-center">
          <form
            className="w-full max-w-md rounded-md border border-black/10 bg-white p-6 shadow-2xl shadow-black/10 dark:border-white/10 dark:bg-[#151515]"
            onSubmit={handleLogin}
          >
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#FF4F00]">HeatFlow · управление</p>
            <h1 className="mt-2 text-3xl font-black">Вход в панель</h1>
            <div className="mt-6 grid gap-4">
              <input
                className="h-12 rounded-md border border-black/10 bg-black/5 px-4 text-sm outline-none focus:border-[#FF4F00] dark:border-white/10 dark:bg-white/5"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Электронная почта"
                required
                type="email"
                value={email}
              />
              <input
                className="h-12 rounded-md border border-black/10 bg-black/5 px-4 text-sm outline-none focus:border-[#FF4F00] dark:border-white/10 dark:bg-white/5"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Пароль"
                required
                type="password"
                value={password}
              />
            </div>
            {loginError && (
              <p role="alert" className="mt-4 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-700 dark:text-red-300">
                {loginError}
              </p>
            )}
            <button
              className="mt-5 h-12 w-full rounded-md bg-[#FF4F00] text-sm font-bold text-white transition hover:bg-[#e64800]"
              type="submit"
            >
              Войти
            </button>
          </form>
        </div>
      </main>
    );
  }

  function filterByStock(filter: "all" | "inStock" | "lowStock" | "outOfStock") {
    router.push(filter === "all" ? "/admin/products" : `/admin/products?stock=${filter}`);
  }

  return (
    <main className="min-h-screen bg-[#F7F7F4] pt-32 text-[#151515] dark:bg-[#0F0F0F] dark:text-white">
      <div className="container-shell pb-20">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#FF4F00]">HeatFlow · управление</p>
            <h1 className="mt-2 text-4xl font-black">
              {isDashboard ? "Обзор" : isOrdersPage ? "Заказы" : isPriceListPage ? "Прайс-лист" : isProductFormPage ? (routeProductId ? "Редактирование товара" : "Новый товар") : "Товары"}
            </h1>
            <p className="mt-3 text-sm text-black/55 dark:text-white/55">Вы вошли как {user.email}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              className="inline-flex h-11 items-center gap-2 rounded-md border border-black/10 px-4 text-sm font-bold transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
              onClick={handleLogout}
              type="button"
            >
              Выйти
            </button>
            {(isDashboard || isProductsPage) && (
              <Link
                className="inline-flex h-11 items-center gap-2 rounded-md bg-[#FF4F00] px-4 text-sm font-bold text-white transition hover:bg-[#e64800]"
                href="/admin/products/new"
              >
                <Plus size={18} aria-hidden />
                Добавить товар
              </Link>
            )}
          </div>
        </div>

        <nav aria-label="Разделы админки" className="mt-7 flex flex-wrap gap-2 border-b border-black/10 pb-4 dark:border-white/10">
          {[
            { href: "/admin", label: "Обзор", active: isDashboard },
            { href: "/admin/products", label: "Товары", active: isProductsPage || isProductFormPage },
            { href: "/admin/orders", label: "Заказы", active: isOrdersPage },
            { href: "/admin/price-list", label: "Прайс-лист", active: isPriceListPage },
          ].map(({ href, label, active }) => (
            <Link
              aria-current={active ? "page" : undefined}
              className={`rounded-lg px-4 py-2.5 text-sm font-bold transition ${active ? "bg-[#FF4F00] text-white" : "border border-black/10 hover:border-[#FF4F00] hover:text-[#FF4F00] dark:border-white/10"}`}
              href={href}
              key={href}
            >
              {label}
            </Link>
          ))}
        </nav>

        {productsError && (
          <p role="alert" className="mt-6 rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-700 dark:text-red-300">
            {productsError}
          </p>
        )}
        {notice && !productsError && (
          <p role="status" className="mt-6 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-700 dark:text-emerald-300">{notice}</p>
        )}
        {isProductFormPage && !modalOpen && productsLoading && (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="animate-spin text-[#FF4F00]" size={32} aria-hidden />
          </div>
        )}

        {isOrdersPage && <AdminOrdersPanel onInventoryUpdated={loadProducts} />}

        {isDashboard && <section className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {([
              { key: "all", label: "Всего товаров", value: inventoryStats.total, icon: Package, accent: "text-[#FF4F00]", borderAccent: "border-l-[#FF4F00]", active: "bg-[#FF4F00]/[0.07]" },
              { key: "inStock", label: "В наличии", value: inventoryStats.inStock, icon: PackageCheck, accent: "text-green-600 dark:text-green-400", borderAccent: "border-l-green-500", active: "bg-green-500/[0.07]" },
              { key: "lowStock", label: "Мало остатков", value: inventoryStats.lowStock, icon: AlertTriangle, accent: "text-orange-600 dark:text-orange-400", borderAccent: "border-l-orange-500", active: "bg-orange-500/[0.07]" },
              { key: "outOfStock", label: "Нет в наличии", value: inventoryStats.outOfStock, icon: PackageX, accent: "text-red-600 dark:text-red-400", borderAccent: "border-l-red-500", active: "bg-red-500/[0.07]" },
            ] as const).map(({ key, label, value, icon: MetricIcon, accent, borderAccent, active }) => (
              <button
                aria-pressed={stockFilter === key}
                className={`min-h-32 rounded-xl border border-l-4 border-black/10 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-[#151515] sm:p-5 ${accent} ${borderAccent} ${stockFilter === key ? active : ""}`}
                key={key}
                onClick={() => filterByStock(key)}
                type="button"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-black/60 dark:text-white/60">{label}</span>
                  <MetricIcon size={19} aria-hidden />
                </span>
                <span className="mt-4 block text-3xl font-black text-[#151515] dark:text-white">{productsLoading ? "—" : value}</span>
                <span className="mt-1 block text-xs font-medium text-black/40 dark:text-white/40">
                  {key === "all" ? "Сбросить фильтр наличия" : "Показать в таблице"}
                </span>
              </button>
            ))}
          </div>

          <div className="grid gap-4">
            <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#151515] sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black">Требуют внимания</h2>
                  <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                    Низкий остаток, нет фото или документов
                  </p>
                </div>
                <span className="rounded-full bg-orange-500/10 px-2.5 py-1 text-xs font-bold text-orange-600 dark:text-orange-400">
                  {productsLoading ? "…" : attentionProducts.length}
                </span>
              </div>
              {attentionProducts.length > 0 ? (
                <ul className="mt-3 divide-y divide-black/5 dark:divide-white/10">
                  {attentionProducts.slice(0, 5).map((product) => (
                    <li className="flex items-center justify-between gap-3 py-3 first:pt-1" key={product.id}>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold" title={productTitle(product)}>{productTitle(product)}</p>
                        <p className="mt-1 text-xs leading-5 text-black/50 dark:text-white/50">
                          {getAttentionReasons(product).join(" · ")}
                        </p>
                      </div>
                      <button
                        className="shrink-0 rounded-md border border-black/10 px-2.5 py-1.5 text-xs font-bold transition hover:border-[#FF4F00] hover:text-[#FF4F00] dark:border-white/10"
                        onClick={() => openEditModal(product)}
                        type="button"
                      >
                        Редактировать
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 rounded-lg bg-green-500/[0.07] px-3 py-2 text-sm font-medium text-green-700 dark:text-green-300">
                  {productsLoading ? "Загрузка списка товаров…" : "Нет товаров, требующих внимания."}
                </p>
              )}
              {attentionProducts.length > 5 && (
                <p className="mt-2 text-xs text-black/45 dark:text-white/45">
                  Показаны 5 из {attentionProducts.length} товаров
                </p>
              )}
            </section>

            <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#151515] sm:p-5">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-black/45 dark:text-white/45">Прайс-лист</p>
                {priceList ? (
                  <>
                    <p className="mt-1 truncate text-sm font-bold" title={priceList.title}>{priceList.title}</p>
                    <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                      Обновлён {new Date(priceList.updatedAt).toLocaleDateString("ru-RU")}
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-sm font-semibold text-black/60 dark:text-white/60">Ещё не загружен</p>
                )}
              </div>
              <a
                className="shrink-0 rounded-md bg-[#FF4F00]/10 px-3 py-2 text-xs font-bold text-[#FF4F00] transition hover:bg-[#FF4F00]/15"
                href="/admin/price-list"
              >
                {priceList ? "К прайс-листу" : "Загрузить прайс"}
              </a>
            </section>
          </div>
        </section>}

        {isDashboard && (
          <div className="mt-5 flex flex-wrap gap-3" aria-label="Быстрые переходы">
            <Link className="rounded-lg border border-black/10 bg-white px-4 py-3 text-sm font-bold transition hover:border-[#FF4F00] hover:text-[#FF4F00] dark:border-white/10 dark:bg-[#151515]" href="/admin/products">Открыть каталог товаров</Link>
            <Link className="rounded-lg border border-black/10 bg-white px-4 py-3 text-sm font-bold transition hover:border-[#FF4F00] hover:text-[#FF4F00] dark:border-white/10 dark:bg-[#151515]" href="/admin/orders">Перейти к заказам</Link>
            <Link className="rounded-lg border border-black/10 bg-white px-4 py-3 text-sm font-bold transition hover:border-[#FF4F00] hover:text-[#FF4F00] dark:border-white/10 dark:bg-[#151515]" href="/admin/price-list">Управлять прайс-листом</Link>
          </div>
        )}

        {isPriceListPage && <section id="price-list" className="mt-6 rounded-xl border border-black/10 bg-white p-5 shadow-xl shadow-black/5 dark:border-white/10 dark:bg-[#151515]">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div>
              <h2 className="text-xl font-black">Прайс-лист</h2>
              <p className="mt-1 text-sm text-black/50 dark:text-white/50">Загрузите актуальный файл для ссылки «Скачать прайс» на сайте.</p>
            </div>
            {priceList && <div className="min-w-0 rounded-lg border border-emerald-500/25 bg-emerald-500/[0.06] p-3 text-sm text-black dark:text-white lg:max-w-[48%] lg:text-right"><p className="break-words font-bold">Активный прайс: {priceList.title}</p><p className="mt-1 text-xs font-medium text-black/65 dark:text-white/70">Обновлён {new Date(priceList.updatedAt).toLocaleString("ru-RU")}</p><div className="mt-2 flex flex-wrap gap-3 lg:justify-end"><a className="font-bold text-[#d94300] underline decoration-[#d94300]/40 underline-offset-2 hover:text-[#a83200] dark:text-[#ff7640] dark:hover:text-[#ff9a73]" href="/api/prices/download">Скачать</a><a className="font-bold text-[#d94300] underline decoration-[#d94300]/40 underline-offset-2 hover:text-[#a83200] dark:text-[#ff7640] dark:hover:text-[#ff9a73]" href={priceList.fileUrl} rel="noreferrer" target="_blank">Открыть</a></div></div>}
          </div>
          <form className="mt-5 grid min-w-0 gap-3 lg:grid-cols-[minmax(180px,0.8fr)_minmax(240px,1.2fr)_auto]" onSubmit={uploadPriceList}>
            <input className="h-11 min-w-0 rounded-lg border border-black/10 bg-black/[0.025] px-3 text-sm outline-none focus:border-[#FF4F00] dark:border-white/10 dark:bg-white/[0.04]" onChange={(event) => setPriceListTitle(event.target.value)} placeholder="Название прайс-листа" required value={priceListTitle} />
            <div className="min-w-0">
              <input id="price-list-file" accept=".pdf,.xlsx,.xls,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={(event) => setPriceListFile(event.target.files?.[0] ?? null)} required type="file" />
              <label className="flex h-11 min-w-0 cursor-pointer items-center gap-3 rounded-lg border border-black/10 bg-black/[0.025] px-3 text-sm transition hover:border-[#FF4F00] dark:border-white/10 dark:bg-white/[0.04]" htmlFor="price-list-file">
                <span className="shrink-0 rounded-md border border-black/10 px-3 py-1.5 font-semibold dark:border-white/15">Выбрать файл</span>
                <span className="min-w-0 flex-1 truncate text-black/65 dark:text-white/70" title={priceListFile?.name}>{priceListFile?.name ?? "PDF, XLS или XLSX · до 25 МБ"}</span>
              </label>
            </div>
            <button className="h-11 whitespace-nowrap rounded-lg bg-[#FF4F00] px-4 text-sm font-bold text-white transition hover:bg-[#e64800] disabled:cursor-not-allowed disabled:opacity-60" disabled={priceListSaving} type="submit">{priceListSaving ? "Загрузка…" : "Загрузить прайс"}</button>
          </form>
          {priceListError && <p role="alert" className="mt-3 text-sm font-semibold text-red-500">{priceListError}</p>}
          {!priceList && !priceListError && <p className="mt-3 rounded-md bg-black/[0.04] px-3 py-2 text-sm font-medium text-black/65 dark:bg-white/[0.06] dark:text-white/70">Прайс-лист ещё не загружен. На сайте пока доступен резервный файл.</p>}
        </section>}

        {isProductsPage && <section id="products-table" className="mt-6 overflow-hidden rounded-xl border border-black/10 bg-white shadow-xl shadow-black/5 dark:border-white/10 dark:bg-[#151515]">
          <div className="grid min-w-0 grid-cols-1 items-end gap-4 border-b border-black/10 p-5 dark:border-white/10 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_minmax(160px,190px)_minmax(170px,190px)_auto]">
            <label className="grid flex-1 gap-2 text-sm font-bold">
              Поиск по названию
              <span className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40" size={17} aria-hidden />
                <input className="h-11 w-full min-w-0 rounded-lg border border-black/10 bg-black/[0.025] pl-10 pr-4 font-normal outline-none transition focus:border-[#FF4F00] dark:border-white/10 dark:bg-white/[0.04]" onChange={(event) => setSearchQuery(event.target.value)} placeholder="Введите название товара" value={searchQuery} />
              </span>
            </label>
            <label className="grid min-w-0 gap-2 text-sm font-bold">
              Категория
              <select className="h-11 w-full min-w-0 rounded-lg border border-black/10 bg-white px-3 font-normal outline-none transition focus:border-[#FF4F00] dark:border-white/10 dark:bg-[#1d1d1d]" onChange={(event) => setCategoryFilter(event.target.value)} value={categoryFilter}>
                <option value="">Все категории</option>
                {catalogCategories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
            <label className="grid min-w-0 gap-2 text-sm font-bold">
              Наличие
              <select
                className="h-11 w-full min-w-0 rounded-lg border border-black/10 bg-white px-3 font-normal outline-none transition focus:border-[#FF4F00] dark:border-white/10 dark:bg-[#1d1d1d]"
                onChange={(event) => {
                  const value = event.target.value;
                  setStockFilter(
                    value === "inStock" || value === "lowStock" || value === "outOfStock" ? value : "all",
                  );
                }}
                value={stockFilter}
              >
                <option value="all">Любой остаток</option>
                <option value="inStock">В наличии</option>
                <option value="lowStock">Мало остатков (1–3)</option>
                <option value="outOfStock">Нет в наличии</option>
              </select>
            </label>
            <p className="whitespace-nowrap pb-3 text-sm font-medium text-black/65 dark:text-white/70">Найдено: <span className="font-black text-black dark:text-white">{filteredProducts.length}</span></p>
          </div>
          <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain">
          <table className="w-full min-w-[1160px] table-fixed border-collapse text-left">
            <thead className="bg-black/[0.03] text-xs font-bold uppercase tracking-wide text-black/45 dark:bg-white/[0.04] dark:text-white/45">
              <tr>
                <th className="w-[28%] px-5 py-4 text-left">Товар</th>
                <th className="w-[15%] px-5 py-4 text-left">Категория</th>
                <th className="w-[14%] px-5 py-4 text-left">Цена</th>
                <th className="w-[19%] px-5 py-4 text-left">Наличие</th>
                <th className="w-[24%] px-5 py-4 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10 dark:divide-white/10">
              {productsLoading && (
                <tr>
                  <td className="px-5 py-8 text-center" colSpan={5}>
                    <Loader2 className="mx-auto animate-spin text-[#FF4F00]" size={28} aria-hidden />
                  </td>
                </tr>
              )}
              {!productsLoading &&
                filteredProducts.map((product) => (
                  <tr className="transition hover:bg-black/[0.025] dark:hover:bg-white/[0.04]" key={product.id}>
                    <td className="px-5 py-4 align-middle">
                      <div className="flex min-w-0 items-center gap-3">
                      <div className="relative size-16 shrink-0 overflow-hidden rounded-md border border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5">
                        <Image
                          alt={productTitle(product)}
                          className="object-cover"
                          fill
                          sizes="64px"
                          src={getProductImageUrl(product.image_id)}
                          unoptimized
                        />
                      </div>
                      <p className="min-w-0 break-words font-black">{productTitle(product)}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-middle text-sm text-black/65 dark:text-white/65"><span className="break-words font-semibold">{product.category}</span>{product.subcategory && <span className="mt-1 block break-words text-xs text-black/55 dark:text-white/55">{product.subcategory}</span>}</td>
                    <td className="px-5 py-4 align-middle"><span className="whitespace-nowrap font-bold">{formatMoney(product.price)}</span>{Number(product.oldPrice ?? product.old_price ?? 0) > Number(product.price) && <span className="mt-1 block whitespace-nowrap text-sm text-black/55 line-through dark:text-white/55">{formatMoney(Number(product.oldPrice ?? product.old_price))}</span>}</td>
                    <td className="px-5 py-4 align-middle">{(() => { const stock = Number(product.stockQuantity ?? product.stock ?? 0); const status = getStockStatus(stock); return <span className={`inline-flex max-w-full rounded-full border px-2.5 py-1 text-xs font-bold leading-tight ${status.className}`}>{status.label}</span>; })()}</td>
                    <td className="px-5 py-4 align-middle">
                      <div className="flex flex-nowrap justify-end gap-2">
                        <button
                          className="inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-black/10 px-3 text-sm font-semibold transition hover:border-[#FF4F00] hover:text-[#FF4F00] dark:border-white/10"
                          onClick={() => openEditModal(product)}
                          type="button"
                        >
                          <Pencil size={15} aria-hidden />Редактировать
                        </button>
                        <button
                          className="inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-red-500/20 px-3 text-sm font-semibold text-red-500 transition hover:bg-red-500 hover:text-white"
                          disabled={deletingId === product.id}
                          onClick={() => handleDeleteProduct(product)}
                          type="button"
                        >
                          {deletingId === product.id ? (
                            <Loader2 className="animate-spin" size={15} aria-hidden />
                          ) : (
                            <Trash2 size={15} aria-hidden />
                          )}
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              {!productsLoading && filteredProducts.length === 0 && (
                <tr>
                  <td className="px-5 py-10 text-center text-sm text-black/50 dark:text-white/50" colSpan={5}>
                    {products.length === 0 ? "В каталоге пока нет товаров." : "По заданным условиям ничего не найдено."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </section>}
      </div>

      {modalOpen && isProductFormPage && (
        <div className="mt-6">
          <form
            className={`w-full rounded-md border border-black/10 bg-white p-6 text-[#151515] shadow-xl dark:border-white/10 dark:bg-[#151515] dark:text-white ${isProductFormPage ? "mx-auto max-w-4xl" : "max-h-[90vh] max-w-2xl overflow-y-auto"}`}
            onPaste={handlePaste}
            onSubmit={handleSaveProduct}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.16em] text-[#FF4F00]">Карточка товара</p>
                <h2 className="mt-1 text-2xl font-black">{isEditing ? "Редактирование товара" : "Новый товар"}</h2>
              </div>
              <button
                className="grid size-10 place-items-center rounded-md border border-black/10 transition hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
                onClick={closeModal}
                type="button"
              >
                <X size={18} aria-hidden />
              </button>
            </div>

            <div className="mt-6 grid gap-7">
              <section className="grid gap-4">
                <div>
                  <h3 className="text-base font-black">Основная информация</h3>
                <p className="mt-1 text-sm text-black/50 dark:text-white/50">Укажите основные сведения о товаре.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold md:col-span-2">
                Название <span className="text-[#FF4F00]">*</span>
                <input
                  className="h-12 rounded-md border border-black/10 bg-black/5 px-4 font-normal outline-none focus:border-[#FF4F00] dark:border-white/10 dark:bg-white/5"
                  onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))}
                  required
                  maxLength={160}
                  placeholder="Например, настенный котёл Navien"
                  value={form.title}
                />
              </label>
              <div className="grid gap-3 rounded-lg border border-black/10 p-4 dark:border-white/10 md:col-span-2 md:grid-cols-2">
                <div className="md:col-span-2"><h3 className="font-black">Цена и скидка</h3><p className="mt-1 text-xs text-black/50 dark:text-white/50">При изменении цены прежняя автоматически станет старой, её можно изменить вручную.</p></div>
                <label className="grid gap-2 text-sm font-bold">Текущая цена (сом) <span className="text-[#FF4F00]">*</span><input className="h-12 rounded-md border border-black/10 bg-black/5 px-4 font-normal outline-none focus:border-[#FF4F00] dark:border-white/10 dark:bg-white/5" step="1" min={0} max={Number.MAX_SAFE_INTEGER} onChange={(event) => setForm((value) => ({ ...value, price: event.target.value, old_price: editingProduct && Number(event.target.value) !== Number(editingProduct.price) && !value.old_price ? String(editingProduct.price) : value.old_price }))} required type="number" value={form.price} /></label>
                <label className="grid gap-2 text-sm font-bold">Старая цена (сом)<input className="h-12 rounded-md border border-black/10 bg-black/5 px-4 font-normal outline-none focus:border-[#FF4F00] dark:border-white/10 dark:bg-white/5" step="1" min={0} max={Number.MAX_SAFE_INTEGER} onChange={(event) => setForm((value) => ({ ...value, old_price: event.target.value }))} placeholder="Необязательно" type="number" value={form.old_price} /><span className="text-xs font-normal text-black/45 dark:text-white/45">Оставьте пустым, чтобы убрать зачёркнутую цену.</span></label>
              </div>
              <label className="grid gap-2 text-sm font-bold">
                Категория <span className="text-[#FF4F00]">*</span>
                <select
                  className="h-12 rounded-md border border-black/10 bg-black/5 px-4 font-normal outline-none transition focus:border-[#FF4F00] dark:border-white/10 dark:bg-white/5"
                  onChange={(event) => handleCategoryChange(event.target.value)}
                  required
                  value={form.category}
                >
                  {catalogCategories.map((category) => (
                    <option className="bg-white text-[#151515]" key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-bold">
                Подкатегория
                <select
                  className="h-12 rounded-md border border-black/10 bg-black/5 px-4 font-normal outline-none transition focus:border-[#FF4F00] disabled:cursor-not-allowed disabled:opacity-55 dark:border-white/10 dark:bg-white/5"
                  disabled={availableSubcategories.length === 0}
                  onChange={(event) => setForm((value) => ({ ...value, subcategory: event.target.value }))}
                  value={form.subcategory}
                >
                  <option className="bg-white text-[#151515]" value="">
                    Без подкатегории
                  </option>
                  {availableSubcategories.map((subcategory) => (
                    <option className="bg-white text-[#151515]" key={subcategory} value={subcategory}>
                      {subcategory}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-bold md:col-span-2">
                Описание
                <textarea
                  className="min-h-28 resize-y rounded-md border border-black/10 bg-black/5 px-4 py-3 font-normal leading-6 outline-none transition focus:border-[#FF4F00] dark:border-white/10 dark:bg-white/5"
                  onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))}
                  placeholder="Описание товара"
                  maxLength={5000}
                  value={form.description}
                />
              </label>
              <label className="grid gap-2 text-sm font-bold">
                Остаток на складе
                <input className="h-12 rounded-md border border-black/10 bg-black/5 px-4 font-normal outline-none focus:border-[#FF4F00] dark:border-white/10 dark:bg-white/5" min={0} max={Number.MAX_SAFE_INTEGER} onChange={(event) => setForm((value) => ({ ...value, stock: event.target.value }))} required step="1" type="number" value={form.stock} />
                <span className="text-xs font-normal text-black/45 dark:text-white/45">Используется для статуса наличия в каталоге.</span>
              </label>
                </div>
              </section>
              {form.category === "Котлы" && (
                <section className="grid gap-3">
                  <div>
                    <h3 className="text-base font-black">Мощность котла</h3>
                    <p className="mt-1 text-sm text-black/50 dark:text-white/50">Выберите все подходящие варианты.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                    {boilerPowerOptions.map((powerOption) => {
                      const checked = form.powerOptions.includes(powerOption);

                      return (
                        <label
                          className={`flex h-11 cursor-pointer items-center gap-2 rounded-md border px-3 text-xs font-black transition ${
                            checked
                              ? "border-[#FF4F00] bg-[#FF4F00]/10 text-[#FF4F00]"
                              : "border-black/10 bg-black/5 text-black/65 hover:border-[#FF4F00] hover:text-[#FF4F00] dark:border-white/10 dark:bg-white/5 dark:text-white/70"
                          }`}
                          key={powerOption}
                        >
                          <input
                            checked={checked}
                            className="size-4 accent-[#FF4F00]"
                            onChange={(event) => setBoilerPowerSelected(powerOption, event.target.checked)}
                            type="checkbox"
                          />
                          {powerOption}
                        </label>
                      );
                    })}
                  </div>
                  {form.powerVariants.length > 0 && <div className="grid gap-2">{form.powerVariants.map((variant) => <div className="grid items-center gap-2 rounded-lg border border-black/10 p-3 dark:border-white/10 sm:grid-cols-2 lg:grid-cols-[0.7fr_1fr_1fr_1fr]" key={variant.power}><p className="font-bold">{variant.power}</p><label className="grid gap-1 text-xs font-semibold">Цена, сом<input className="h-10 rounded border border-black/10 bg-black/5 px-2 text-sm dark:border-white/10 dark:bg-white/5" min={0} step="1" type="number" value={variant.price} onChange={(event) => setForm((value) => ({ ...value, powerVariants: value.powerVariants.map((item) => item.power === variant.power ? { ...item, price: event.target.value } : item) }))} /></label><label className="grid gap-1 text-xs font-semibold">Старая цена<input className="h-10 rounded border border-black/10 bg-black/5 px-2 text-sm dark:border-white/10 dark:bg-white/5" min={0} step="1" placeholder="Необязательно" type="number" value={variant.oldPrice} onChange={(event) => setForm((value) => ({ ...value, powerVariants: value.powerVariants.map((item) => item.power === variant.power ? { ...item, oldPrice: event.target.value } : item) }))} /></label><label className="grid gap-1 text-xs font-semibold">Остаток, шт.<input className="h-10 rounded border border-black/10 bg-black/5 px-2 text-sm dark:border-white/10 dark:bg-white/5" min={0} step="1" type="number" value={variant.stockQuantity} onChange={(event) => setForm((value) => ({ ...value, powerVariants: value.powerVariants.map((item) => item.power === variant.power ? { ...item, stockQuantity: event.target.value } : item) }))} /></label></div>)}</div>}
                </section>
              )}
              <section className="grid gap-3">
                <div>
                  <h3 className="text-base font-black">Фотографии</h3>
                  <p className="mt-1 text-sm text-black/50 dark:text-white/50">Добавьте до трёх изображений. Подойдут JPEG, PNG, WebP, GIF или AVIF до 10 МБ.</p>
                </div>
                <label
                  className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-3 rounded-md border border-dashed border-black/20 bg-black/5 px-4 text-center text-sm font-semibold text-black/55 transition hover:border-[#FF4F00] hover:text-[#FF4F00] dark:border-white/15 dark:bg-white/5 dark:text-white/55"
                  onDragOver={handleImageDragOver}
                  onDrop={handleImageDrop}
                >
                  <ImagePlus size={24} aria-hidden />
                  <span>Выберите файлы, перетащите их сюда или вставьте из буфера обмена</span>
                  <span className="text-xs font-semibold text-black/40 dark:text-white/40">Можно добавить ещё {3 - form.images.length}</span>
                  <input
                    accept="image/*"
                    className="sr-only"
                    disabled={form.images.length >= 3}
                    multiple
                    onChange={(event) => {
                      addImageFiles(event.target.files);
                      event.target.value = "";
                    }}
                    type="file"
                  />
                </label>
                {form.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {form.images.map((image) => (
                      <div
                        className="relative aspect-square overflow-hidden rounded-md border border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5"
                        key={image.id}
                      >
                        {image.type === "file" ? (
                          <img
                            alt="Предпросмотр фотографии товара"
                            className="size-full object-cover"
                            src={image.previewUrl}
                          />
                        ) : (
                          <Image
                            alt="Предпросмотр фотографии товара"
                            className="object-cover"
                            fill
                            sizes="160px"
                            src={image.previewUrl}
                            unoptimized
                          />
                        )}
                        <button
                          aria-label="Удалить фотографию"
                          className="absolute right-2 top-2 grid size-8 place-items-center rounded-md bg-black/70 text-white transition hover:bg-red-500"
                          onClick={() => removeImage(image.id)}
                          type="button"
                        >
                          <X size={15} aria-hidden />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs font-semibold text-black/45 dark:text-white/45">Добавлено фотографий: {form.images.length} из 3</p>
              </section>
              <section className="grid gap-3">
                <div>
                  <h3 className="text-base font-black">Документация (PDF)</h3>
                  <p className="mt-1 text-sm text-black/50 dark:text-white/50">Прикрепите сертификат соответствия и паспорт товара. Максимальный размер файла — 10 МБ.</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {([
                    { key: "certificate", label: "Сертификат соответствия" },
                    { key: "passport", label: "Паспорт" },
                  ] as const).map(({ key, label }) => {
                    const document = form.documentation[key];
                    const inputId = `product-${key}-pdf`;

                    return (
                      <div className="grid gap-3 rounded-lg border border-black/10 p-4 dark:border-white/10" key={key}>
                        <div className="flex items-center gap-2 font-bold">
                          <FileText className="shrink-0 text-[#FF4F00]" size={18} aria-hidden />
                          <h4>{label}</h4>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            accept=".pdf,application/pdf"
                            className="sr-only"
                            id={inputId}
                            onChange={(event) => {
                              setProductPdf(key, event.target.files?.[0] ?? null);
                              event.target.value = "";
                            }}
                            type="file"
                          />
                          <label
                            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-black/10 px-3 text-sm font-semibold transition hover:border-[#FF4F00] hover:text-[#FF4F00] dark:border-white/10"
                            htmlFor={inputId}
                          >
                            <Upload size={15} aria-hidden />
                            {document.url || document.file ? "Заменить PDF" : "Загрузить PDF"}
                          </label>
                          {(document.url || document.file) && (
                            <button
                              className="inline-flex h-10 items-center rounded-md border border-red-500/20 px-3 text-sm font-semibold text-red-500 transition hover:bg-red-500 hover:text-white"
                              onClick={() => removeProductPdf(key)}
                              type="button"
                            >
                              Удалить
                            </button>
                          )}
                        </div>
                        {document.url ? (
                          <>
                            <a
                              className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold text-[#FF4F00] hover:underline"
                              href={document.url}
                              rel="noreferrer"
                              target="_blank"
                              title={document.fileName || label}
                            >
                              <FileText className="shrink-0" size={16} aria-hidden />
                              <span className="truncate">{document.fileName || "Открыть прикреплённый PDF"}</span>
                            </a>
                            {document.file && (
                              <p className="truncate text-xs text-black/50 dark:text-white/50" title={document.file.name}>
                                Новый файл: {document.file.name}
                              </p>
                            )}
                          </>
                        ) : document.file ? (
                          <p className="truncate text-sm text-black/60 dark:text-white/60" title={document.file.name}>
                            Выбран файл: {document.file.name}
                          </p>
                        ) : (
                          <p className="text-sm text-black/45 dark:text-white/45">Файл не прикреплён</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
              <section className="grid gap-3">
                <div>
                  <h3 className="text-base font-black">Характеристики</h3>
                  <p className="mt-1 text-sm text-black/50 dark:text-white/50">Добавьте параметры, которые помогут покупателю выбрать товар.</p>
                </div>
                <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                  <input
                    className="h-12 rounded-md border border-black/10 bg-black/5 px-4 font-normal outline-none focus:border-[#FF4F00] dark:border-white/10 dark:bg-white/5"
                    onChange={(event) => setForm((value) => ({ ...value, specKeyInput: event.target.value }))}
                    onKeyDown={handleSpecInputKeyDown}
                    placeholder="Параметр, например: Производитель"
                    value={form.specKeyInput}
                  />
                  <input
                    className="h-12 rounded-md border border-black/10 bg-black/5 px-4 font-normal outline-none focus:border-[#FF4F00] dark:border-white/10 dark:bg-white/5"
                    onChange={(event) => setForm((value) => ({ ...value, specValueInput: event.target.value }))}
                    onKeyDown={handleSpecInputKeyDown}
                    placeholder="Значение, например: Navien"
                    value={form.specValueInput}
                  />
                  <button
                    className="h-12 rounded-md bg-[#151515] px-4 text-xs font-black uppercase text-white dark:bg-white dark:text-[#151515]"
                    onClick={addSpec}
                    type="button"
                  >
                    Добавить
                  </button>
                </div>
                {form.specs.length > 0 && (
                  <div className="grid gap-2">
                    {form.specs.map((spec) => (
                      <div
                        className="flex items-center justify-between gap-3 rounded-md border border-black/10 bg-black/5 px-3 py-2 text-sm font-bold dark:border-white/10 dark:bg-white/5"
                        key={spec}
                      >
                        <span className="min-w-0 flex-1 break-words font-normal">{spec}</span>
                        <button
                          className="h-8 rounded-md border border-red-500/20 px-3 text-xs font-black uppercase text-red-500 transition hover:bg-red-500 hover:text-white"
                          onClick={() => removeSpec(spec)}
                          type="button"
                        >
                          Удалить
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {productsError && <p role="alert" className="mt-5 rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-700 dark:text-red-300">{productsError}</p>}

            <button
              className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#FF4F00] text-sm font-bold text-white transition hover:bg-[#e64800] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saving}
              type="submit"
            >
              {saving && <Loader2 className="animate-spin" size={18} aria-hidden />}
              {saving ? "Сохранение…" : isEditing ? "Сохранить изменения" : "Добавить товар"}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
