"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBold,
  faItalic,
  faUnderline,
  faListUl,
  faListOl,
  faImage,
  faLink,
  faAlignLeft,
  faAlignCenter,
  faAlignRight,
  faAlignJustify,
  faCloudUploadAlt,
} from "@fortawesome/free-solid-svg-icons";
import styles from "./edit_new.module.css";
import ToastNotification from "../../../user/ToastNotification/ToastNotification";

config.autoAddCss = false;

interface Article {
  _id: string;
  slug: string;
  title: string;
  thumbnailUrl?: string;
  status: "show" | "hidden";
  content: string;
  views: number;
}

const API_DOMAIN = "https://api-zeal.onrender.com";
const FALLBACK_IMAGE = "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg";

const generateSlug = (title: string): string => {
  console.log("Tiêu đề đầu vào:", title);
  const slug = title
    .toLowerCase()
    .replace(/đ/g, "d") // Thay "đ" thành "d"
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['",]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
  console.log("Slug đầu ra:", slug);
  return slug || "untitled";
};

const EditBlog = () => {
  const router = useRouter();
  const { id: slug } = useParams();
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).replace(/,/, "").replace(/(\d+)\/(\d+)\/(\d+)/, "$2-$1-$3");
  };

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    content: "",
    thumbnailFile: null as File | null,
    status: "show" as "show" | "hidden",
    contentImages: [] as File[],
    views: 0,
    updateTime: getCurrentTime(),
  });
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "success" as "success" | "error",
  });
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    insertUnorderedList: false,
    insertOrderedList: false,
    createLink: false,
    justifyLeft: false,
    justifyCenter: false,
    justifyRight: false,
    justifyFull: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewThumbnail, setPreviewThumbnail] = useState<string | null>(null);
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);

  const fileToDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const cleanHtmlContent = (html: string): string => {
    const unescapedHtml = html
      .replace(/\u003C/g, "<")
      .replace(/\u003E/g, ">")
      .replace(/\u0022/g, '"');
    const parser = new DOMParser();
    const doc = parser.parseFromString(unescapedHtml, "text/html");
    if (doc.querySelector("parsererror")) {
      console.error("Nội dung HTML không hợp lệ:", unescapedHtml);
      return "<p>Nội dung không hợp lệ. Vui lòng chỉnh sửa lại.</p>";
    }
    return doc.body.innerHTML;
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token || role !== "admin") {
      router.push("/user/login");
    }
  }, [router]);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        setIsSubmitting(true);
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Vui lòng đăng nhập lại.");

        const response = await fetch(`${API_DOMAIN}/api/news/${slug}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });

        if (response.status === 401 || response.status === 403) {
          console.error("Lỗi xác thực:", await response.text());
          showNotification("Phiên đăng nhập hết hạn.", "error");
          router.push("/user/login");
          return;
        }

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Lỗi API:", errorData);
          throw new Error(errorData.error || "Không thể tải bài viết.");
        }

        const article: Article = await response.json();
        console.log("Dữ liệu bài viết:", article);

        const fixedContent = cleanHtmlContent(article.content || "");
        setFormData({
          title: article.title || "",
          slug: generateSlug(article.title || ""),
          content: fixedContent,
          thumbnailFile: null,
          status: article.status || "show",
          contentImages: [],
          views: article.views || 0,
          updateTime: getCurrentTime(),
        });

        setPreviewThumbnail(article.thumbnailUrl || null);
      } catch (error: any) {
        console.error("Lỗi khi tải bài viết:", error);
        showNotification(error.message || "Lỗi khi tải bài viết.", "error");
        router.push("/admin/news");
      } finally {
        setIsSubmitting(false);
      }
    };

    if (slug) fetchArticle();
  }, [slug, router]);

  useEffect(() => {
    if (!isSubmitting && editorRef.current && formData.content) {
      console.log("Gán nội dung vào editor:", formData.content);
      editorRef.current.innerHTML = formData.content;
    }
  }, [formData.content, isSubmitting]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const updateFormatStates = () => {
      const commands = [
        "bold",
        "italic",
        "underline",
        "insertUnorderedList",
        "insertOrderedList",
        "createLink",
        "justifyLeft",
        "justifyCenter",
        "justifyRight",
        "justifyFull",
      ];
      const newStates: any = {};
      commands.forEach((cmd) => {
        newStates[cmd] = document.queryCommandState(cmd);
      });
      setActiveFormats(newStates);
    };

    document.addEventListener("selectionchange", updateFormatStates);
    editor.addEventListener("keyup", updateFormatStates);
    editor.addEventListener("mouseup", updateFormatStates);

    return () => {
      document.removeEventListener("selectionchange", updateFormatStates);
      editor.removeEventListener("keyup", updateFormatStates);
      editor.removeEventListener("mouseup", updateFormatStates);
    };
  }, []);

  const showNotification = (message: string, type: "success" | "error") => {
    let displayMessage = message;
    if (message.includes("Trùng lặp slug") || message.includes("duplicate key")) {
      displayMessage = "Slug đã tồn tại. Vui lòng thử lại với tiêu đề khác.";
    } else if (message.includes("Invalid file type")) {
      displayMessage = "Loại file không hợp lệ. Chỉ chấp nhận JPG, PNG, GIF, WebP, SVG.";
    } else if (message.includes("File too large")) {
      displayMessage = "Kích thước file quá lớn. Tối đa 20MB.";
    } else if (message.includes("Unauthorized") || message.includes("Forbidden")) {
      displayMessage = "Bạn không có quyền thực hiện thao tác này.";
      router.push("/user/login");
    }
    setNotification({ show: true, message: displayMessage, type });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newFormData = {
        ...prev,
        [name]: name === "views" ? parseInt(value) || 0 : value,
      };
      if (name === "title") {
        newFormData.slug = generateSlug(value);
      }
      return newFormData;
    });
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      const file = e.target.files[0];
      const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/gif", "image/webp", "image/svg+xml"];
      if (!allowedTypes.includes(file.type)) {
        showNotification("Chỉ chấp nhận file ảnh (JPG, PNG, GIF, WebP, SVG)", "error");
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        showNotification("Kích thước file không được vượt quá 20MB", "error");
        return;
      }
      setFormData((prev) => ({ ...prev, thumbnailFile: file }));
      setPreviewThumbnail(URL.createObjectURL(file));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length && editorRef.current) {
      const files = Array.from(e.target.files);
      const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/gif", "image/webp", "image/svg+xml"];
      const validFiles = files.filter((file) => allowedTypes.includes(file.type) && file.size <= 20 * 1024 * 1024);

      if (validFiles.length !== files.length) {
        showNotification("Một số file không hợp lệ hoặc quá lớn.", "error");
        return;
      }

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        showNotification("Vui lòng chọn vị trí để chèn ảnh.", "error");
        return;
      }

      const range = selection.getRangeAt(0);
      range.deleteContents();

      for (const file of validFiles) {
        try {
          const dataUrl = await fileToDataURL(file);
          const img = document.createElement("img");
          img.src = dataUrl;
          img.alt = "Image";
          img.className = styles.editorImage; // Thêm class để áp dụng kiểu responsive
          img.style.maxWidth = "100%";
          img.style.height = "auto";

          range.insertNode(img);
          range.insertNode(document.createTextNode(" "));
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        } catch (error) {
          console.error("Error inserting image:", error);
          showNotification("Lỗi khi chèn ảnh.", "error");
        }
      }

      setFormData((prev) => ({
        ...prev,
        content: editorRef.current!.innerHTML,
        contentImages: [...prev.contentImages, ...validFiles],
      }));
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    setTimeout(() => {
      const event = new Event("input", { bubbles: true });
      editorRef.current?.dispatchEvent(event);
    }, 10);
  };

  const insertHeading = (level: string) => {
    if (level) execCommand("formatBlock", `<h${level}>`);
  };

  const insertList = (type: "ul" | "ol") => {
    execCommand(`insert${type === "ul" ? "UnorderedList" : "OrderedList"}`);
  };

  const insertLink = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const url = prompt("Nhập URL liên kết:", "https://");
      if (url) {
        const validUrl = url.startsWith("http") ? url : `https://${url}`;
        execCommand("createLink", validUrl);
      } else {
        showNotification("URL không hợp lệ.", "error");
      }
    } else {
      showNotification("Vui lòng chọn văn bản để tạo liên kết.", "error");
    }
  };

  const changeFontSize = (size: string) => {
    execCommand("fontSize", "3");
    const fontElements = document.getElementsByTagName("font");
    for (let i = 0; i < fontElements.length; i++) {
      if (fontElements[i].size === "3") {
        fontElements[i].removeAttribute("size");
        fontElements[i].style.fontSize = size + "px";
      }
    }
  };

  const alignText = (alignment: string) => {
    const commands: { [key: string]: string } = {
      left: "justifyLeft",
      center: "justifyCenter",
      right: "justifyRight",
      justify: "justifyFull",
    };
    execCommand(commands[alignment]);
  };

  const renderToolbar = useCallback(
    () => (
      <div className={styles.toolbar}>
        <select onChange={(e) => changeFontSize(e.target.value)} defaultValue="14">
          <option value="10">10</option>
          <option value="12">12</option>
          <option value="14">14</option>
          <option value="16">16</option>
          <option value="18">18</option>
          <option value="20">20</option>
          <option value="24">24</option>
        </select>
        <div className={styles.toolbarDivider}></div>
        <button
          type="button"
          onClick={() => execCommand("bold")}
          className={activeFormats.bold ? styles.active : ""}
          title="Đậm (Ctrl+B)"
        >
          <FontAwesomeIcon icon={faBold} />
        </button>
        <button
          type="button"
          onClick={() => execCommand("italic")}
          className={activeFormats.italic ? styles.active : ""}
          title="Nghiêng (Ctrl+I)"
        >
          <FontAwesomeIcon icon={faItalic} />
        </button>
        <button
          type="button"
          onClick={() => execCommand("underline")}
          className={activeFormats.underline ? styles.active : ""}
          title="Gạch chân (Ctrl+U)"
        >
          <FontAwesomeIcon icon={faUnderline} />
        </button>
        <div className={styles.toolbarDivider}></div>
        <button
          type="button"
          onClick={() => alignText("left")}
          className={activeFormats.justifyLeft ? styles.active : ""}
          title="Căn trái"
        >
          <FontAwesomeIcon icon={faAlignLeft} />
        </button>
        <button
          type="button"
          onClick={() => alignText("center")}
          className={activeFormats.justifyCenter ? styles.active : ""}
          title="Căn giữa"
        >
          <FontAwesomeIcon icon={faAlignCenter} />
        </button>
        <button
          type="button"
          onClick={() => alignText("right")}
          className={activeFormats.justifyRight ? styles.active : ""}
          title="Căn phải"
        >
          <FontAwesomeIcon icon={faAlignRight} />
        </button>
        <button
          type="button"
          onClick={() => alignText("justify")}
          className={activeFormats.justifyFull ? styles.active : ""}
          title="Căn đều"
        >
          <FontAwesomeIcon icon={faAlignJustify} />
        </button>
        <div className={styles.toolbarDivider}></div>
        <button
          type="button"
          onClick={() => insertList("ul")}
          className={activeFormats.insertUnorderedList ? styles.active : ""}
          title="Danh sách dấu đầu dòng"
        >
          <FontAwesomeIcon icon={faListUl} />
        </button>
        <button
          type="button"
          onClick={() => insertList("ol")}
          className={activeFormats.insertOrderedList ? styles.active : ""}
          title="Danh sách số"
        >
          <FontAwesomeIcon icon={faListOl} />
        </button>
        <div className={styles.toolbarDivider}></div>
        <button
          type="button"
          onClick={insertLink}
          className={activeFormats.createLink ? styles.active : ""}
          title="Chèn liên kết"
        >
          <FontAwesomeIcon icon={faLink} />
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={styles.toolbarButton}
          title="Chèn hình ảnh"
        >
          <FontAwesomeIcon icon={faImage} />
        </button>
      </div>
    ),
    [activeFormats]
  );

  const handleContentChange = () => {
    if (editorRef.current) {
      const cleanedContent = cleanHtmlContent(
        editorRef.current.innerHTML.replace(/ data-placeholder="true"/g, "").trim()
      );
      setFormData((prev) => ({ ...prev, content: cleanedContent }));
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = FALLBACK_IMAGE;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.title.trim()) {
      showNotification("Vui lòng nhập tiêu đề bài viết.", "error");
      return;
    }
    if (!formData.content.trim() || formData.content.trim() === "<br>") {
      showNotification("Vui lòng nhập nội dung bài viết.", "error");
      return;
    }

    setShowConfirmPopup(true);
  };

  const confirmUpdate = async () => {
    setShowConfirmPopup(false);
    setIsSubmitting(true);

    const currentTime = getCurrentTime();
    setFormData((prev) => ({ ...prev, updateTime: currentTime }));

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        showNotification("Vui lòng đăng nhập lại.", "error");
        router.push("/user/login");
        return;
      }

      const formDataToSend = new FormData();
      formDataToSend.append("title", formData.title.trim());
      formDataToSend.append("slug", formData.slug);
      const cleanedContent = formData.content.replace(
        new RegExp(`${API_DOMAIN}/(images/[^"]+)`, "g"),
        "/$1"
      );
      formDataToSend.append("content", cleanedContent);
      if (formData.thumbnailFile) formDataToSend.append("thumbnail", formData.thumbnailFile);
      formDataToSend.append("status", formData.status);
      formDataToSend.append("views", formData.views.toString());
      formDataToSend.append("thumbnailCaption", currentTime);

      const response = await fetch(`${API_DOMAIN}/api/news/${slug}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      const result = await response.json();
      if (!response.ok) {
        if (result.error.includes("duplicate key")) {
          const newSlug = `${formData.slug}-${Date.now()}`;
          showNotification(`Slug '${formData.slug}' đã tồn tại. Đã tạo slug mới: ${newSlug}`, "success");
          formDataToSend.set("slug", newSlug);
          const retryResponse = await fetch(`${API_DOMAIN}/api/news/${slug}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
            body: formDataToSend,
          });
          if (!retryResponse.ok) {
            showNotification("Lỗi khi cập nhật bài viết", "error");
            return;
          }
        } else {
          showNotification(result.error || "Lỗi khi cập nhật bài viết", "error");
          return;
        }
      }

      showNotification("Cập nhật bài viết thành công!", "success");
      setTimeout(() => {
        router.push("/admin/news");
      }, 1500);
    } catch (error) {
      console.error("Lỗi yêu cầu:", error);
      showNotification("Lỗi kết nối. Vui lòng kiểm tra mạng.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelUpdate = () => {
    setShowConfirmPopup(false);
  };

  if (isSubmitting && !notification.show) {
    return <div className={styles.container}>Đang tải thông tin bài viết...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.new_container}>
        <h1 className={styles.pageTitle}>Chỉnh sửa Blog</h1>
        <div className={styles.addcontent}>
          <div className={styles.editorSection}>
            <div className={styles.editorHeader}>
              <label className={styles.formLabel}>Tiêu đề bài viết</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className={styles.titleInput}
                required
                placeholder="Nhập tiêu đề bài viết"
                maxLength={100}
              />
            </div>
            <div className={styles.editorMain}>
              <label className={styles.formLabel}>Nội dung bài viết</label>
              <div className={styles.contentEditorWrapper}>
                {renderToolbar()}
                <div
                  ref={editorRef}
                  className={styles.editorContent}
                  contentEditable
                  onInput={handleContentChange}
                  data-placeholder="Bắt đầu viết nội dung bài viết của bạn..."
                />
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                  multiple
                />
              </div>
            </div>
          </div>
          <div className={styles.formSection}>
            {notification.show && (
              <ToastNotification
                message={notification.message}
                type={notification.type}
                onClose={() => setNotification({ show: false, message: "", type: "success" })}
              />
            )}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Thời gian cập nhật</label>
              <input
                type="text"
                name="updateTime"
                value={formData.updateTime}
                onChange={handleInputChange}
                className={styles.formInput}
                readOnly
              />
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Trạng thái</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className={styles.formInput}
                  required
                >
                  <option value="show">Hiển thị</option>
                  <option value="hidden">Ẩn</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Số lượt xem</label>
                <input
                  type="number"
                  name="views"
                  value={formData.views}
                  onChange={handleInputChange}
                  className={styles.formInput}
                  min="0"
                  placeholder="Nhập số lượt xem"
                />
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Hình đại diện</label>
              <div
                className={styles.imageUpload}
                onClick={() => thumbnailInputRef.current?.click()}
              >
                {previewThumbnail ? (
                  <div className={styles.uploadedImage}>
                    <img
                      src={previewThumbnail}
                      alt="Thumbnail Preview"
                      onError={handleImageError}
                    />
                  </div>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faCloudUploadAlt} className={styles.uploadIcon} />
                    <div className={styles.uploadText}>Tải ảnh lên</div>
                    <div className={styles.uploadSubtext}>Click để chọn ảnh</div>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailChange}
                  ref={thumbnailInputRef}
                  style={{ display: "none" }}
                />
              </div>
            </div>
            <div className={styles.buttonGroup}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => router.push("/admin/news")}
                disabled={isSubmitting}
              >
                Hủy
              </button>
              <button
                type="submit"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Đang cập nhật..." : "Cập nhật"}
              </button>
            </div>
          </div>
        </div>

        {showConfirmPopup && (
          <div className={styles.popupOverlay}>
            <div className={styles.popupContent}>
              <h2>Xác nhận cập nhật</h2>
              <p>Bạn có chắc chắn muốn cập nhật bài viết này?</p>
              <div className={styles.popupButtons}>
                <button
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  onClick={cancelUpdate}
                  disabled={isSubmitting}
                >
                  Hủy
                </button>
                <button
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={confirmUpdate}
                  disabled={isSubmitting}
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditBlog;