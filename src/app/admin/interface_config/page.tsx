"use client";

import { useState, useEffect } from "react";
import styles from "./interface_config.module.css";
import ToastNotification from "../../user/ToastNotification/ToastNotification";

type PreviewType = {
  logo: string | null;
  favicon: string | null;
  banner1: string[];
  banner2: string | null;
  decor: string[];
  banner3: string | null;
  bannerAbout: string | null;
  bannerNews: string | null;
  [key: string]: string | string[] | null;
};

const imageDimensions: { [key: string]: { width: number; height: number } } = {
  logo: { width: 185, height: 150 }, 
  favicon: { width: 185, height: 150 }, 
  banner1: { width: 1920, height: 732.5 },
  banner2: { width: 1920, height: 900 },
  decor: { width: 630, height: 1125 },
  banner3: { width: 1920, height: 1090 },
  bannerAbout: { width: 1920, height: 760 },
  bannerNews: { width: 1920, height: 760 }, 
};

export default function ConfigPage() {
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<null | "success" | "error" | "warning">(null);
  const [loading, setLoading] = useState(false);
  const [previews, setPreviews] = useState<PreviewType>({
    logo: null,
    favicon: null,
    banner1: [],
    banner2: null,
    decor: [],
    banner3: null,
    bannerAbout: null,
    bannerNews: null,
  });

  const validateToken = (token: string | null) => {
    if (!token) {
      setMessage("Không tìm thấy token. Vui lòng đăng nhập lại.");
      setMessageType("error");
      return false;
    }

    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      const decoded = JSON.parse(jsonPayload);
      const exp = decoded.exp ? new Date(decoded.exp * 1000) : null;
      const role = decoded.role || "user";

      if (exp && exp < new Date()) {
        setMessage("Token đã hết hạn. Vui lòng đăng nhập lại.");
        setMessageType("error");
        return false;
      }
      if (role !== "admin") {
        setMessage("Bạn không có quyền truy cập trang cấu hình. Vui lòng sử dụng tài khoản admin.");
        setMessageType("error");
        return false;
      }
      return true;
    } catch (err) {
      setMessage("Token không hợp lệ. Vui lòng đăng nhập lại.");
      setMessageType("error");
      return false;
    }
  };

  useEffect(() => {
    const fetchCurrentImages = async () => {
      const token = localStorage.getItem("token");
      if (!validateToken(token)) return;

      const types = [
        { key: "logo", endpoint: "logo-shop" },
        { key: "favicon", endpoint: "favicon" },
        { key: "banner1", endpoint: "banner1" },
        { key: "banner2", endpoint: "banner2" },
        { key: "decor", endpoint: "decor-images" },
        { key: "banner3", endpoint: "banner3" },
        { key: "bannerAbout", endpoint: "banner-about" },
        { key: "bannerNews", endpoint: "banner-news" },
      ];

      setLoading(true);
      for (const { key, endpoint } of types) {
        try {
          const url = `https://api-zeal.onrender.com/api/interfaces/${endpoint}`;
          const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          });

          if (res.ok) {
            const data = await res.json();
            if (data.paths && data.paths.length > 0) {
              setPreviews((prev) => ({
                ...prev,
                [key]: key === "banner1" || key === "decor" ? data.paths : data.paths[0],
              }));
            } else {
              setPreviews((prev) => ({
                ...prev,
                [key]: key === "banner1" || key === "decor" ? [] : null,
              }));
            }
          } else if (res.status === 401 || res.status === 403) {
            setMessage("Token không hợp lệ hoặc hết hạn. Vui lòng đăng nhập lại.");
            setMessageType("error");
            break;
          } else {
            console.warn(`No images found for ${key}: ${res.status} ${res.statusText}`);
            setPreviews((prev) => ({
              ...prev,
              [key]: key === "banner1" || key === "decor" ? [] : null,
            }));
          }
        } catch (error) {
          console.error(`Error fetching ${key}:`, error);
          setPreviews((prev) => ({
            ...prev,
            [key]: key === "banner1" || key === "decor" ? [] : null,
          }));
        }
      }
      setLoading(false);
    };

    fetchCurrentImages();
  }, []);

  // Tự động ẩn thông báo sau 3 giây
  useEffect(() => {
    if (message && messageType) {
      const timer = setTimeout(() => {
        setMessage("");
        setMessageType(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, messageType]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const files = event.target.files;
    if (!files) return;

    if (type === "banner1" || type === "decor") {
      const maxFiles = type === "banner1" ? 5 : 2;
      const fileArray = Array.from(files).slice(0, maxFiles);
      setPreviews((prev) => ({
        ...prev,
        [type]: fileArray.map((file) => URL.createObjectURL(file)),
      }));
    } else {
      setPreviews((prev) => ({
        ...prev,
        [type]: files[0] ? URL.createObjectURL(files[0]) : null,
      }));
    }
  };

  // Hàm kiểm tra kích thước ảnh
  const checkImageDimensions = (file: File, type: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const { width, height } = img;
        const targetDimensions = imageDimensions[type];
        if (!targetDimensions) {
          resolve(true); // Không kiểm tra nếu không có tỉ lệ định nghĩa
          return;
        }

        const targetRatio = targetDimensions.width / targetDimensions.height;
        const imageRatio = width / height;
        const tolerance = 0.05; // Dung sai ±5%

        // Kiểm tra tỉ lệ
        const isValidRatio = Math.abs(imageRatio - targetRatio) <= targetRatio * tolerance;

        // Kiểm tra kích thước tối thiểu (chỉ áp dụng cho banner1, banner2, decor, banner3, bannerAbout, bannerNews)
        const isValidSize =
          type === "logo" || type === "favicon"
            ? true // Không kiểm tra kích thước cụ thể cho logo và favicon
            : width >= targetDimensions.width * 0.95 && height >= targetDimensions.height * 0.95;

        resolve(isValidRatio && isValidSize);
      };
      img.onerror = () => resolve(false);
    });
  };

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>, type: string) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setMessageType(null);

    const token = localStorage.getItem("token");
    if (!validateToken(token)) {
      setLoading(false);
      return;
    }

    const formData = new FormData(event.currentTarget);
    const endpoint = {
      logo: "logo-shop",
      favicon: "favicon",
      banner1: "banner1",
      banner2: "banner2",
      decor: "decor-images",
      banner3: "banner3",
      bannerAbout: "banner-about",
      bannerNews: "banner-news",
    }[type];

    const url = `https://api-zeal.onrender.com/api/interfaces/${endpoint}`;
    const maxFiles = type === "banner1" ? 5 : type === "decor" ? 2 : 1;
    const files = formData.getAll(type) as File[];

    if (files.length > maxFiles || (files.length === 0 && maxFiles > 0)) {
      setMessage(`Không có hình nào được tải lên hoặc vượt quá số lượng cho phép`);
      setMessageType("warning");
      setLoading(false);
      return;
    }

    // Kiểm tra kích thước ảnh
    for (const file of files) {
      const isValid = await checkImageDimensions(file, type);
      if (!isValid) {
        const dimensionText =
          type === "logo" || type === "favicon"
            ? "hình vuông (tỉ lệ 1:1)"
            : `${imageDimensions[type]?.width || "N/A"}x${imageDimensions[type]?.height || "N/A"} px`;
        setMessage(
          `Hình ảnh ${type} không đúng tỉ lệ. Yêu cầu: ${dimensionText} (±5%).`
        );
        setMessageType("error");
        setLoading(false);
        return;
      }
    }

    formData.delete(type);
    files.forEach((file) => formData.append(type, file));

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        setMessage(data.message || `CẬP NHẬT ${type.toUpperCase()} THÀNH CÔNG`);
        setMessageType("success");
        if (data.paths && data.paths.length > 0) {
          setPreviews((prev) => ({
            ...prev,
            [type]: type === "banner1" || type === "decor" ? data.paths : data.paths[0],
          }));
        }
        setTimeout(() => window.location.reload(), 3000);
      } else {
        setMessage(`Lỗi: ${data.error || "Không thể upload"} - Mã lỗi: ${response.status}`);
        setMessageType("error");
      }
    } catch (error) {
      setMessage(`Lỗi server: ${(error as Error).message}`);
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  // Hàm xử lý URL ảnh
  const getImageUrl = (image: string | null): string => {
    if (!image) return "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg";
    return image.startsWith("http") ? `${image}?_t=${Date.now()}` : image;
  };

  const renderForm = (type: string, label: string, multiple = false, maxFiles = 1) => (
    <form onSubmit={(e) => handleUpload(e, type)} className={styles.form}>
      <div className={styles.formGroup}>
        <label className={styles.subtitle}>{label}</label>
        <input
          type="file"
          name={type}
          accept="image/*"
          multiple={multiple}
          onChange={(e) => handleFileChange(e, type)}
          className={styles.searchInput}
          title={`Chọn ${label}`}
          placeholder={`Chọn ${label}`}
        />
        {multiple ? (
          (previews[type as keyof PreviewType] as string[]).length > 0 && (
            <div className={styles.previewContainer}>
              {(previews[type as keyof PreviewType] as string[]).map((src: string, index: number) => (
                <img
                  key={index}
                  src={getImageUrl(src)}
                  alt={`${label} Preview ${index + 1}`}
                  className={styles.previewImage}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg";
                    console.log(`Image load failed for ${type}:`, src);
                  }}
                />
              ))}
            </div>
          )
        ) : (
          previews[type as keyof PreviewType] && (
            <div className={styles.previewContainer}>
              <img
                src={getImageUrl(previews[type as keyof PreviewType] as string)}
                alt={`${label} Preview`}
                className={styles.previewImage}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg";
                  console.log(`Image load failed for ${type}:`, previews[type]);
                }}
              />
            </div>
          )
        )}
        <div className={styles.formActions}>
          <button type="submit" disabled={loading} className={styles.addProductBtn}>
            {loading ? "ĐANG TẢI..." : "TẢI LÊN"}
          </button>
        </div>
      </div>
    </form>
  );

  return (
    <div className={styles.configPage}>
      <div className={styles.titleContainer}>
        <h1>HÌNH ẢNH CHO WEBSITE</h1>
      </div>
      <div className={styles.tableContainer}>
        {renderForm("logo", "Logo Shop")}
        {renderForm("favicon", "Favicon")}
        {renderForm("banner1", "Banner 1 trang home (tối đa 5 hình)", true, 5)}
        {renderForm("banner2", "Banner 2 trang home")}
        {renderForm("decor", "Hình trang trí trang home (tối đa 2 hình)", true, 2)}
        {renderForm("banner3", "Banner 3 trang home")}
        {renderForm("bannerAbout", "Banner trang giới thiệu")}
        {renderForm("bannerNews", "Banner trang tin tức")}
      </div>
      {message && (
        <ToastNotification
          message={message}
          type={messageType}
          onClose={() => {
            setMessage("");
            setMessageType(null);
          }}
        />
      )}
    </div>
  );
}