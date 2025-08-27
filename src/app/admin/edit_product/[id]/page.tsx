"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import styles from "./editproduct.module.css";
import ToastNotification from "../../../user/ToastNotification/ToastNotification";

// Hàm slugify tùy chỉnh cho tiếng Việt
const slugify = (text: string): string => {
  const vietnameseMap: { [key: string]: string } = {
    'á': 'a', 'à': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
    'ă': 'a', 'ắ': 'a', 'ằ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
    'â': 'a', 'ấ': 'a', 'ầ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
    'é': 'e', 'è': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
    'ê': 'e', 'ế': 'e', 'ề': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
    'í': 'i', 'ì': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
    'ó': 'o', 'ò': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
    'ô': 'o', 'ố': 'o', 'ồ': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
    'ơ': 'o', 'ớ': 'o', 'ờ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
    'ú': 'u', 'ù': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
    'ư': 'u', 'ứ': 'u', 'ừ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
    'ý': 'y', 'ỳ': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
    'đ': 'd',
    'Á': 'A', 'À': 'A', 'Ả': 'A', 'Ã': 'A', 'Ạ': 'A',
    'Ă': 'A', 'Ắ': 'A', 'Ằ': 'A', 'Ẳ': 'A', 'Ẵ': 'A', 'Ặ': 'A',
    'Â': 'A', 'Ấ': 'A', 'Ầ': 'A', 'Ẩ': 'A', 'Ẫ': 'A', 'Ậ': 'A',
    'É': 'E', 'È': 'E', 'Ẻ': 'E', 'Ẽ': 'E', 'Ẹ': 'E',
    'Ê': 'E', 'Ế': 'E', 'Ề': 'E', 'Ể': 'E', 'Ễ': 'E', 'Ệ': 'E',
    'Í': 'I', 'Ì': 'I', 'Ỉ': 'I', 'Ĩ': 'I', 'Ị': 'I',
    'Ó': 'O', 'Ò': 'O', 'Ỏ': 'O', 'Õ': 'O', 'Ọ': 'O',
    'Ô': 'O', 'Ố': 'O', 'Ồ': 'O', 'Ổ': 'O', 'Ỗ': 'O', 'Ộ': 'O',
    'Ơ': 'O', 'Ớ': 'O', 'Ờ': 'O', 'Ở': 'O', 'Ỡ': 'O', 'Ợ': 'O',
    'Ú': 'U', 'Ù': 'U', 'Ủ': 'U', 'Ũ': 'U', 'Ụ': 'U',
    'Ư': 'U', 'Ứ': 'U', 'Ừ': 'U', 'Ử': 'U', 'Ữ': 'U', 'Ự': 'U',
    'Ý': 'Y', 'Ỳ': 'Y', 'Ỷ': 'Y', 'Ỹ': 'Y', 'Ỵ': 'Y',
  };

  let slug = text
    .split('')
    .map((char) => vietnameseMap[char] || char)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return slug || 'unnamed';
};

// Hàm làm sạch HTML
const cleanHtmlContent = (html: string): string => {
  const unescapedHtml = html
    .replace(/\u003C/g, "<")
    .replace(/\u003E/g, ">")
    .replace(/\u0022/g, '"');
  const parser = new DOMParser();
  const doc = parser.parseFromString(unescapedHtml, "text/html");
  if (doc.querySelector("parsererror")) {
    console.error("Invalid HTML content:", unescapedHtml);
    return "<p>Mô tả không hợp lệ. Vui lòng chỉnh sửa lại.</p>";
  }
  return doc.body.innerHTML;
};

interface Option {
  value: string;
  unit: "ml" | "g";
  price: string;
  discount_price: string;
  stock: string;
}

interface Product {
  _id: string;
  name: string;
  slug: string;
  status: "show" | "hidden";
  view: number;
  id_brand: string | { _id: string; name?: string };
  id_category: string | { _id: string; name?: string };
  images: string[];
  short_description: string;
  description: string;
  option: { value: string; price: number; stock: number; discount_price?: number }[];
}

interface Category {
  _id: string;
  name: string;
  status: string;
}

interface Brand {
  _id: string;
  name: string;
  status: "show" | "hidden";
}

interface Notification {
  show: boolean;
  message: string;
  type: "success" | "error";
}

interface ActiveFormats {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikeThrough: boolean;
  insertUnorderedList: boolean;
  insertOrderedList: boolean;
}

interface Errors {
  name?: string;
  slug?: string;
  id_category?: string;
  id_brand?: string;
  short_description?: string;
  description?: string;
  options?: string;
  images?: string;
}

const EditProduct = () => {
  const router = useRouter();
  const { id: slug } = useParams();
  const editorRef = useRef<HTMLDivElement>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [notification, setNotification] = useState<Notification>({ show: false, message: "", type: "success" });
  const [activeFormats, setActiveFormats] = useState<ActiveFormats>({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
    insertUnorderedList: false,
    insertOrderedList: false,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    status: "show" as "show" | "hidden",
    id_category: "",
    id_brand: "",
    short_description: "",
    description: "<p>Nhập mô tả sản phẩm...</p>",
    option: [{ value: "", unit: "ml", price: "", discount_price: "", stock: "" }] as Option[],
    images: [] as File[],
  });

  const normalizeImageUrl = (path: string): string => {
    if (path.startsWith("http")) return path;
    return `https://api-zeal.onrender.com${path.startsWith("/") ? "" : "/"}${path}`;
  };
  const fallbackImage = "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg";

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token || role !== "admin") {
      router.push("/user/login");
    }
  }, [router]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleSelectionChange = () => {
      updateFormatStates();
    };

    const handleKeyUp = () => {
      updateFormatStates();
    };

    const handleMouseUp = () => {
      updateFormatStates();
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    editor.addEventListener("keyup", handleKeyUp);
    editor.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      if (editor) {
        editor.removeEventListener("keyup", handleKeyUp);
        editor.removeEventListener("mouseup", handleMouseUp);
      }
    };
  }, []);

  const updateFormatStates = () => {
    if (!editorRef.current) return;

    const newStates: ActiveFormats = {
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      strikeThrough: document.queryCommandState("strikeThrough"),
      insertUnorderedList: document.queryCommandState("insertUnorderedList"),
      insertOrderedList: document.queryCommandState("insertOrderedList"),
    };

    setActiveFormats(newStates);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("No token found");
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const productResponse = await fetch(`https://api-zeal.onrender.com/api/products/${slug}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
          cache: "no-store",
        });
        clearTimeout(timeoutId);

        if (productResponse.status === 401 || productResponse.status === 403) {
          throw new Error("Phiên đăng nhập hết hạn");
        }
        if (!productResponse.ok) {
          throw new Error("Không thể tải thông tin sản phẩm");
        }
        const productData: Product = await productResponse.json();
        console.log("API Response:", productData);
        console.log("Description:", productData.description);

        const categoriesResponse = await fetch("https://api-zeal.onrender.com/api/categories", {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
          cache: "no-store",
        });
        if (!categoriesResponse.ok) throw new Error("Không thể tải danh mục");
        const categoriesData: Category[] = await categoriesResponse.json();

        const brandsResponse = await fetch("https://api-zeal.onrender.com/api/brands", {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
          cache: "no-store",
        });
        if (!brandsResponse.ok) throw new Error("Không thể tải thương hiệu");
        const brandsData: Brand[] = await brandsResponse.json();

        const options: Option[] =
          productData.option && productData.option.length > 0
            ? productData.option.map((opt) => {
                const match = opt.value.match(/^(\d+)(ml|g)$/);
                const unit = match?.[2] === "ml" || match?.[2] === "g" ? match[2] : "ml";
                return {
                  value: match ? match[1] : opt.value,
                  unit,
                  price: opt.price.toString(),
                  discount_price: opt.discount_price ? opt.discount_price.toString() : "",
                  stock: opt.stock.toString(),
                };
              })
            : [{ value: "", unit: "ml", price: "", discount_price: "", stock: "" }];

        const cleanedDescription = productData.description
          ? cleanHtmlContent(productData.description)
          : "<p>Nhập mô tả sản phẩm...</p>";

        setCategories(categoriesData);
        setBrands(brandsData);
        setFormData({
          name: productData.name || "",
          slug: productData.slug || "",
          status: productData.status || "show",
          id_category: typeof productData.id_category === "string" ? productData.id_category : productData.id_category?._id || "",
          id_brand: typeof productData.id_brand === "string" ? productData.id_brand : productData.id_brand?._id || "",
          short_description: productData.short_description || "",
          description: cleanedDescription,
          option: options,
          images: [],
        });
        setExistingImages(productData.images || []);

      } catch (error) {
        const errorMessage =
          error instanceof Error && error.name === "AbortError"
            ? "Yêu cầu tải dữ liệu đã quá thời gian chờ (30 giây). Vui lòng thử lại."
            : error instanceof Error
            ? error.message === "Phiên đăng nhập hết hạn"
              ? "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!"
              : "Không thể tải thông tin sản phẩm hoặc danh mục/thương hiệu"
            : "Đã xảy ra lỗi không xác định";
        showNotification(errorMessage, "error");
        if (error instanceof Error && error.message === "Phiên đăng nhập hết hạn") {
          localStorage.removeItem("token");
          localStorage.removeItem("role");
          localStorage.removeItem("email");
          router.push("/user/login");
        }
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchData();
    }
  }, [slug, router]);

  useEffect(() => {
    const setDescription = () => {
      if (editorRef.current && formData.description) {
        console.log("Assigning description to editor:", formData.description);
        editorRef.current.innerHTML = formData.description;
      }
    };
    setDescription();
    const timer = setTimeout(setDescription, 100);
    return () => clearTimeout(timer);
  }, [formData.description]);

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: "", type: "success" });
    }, 3000);
  };

  const validateName = (name: string): string => {
    if (!name) return "Tên sản phẩm không được để trống.";
    return "";
  };

  const validateSlug = (slug: string): string => {
    if (!slug || slug === "unnamed") return "Slug không hợp lệ.";
    return "";
  };

  const validateCategory = (id_category: string): string => {
    if (!id_category) return "Vui lòng chọn danh mục.";
    const category = categories.find((cat) => cat._id === id_category);
    if (!category || category.status === "hidden") return "Danh mục không hợp lệ hoặc đã bị ẩn.";
    return "";
  };

  const validateBrand = (id_brand: string): string => {
    if (!id_brand) return "Vui lòng chọn thương hiệu.";
    const brand = brands.find((b) => b._id === id_brand);
    if (!brand || brand.status === "hidden") return "Thương hiệu không hợp lệ hoặc đã bị ẩn.";
    return "";
  };

  const validateShortDescription = (short_description: string): string => {
    const trimmedDesc = short_description.trim();
    if (!trimmedDesc) return "Mô tả ngắn không được để trống.";
    if (/\s{2,}/.test(trimmedDesc)) return "Mô tả ngắn không được chứa nhiều dấu cách liên tiếp.";
    return "";
  };

  const validateDescription = (description: string): string => {
    if (!description.trim() || description === "<p><br></p>" || description === "<p>Nhập mô tả sản phẩm...</p>")
      return "Mô tả chi tiết không được để trống.";
    return "";
  };

  const validateOptions = (options: Option[]): string => {
    if (options.length === 0) return "Phải có ít nhất một tùy chọn sản phẩm.";

    const sizeUnitSet = new Set<string>();
    const firstUnit = options[0].unit;

    for (let i = 0; i < options.length; i++) {
      const opt = options[i];

      if (opt.unit !== firstUnit) {
        return `Tùy chọn ${i + 1}: Đơn vị phải giống với tùy chọn đầu tiên (${firstUnit}).`;
      }

      if (!opt.value.trim()) return `Tùy chọn ${i + 1}: Kích thước không được để trống.`;
      const valueNum = parseFloat(opt.value);
      if (isNaN(valueNum) || valueNum <= 0) return `Tùy chọn ${i + 1}: Kích thước phải là số lớn hơn 0.`;
      if (!opt.unit) return `Tùy chọn ${i + 1}: Đơn vị không được để trống.`;

      const sizeUnit = `${opt.value}${opt.unit}`;
      if (sizeUnitSet.has(sizeUnit)) return `Tùy chọn ${i + 1}: Kích thước đã tồn tại.`;
      sizeUnitSet.add(sizeUnit);

      if (!opt.price.trim()) return `Tùy chọn ${i + 1}: Giá gốc không được để trống.`;
      const priceNum = parseFloat(opt.price);
      if (isNaN(priceNum) || priceNum <= 0) return `Tùy chọn ${i + 1}: Giá gốc phải là số lớn hơn 0.`;

      if (opt.discount_price) {
        const discountNum = parseFloat(opt.discount_price);
        if (isNaN(discountNum) || discountNum < 0) return `Tùy chọn ${i + 1}: Giá khuyến mãi không được âm.`;
        if (discountNum >= priceNum) return `Tùy chọn ${i + 1}: Giá khuyến mãi phải nhỏ hơn giá gốc.`;
      }

      if (!opt.stock.trim()) return `Tùy chọn ${i + 1}: Số lượng không được để trống.`;
      const stockNum = parseFloat(opt.stock);
      if (isNaN(stockNum) || stockNum < 0) return `Tùy chọn ${i + 1}: Số lượng không được âm.`;
      if (!Number.isInteger(stockNum)) return `Tùy chọn ${i + 1}: Số lượng phải là số nguyên.`;
    }
    return "";
  };

  const validateImages = (images: File[], existingImages: string[]): string => {
    if (images.length + existingImages.length === 0) return "Vui lòng chọn ít nhất một hình ảnh.";
    if (images.length + existingImages.length > 4) return "Tổng số ảnh không được vượt quá 4 ảnh.";
    return "";
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const trimmedValue = name === "short_description" ? value.trim() : value;
    setFormData((prev) => ({
      ...prev,
      [name]: trimmedValue,
      ...(name === "name" && { slug: slugify(trimmedValue) }),
    }));
    setErrors((prevErrors) => ({
      ...prevErrors,
      [name as keyof Errors]:
        name === "name"
          ? validateName(trimmedValue)
          : name === "id_category"
          ? validateCategory(trimmedValue)
          : name === "id_brand"
          ? validateBrand(trimmedValue)
          : name === "short_description"
          ? validateShortDescription(trimmedValue)
          : prevErrors[name as keyof Errors],
      ...(name === "name" && { slug: validateSlug(slugify(trimmedValue)) }),
    }));
  };

  const handleOptionChange = (index: number, field: string, value: string) => {
    setFormData((prev) => {
      const newOptions = [...prev.option];
      newOptions[index] = { ...newOptions[index], [field]: value };
      return { ...prev, option: newOptions };
    });
    setErrors((prevErrors) => ({ ...prevErrors, options: validateOptions(formData.option) }));
  };

  const addOption = () => {
    setFormData((prev) => ({
      ...prev,
      option: [...prev.option, { value: "", unit: prev.option[0]?.unit || "ml", price: "", discount_price: "", stock: "" }],
    }));
  };

  const removeOption = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      option: prev.option.filter((_, i) => i !== index),
    }));
    setErrors((prevErrors) => ({ ...prevErrors, options: validateOptions(formData.option) }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const totalImages = files.length + formData.images.length + existingImages.length;
      if (totalImages > 4) {
        showNotification("Tổng số ảnh không được vượt quá 4 ảnh", "error");
        return;
      }
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...files],
      }));
      setErrors((prevErrors) => ({ ...prevErrors, images: validateImages([...formData.images, ...files], existingImages) }));
    }
  };

  const removeExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
    setErrors((prevErrors) => ({ ...prevErrors, images: validateImages(formData.images, existingImages.filter((_, i) => i !== index)) }));
  };

  const removeNewImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
    setErrors((prevErrors) => ({ ...prevErrors, images: validateImages(formData.images.filter((_, i) => i !== index), existingImages) }));
  };

  const execCommand = (command: string, value?: string) => {
    if (editorRef.current) {
      const isActive = document.queryCommandState(command);
      if (isActive && !value) {
        document.execCommand(command, false, undefined);
      } else {
        document.execCommand(command, false, value);
      }
      editorRef.current.focus();
      setTimeout(updateFormatStates, 10);
    }
  };

  const insertList = (type: "ul" | "ol") => {
    const command = `insert${type === "ul" ? "UnorderedList" : "OrderedList"}`;
    if (editorRef.current) {
      const isActive = document.queryCommandState(command);
      if (isActive) {
        document.execCommand("formatBlock", false, "p");
      } else {
        document.execCommand(command, false, undefined);
      }
      editorRef.current.focus();
      setTimeout(updateFormatStates, 10);
    }
  };

  const changeFontSize = (size: string) => {
    if (editorRef.current && size) {
      const currentSize = document.queryCommandValue("fontSize");
      if (currentSize === size) {
        document.execCommand("fontSize", false, "3");
      } else {
        document.execCommand("fontSize", false, size);
      }
      editorRef.current.focus();
      setTimeout(updateFormatStates, 10);
    }
  };

  const changeFontFamily = (font: string) => {
    if (editorRef.current && font) {
      const currentFont = document.queryCommandValue("fontName").replace(/"/g, "");
      if (currentFont.toLowerCase().includes(font.toLowerCase())) {
        document.execCommand("fontName", false, "Arial");
      } else {
        document.execCommand("fontName", false, font);
      }
      editorRef.current.focus();
      setTimeout(updateFormatStates, 10);
    }
  };

  const insertHeading = (level: string) => {
    if (editorRef.current && level) {
      const currentBlock = document.queryCommandValue("formatBlock").toLowerCase();
      if (currentBlock === `h${level}`) {
        document.execCommand("formatBlock", false, "p");
      } else {
        document.execCommand("formatBlock", false, `h${level}`);
      }
      editorRef.current.focus();
      setTimeout(updateFormatStates, 10);
    }
  };

  const handleDescriptionChange = () => {
    if (editorRef.current) {
      const description = cleanHtmlContent(editorRef.current.innerHTML);
      setFormData((prev) => ({
        ...prev,
        description,
      }));
      setErrors((prevErrors) => ({ ...prevErrors, description: validateDescription(description) }));
    }
    updateFormatStates();
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const trimmedValue = name === "short_description" ? value.trim() : value;
    if (name === "name") {
      setErrors((prevErrors) => ({
        ...prevErrors,
        name: validateName(trimmedValue),
        slug: validateSlug(slugify(trimmedValue)),
      }));
    } else {
      setErrors((prevErrors) => ({
        ...prevErrors,
        [name as keyof Errors]:
          name === "id_category"
            ? validateCategory(trimmedValue)
            : name === "id_brand"
            ? validateBrand(trimmedValue)
            : name === "short_description"
            ? validateShortDescription(trimmedValue)
            : prevErrors[name as keyof Errors],
      }));
    }
  };

  const handleOptionBlur = (index: number, field: string) => {
    setErrors((prevErrors) => ({ ...prevErrors, options: validateOptions(formData.option) }));
  };

  const handleImageBlur = () => {
    setErrors((prevErrors) => ({ ...prevErrors, images: validateImages(formData.images, existingImages) }));
  };

  const handleDescriptionBlur = () => {
    setErrors((prevErrors) => ({
      ...prevErrors,
      description: validateDescription(formData.description),
    }));
  };

  const validateForm = (): Errors => {
    return {
      name: validateName(formData.name),
      slug: validateSlug(formData.slug),
      id_category: validateCategory(formData.id_category),
      id_brand: validateBrand(formData.id_brand),
      short_description: validateShortDescription(formData.short_description),
      description: validateDescription(formData.description),
      options: validateOptions(formData.option),
      images: validateImages(formData.images, existingImages),
    };
  };

  const renderToolbar = () => (
    <div className={styles.toolbar}>
      <div className={styles.toolbarGroup}>
        <select
          className={styles.toolbarSelect}
          onChange={(e) => changeFontSize(e.target.value)}
          value={document.queryCommandValue("fontSize") || ""}
        >
          <option value="">Size</option>
          <option value="1">8pt</option>
          <option value="2">10pt</option>
          <option value="3">12pt</option>
          <option value="4">14pt</option>
          <option value="5">18pt</option>
          <option value="6">24pt</option>
          <option value="7">36pt</option>
        </select>
        <select
          className={styles.toolbarSelect}
          onChange={(e) => insertHeading(e.target.value)}
          value={document.queryCommandValue("formatBlock").toLowerCase().replace('h', '') || ""}
        >
          <option value="">Heading</option>
          <option value="1">H1</option>
          <option value="2">H2</option>
          <option value="3">H3</option>
          <option value="4">H4</option>
          <option value="5">H5</option>
          <option value="6">H6</option>
        </select>
      </div>
      <div className={styles.toolbarGroup}>
        <button
          type="button"
          className={`${styles.toolbarBtn} ${activeFormats.bold ? styles.active : ""}`}
          onClick={() => execCommand("bold")}
          title="Đậm"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          className={`${styles.toolbarBtn} ${activeFormats.italic ? styles.active : ""}`}
          onClick={() => execCommand("italic")}
          title="Nghiêng"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          className={`${styles.toolbarBtn} ${activeFormats.underline ? styles.active : ""}`}
          onClick={() => execCommand("underline")}
          title="Gạch chân"
        >
          <u>U</u>
        </button>
        <button
          type="button"
          className={`${styles.toolbarBtn} ${activeFormats.strikeThrough ? styles.active : ""}`}
          onClick={() => execCommand("strikeThrough")}
          title="Gạch ngang"
        >
          <s>S</s>
        </button>
      </div>
      <div className={styles.toolbarGroup}>
        <button
          type="button"
          className={`${styles.toolbarBtn} ${activeFormats.insertUnorderedList ? styles.active : ""}`}
          onClick={() => insertList("ul")}
          title="Danh sách không đánh số"
        >
          • List
        </button>
        <button
          type="button"
          className={`${styles.toolbarBtn} ${activeFormats.insertOrderedList ? styles.active : ""}`}
          onClick={() => insertList("ol")}
          title="Danh sách đánh số"
        >
          1. List
        </button>
      </div>
    </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateForm();
    setErrors(validationErrors);

    if (Object.values(validationErrors).some((error) => error)) {
      showNotification("Vui lòng kiểm tra và sửa các lỗi trong biểu mẫu.", "error");
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const productData = new FormData();
      productData.append("name", formData.name);
      productData.append("slug", formData.slug);
      productData.append("status", formData.status);
      productData.append("id_category", formData.id_category);
      productData.append("id_brand", formData.id_brand);
      productData.append("short_description", formData.short_description);
      productData.append("description", cleanHtmlContent(formData.description));
      productData.append(
        "option",
        JSON.stringify(
          formData.option.map((opt) => ({
            value: `${opt.value}${opt.unit}`,
            price: Number(opt.price),
            discount_price: opt.discount_price ? Number(opt.discount_price) : undefined,
            stock: Number(opt.stock),
          }))
        )
      );
      formData.images.forEach((file) => {
        productData.append("images", file);
      });
      productData.append("existingImages", JSON.stringify(existingImages));

      const response = await fetch(`https://api-zeal.onrender.com/api/products/${slug}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: productData,
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error("Phiên đăng nhập hết hạn");
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Lỗi API: ${response.status} ${response.statusText}`);
      }

      showNotification("Cập nhật sản phẩm thành công", "success");
      router.push("/admin/product");
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message === "Phiên đăng nhập hết hạn"
            ? "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!"
            : error.message || "Đã xảy ra lỗi khi cập nhật sản phẩm"
          : "Đã xảy ra lỗi không xác định";
      showNotification(errorMessage, "error");
      if (error instanceof Error && error.message === "Phiên đăng nhập hết hạn") {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("email");
        router.push("/user/login");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main className={styles.mainContainer}>
        <div className={styles.contentWrapper}>
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>Đang tải thông tin sản phẩm...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.mainContainer}>
      {notification.show && (
        <ToastNotification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification({ show: false, message: "", type: "success" })}
        />
      )}
      <div className={styles.maintitle}>
        <h1 className={styles.title}>Chỉnh sửa sản phẩm</h1>
        <button
          type="button"
          onClick={() => router.push("/admin/product")}
          className={styles.backButton}
        >
          ← Quay lại
        </button>
      </div>
      <div className={styles.contentWrapper}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.basicInfo}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Tên sản phẩm *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                  className={styles.input}
                  required
                  placeholder="Nhập tên sản phẩm"
                />
                {errors.name && <span className={styles.error}>{errors.name}</span>}
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Danh mục *</label>
                <select
                  name="id_category"
                  value={formData.id_category}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                  className={styles.select}
                  required
                >
                  <option value="">-- Chọn danh mục --</option>
                  {categories
                    .filter((cat) => cat.status !== "hidden")
                    .map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
                {errors.id_category && <span className={styles.error}>{errors.id_category}</span>}
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Thương hiệu *</label>
                <select
                  name="id_brand"
                  value={formData.id_brand}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                  className={styles.select}
                  required
                >
                  <option value="">-- Chọn thương hiệu --</option>
                  {brands
                    .filter((brand) => brand.status !== "hidden")
                    .map((brand) => (
                      <option key={brand._id} value={brand._id}>
                        {brand.name}
                      </option>
                    ))}
                </select>
                {errors.id_brand && <span className={styles.error}>{errors.id_brand}</span>}
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Trạng thái *</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className={styles.select}
                  required
                >
                  <option value="show">Hiển thị</option>
                  <option value="hidden">Ẩn</option>
                </select>
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Mô tả ngắn *</label>
              <textarea
                name="short_description"
                value={formData.short_description}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                className={styles.textarea}
                required
                placeholder="Nhập mô tả ngắn (tối đa 200 ký tự)"
                maxLength={200}
              />
              {errors.short_description && <span className={styles.error}>{errors.short_description}</span>}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Tùy chọn sản phẩm *</label>
            <table className={styles.optionsTable}>
              <thead>
                <tr>
                  <th>Kích thước</th>
                  <th>Giá gốc</th>
                  <th>Giá khuyến mãi</th>
                  <th>Số lượng</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {formData.option.map((option, index) => (
                  <tr key={index} className={styles.optionRow}>
                    <td className={styles.sizeColumn}>
                      <div className={styles.sizeInputGroup}>
                        <input
                          type="number"
                          placeholder="e.g., 50"
                          value={option.value}
                          onChange={(e) => handleOptionChange(index, "value", e.target.value)}
                          onBlur={() => handleOptionBlur(index, "value")}
                          className={styles.input}
                          required
                          min="0"
                          step="0.01"
                        />
                        <select
                          value={option.unit}
                          onChange={(e) => handleOptionChange(index, "unit", e.target.value)}
                          onBlur={() => handleOptionBlur(index, "unit")}
                          className={styles.unitSelect}
                          required
                        >
                          <option value="ml">ml</option>
                          <option value="g">g</option>
                        </select>
                      </div>
                    </td>
                    <td>
                      <input
                        type="number"
                        placeholder="Giá gốc"
                        value={option.price}
                        onChange={(e) => handleOptionChange(index, "price", e.target.value)}
                        onBlur={() => handleOptionBlur(index, "price")}
                        className={styles.input}
                        required
                        min="0"
                        step="0.01"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        placeholder="Giá khuyến mãi"
                        value={option.discount_price}
                        onChange={(e) => handleOptionChange(index, "discount_price", e.target.value)}
                        onBlur={() => handleOptionBlur(index, "discount_price")}
                        className={styles.input}
                        min="0"
                        step="0.01"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        placeholder="Số lượng"
                        value={option.stock}
                        onChange={(e) => handleOptionChange(index, "stock", e.target.value)}
                        onBlur={() => handleOptionBlur(index, "stock")}
                        className={styles.input}
                        required
                        min="0"
                        step="1"
                      />
                    </td>
                    <td>
                      {formData.option.length > 1 && (
                        <button type="button" className={styles.removeBtn} onClick={() => removeOption(index)}>
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {errors.options && <span className={styles.error}>{errors.options}</span>}
            <button type="button" className={styles.addOptionBtn} onClick={addOption}>
              Thêm tùy chọn +
            </button>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Mô tả chi tiết *</label>
            {renderToolbar()}
            <div
              ref={editorRef}
              className={styles.editor}
              contentEditable
              onInput={handleDescriptionChange}
              onBlur={handleDescriptionBlur}
              data-placeholder="Nhập mô tả sản phẩm chi tiết, thành phần, hướng dẫn sử dụng, đặc điểm nổi bật..."
            />
            {errors.description && <span className={styles.error}>{errors.description}</span>}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Hình ảnh sản phẩm (tối đa 4 ảnh) *</label>
            {existingImages.length > 0 && (
              <div className={styles.imageSection}>
                <h4 className={styles.sectionTitle}>Ảnh hiện tại:</h4>
                <div className={styles.imagePreview}>
                  {existingImages.map((img, idx) => (
                    <div key={idx} className={styles.imageItem}>
                      <img
                        src={normalizeImageUrl(img)}
                        alt={`Ảnh ${idx + 1}`}
                        width={100}
                        height={100}
                        className={styles.previewImage}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = fallbackImage;
                        }}
                      />
                      <div className={styles.imageInfo}>
                        <span className={styles.imageName}>Ảnh {idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeExistingImage(idx)}
                          className={styles.removeBtn}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className={styles.imageUploadArea}>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                onBlur={handleImageBlur}
                className={styles.fileInput}
                id="imageInput"
                disabled={existingImages.length + formData.images.length >= 4}
              />
              <label
                htmlFor="imageInput"
                className={`${styles.uploadLabel} ${
                  existingImages.length + formData.images.length >= 4 ? styles.disabled : ""
                }`}
              >
                <div className={styles.uploadIcon}>📷</div>
                <span>
                  {existingImages.length + formData.images.length >= 4
                    ? "Đã đạt giới hạn 4 ảnh"
                    : "Thêm ảnh mới"}
                </span>
              </label>
            </div>
            {errors.images && <span className={styles.error}>{errors.images}</span>}
            {formData.images.length > 0 && (
              <div className={styles.imageSection}>
                <h4 className={styles.sectionTitle}>Ảnh mới sẽ thêm:</h4>
                <div className={styles.imagePreview}>
                  {formData.images.map((img, idx) => (
                    <div key={idx} className={styles.imageItem}>
                      <Image
                        src={URL.createObjectURL(img)}
                        alt={`New Preview ${idx + 1}`}
                        width={100}
                        height={100}
                        className={styles.previewImage}
                      />
                      <div className={styles.imageInfo}>
                        <span className={styles.imageName}>{img.name}</span>
                        <button
                          type="button"
                          onClick={() => removeNewImage(idx)}
                          className={styles.removeBtn}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className={styles.buttonGroup}>
            <button
              type="button"
              onClick={() => router.push("/admin/product")}
              className={styles.cancelButton}
            >
              Hủy
            </button>
            <button type="submit" className={styles.submitButton} disabled={loading}>
              <span>✓</span> Cập nhật sản phẩm
            </button>
          </div>
        </form>
      </div>
    </main>
  );
};

export default EditProduct;