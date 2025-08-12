"use client";

import React, { useState, useEffect } from "react";
import styles from "./contact.module.css";
import ToastNotification from "../ToastNotification/ToastNotification"; 
import ScrollInView from "../../components/ScrollInView";


const API_BASE_URL = "https://api-zeal.onrender.com";

const ContactPage: React.FC = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    message: "",
  });
  const [logo, setLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [cacheBuster, setCacheBuster] = useState<string>("");

  // Tạo cacheBuster để tránh cache hình ảnh
  useEffect(() => {
    setCacheBuster(`_t=${Date.now()}`);
  }, []);

  // Hàm xử lý URL ảnh
  const getImageUrl = (image: string | null): string => {
    if (!image) return "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg";
    return image.startsWith("http") ? `${image}?${cacheBuster}` : image;
  };

  // Hook tùy chỉnh: Quản lý thông báo toast
  const useToast = () => {
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const TOAST_DURATION = 3000;

    const showToast = (type: "success" | "error", text: string) => {
      setMessage({ type, text });
      setTimeout(() => setMessage(null), TOAST_DURATION);
    };

    const hideToast = () => setMessage(null);

    return { message, showToast, hideToast };
  };

  const { message: toastMessage, showToast, hideToast } = useToast();

  // Fetch logo từ API khi component mount
  useEffect(() => {
    const fetchLogo = async () => {
      try {
        setLoading(true);
        setLogoError(null);
        const response = await fetch(`${API_BASE_URL}/api/interfaces/logo-shop`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`Lỗi HTTP: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        if (data.paths && data.paths.length > 0) {
          setLogo(data.paths[0]);
        } else {
          setLogo(null);
        }
      } catch (error: any) {
        console.error("Lỗi khi lấy logo:", error);
        setLogoError(error.message || "Không thể tải logo");
        setLogo(null);
      } finally {
        setLoading(false);
      }
    };

    fetchLogo();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
    setFormError(null); // Xóa lỗi khi người dùng nhập
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/contacts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Lỗi HTTP: ${response.status}`);
      }

      const result = await response.json();
      showToast("success", "Cảm ơn bạn đã liên hệ với Pure Botanica!");
      setFormData({ fullName: "", phone: "", email: "", message: "" });
    } catch (error: any) {
      console.error("Lỗi khi gửi thông tin liên hệ:", error);
      setFormError(error.message || "Đã xảy ra lỗi khi gửi thông tin. Vui lòng thử lại sau.");
      showToast("error", "Đã xảy ra lỗi khi gửi thông tin. Vui lòng thử lại sau.");
    }
  };

  return (
    <ScrollInView>
    <div className={styles.contactPage}>
      <div className={styles.contactHeader}>
        <h1>THÔNG TIN LIÊN HỆ</h1>
        <p>Liên hệ ngay để được tư vấn bí quyết làm đẹp hoàn hảo với sản phẩm của chúng tôi!</p>
      </div>

      <div className={styles.contactContent}>
        <div className={styles.contactInfo}>
          <div className={styles.logoContainer}>
            <div className={styles.logo}>
              {loading ? (
                <p>Đang tải logo...</p>
              ) : logoError ? (
                <p className={styles.errorContainer}>Lỗi: {logoError}</p>
              ) : (
                <img
                  src={getImageUrl(logo)}
                  alt="Pure Botanica Logo"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg";
                    console.log("Không thể tải hình ảnh logo:", logo);
                  }}
                />
              )}
              <div className={styles.slogan}>
                <p>"Nurtured by Nature</p>
                <p>Perfected for You"</p>
              </div>
            </div>

            <div className={styles.infoDetails}>
              <div className={styles.infoItem}>
                <i className="fas fa-map-marker-alt"></i>
                <div>
                  <strong>Trụ sở chính:</strong> Tòa nhà QTSC9 (tòa T), đường Tô Ký, phường Tân Chánh Hiệp, Quận 12, TP Hồ Chí Minh
                </div>
              </div>

              <div className={styles.infoItem}>
                <i className="fas fa-phone"></i>
                <div>
                  <strong>Số điện thoại:</strong> 097 806 1649
                </div>
              </div>

              <div className={styles.infoItem}>
                <i className="fas fa-envelope"></i>
                <div>
                  <strong>Email:</strong> purebotanica@gmail.com
                </div>
              </div>

              <div className={styles.infoItem}>
                <i className="fas fa-clock"></i>
                <div>
                  <strong>Khung giờ làm việc:</strong> 8h-18h thứ 2 - thứ 7
                </div>
              </div>
            </div>
          </div>

          <div className={styles.mapContainer}>
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3918.4472468502183!2d106.62525307589173!3d10.853826857697598!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x317529f8997a2f31%3A0xe30e97e8f50eb8c5!2zRlBUIFBvbHl0ZWNobmljIC0gVG_DoG4gUXXhuq1uIDExLCBUUC5IQ00!5e0!3m2!1svi!2s!4v1713703520970!5m2!1svi!2s"
              width="100%"
              height="300"
              style={{ border: 0 }}
              allowFullScreen
              loading="eager"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </div>

        <div className={styles.contactForm}>
          <div className={styles.formHeader}>
            <h2>Bạn cần hỗ trợ?</h2>
            <p>Hãy gửi thông tin liên hệ cho chúng tôi.</p>
          </div>

          {formError && <p className={styles.errorContainer}>{formError}</p>}

          <form onSubmit={handleSubmit}>
            <div className={styles.formRow}>
              <input
                type="text"
                name="fullName"
                placeholder="Họ và tên"
                value={formData.fullName}
                onChange={handleChange}
                required
              />

              <input
                type="tel"
                name="phone"
                placeholder="Số điện thoại"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
            />

            <textarea
              name="message"
              placeholder="Mô tả vấn đề"
              value={formData.message}
              onChange={handleChange}
            ></textarea>

            <button type="submit" className={styles.submitBtn}>
              Gửi cho Pure Botanica
            </button>
          </form>

          {}
          {toastMessage && (
            <ToastNotification
              message={toastMessage.text}
              type={toastMessage.type}
              onClose={hideToast}
            />
          )}
        </div>
      </div>
    </div>
    </ScrollInView>
  );
};

export default ContactPage;