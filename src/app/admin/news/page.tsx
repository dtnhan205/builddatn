"use client";

import React, { useEffect, useState } from "react";
import styles from "./news.module.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import {
  faEye,
  faEyeSlash,
  faEdit,
  faTrash,
  faTimes,
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface NewsItem {
  _id: string;
  title: string;
  content: string;
  thumbnailUrl: string;
  thumbnailCaption?: string;
  status: "show" | "hidden";
  views: number;
  publishedAt: string;
  slug: string;
}

const API_BASE_URL = "https://api-zeal.onrender.com";
const VIEW_THRESHOLD = 1; // Ngưỡng lượt xem để hiển thị popup xác nhận

const processContentImages = (content: string): string => {
  return content.replace(/src="([^"]+)"/g, (match, src) => {
    if (!src.startsWith("http://") && !src.startsWith("https://")) {
      return `src="${API_BASE_URL}/${src}"`;
    }
    return match;
  });
};

const AdminNewsPage: React.FC = () => {
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "show" | "hidden">("all");
  const [sortOption, setSortOption] = useState<"mostViewed" | "leastViewed">("mostViewed");
  const [searchTitle, setSearchTitle] = useState<string>("");
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState<boolean>(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [confirmPopup, setConfirmPopup] = useState<{
    show: boolean;
    newsId: string | null;
    currentStatus: "show" | "hidden" | null;
  }>({ show: false, newsId: null, currentStatus: null });
  const [deleteConfirmPopup, setDeleteConfirmPopup] = useState<{
    show: boolean;
    newsId: string | null;
  }>({ show: false, newsId: null });

  const itemsPerPage = 9; // Đồng bộ với ordersPerPage trong order.module.css
  const totalPages = Math.ceil(newsList.length / itemsPerPage);

  const fetchNews = async (): Promise<void> => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        showNotification("Token xác thực không tồn tại. Vui lòng đăng nhập lại!", "error");
        return;
      }
      const res = await fetch(`${API_BASE_URL}/api/news`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Lỗi HTTP: ${res.status}`);
      const data: NewsItem[] = await res.json();
      setNewsList(data);
    } catch (err) {
      console.error("Lỗi khi tải tin tức:", err);
      showNotification("Đã xảy ra lỗi khi tải danh sách tin tức.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const showNotification = (message: string, type: "success" | "error") => {
    if (type === "success") {
      toast.success(message, {
         className: `${styles.customToast} ${styles.customToastBody}`
      });
    } else {
      toast.error(message, {
                 className: `${styles.customToast} ${styles.customToastBody}`

      });
    }
  };

  const filteredNews = newsList
    .filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      return item.title.toLowerCase().includes(searchTitle.toLowerCase());
    })
    .sort((a, b) => {
      if (sortOption === "mostViewed") return b.views - a.views;
      return a.views - b.views;
    });

  const paginatedNews = filteredNews.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const goToPage = (page: number) => {
    if (page >= 1 && page <= Math.ceil(filteredNews.length / itemsPerPage)) {
      setCurrentPage(page);
    }
  };

  const fetchNewsDetails = async (id: string): Promise<void> => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/news/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Lỗi HTTP: ${res.status}`);
      const data: NewsItem = await res.json();
      if (data.thumbnailUrl) {
        if (!data.thumbnailUrl.startsWith("http")) {
          data.thumbnailUrl = `${API_BASE_URL}/${data.thumbnailUrl}?t=${new Date().getTime()}`;
        } else {
          data.thumbnailUrl += `?t=${new Date().getTime()}`;
        }
      }
      setSelectedNews(data);
      setIsPopupOpen(true);
    } catch (err) {
      console.error("Lỗi khi tải chi tiết bài viết:", err);
      showNotification("Lỗi khi tải chi tiết bài viết.", "error");
    }
  };

  const toggleVisibility = async (id: string, currentStatus: "show" | "hidden"): Promise<void> => {
    try {
      const newsItem = newsList.find((item) => item._id === id);
      if (newsItem && currentStatus === "show" && newsItem.views > VIEW_THRESHOLD) {
        setConfirmPopup({ show: true, newsId: id, currentStatus });
        return;
      }

      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/news/${id}/toggle-visibility`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) throw new Error("Cập nhật trạng thái thất bại.");
      const newStatus = currentStatus === "show" ? "hidden" : "show";
      setNewsList((prev) =>
        prev.map((item) => (item._id === id ? { ...item, status: newStatus } : item))
      );
      showNotification(`Đã ${newStatus === "show" ? "hiển thị" : "ẩn"} bài viết thành công!`, "success");
    } catch (err) {
      showNotification("Lỗi khi đổi trạng thái.", "error");
    }
  };

  const confirmToggleVisibility = async () => {
    if (!confirmPopup.newsId || !confirmPopup.currentStatus) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/news/${confirmPopup.newsId}/toggle-visibility`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) throw new Error("Cập nhật trạng thái thất bại.");
      const newStatus = confirmPopup.currentStatus === "show" ? "hidden" : "show";
      setNewsList((prev) =>
        prev.map((item) => (item._id === confirmPopup.newsId ? { ...item, status: newStatus } : item))
      );
      showNotification(`Đã ẩn bài viết thành công!`, "success");
    } catch (err) {
      showNotification("Lỗi khi đổi trạng thái.", "error");
    } finally {
      setConfirmPopup({ show: false, newsId: null, currentStatus: null });
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    const newsItem = newsList.find((item) => item._id === id);
    if (newsItem && newsItem.views > VIEW_THRESHOLD) {
      setDeleteConfirmPopup({ show: true, newsId: id });
      return;
    }
    await confirmDelete(id);
  };

  const confirmDelete = async (id: string): Promise<void> => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/news/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Xóa thất bại.");
      setNewsList((prev) => prev.filter((item) => item._id !== id));
      showNotification("Xóa bài viết thành công!", "success");
    } catch (err) {
      showNotification("Lỗi khi xóa bài viết.", "error");
    } finally {
      setDeleteConfirmPopup({ show: false, newsId: null });
    }
  };

  const closePopup = () => {
    setIsPopupOpen(false);
    setSelectedNews(null);
    setImageError(null);
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) closePopup();
  };

  if (loading) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.processingIndicator}>
          <FontAwesomeIcon icon={faChevronRight} spin />
          <p>Đang tải danh sách tin tức...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.orderManagementContainer}>
      <ToastContainer
  position="top-right"
  autoClose={3000}
  hideProgressBar={false}
  newestOnTop={false}
  closeOnClick
  rtl={false}
  pauseOnFocusLoss
  draggable
  pauseOnHover
  theme="light"
  toastClassName={`${styles.customToast} ${styles.customToastBody}`}
/>


      <div className={styles.titleContainer}>
        <h1>QUẢN LÝ TIN TỨC</h1>
        <div className={styles.filterContainer}>
          <input
            type="text"
            placeholder="Tìm theo tiêu đề..."
            className={styles.searchInput}
            value={searchTitle}
            onChange={(e) => setSearchTitle(e.target.value)}
            aria-label="Tìm kiếm tin tức"
          />
          <select
            className={styles.categorySelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "show" | "hidden")}
            aria-label="Lọc theo trạng thái"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="show">Hiển thị</option>
            <option value="hidden">Ẩn</option>
          </select>
          <select
            className={styles.categorySelect}
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as "mostViewed" | "leastViewed")}
            aria-label="Sắp xếp theo lượt xem"
          >
            <option value="mostViewed">Xem nhiều nhất</option>
            <option value="leastViewed">Xem ít nhất</option>
          </select>
          <Link href="/admin/add_news" className={styles.addProductBtn}>
            Thêm bài viết
          </Link>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.orderTable}>
          <thead className={styles.orderTableThead}>
            <tr>
              <th>Tiêu đề</th>
              <th>Trạng thái</th>
              <th>Lượt xem</th>
              <th>Ngày đăng</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {paginatedNews.length === 0 ? (
              <tr>
                <td colSpan={5} className={styles.emptyState}>
                  <h3>{searchTitle || statusFilter !== "all" ? "Không tìm thấy bài viết" : "Chưa có bài viết"}</h3>
                  <p>
                    {searchTitle || statusFilter !== "all"
                      ? "Không có bài viết nào khớp với bộ lọc."
                      : "Hiện tại không có bài viết nào để hiển thị."}
                  </p>
                </td>
              </tr>
            ) : (
              paginatedNews.map((news, index) => (
                <tr
                  key={news._id}
                  className={styles.orderRow}
                  onClick={() => fetchNewsDetails(news._id)}
                >
                  <td>{(currentPage - 1) * itemsPerPage + index + 1}. {news.title}</td>
                  <td>
                    <span className={news.status === "show" ? styles.statusShow : styles.statusHidden}>
                      {news.status === "show" ? "Hiển thị" : "Ẩn"}
                    </span>
                  </td>
                  <td>
                    <FontAwesomeIcon icon={faEye} /> {news.views}
                  </td>
                  <td>{new Date(news.publishedAt).toLocaleDateString("vi-VN")}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className={styles.actionButtons}>
                      <Link href={`/admin/edit_new/${news.slug}`}>
                        <button className={styles.editBtn} title="Chỉnh sửa" aria-label={`Chỉnh sửa bài viết ${news.title}`}>
                          <FontAwesomeIcon icon={faEdit} />
                        </button>
                      </Link>
                      <button
                        className={styles.toggleStatusBtn}
                        onClick={() => toggleVisibility(news._id, news.status)}
                        title={news.status === "show" ? "Ẩn bài viết" : "Hiển thị bài viết"}
                        aria-label={news.status === "show" ? `Ẩn bài viết ${news.title}` : `Hiển thị bài viết ${news.title}`}
                      >
                        <FontAwesomeIcon icon={news.status === "show" ? faEyeSlash : faEye} />
                      </button>
                      <button
                        className={styles.cancelBtn}
                        onClick={() => handleDelete(news._id)}
                        title="Xóa bài viết"
                        aria-label={`Xóa bài viết ${news.title}`}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className={styles.pagination}>
            {(() => {
              const visiblePages: number[] = [];
              let showPrevEllipsis = false;
              let showNextEllipsis = false;

              if (totalPages <= 3) {
                for (let i = 1; i <= totalPages; i++) {
                  visiblePages.push(i);
                }
              } else {
                if (currentPage === 1) {
                  visiblePages.push(1, 2, 3);
                  showNextEllipsis = totalPages > 3;
                } else if (currentPage === totalPages) {
                  visiblePages.push(totalPages - 2, totalPages - 1, totalPages);
                  showPrevEllipsis = totalPages > 3;
                } else {
                  visiblePages.push(currentPage - 1, currentPage, currentPage + 1);
                  showPrevEllipsis = currentPage > 2;
                  showNextEllipsis = currentPage < totalPages - 1;
                }
              }

              return (
                <>
                  {showPrevEllipsis && (
                    <>
                      <button
                        className={`${styles.pageLink} ${styles.firstLastPage}`}
                        onClick={() => goToPage(1)}
                        disabled={loading}
                        title="Trang đầu tiên"
                      >
                        1
                      </button>
                      <div
                        className={styles.ellipsis}
                        onClick={() => goToPage(Math.max(1, currentPage - 3))}
                        title="Trang trước đó"
                      >
                        ...
                      </div>
                    </>
                  )}
                  {visiblePages.map((page) => (
                    <button
                      key={page}
                      className={`${styles.pageLink} ${currentPage === page ? styles.pageLinkActive : ""}`}
                      onClick={() => goToPage(page)}
                      disabled={loading}
                      title={`Trang ${page}`}
                    >
                      {page}
                    </button>
                  ))}
                  {showNextEllipsis && (
                    <>
                      <div
                        className={styles.ellipsis}
                        onClick={() => goToPage(Math.min(totalPages, currentPage + 3))}
                        title="Trang tiếp theo"
                      >
                        ...
                      </div>
                      <button
                        className={`${styles.pageLink} ${styles.firstLastPage}`}
                        onClick={() => goToPage(totalPages)}
                        disabled={loading}
                        title="Trang cuối cùng"
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>

      {isPopupOpen && selectedNews && (
        <div className={styles.modalOverlay} onClick={handleOverlayClick}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closePopupBtn} onClick={closePopup} title="Đóng" aria-label="Đóng chi tiết bài viết">
              <FontAwesomeIcon icon={faTimes} />
            </button>
            <h2 className={styles.popupTitle}>{selectedNews.title}</h2>
            <div className={styles.popupDetails}>
              <p><strong>Trạng thái:</strong> {selectedNews.status === "show" ? "Hiển thị" : "Ẩn"}</p>
              <p><strong>Lượt xem:</strong> {selectedNews.views}</p>
              <p><strong>Ngày đăng:</strong> {new Date(selectedNews.publishedAt).toLocaleDateString("vi-VN")}</p>
              {selectedNews.thumbnailUrl && (
                <div className={styles.popupThumbnail}>
                  <img
                    src={selectedNews.thumbnailUrl}
                    alt={selectedNews.thumbnailCaption || selectedNews.title}
                    onError={() => setImageError("Không thể tải hình ảnh thumbnail.")}
                    className={styles.orderTableImage}
                  />
                  {selectedNews.thumbnailCaption && <p>{selectedNews.thumbnailCaption}</p>}
                </div>
              )}
              <div
                className={styles.popupContentBody}
                dangerouslySetInnerHTML={{
                  __html: processContentImages(selectedNews.content),
                }}
                onError={(e) => {
                  setImageError("Không thể tải hình ảnh trong nội dung.");
                  console.error("Image load error:", e);
                }}
              />
              {imageError && <p className={styles.errorContainer}>{imageError}</p>}
            </div>
          </div>
        </div>
      )}

      {confirmPopup.show && (
        <div className={styles.modalOverlay} onClick={() => setConfirmPopup({ show: false, newsId: null, currentStatus: null })}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles.closePopupBtn}
              onClick={() => setConfirmPopup({ show: false, newsId: null, currentStatus: null })}
              title="Đóng"
              aria-label="Đóng xác nhận ẩn bài viết"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
            <h2 className={styles.modalContentTitle}>Xác nhận ẩn bài viết</h2>
            <div className={styles.popupDetails}>
              <p>Bài viết này có hơn {VIEW_THRESHOLD} lượt xem. Bạn có chắc chắn muốn ẩn bài viết?</p>
              <div className={styles.modalActions}>
                <button
                  className={styles.cancelBtn}
                  onClick={() => setConfirmPopup({ show: false, newsId: null, currentStatus: null })}
                  title="Hủy"
                  aria-label="Hủy ẩn bài viết"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
                <button
                  className={styles.confirmBtn}
                  onClick={confirmToggleVisibility}
                  title="Xác nhận"
                  aria-label="Xác nhận ẩn bài viết"
                >
                  <FontAwesomeIcon icon={faEyeSlash} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmPopup.show && (
        <div className={styles.modalOverlay} onClick={() => setDeleteConfirmPopup({ show: false, newsId: null })}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles.closePopupBtn}
              onClick={() => setDeleteConfirmPopup({ show: false, newsId: null })}
              title="Đóng"
              aria-label="Đóng xác nhận xóa bài viết"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
            <h2 className={styles.modalContentTitle}>Xác nhận xóa bài viết</h2>
            <div className={styles.popupDetails}>
              <p>Bài viết này có hơn {VIEW_THRESHOLD} lượt xem. Bạn có chắc chắn muốn xóa bài viết?</p>
              <div className={styles.modalActions}>
                <button
                  className={styles.cancelBtn}
                  onClick={() => setDeleteConfirmPopup({ show: false, newsId: null })}
                  title="Hủy"
                  aria-label="Hủy xóa bài viết"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
                <button
                  className={styles.confirmBtn}
                  onClick={() => deleteConfirmPopup.newsId && confirmDelete(deleteConfirmPopup.newsId)}
                  title="Xác nhận"
                  aria-label="Xác nhận xóa bài viết"
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNewsPage;