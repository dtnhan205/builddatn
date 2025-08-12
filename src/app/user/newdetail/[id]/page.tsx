"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarDays, faEye } from "@fortawesome/free-solid-svg-icons";
import styles from "./newdetail.module.css";

export interface NewsDetail {
  _id: string;
  title: string;
  slug: string;
  thumbnailUrl: string;
  publishedAt: string;
  content: string;
  views: number;
}

export default function NewsDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [news, setNews] = useState<NewsDetail | null>(null);
  const [relatedNews, setRelatedNews] = useState<NewsDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationType, setNotificationType] = useState<"success" | "error" | "">("");
  const [cacheBuster, setCacheBuster] = useState<string>("");

  const calledRef = useRef(false); // Ngăn useEffect chạy lại

  // Tạo cacheBuster để tránh cache hình ảnh
  useEffect(() => {
    setCacheBuster(`_t=${Date.now()}`);
    // Làm sạch thuộc tính từ extension
    const body = document.body;
    body.removeAttribute("data-new-gr-c-s-check-loaded");
    body.removeAttribute("data-gr-ext-installed");
  }, []);

  // Hàm xử lý URL ảnh
  const getImageUrl = (image: string | null): string => {
    if (!image) return "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg";
    return image.startsWith("http") ? `${image}?${cacheBuster}` : image;
  };

  // Show notification
  const showNotificationMessage = (message: string, type: "success" | "error") => {
    setNotificationMessage(message);
    setNotificationType(type);
    setShowNotification(true);
    setTimeout(() => {
      setShowNotification(false);
      setNotificationMessage("");
      setNotificationType("");
    }, 3000);
  };

  useEffect(() => {
    if (!id || calledRef.current) return;
    calledRef.current = true;

    const slugString = Array.isArray(id) ? id[0] : id;

    const fetchNews = async () => {
      try {
        // Gọi API lấy bài viết
        const res = await fetch(`https://api-zeal.onrender.com/api/news/${slugString}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error(`Lỗi ${res.status}: ${await res.text()}`);
        }
        const data: NewsDetail = await res.json();
        if (!data._id || !data.title || !data.slug) {
          throw new Error("Dữ liệu bài viết không đầy đủ.");
        }
        setNews({
          ...data,
          thumbnailUrl: getImageUrl(data.thumbnailUrl),
        });

        // Gọi API lấy các bài viết khác
        const allNewsRes = await fetch("https://api-zeal.onrender.com/api/news", {
          cache: "no-store",
        });
        if (!allNewsRes.ok) {
          throw new Error(`Lỗi khi lấy danh sách bài viết: ${await allNewsRes.text()}`);
        }
        const allNews: NewsDetail[] = await allNewsRes.json();
        const others = allNews
          .filter((item) => item.slug !== data.slug)
          .map((item) => ({
            ...item,
            thumbnailUrl: getImageUrl(item.thumbnailUrl),
          }));
        const shuffled = others.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 3);
        setRelatedNews(selected);
        setLoading(false);
      } catch (err: any) {
        setError(err.message);
        showNotificationMessage(`Lỗi: ${err.message}`, "error");
        setLoading(false);
      }
    };

    fetchNews();
  }, [id]);

  if (loading) return <p className={styles.errorContainer}>Đang tải bài viết...</p>;
  if (error) return <p className={styles.errorContainer}>Lỗi: {error}</p>;
  if (!news) return <p className={styles.errorContainer}>Không tìm thấy bài viết.</p>;

  return (
    <div className={styles.news}>
      {showNotification && (
        <div className={`${styles.notification} ${styles[notificationType]}`}>
          {notificationMessage}
        </div>
      )}

      <section className={styles.newsArticle}>
        <div className={styles.newsHeader}>
          <p className={styles.newsTitle}>{news.title}</p>
          <div className={styles.newsMeta}>
            <span className={styles.newsDate}>
              <FontAwesomeIcon icon={faCalendarDays} />
              {new Date(news.publishedAt).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
            </span>
            <span className={styles.newsViews}>
              <FontAwesomeIcon icon={faEye} />
              {news.views} lượt xem
            </span>
          </div>
        </div>

        <div className={styles.newsSection}>
          <div
            className={styles.editorContent}
            dangerouslySetInnerHTML={{ __html: news.content }}
          />
        </div>

        <div className={styles.newsRelated}>
          <p className={styles.newsRelatedTitle}>Xem Thêm</p>
          <div className={styles.newsRelatedGrid}>
            {relatedNews.map((item) => (
              <Link
                key={item._id}
                href={`/user/newdetail/${item.slug}`}
                className={styles.newsRelatedLink}
              >
                <div className={styles.newsRelatedItem}>
                  <img
                    src={getImageUrl(item.thumbnailUrl)}
                    alt={item.title}
                    width={410}
                    height={250}
                    className={styles.newsRelatedimage}
                    onError={(e) => {
                      e.currentTarget.src =
                        "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg";
                      console.error(
                        `Error loading related news image for ${item.title}: ${item.thumbnailUrl}`
                      );
                    }}
                  />
                  <p className={styles.newsRelatedText}>{item.title}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}