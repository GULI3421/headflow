"use client";

import Image from "next/image";
import { type ClipboardEvent as ReactClipboardEvent, type DragEvent, FormEvent, KeyboardEvent, useEffect, useMemo, useState } from "react";
import { ID, Models, Permission, Role } from "appwrite";
import { ImagePlus, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  account,
  appwriteConfig,
  AppwriteProductDocument,
  databases,
  getProductImageUrl,
  storage,
} from "@/src/lib/appwrite";
import { useClientMounted } from "@/components/use-client-mounted";
import { catalogCategories, subcategoryMap } from "@/lib/catalog";

type ProductImageFormItem = {
  id: string;
  type: "file" | "value";
  value: string;
  file?: File;
  previewUrl: string;
};

type ProductFormState = {
  title: string;
  price: string;
  old_price: string;
  category: string;
  subcategory: string;
  description: string;
  powerOptions: string[];
  images: ProductImageFormItem[];
  specs: string[];
  specKeyInput: string;
  specValueInput: string;
};

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

const emptyForm: ProductFormState = {
  title: "",
  price: "",
  old_price: "",
  category: "Котлы",
  subcategory: "",
  description: "",
  powerOptions: [],
  images: [],
  specs: [],
  specKeyInput: "",
  specValueInput: "",
};

function productTitle(product: AppwriteProductDocument) {
  return product.title_ru || product.title_ky || "Без названия";
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

function isStorageImageId(imageId: string) {
  return Boolean(imageId) && !/^(https?:)?\/\//.test(imageId) && !imageId.startsWith("/");
}

function revokeLocalImagePreviews(images: ProductImageFormItem[]) {
  images.forEach((image) => {
    if (image.type === "file") {
      URL.revokeObjectURL(image.previewUrl);
    }
  });
}

function getAppwriteErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown Appwrite error";
}

export default function AdminPage() {
  const mounted = useClientMounted();
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [products, setProducts] = useState<AppwriteProductDocument[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AppwriteProductDocument | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isEditing = Boolean(editingProduct);
  const canUseStorage = Boolean(appwriteConfig.productImagesBucketId);
  const availableSubcategories = subcategoryMap[form.category] ?? [];

  const sortedProducts = useMemo(
    () => [...products].sort((first, second) => productTitle(first).localeCompare(productTitle(second), "ru")),
    [products],
  );

  useEffect(() => {
    if (!mounted) return;

    async function loadSession() {
      try {
        const currentUser = await account.get();
        setUser(currentUser);
      } catch {
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    }

    loadSession();
  }, [mounted]);

  useEffect(() => {
    if (!mounted || !user) return;
    loadProducts();
  }, [mounted, user]);

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
      if (!appwriteConfig.databaseId || !appwriteConfig.productsCollectionId) {
        throw new Error("Appwrite databaseId or productsCollectionId is missing.");
      }

      const response = await databases.listDocuments<AppwriteProductDocument>({
        databaseId: appwriteConfig.databaseId,
        collectionId: appwriteConfig.productsCollectionId,
      });

      setProducts(response.documents);
    } catch (error) {
      setProducts([]);
      setProductsError(`Не удалось загрузить товары из Appwrite: ${getAppwriteErrorMessage(error)}`);
    } finally {
      setProductsLoading(false);
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError("");
    setAuthLoading(true);

    try {
      await account.createEmailPasswordSession({ email, password });
      const currentUser = await account.get();
      setUser(currentUser);
    } catch (error) {
      console.error("Failed to login", error);
      setLoginError("Не удалось войти. Проверьте email и пароль.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    await account.deleteSession("current");
    setUser(null);
    setProducts([]);
  }

  function openCreateModal() {
    setEditingProduct(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEditModal(product: AppwriteProductDocument) {
    setEditingProduct(product);
    setForm({
      title: productTitle(product),
      price: String(product.price ?? ""),
      old_price: product.old_price == null ? "" : String(product.old_price),
      category: product.category && catalogCategories.includes(product.category) ? product.category : "Котлы",
      subcategory:
        product.subcategory && subcategoryMap[product.category]?.includes(product.subcategory)
          ? product.subcategory
          : "",
      description: product.description ?? "",
      powerOptions: normalizeStringArray(product.power_options),
      images: normalizeImageIds(product.image_id)
        .filter(isStorageImageId)
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
    });
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    revokeLocalImagePreviews(form.images);
    setModalOpen(false);
    setEditingProduct(null);
    setForm(emptyForm);
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
    }));
  }

  function setBoilerPowerSelected(powerOption: string, checked: boolean) {
    setForm((value) => ({
      ...value,
      powerOptions: checked
        ? Array.from(new Set([...value.powerOptions, powerOption]))
        : value.powerOptions.filter((option) => option !== powerOption),
    }));
  }

  async function uploadImagesIfNeeded() {
    const imageIds: string[] = [];
    const imageUrls: string[] = [];
    const uploadedImageIds: string[] = [];

    if (!canUseStorage) {
      const hasLocalFiles = form.images.some((image) => image.type === "file");
      if (hasLocalFiles) {
        throw new Error("NEXT_PUBLIC_APPWRITE_PRODUCT_IMAGES_BUCKET_ID is required for image uploads.");
      }
    }

    for (const image of form.images) {
      if (image.type === "value") {
        if (isStorageImageId(image.value)) {
          imageIds.push(image.value);
          imageUrls.push(getProductImageUrl(image.value));
        }
        continue;
      }

      if (!image.file) continue;

      const file = await storage.createFile({
        bucketId: appwriteConfig.productImagesBucketId,
        fileId: ID.unique(),
        file: image.file,
        permissions: [Permission.read(Role.any())],
      });

      imageIds.push(file.$id);
      imageUrls.push(getProductImageUrl(file.$id));
      uploadedImageIds.push(file.$id);
    }

    return { imageIds, imageUrls, uploadedImageIds };
  }

  async function deleteImageIfPossible(imageId: string) {
    if (!canUseStorage || !isStorageImageId(imageId)) return;

    await storage.deleteFile({
      bucketId: appwriteConfig.productImagesBucketId,
      fileId: imageId,
    });
  }

  async function deleteImagesIfPossible(imageIds: string[]) {
    await Promise.all(imageIds.map((imageId) => deleteImageIfPossible(imageId)));
  }

  async function handleSaveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setProductsError("");

    let uploadedImageIds: string[] = [];

    try {
      const uploadResult = await uploadImagesIfNeeded();
      const imageIds = normalizeStringArray(uploadResult.imageIds);
      const imageUrl = uploadResult.imageUrls.find(Boolean) ?? "";
      uploadedImageIds = uploadResult.uploadedImageIds;
      const formData: {
        title_ru: string;
        price: string;
        old_price: string;
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

      const appwritePayload = {
        title_ru: formData.title_ru,
        price: Number(formData.price),
        old_price: formData.old_price && formData.old_price.trim() !== "" ? Number(formData.old_price) : null,
        category: formData.category,
        subcategory: formData.subcategory,
        description: formData.description,
        imageUrl: String(formData.imageUrl || ""),

        // Ultimate array fix for images:
        image_id: !formData.image_id || formData.image_id === ""
          ? []
          : (typeof formData.image_id === "string" ? [formData.image_id] : formData.image_id),

        power_options: typeof formData.power_options === "string"
          ? formData.power_options.split(",").map((item: string) => item.trim()).filter(Boolean)
          : (Array.isArray(formData.power_options) ? formData.power_options : []),

        specs: String(formattedSpecs || "").slice(0, 65535),
      };

      if (editingProduct) {
        const previousImageIds = normalizeImageIds(editingProduct.image_id);
        const updatedProduct = await databases.updateDocument<AppwriteProductDocument>({
          databaseId: appwriteConfig.databaseId,
          collectionId: appwriteConfig.productsCollectionId,
          documentId: editingProduct.$id,
          data: {
            ...appwritePayload,
            specs: String(formattedSpecs || "").slice(0, 65535),
          },
        });

        setProducts((value) => value.map((product) => (product.$id === updatedProduct.$id ? updatedProduct : product)));

        const removedImageIds = previousImageIds.filter((imageId) => !imageIds.includes(imageId));

        if (removedImageIds.length > 0) {
          try {
            await deleteImagesIfPossible(removedImageIds);
          } catch (deleteError) {
            console.error("Failed to delete removed product images", deleteError);
            setProductsError("Товар сохранен, но один или несколько старых файлов изображений не удалены.");
          }
        }
      } else {
        const createdProduct = await databases.createDocument<AppwriteProductDocument>({
          databaseId: appwriteConfig.databaseId,
          collectionId: appwriteConfig.productsCollectionId,
          documentId: ID.unique(),
          data: {
            ...appwritePayload,
            specs: String(formattedSpecs || "").slice(0, 65535),
          },
        });

        setProducts((value) => [createdProduct, ...value]);
      }

      setModalOpen(false);
      setEditingProduct(null);
      revokeLocalImagePreviews(form.images);
      setForm(emptyForm);
    } catch (error) {
      console.error("Failed to save product", error);
      if (uploadedImageIds.length > 0) {
        try {
          await deleteImagesIfPossible(uploadedImageIds);
        } catch (deleteError) {
          console.error("Failed to clean up uploaded images", deleteError);
        }
      }
      setProductsError(`Не удалось сохранить товар: ${getAppwriteErrorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteProduct(product: AppwriteProductDocument) {
    const confirmed = window.confirm(`Удалить товар "${productTitle(product)}"?`);
    if (!confirmed) return;

    setDeletingId(product.$id);
    setProductsError("");

    try {
      await databases.deleteDocument({
        databaseId: appwriteConfig.databaseId,
        collectionId: appwriteConfig.productsCollectionId,
        documentId: product.$id,
      });

      setProducts((value) => value.filter((item) => item.$id !== product.$id));

      try {
        await deleteImagesIfPossible(normalizeImageIds(product.image_id));
      } catch (deleteError) {
        console.error("Failed to delete product image", deleteError);
        setProductsError("Товар удален, но один или несколько файлов изображений не удалены.");
      }
    } catch (error) {
      console.error("Failed to delete product", error);
      setProductsError("Не удалось удалить товар или файл изображения.");
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
            <p className="text-sm font-black uppercase text-[#FF4F00]">Admin</p>
            <h1 className="mt-2 text-3xl font-black">Вход в панель</h1>
            <div className="mt-6 grid gap-4">
              <input
                className="h-12 rounded-md border border-black/10 bg-black/5 px-4 text-sm outline-none focus:border-[#FF4F00] dark:border-white/10 dark:bg-white/5"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email"
                required
                type="email"
                value={email}
              />
              <input
                className="h-12 rounded-md border border-black/10 bg-black/5 px-4 text-sm outline-none focus:border-[#FF4F00] dark:border-white/10 dark:bg-white/5"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                required
                type="password"
                value={password}
              />
            </div>
            {loginError && (
              <p className="mt-4 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-700 dark:text-red-300">
                {loginError}
              </p>
            )}
            <button
              className="mt-5 h-12 w-full rounded-md bg-[#FF4F00] text-sm font-black uppercase text-white transition hover:bg-[#e64800]"
              type="submit"
            >
              Войти
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F7F4] pt-32 text-[#151515] dark:bg-[#0F0F0F] dark:text-white">
      <div className="container-shell pb-20">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-black uppercase text-[#FF4F00]">HeatFlow Admin</p>
            <h1 className="mt-2 text-4xl font-black">Product Management</h1>
            <p className="mt-3 text-sm text-black/55 dark:text-white/55">{user.email}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              className="inline-flex h-11 items-center gap-2 rounded-md border border-black/10 px-4 text-sm font-black uppercase transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
              onClick={handleLogout}
              type="button"
            >
              Выйти
            </button>
            <button
              className="inline-flex h-11 items-center gap-2 rounded-md bg-[#FF4F00] px-4 text-sm font-black uppercase text-white transition hover:bg-[#e64800]"
              onClick={openCreateModal}
              type="button"
            >
              <Plus size={18} aria-hidden />
              Add Product
            </button>
          </div>
        </div>

        {productsError && (
          <p className="mt-6 rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-700 dark:text-red-300">
            {productsError}
          </p>
        )}

        <div className="mt-8 overflow-hidden rounded-md border border-black/10 bg-white shadow-xl shadow-black/5 dark:border-white/10 dark:bg-[#151515]">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead className="bg-black/[0.03] text-xs uppercase text-black/45 dark:bg-white/[0.04] dark:text-white/45">
              <tr>
                <th className="px-5 py-4">Image</th>
                <th className="px-5 py-4">Title</th>
                <th className="px-5 py-4">Price</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10 dark:divide-white/10">
              {productsLoading && (
                <tr>
                  <td className="px-5 py-8 text-center" colSpan={4}>
                    <Loader2 className="mx-auto animate-spin text-[#FF4F00]" size={28} aria-hidden />
                  </td>
                </tr>
              )}
              {!productsLoading &&
                sortedProducts.map((product) => (
                  <tr className="transition hover:bg-black/[0.025] dark:hover:bg-white/[0.04]" key={product.$id}>
                    <td className="px-5 py-4">
                      <div className="relative size-16 overflow-hidden rounded-md border border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5">
                        <Image
                          alt={productTitle(product)}
                          className="object-cover"
                          fill
                          sizes="64px"
                          src={getProductImageUrl(product.image_id)}
                          unoptimized
                        />
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-black">{productTitle(product)}</p>
                      <p className="mt-1 text-xs text-black/45 dark:text-white/45">
                        {[product.category, product.subcategory].filter(Boolean).join(" / ")}
                      </p>
                    </td>
                    <td className="px-5 py-4 font-bold">{Number(product.price).toLocaleString("ru-RU")} KGS</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          aria-label="Edit product"
                          className="grid size-10 place-items-center rounded-md border border-black/10 text-black/65 transition hover:border-[#FF4F00] hover:text-[#FF4F00] dark:border-white/10 dark:text-white/70"
                          onClick={() => openEditModal(product)}
                          type="button"
                        >
                          <Pencil size={17} aria-hidden />
                        </button>
                        <button
                          aria-label="Delete product"
                          className="grid size-10 place-items-center rounded-md border border-red-500/20 text-red-500 transition hover:bg-red-500 hover:text-white"
                          disabled={deletingId === product.$id}
                          onClick={() => handleDeleteProduct(product)}
                          type="button"
                        >
                          {deletingId === product.$id ? (
                            <Loader2 className="animate-spin" size={17} aria-hidden />
                          ) : (
                            <Trash2 size={17} aria-hidden />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              {!productsLoading && sortedProducts.length === 0 && (
                <tr>
                  <td className="px-5 py-10 text-center text-sm text-black/50 dark:text-white/50" colSpan={4}>
                    Products collection is empty.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
          <form
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-md border border-white/10 bg-white p-6 text-[#151515] shadow-2xl dark:bg-[#151515] dark:text-white"
            onPaste={handlePaste}
            onSubmit={handleSaveProduct}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase text-[#FF4F00]">{isEditing ? "Edit" : "Create"}</p>
                <h2 className="mt-1 text-2xl font-black">{isEditing ? "Update product" : "Add product"}</h2>
              </div>
              <button
                className="grid size-10 place-items-center rounded-md border border-black/10 transition hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
                onClick={closeModal}
                type="button"
              >
                <X size={18} aria-hidden />
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold">
                Title
                <input
                  className="h-12 rounded-md border border-black/10 bg-black/5 px-4 font-normal outline-none focus:border-[#FF4F00] dark:border-white/10 dark:bg-white/5"
                  onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))}
                  required
                  value={form.title}
                />
              </label>
              <label className="grid gap-2 text-sm font-bold">
                Price
                <input
                  className="h-12 rounded-md border border-black/10 bg-black/5 px-4 font-normal outline-none focus:border-[#FF4F00] dark:border-white/10 dark:bg-white/5"
                  min={0}
                  onChange={(event) => setForm((value) => ({ ...value, price: event.target.value }))}
                  required
                  type="number"
                  value={form.price}
                />
              </label>
              <label className="grid gap-2 text-sm font-bold">
                Category
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
                Subcategory
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
                Description
                <textarea
                  className="min-h-28 resize-y rounded-md border border-black/10 bg-black/5 px-4 py-3 font-normal leading-6 outline-none transition focus:border-[#FF4F00] dark:border-white/10 dark:bg-white/5"
                  onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))}
                  placeholder="Описание товара"
                  value={form.description}
                />
              </label>
              {form.category === "Котлы" && (
                <div className="grid gap-3 text-sm font-bold md:col-span-2">
                  Доступные мощности котла
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
                </div>
              )}
              <div className="grid gap-3 text-sm font-bold md:col-span-2">
                Images
                <label
                  className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-3 rounded-md border border-dashed border-black/20 bg-black/5 px-4 text-center text-sm font-semibold text-black/55 transition hover:border-[#FF4F00] hover:text-[#FF4F00] dark:border-white/15 dark:bg-white/5 dark:text-white/55"
                  onDragOver={handleImageDragOver}
                  onDrop={handleImageDrop}
                >
                  <ImagePlus size={24} aria-hidden />
                  <span>Choose files, drop images here, or paste from clipboard</span>
                  <span className="text-xs font-semibold text-black/40 dark:text-white/40">Maximum 3 images</span>
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
                            alt="Product preview"
                            className="size-full object-cover"
                            src={image.previewUrl}
                          />
                        ) : (
                          <Image
                            alt="Product preview"
                            className="object-cover"
                            fill
                            sizes="160px"
                            src={image.previewUrl}
                            unoptimized
                          />
                        )}
                        <button
                          aria-label="Remove image"
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
                <p className="text-xs font-semibold text-black/45 dark:text-white/45">{form.images.length}/3 images</p>
              </div>
              <div className="grid gap-2 text-sm font-bold md:col-span-2">
                Specifications
                <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                  <input
                    className="h-12 rounded-md border border-black/10 bg-black/5 px-4 font-normal outline-none focus:border-[#FF4F00] dark:border-white/10 dark:bg-white/5"
                    onChange={(event) => setForm((value) => ({ ...value, specKeyInput: event.target.value }))}
                    onKeyDown={handleSpecInputKeyDown}
                    placeholder="Производитель"
                    value={form.specKeyInput}
                  />
                  <input
                    className="h-12 rounded-md border border-black/10 bg-black/5 px-4 font-normal outline-none focus:border-[#FF4F00] dark:border-white/10 dark:bg-white/5"
                    onChange={(event) => setForm((value) => ({ ...value, specValueInput: event.target.value }))}
                    onKeyDown={handleSpecInputKeyDown}
                    placeholder="Navien"
                    value={form.specValueInput}
                  />
                  <button
                    className="h-12 rounded-md bg-[#151515] px-4 text-xs font-black uppercase text-white dark:bg-white dark:text-[#151515]"
                    onClick={addSpec}
                    type="button"
                  >
                    ADD SPEC
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
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {!canUseStorage && (
              <p className="mt-4 rounded-md border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-sm font-bold text-yellow-700 dark:text-yellow-300">
                Set NEXT_PUBLIC_APPWRITE_PRODUCT_IMAGES_BUCKET_ID to enable image uploads.
              </p>
            )}

            <button
              className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#FF4F00] text-sm font-black uppercase text-white transition hover:bg-[#e64800] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saving}
              type="submit"
            >
              {saving && <Loader2 className="animate-spin" size={18} aria-hidden />}
              {saving ? "Saving..." : "Save product"}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
