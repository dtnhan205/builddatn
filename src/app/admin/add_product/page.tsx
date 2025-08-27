"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import styles from "./add_product.module.css";
import ToastNotification from "../../user/ToastNotification/ToastNotification";

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

interface Category {
  status: string;
  _id: string;
  name: string;
}

interface Brand {
  _id: string;
  name: string;
  status: "show" | "hidden";
}

interface Option {
  value: string;
  unit: "ml" | "g";
  price: string;
  discount_price: string;
  stock: string;
}

interface ActiveFormats {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikeThrough: boolean;
  justifyLeft: boolean;
  justifyCenter: boolean;
  justifyRight: boolean;
  justifyFull: boolean;
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

const AddProduct = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    id_category: "",
    id_brand: "",
    short_description: "",
    description: "",
    options: [{ value: "", unit: "ml", price: "", discount_price: "", stock: "" }] as Option[],
    images: [] as File[],
  });
  const [errors, setErrors] = useState<Errors>({});
  const [activeFormats, setActiveFormats] = useState<ActiveFormats>({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
    justifyLeft: false,
    justifyCenter: false,
    justifyRight: false,
    justifyFull: false,
    insertUnorderedList: false,
    insertOrderedList: false,
  });
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "success" as "success" | "error",
  });

  const editorRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ show: true, message, type });
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token || role !== "admin") {
      showNotification("Bạn cần quyền admin để truy cập trang này.", "error");
      router.push("/user/login");
    }
  }, [router]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("https://api-zeal.onrender.com/api/categories", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (response.status === 401 || response.status === 403) {
          showNotification("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!", "error");
          localStorage.removeItem("token");
          localStorage.removeItem("role");
          localStorage.removeItem("email");
          router.push("/user/login");
          return;
        }
        if (!response.ok) throw new Error(`Lỗi API: ${response.status}`);
        const data: Category[] = await response.json();
        setCategories(data);
      } catch (error) {
        console.error("Lỗi khi tải danh mục:", error);
        showNotification("Không thể tải danh mục", "error");
      }
    };

    const fetchBrands = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("https://api-zeal.onrender.com/api/brands", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (response.status === 401 || response.status === 403) {
          showNotification("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!", "error");
          localStorage.removeItem("token");
          localStorage.removeItem("role");
          localStorage.removeItem("email");
          router.push("/user/login");
          return;
        }
        if (!response.ok) throw new Error(`Lỗi API: ${response.status}`);
        const data: Brand[] = await response.json();
        setBrands(data);
      } catch (error) {
        console.error("Lỗi khi tải thương hiệu:", error);
        showNotification("Không thể tải thương hiệu", "error");
      }
    };

    fetchCategories();
    fetchBrands();
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
      justifyLeft: document.queryCommandState("justifyLeft"),
      justifyCenter: document.queryCommandState("justifyCenter"),
      justifyRight: document.queryCommandState("justifyRight"),
      justifyFull: document.queryCommandState("justifyFull"),
      insertUnorderedList: document.queryCommandState("insertUnorderedList"),
      insertOrderedList: document.queryCommandState("insertOrderedList"),
    };

    setActiveFormats(newStates);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const trimmedValue = (name === "name" || name === "short_description") ? value.trim() : value;
    setFormData((prevState) => ({
      ...prevState,
      [name]: trimmedValue,
      ...(name === "name" && { slug: slugify(trimmedValue) }),
    }));
    setErrors((prevErrors) => ({
      ...prevErrors,
      [name]: name === "name" ? (trimmedValue ? "" : "Tên sản phẩm không được để trống.") : validateShortDescription(trimmedValue),
      ...(name === "name" && { slug: slugify(trimmedValue) && slugify(trimmedValue) !== "unnamed" ? "" : "Slug không hợp lệ." }),
    }));
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
    setErrors((prevErrors) => ({
      ...prevErrors,
      [name]: name === "id_category" ? validateCategory(value) : validateBrand(value),
    }));
  };

  const handleOptionChange = (index: number, field: string, value: string) => {
    setFormData((prevState) => {
      const newOptions = [...prevState.options];
      newOptions[index] = { ...newOptions[index], [field]: value };
      return { ...prevState, options: newOptions };
    });
    setErrors((prevErrors) => ({ ...prevErrors, options: validateOptions(formData.options) }));
  };

  const addOption = () => {
    setFormData((prevState) => ({
      ...prevState,
      options: [...prevState.options, { value: "", unit: prevState.options[0]?.unit || "ml", price: "", discount_price: "", stock: "" }],
    }));
  };

  const removeOption = (index: number) => {
    const newOptions = formData.options.filter((_, i) => i !== index);
    setFormData((prevState) => ({
      ...prevState,
      options: newOptions,
    }));
    setErrors((prevErrors) => ({ ...prevErrors, options: validateOptions(newOptions) }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newImages = [...formData.images, ...files];
      setFormData((prevState) => ({
        ...prevState,
        images: newImages,
      }));
      setErrors((prevErrors) => ({ ...prevErrors, images: validateImages(newImages) }));
    }
  };

  const removeImage = (index: number) => {
    const newImages = formData.images.filter((_, i) => i !== index);
    setFormData((prevState) => ({
      ...prevState,
      images: newImages,
    }));
    setErrors((prevErrors) => ({ ...prevErrors, images: validateImages(newImages) }));
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
    setTimeout(updateFormatStates, 10);
  };

  const handleDescriptionChange = () => {
    if (editorRef.current) {
      const description = editorRef.current.innerHTML;
      setFormData((prevState) => ({
        ...prevState,
        description,
      }));
      setErrors((prevErrors) => ({ ...prevErrors, description: validateDescription(description) }));
    }
    updateFormatStates();
  };

  const insertList = (type: "ul" | "ol") => {
    execCommand(`insert${type === "ul" ? "UnorderedList" : "OrderedList"}`);
  };

  const changeFontSize = (size: string) => {
    if (size) {
      execCommand("fontSize", size);
    }
  };

  const changeFontFamily = (font: string) => {
    if (font) {
      execCommand("fontName", font);
    }
  };

  const insertHeading = (level: string) => {
    if (level) {
      execCommand("formatBlock", `<h${level}>`);
    }
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
    if (!description.trim() || description === "<p><br></p>") return "Mô tả chi tiết không được để trống.";
    return "";
  };

  const validateOptions = (options: Option[]): string => {
    if (options.length === 0) return "Phải có ít nhất một tùy chọn sản phẩm.";

    const sizeUnitSet = new Set<string>();
    const firstUnit = options[0].unit; // Lấy đơn vị của tùy chọn đầu tiên

    for (let i = 0; i < options.length; i++) {
      const opt = options[i];

      // Kiểm tra đơn vị có khớp với đơn vị của tùy chọn đầu tiên không
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

  const validateImages = (images: File[]): string => {
    if (images.length === 0) return "Vui lòng chọn ít nhất một hình ảnh.";
    return "";
  };

  const handleInputBlur = async (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "name") {
      const nameError = value.trim() ? "" : "Tên sản phẩm không được để trống.";
      const slugError = slugify(value.trim()) && slugify(value.trim()) !== "unnamed" ? "" : "Slug không hợp lệ.";
      setErrors((prevErrors) => ({
        ...prevErrors,
        name: nameError,
        slug: slugError,
      }));
    } else if (name === "id_category") {
      setErrors((prevErrors) => ({
        ...prevErrors,
        id_category: validateCategory(value),
      }));
    } else if (name === "id_brand") {
      setErrors((prevErrors) => ({
        ...prevErrors,
        id_brand: validateBrand(value),
      }));
    } else if (name === "short_description") {
      setErrors((prevErrors) => ({
        ...prevErrors,
        short_description: validateShortDescription(value),
      }));
    }
  };

  const handleDescriptionBlur = () => {
    setErrors((prevErrors) => ({
      ...prevErrors,
      description: validateDescription(formData.description),
    }));
  };

  const handleOptionBlur = (index: number, field: string) => {
    setErrors((prevErrors) => ({ ...prevErrors, options: validateOptions(formData.options) }));
  };

  const handleImageBlur = () => {
    setErrors((prevErrors) => ({
      ...prevErrors,
      images: validateImages(formData.images),
    }));
  };

  const validateForm = (): Errors => {
    return {
      name: formData.name.trim() ? "" : "Tên sản phẩm không được để trống.",
      slug: formData.slug && formData.slug !== "unnamed" ? "" : "Slug không hợp lệ.",
      id_category: validateCategory(formData.id_category),
      id_brand: validateBrand(formData.id_brand),
      short_description: validateShortDescription(formData.short_description),
      description: validateDescription(formData.description),
      options: validateOptions(formData.options),
      images: validateImages(formData.images),
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateForm();
    setErrors(validationErrors);

    if (Object.values(validationErrors).some((error) => error)) {
      showNotification("Vui lòng kiểm tra và sửa các lỗi trong biểu mẫu.", "error");
      return;
    }

    try {
      const productData = new FormData();
      productData.append("name", formData.name);
      productData.append("slug", formData.slug);
      productData.append("id_category", formData.id_category);
      productData.append("id_brand", formData.id_brand);
      productData.append("short_description", formData.short_description);
      productData.append("description", formData.description);
      productData.append(
        "option",
        JSON.stringify(
          formData.options.map((opt) => ({
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

      const token = localStorage.getItem("token");
      const response = await fetch("https://api-zeal.onrender.com/api/products", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: productData,
      });

      if (response.status === 401 || response.status === 403) {
        showNotification("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!", "error");
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("email");
        router.push("/user/login");
        return;
      }

      if (response.ok) {
        showNotification("Thêm sản phẩm thành công", "success");
        setFormData({
          name: "",
          slug: "",
          id_category: "",
          id_brand: "",
          short_description: "",
          description: "",
          options: [{ value: "", unit: "ml", price: "", discount_price: "", stock: "" }],
          images: [],
        });
        setErrors({});
        if (editorRef.current) {
          editorRef.current.innerHTML = "";
        }
        setActiveFormats({
          bold: false,
          italic: false,
          underline: false,
          strikeThrough: false,
          justifyLeft: false,
          justifyCenter: false,
          justifyRight: false,
          justifyFull: false,
          insertUnorderedList: false,
          insertOrderedList: false,
        });
        router.push("/admin/product");
      } else {
        const errorData = await response.json();
        showNotification(errorData.message || "Đã xảy ra lỗi khi thêm sản phẩm.", "error");
      }
    } catch (error) {
      console.error("Lỗi gửi sản phẩm:", error);
      showNotification("Có lỗi xảy ra khi gửi sản phẩm.", "error");
    }
  };

  const renderToolbar = () => (
    <div className={styles.toolbar}>
      <div className={styles.toolbarGroup}>
        <select
          className={styles.toolbarSelect}
          onChange={(e) => changeFontSize(e.target.value)}
          defaultValue=""
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
          defaultValue=""
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
        <h1 className={styles.title}>Thêm sản phẩm</h1>
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
                {errors.slug && <span className={styles.error}>{errors.slug}</span>}
              </div>
               <div className={styles.formGroup}>
                <label className={styles.label}>Danh mục *</label>
                <select
                  name="id_category"
                  value={formData.id_category}
                  onChange={handleSelectChange}
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
             <div className={styles.formGroup}>
              <label className={styles.label}>Mô tả ngắn *</label>
              <textarea
                name="short_description"
                value={formData.short_description}
                onChange={handleInputChange}  
                onBlur={handleInputBlur}
                className={styles.textarea}
                required
                placeholder="Nhập mô tả ngắn"
              />
              {errors.short_description && <span className={styles.error}>{errors.short_description}</span>}
            </div>
            <div className={styles.formGroup}>
                <label className={styles.label}>Thương hiệu *</label>
                <select
                  name="id_brand"
                  value={formData.id_brand}
                  onChange={handleSelectChange}
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
                {formData.options.map((option, index) => (
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
                      {formData.options.length > 1 && (
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
            <label className={styles.label}>Hình ảnh sản phẩm (ít nhất 1 ảnh) *</label>
            <div className={styles.imageUploadArea}>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                onBlur={handleImageBlur}
                className={styles.fileInput}
                id="imageInput"
              />
              <label htmlFor="imageInput" className={styles.uploadLabel}>
                <div className={styles.uploadIcon}>📷</div>
                <span>Chọn hình ảnh</span>
              </label>
            </div>
            {errors.images && <span className={styles.error}>{errors.images}</span>}
            {formData.images.length > 0 && (
              <div className={styles.imagePreview}>
                {formData.images.map((img, idx) => (
                  <div key={idx} className={styles.imageItem}>
                    <Image
                      src={URL.createObjectURL(img)}
                      alt={`Preview ${idx + 1}`}
                      width={100}
                      height={100}
                      className={styles.previewImage}
                    />
                    <div className={styles.imageInfo}>
                      <span className={styles.imageName}>{img.name}</span>
                      <button type="button" onClick={() => removeImage(idx)} className={styles.removeBtn}>
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button type="submit" className={styles.submitButton}>
            <span>✓</span> Thêm sản phẩm
          </button>
        </form>
      </div>
    </main>
  );
};

export default AddProduct;