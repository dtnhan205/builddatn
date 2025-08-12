"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import styles from "./add_product.module.css";
import ToastNotification from "../../user/ToastNotification/ToastNotification";

// Hàm slugify tùy chỉnh cho tiếng Việt
const slugify = (text: string): string => {
  // Bảng ánh xạ các ký tự tiếng Việt sang không dấu
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

  // Chuyển đổi ký tự tiếng Việt thành không dấu
  let slug = text
    .split('')
    .map((char) => vietnameseMap[char] || char)
    .join('')
    // Chuyển thành chữ thường
    .toLowerCase()
    // Thay thế ký tự đặc biệt và khoảng trắng bằng dấu gạch ngang
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    // Loại bỏ các dấu gạch ngang liên tiếp
    .replace(/-+/g, '-')
    // Loại bỏ dấu gạch ngang ở đầu và cuối
    .replace(/^-|-$/g, '');

  return slug || 'unnamed'; // Trả về giá trị mặc định nếu slug rỗng
};

// Định nghĩa giao diện TypeScript
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

const AddProduct = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    slug: "", // Thêm trường slug
    id_category: "",
    id_brand: "",
    short_description: "",
    description: "",
    options: [{ value: "", unit: "ml", price: "", discount_price: "", stock: "" }] as Option[],
    images: [] as File[],
  });
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

  // Kiểm tra quyền admin
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token || role !== "admin") {
      showNotification("Bạn cần quyền admin để truy cập trang này.", "error");
      router.push("/user/login");
    }
  }, [router]);

  // Lấy danh mục và thương hiệu
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

  // Event listeners cho editor để theo dõi trạng thái formatting
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

  // Hàm kiểm tra trạng thái format hiện tại
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
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
      ...(name === "name" && { slug: slugify(value) }), // Tạo slug khi tên thay đổi
    }));
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleOptionChange = (index: number, field: string, value: string) => {
    setFormData((prevState) => {
      const newOptions = [...prevState.options];
      newOptions[index] = { ...newOptions[index], [field]: value };
      return { ...prevState, options: newOptions };
    });
  };

  const addOption = () => {
    setFormData((prevState) => ({
      ...prevState,
      options: [...prevState.options, { value: "", unit: "ml", price: "", discount_price: "", stock: "" }],
    }));
  };

  const removeOption = (index: number) => {
    setFormData((prevState) => ({
      ...prevState,
      options: prevState.options.filter((_, i) => i !== index),
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (files.length + formData.images.length > 4) {
        showNotification("Chỉ được chọn tối đa 4 ảnh.", "error");
        return;
      }
      setFormData((prevState) => ({
        ...prevState,
        images: [...prevState.images, ...files],
      }));
    }
  };

  const removeImage = (index: number) => {
    setFormData((prevState) => ({
      ...prevState,
      images: prevState.images.filter((_, i) => i !== index),
    }));
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
      setFormData((prevState) => ({
        ...prevState,
        description: editorRef.current!.innerHTML,
      }));
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

  const renderToolbar = () => (
    <div className={styles.toolbar}>
      <div className={styles.toolbarGroup}>
        <select
          className={styles.toolbarSelect}
          onChange={(e) => changeFontFamily(e.target.value)}
          defaultValue=""
        >
          <option value="">Font</option>
          <option value="Arial">Arial</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Helvetica">Helvetica</option>
          <option value="Georgia">Georgia</option>
          <option value="Verdana">Verdana</option>
        </select>
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Xác thực dữ liệu
    if (!formData.name || !formData.id_category || !formData.id_brand || !formData.short_description || !formData.description) {
      showNotification("Vui lòng điền đầy đủ các trường bắt buộc.", "error");
      return;
    }
    if (formData.options.some((opt) => !opt.value || !opt.unit || !opt.price || !opt.stock)) {
      showNotification("Vui lòng điền đầy đủ thông tin cho tất cả tùy chọn.", "error");
      return;
    }
    if (formData.images.length === 0) {
      showNotification("Vui lòng chọn ít nhất một hình ảnh.", "error");
      return;
    }
    if (!formData.slug) {
      showNotification("Slug không hợp lệ. Vui lòng kiểm tra tên sản phẩm.", "error");
      return;
    }

    try {
      const productData = new FormData();
      productData.append("name", formData.name);
      productData.append("slug", formData.slug); // Thêm slug vào FormData
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
          slug: "", // Reset slug
          id_category: "",
          id_brand: "",
          short_description: "",
          description: "",
          options: [{ value: "", unit: "ml", price: "", discount_price: "", stock: "" }],
          images: [],
        });
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
                  className={styles.input}
                  required
                  placeholder="Nhập tên sản phẩm"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Slug *</label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleInputChange}
                  className={styles.input}
                  required
                  placeholder="Slug sẽ được tạo tự động"
                  readOnly // Làm trường slug chỉ đọc
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Danh mục *</label>
                <select
                  name="id_category"
                  value={formData.id_category}
                  onChange={handleSelectChange}
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
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Thương hiệu *</label>
                <select
                  name="id_brand"
                  value={formData.id_brand}
                  onChange={handleSelectChange}
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
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Mô tả ngắn *</label>
              <textarea
                name="short_description"
                value={formData.short_description}
                onChange={handleInputChange}
                className={styles.textarea}
                required
                placeholder="Nhập mô tả ngắn (tối đa 200 ký tự)"
                maxLength={200}
              />
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
                          className={styles.input}
                          required
                          min="0"
                        />
                        <select
                          value={option.unit}
                          onChange={(e) => handleOptionChange(index, "unit", e.target.value)}
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
                        className={styles.input}
                        required
                        min="0"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        placeholder="Giá khuyến mãi"
                        value={option.discount_price}
                        onChange={(e) => handleOptionChange(index, "discount_price", e.target.value)}
                        className={styles.input}
                        min="0"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        placeholder="Số lượng"
                        value={option.stock}
                        onChange={(e) => handleOptionChange(index, "stock", e.target.value)}
                        className={styles.input}
                        required
                        min="0"
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
              data-placeholder="Nhập mô tả sản phẩm chi tiết, thành phần, hướng dẫn sử dụng, đặc điểm nổi bật..."
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Hình ảnh sản phẩm (tối đa 4 ảnh) *</label>
            <div className={styles.imageUploadArea}>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className={styles.fileInput}
                id="imageInput"
              />
              <label htmlFor="imageInput" className={styles.uploadLabel}>
                <div className={styles.uploadIcon}>📷</div>
                <span>Chọn hình ảnh</span>
              </label>
            </div>
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