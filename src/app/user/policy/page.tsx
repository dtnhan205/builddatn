"use client";

import React, { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation"; // Import useSearchParams
import styles from "./policy.module.css";
import ScrollInView from "../../components/ScrollInView";

const PolicyPage = () => {
  const [logoLoading, setLogoLoading] = useState<boolean>(true);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [cacheBuster, setCacheBuster] = useState<string>("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [isScrolling, setIsScrolling] = useState<boolean>(false);
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({
    "privacy-policy": null,
    "return-policy": null,
    "delivery-policy": null,
    "information-policy": null,
  });
  const searchParams = useSearchParams(); // Get query parameters

  useEffect(() => {
    setCacheBuster(`_t=${Date.now()}`);
  }, []);

  const getImageUrl = (image: string | null): string => {
    if (!image) return "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg";
    return image.startsWith("http") ? `${image}?${cacheBuster}` : image;
  };

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        setLogoLoading(true);
        setLogoError(null);
        const logoResponse = await fetch("https://api-zeal.onrender.com/api/interfaces/logo-shop", { cache: "no-store" });
        if (!logoResponse.ok) throw new Error(`Lỗi HTTP: ${logoResponse.status} ${logoResponse.statusText}`);
        const logoData = await logoResponse.json();
        setLogoUrl(logoData.paths && logoData.paths.length > 0 ? logoData.paths[0] : null);
      } catch (error: any) {
        console.error("Lỗi tải logo:", error);
        setLogoError(error.message || "Không thể tải logo");
        setLogoUrl(null);
      } finally {
        setLogoLoading(false);
      }
    };

    fetchLogo();
  }, []);

  // Handle initial scroll based on query parameter
  useEffect(() => {
    const type = searchParams.get("type");
    const sectionMap: { [key: string]: { id: string; targetPx: number } } = {
      privacy: { id: "privacy-policy", targetPx: 0 },
      return: { id: "return-policy", targetPx: 790 },
      shipping: { id: "delivery-policy", targetPx: 1240 },
      information: { id: "information-policy", targetPx: 1800 },
    };

    if (type && sectionMap[type]) {
      const { id, targetPx } = sectionMap[type];
      setIsScrolling(true);
      setActiveSection(id);
      window.scrollTo({ top: targetPx, behavior: "smooth" });
      setTimeout(() => setIsScrolling(false), 1000);
    }
  }, [searchParams]);

  const handleScroll = (sectionId: string, targetPx: number) => {
    setIsScrolling(true);
    setActiveSection(sectionId);
    window.scrollTo({ top: targetPx, behavior: "smooth" });
    setTimeout(() => setIsScrolling(false), 1000);
  };

  const handleBack = () => {
    window.history.back();
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrolling) return;
        let closestSection = null;
        let closestDistance = Infinity;
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const distance = Math.abs(entry.boundingClientRect.top);
            if (distance < closestDistance) {
              closestDistance = distance;
              closestSection = entry.target.id;
            }
          }
        });
        if (closestSection) {
          setActiveSection(closestSection);
        }
      },
      { threshold: [0.1, 0.25, 0.5, 0.75], rootMargin: "-10% 0% -10% 0%" }
    );

    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [isScrolling]);

  return (
    <div className={styles.container}>
      {logoLoading && (
        <div className={styles.loaderContainer}>
          <div className={styles.loader}></div>
        </div>
      )}
      <ScrollInView>
        <section className={styles.header}>
          {logoError ? (
            <p className={styles.error}>Lỗi: {logoError}</p>
          ) : (
            <img src={getImageUrl(logoUrl)} alt="Logo Pure Botanica" className={styles.logo} />
          )}
          <h1>Chính Sách của Pure Botanica</h1>
        </section>
      </ScrollInView>

      <div className={styles.mainContent}>
        <nav className={styles.navBar}>
          <div className={styles.navTitle}>
            <h2 className={styles.sectionHeading}>Chính Sách Của Chúng tôi</h2>
            <hr className={styles.divider} />
          </div>
          <ul className={styles.navList}>
            <li>
              <a
                href="#privacy-policy"
                className={`${styles.navLink} ${activeSection === "privacy-policy" ? styles.active : ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleScroll("privacy-policy", 0);
                }}
              >
                Chính Sách Bảo Mật
              </a>
            </li>
            <li>
              <a
                href="#return-policy"
                className={`${styles.navLink} ${activeSection === "return-policy" ? styles.active : ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleScroll("return-policy", 790);
                }}
              >
                Chính Sách Đổi Trả
              </a>
            </li>
            <li>
              <a
                href="#delivery-policy"
                className={`${styles.navLink} ${activeSection === "delivery-policy" ? styles.active : ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleScroll("delivery-policy", 1240);
                }}
              >
                Chính Sách Giao Hàng
              </a>
            </li>
            <li>
              <a
                href="#information-policy"
                className={`${styles.navLink} ${activeSection === "information-policy" ? styles.active : ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleScroll("information-policy", 1800);
                }}
              >
                Chính Sách Bảo Mật Thông Tin
              </a>
            </li>
          </ul>
          <button className={styles.backButton} onClick={handleBack}>
            Quay Lại trang trước
          </button>
        </nav>

        <section className={styles.content}>
          <ScrollInView>
            <section
              id="privacy-policy"
              className={styles.section}
              ref={(el) => {
                sectionRefs.current["privacy-policy"] = el;
              }}
            >
              <h2 className={styles.sectionHeading}>Chính Sách Bảo Mật</h2>
              <h3 className={styles.sectionTitle}>Cam Kết Bảo Vệ Thông Tin Khách Hàng</h3>
              <hr className={styles.divider} />
              <p>
                Tại Pure Botanica, chúng tôi cam kết bảo vệ thông tin cá nhân của khách hàng theo các nguyên tắc nghiêm ngặt, đảm bảo quyền lợi và sự an tâm khi sử dụng dịch vụ của chúng tôi:
              </p>
              <ul>
                <li><strong>Thu thập thông tin:</strong> Chúng tôi chỉ thu thập các thông tin cần thiết như họ tên, địa chỉ, email, và số điện thoại khi khách hàng đặt hàng hoặc đăng ký tài khoản trên trang web.</li>
                <li><strong>Sử dụng thông tin:</strong> Thông tin được sử dụng để xử lý đơn hàng, cung cấp dịch vụ chăm sóc khách hàng, và gửi thông tin khuyến mãi nếu khách hàng đồng ý nhận.</li>
                <li><strong>Bảo mật thông tin:</strong> Chúng tôi áp dụng công nghệ mã hóa SSL (Secure Sockets Layer) và tuân thủ nghiêm ngặt các quy định của GDPR để bảo vệ dữ liệu khách hàng.</li>
                <li><strong>Chia sẻ thông tin:</strong> Thông tin cá nhân của khách hàng sẽ không được chia sẻ với bất kỳ bên thứ ba nào, trừ trường hợp có yêu cầu từ cơ quan pháp luật.</li>
                <li><strong>Quyền lợi khách hàng:</strong> Khách hàng có quyền yêu cầu xem, chỉnh sửa hoặc xóa thông tin cá nhân của mình. Vui lòng liên hệ qua email <a href="mailto:purebotanica@gmail.com" className={styles.link}>purebotanica@gmail.com</a> hoặc truy cập <a href="https://purebotanica.online/" className={styles.link}>https://purebotanica.online/</a> để được hỗ trợ.</li>
                <li><strong>Lưu trữ thông tin:</strong> Dữ liệu khách hàng được lưu trữ an toàn trên máy chủ được bảo mật cao, với thời hạn lưu trữ tối đa 5 năm kể từ lần tương tác cuối cùng.</li>
              </ul>
              <p>Cập nhật: 21/08/2025 14:16 (giờ Việt Nam).</p>
            </section>
          </ScrollInView>

          <ScrollInView>
            <section
              id="return-policy"
              className={styles.section}
              ref={(el) => {
                sectionRefs.current["return-policy"] = el;
              }}
            >
              <h2 className={styles.sectionHeading}>Chính Sách Đổi Trả</h2>
              <h3 className={styles.sectionTitle}>Hỗ Trợ Đổi Trả Linh Hoạt</h3>
              <hr className={styles.divider} />
              <p>
                Chúng tôi hỗ trợ đổi trả sản phẩm với các điều kiện rõ ràng nhằm mang lại trải nghiệm mua sắm tốt nhất cho khách hàng:
              </p>
              <ul>
                <li><strong>Thời hạn đổi trả:</strong> Trong vòng 7 ngày kể từ ngày nhận hàng, áp dụng cho tất cả các sản phẩm mua tại Pure Botanica.</li>
                <li><strong>Điều kiện đổi trả:</strong> Sản phẩm phải còn nguyên vẹn, chưa qua sử dụng, và thuộc các trường hợp lỗi sản xuất, sai kích cỡ, hoặc không đúng như mô tả trên website.</li>
                <li><strong>Quy trình đổi trả:</strong> Khách hàng cần gửi yêu cầu đổi trả qua email <a href="mailto:purebotanica@gmail.com" className={styles.link}>purebotanica@gmail.com</a> hoặc truy cập <a href="https://purebotanica.online/" className={styles.link}>https://purebotanica.online/</a>. Vui lòng cung cấp mã đơn hàng và hình ảnh sản phẩm để được xử lý nhanh chóng.</li>
                <li><strong>Chi phí đổi trả:</strong> Miễn phí vận chuyển đổi trả nếu lỗi do nhà cung cấp. Trong trường hợp khách hàng đổi ý, phí vận chuyển sẽ do khách hàng chi trả.</li>
                <li><strong>Hoàn tiền:</strong> Hoàn tiền sẽ được thực hiện trong vòng 5-7 ngày làm việc kể từ khi nhận được sản phẩm trả lại, thông qua phương thức thanh toán ban đầu.</li>
              </ul>
              <p>Cập nhật: 21/08/2025 14:16 (giờ Việt Nam).</p>
            </section>
          </ScrollInView>

          <ScrollInView>
            <section
              id="delivery-policy"
              className={styles.section}
              ref={(el) => {
                sectionRefs.current["delivery-policy"] = el;
              }}
            >
              <h2 className={styles.sectionHeading}>Chính Sách Giao Hàng</h2>
              <h3 className={styles.sectionTitle}>Giao Hàng Nhanh Chóng và Đảm Bảo</h3>
              <hr className={styles.divider} />
              <p>
                Dịch vụ giao hàng của Pure Botanica được thiết kế để đảm bảo sản phẩm đến tay khách hàng nhanh chóng và an toàn:
              </p>
              <ul>
                <li><strong>Thời gian giao hàng:</strong> 2-5 ngày làm việc cho khu vực nội thành và 5-7 ngày làm việc cho khu vực ngoại thành hoặc tỉnh lẻ.</li>
                <li><strong>Phí giao hàng:</strong> Miễn phí vận chuyển cho đơn hàng từ 1.000.000 VNĐ trở lên. Đơn hàng dưới mức này sẽ chịu phí vận chuyển 30.000 VNĐ.</li>
                <li><strong>Khu vực giao hàng:</strong> Chúng tôi cung cấp dịch vụ giao hàng trên toàn quốc, bao gồm cả các khu vực vùng sâu, vùng xa.</li>
                <li><strong>Theo dõi đơn hàng:</strong> Khách hàng sẽ nhận được mã theo dõi đơn hàng qua email hoặc SMS ngay sau khi đơn hàng được gửi đi.</li>
                <li><strong>Bảo đảm giao hàng:</strong> Trong trường hợp sản phẩm bị hư hỏng hoặc thất lạc trong quá trình vận chuyển, chúng tôi cam kết hoàn tiền hoặc gửi lại sản phẩm mới.</li>
              </ul>
              <p>Cập nhật: 21/08/2025 14:16 (giờ Việt Nam).</p>
            </section>
          </ScrollInView>

          <ScrollInView>
            <section
              id="information-policy"
              className={styles.section}
              ref={(el) => {
                sectionRefs.current["information-policy"] = el;
              }}
            >
              <h2 className={styles.sectionHeading}>Chính Sách Bảo Mật Thông Tin</h2>
              <h3 className={styles.sectionTitle}>Đảm Bảo An Toàn Dữ Liệu Khách Hàng</h3>
              <hr className={styles.divider} />
              <p>
                Chính sách bảo mật thông tin của Pure Botanica được xây dựng để bảo vệ dữ liệu cá nhân của khách hàng một cách tối đa:
              </p>
              <ul>
                <li><strong>Thu thập thông tin:</strong> Chúng tôi thu thập các thông tin cơ bản như họ tên, email, số điện thoại và địa chỉ khi khách hàng đăng ký tài khoản hoặc đặt hàng.</li>
                <li><strong>Mục đích sử dụng:</strong> Thông tin được sử dụng để xử lý đơn hàng, cung cấp dịch vụ hỗ trợ khách hàng, và cải thiện trải nghiệm người dùng trên website.</li>
                <li><strong>Bảo vệ thông tin:</strong> Chúng tôi sử dụng công nghệ mã hóa SSL và tuân thủ các tiêu chuẩn quốc tế như GDPR để đảm bảo an toàn dữ liệu.</li>
                <li><strong>Quyền lợi khách hàng:</strong> Khách hàng có thể yêu cầu chỉnh sửa, xóa hoặc kiểm tra thông tin cá nhân bất kỳ lúc nào bằng cách liên hệ qua <a href="mailto:purebotanica@gmail.com" className={styles.link}>purebotanica@gmail.com</a> hoặc truy cập <a href="https://purebotanica.online/" className={styles.link}>https://purebotanica.online/</a>.</li>
                <li><strong>Cập nhật thông tin:</strong> Chúng tôi có thể định kỳ yêu cầu khách hàng cập nhật thông tin để đảm bảo dữ liệu luôn chính xác và phù hợp.</li>
              </ul>
              <p>Cập nhật: 21/08/2025 14:16 (giờ Việt Nam).</p>
            </section>
          </ScrollInView>
        </section>
      </div>
    </div>
  );
};

export default PolicyPage;