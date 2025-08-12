"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./comment.module.css";
import Head from "next/head";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRedo } from "@fortawesome/free-solid-svg-icons";
import ToastNotification from "../../user/ToastNotification/ToastNotification";

interface User {
  _id: string;
  username: string;
  email: string;
}

interface Product {
  _id: string;
  name: string;
  price: number;
  images: string[];
}

interface Comment {
  _id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: User | null;
  product: Product | null;
  rating: number;
}

const CommentPage: React.FC = () => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [filteredComments, setFilteredComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const commentsPerPage = 9;
  const router = useRouter();
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "success" as "success" | "error",
  });

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ show: true, message, type });
  };

  const normalizeImageUrl = (path: string): string => {
    if (path.startsWith("http")) return path;
    return `https://api-zeal.onrender.com${path.startsWith("/") ? "" : "/"}${path}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const renderStars = (rating: number | undefined) => {
    const stars = rating ? Math.min(Math.max(rating, 0), 5) : 0;
    return (
      <>
        {Array(5)
          .fill(0)
          .map((_, i) => (
            <span key={i} style={{ color: i < stars ? "#ffa500" : "#ccc" }}>
              ★
            </span>
          ))}
      </>
    );
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
    const fetchComments = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("Không tìm thấy token. Vui lòng đăng nhập lại.");
        }

        const res = await fetch("https://api-zeal.onrender.com/api/comments", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        if (res.status === 401 || res.status === 403) {
          showNotification("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!", "error");
          localStorage.removeItem("token");
          localStorage.removeItem("role");
          router.push("/user/login");
          return;
        }

        if (!res.ok) {
          throw new Error(`Lỗi khi tải danh sách bình luận: ${res.status}`);
        }

        const data: Comment[] = await res.json();
        if (!Array.isArray(data)) {
          throw new Error("Dữ liệu bình luận không hợp lệ");
        }
        setComments(data);
        setFilteredComments(data);
      } catch (error: any) {
        const errorMessage = error.message || "Không thể tải danh sách bình luận.";
        showNotification(errorMessage, "error");
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, [router]);

  useEffect(() => {
    const filtered = comments.filter((comment) => {
      const matchesSearch =
        comment.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (comment.user?.username &&
          comment.user.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (comment.product?.name &&
          comment.product.name.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesSearch;
    });
    setFilteredComments(filtered);
    setCurrentPage(1);
  }, [searchQuery, comments]);

  const handleToggleDetails = (commentId: string) => {
    setSelectedCommentId(selectedCommentId === commentId ? null : commentId);
  };

  const totalPages = Math.ceil(filteredComments.length / commentsPerPage);
  const indexOfLastComment = currentPage * commentsPerPage;
  const indexOfFirstComment = indexOfLastComment - commentsPerPage;
  const currentComments = filteredComments.slice(indexOfFirstComment, indexOfLastComment);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setSelectedCommentId(null);
    }
  };

  const getPaginationInfo = () => {
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

    return { visiblePages, showPrevEllipsis, showNextEllipsis };
  };

  if (loading && comments.length === 0) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.processingIndicator}>
          <FontAwesomeIcon icon={faRedo} spin />
          <p>Đang tải danh sách bình luận...</p>
        </div>
      </div>
    );
  }

  if (error && comments.length === 0) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.errorMessage}>{error}</p>
        <button
          className={styles.retryButton}
          onClick={() => {
            setLoading(true);
            setError(null);
            (async () => {
              try {
                setLoading(true);
                const token = localStorage.getItem("token");
                if (!token) {
                  throw new Error("Không tìm thấy token. Vui lòng đăng nhập lại.");
                }

                const res = await fetch("https://api-zeal.onrender.com/api/comments", {
                  method: "GET",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  cache: "no-store",
                });

                if (res.status === 401 || res.status === 403) {
                  showNotification("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!", "error");
                  localStorage.removeItem("token");
                  localStorage.removeItem("role");
                  router.push("/user/login");
                  return;
                }

                if (!res.ok) {
                  throw new Error(`Lỗi khi tải danh sách bình luận: ${res.status}`);
                }

                const data: Comment[] = await res.json();
                if (!Array.isArray(data)) {
                  throw new Error("Dữ liệu bình luận không hợp lệ");
                }
                setComments(data);
                setFilteredComments(data);
              } catch (error: any) {
                const errorMessage = error.message || "Không thể tải danh sách bình luận.";
                showNotification(errorMessage, "error");
                setError(errorMessage);
              } finally {
                setLoading(false);
              }
            })();
          }}
          title="Thử lại"
        >
          <FontAwesomeIcon icon={faRedo} />
        </button>
      </div>
    );
  }

  return (
    <div className={styles.commentManagementContainer}>
      <Head>
        <title>Quản Lý Bình Luận</title>
      </Head>
      {notification.show && (
        <ToastNotification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification({ show: false, message: "", type: "success" })}
        />
      )}
      {loading && comments.length > 0 && (
        <div className={styles.processingIndicator}>
          <FontAwesomeIcon icon={faRedo} spin /> Đang xử lý...
        </div>
      )}
      <div className={styles.titleContainer}>
        <h1>QUẢN LÝ BÌNH LUẬN</h1>
        <div className={styles.filterContainer}>
          <input
            type="text"
            placeholder="Tìm kiếm theo nội dung, người dùng, sản phẩm..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
            aria-label="Tìm kiếm bình luận"
          />
        </div>
      </div>
      <div className={styles.tableContainer}>
        <table className={styles.commentTable}>
          <thead className={styles.commentTableThead}>
            <tr>
              <th>Hình ảnh</th>
              <th>Người dùng</th>
              <th>Sản phẩm</th>
              <th>Nội dung</th>
              <th>Số sao</th>
              <th>Ngày bình luận</th>
            </tr>
          </thead>
          <tbody>
            {currentComments.length > 0 ? (
              currentComments.map((comment) => (
                <React.Fragment key={comment._id}>
                  <tr
                    onClick={() => handleToggleDetails(comment._id)}
                    className={`${styles.commentRow} ${
                      selectedCommentId === comment._id ? styles.commentRowActive : ""
                    }`}
                    style={{ cursor: "pointer" }}
                  >
                    <td>
                      <img
                        src={
                          comment.product?.images && comment.product.images.length > 0
                            ? normalizeImageUrl(comment.product.images[0])
                            : "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg"
                        }
                        alt={comment.product?.name || "Sản phẩm"}
                        width={48}
                        height={48}
                        className={styles.commentTableImage}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg";
                        }}
                      />
                    </td>
                    <td>
                      {comment.user
                        ? `${comment.user.username} (${comment.user.email})`
                        : "Người dùng không tồn tại"}
                    </td>
                    <td>{comment.product?.name || "Sản phẩm không tồn tại"}</td>
                    <td>{comment.content}</td>
                    <td>{renderStars(comment.rating)}</td>
                    <td>{formatDate(comment.createdAt)}</td>
                  </tr>
                  {selectedCommentId === comment._id && (
                    <tr className={styles.detailsRow}>
                      <td colSpan={6}>
                        <div className={styles.commentDetails}>
                          <h3>Chi tiết bình luận</h3>
                          <div className={styles.detailsContainer}>
                            <div className={styles.detailsSection}>
                              <h4>Thông tin người dùng</h4>
                              <div className={styles.detailsGrid}>
                                <p>
                                  <strong>Tên người dùng:</strong>{" "}
                                  {comment.user?.username || "Không có"}
                                </p>
                                <p>
                                  <strong>Email:</strong> {comment.user?.email || "Không có"}
                                </p>
                              </div>
                            </div>
                            <div className={styles.detailsSection}>
                              <h4>Nội dung bình luận</h4>
                              <p>{comment.content}</p>
                            </div>
                            <div className={styles.detailsSection}>
                              <h4>Số sao</h4>
                              <p>{renderStars(comment.rating)} ({comment.rating || 0}/5)</p>
                            </div>
                            <div className={styles.detailsSection}>
                              <h4>Thông tin sản phẩm</h4>
                              <div className={styles.detailsGrid}>
                                <p>
                                  <strong>Tên sản phẩm:</strong>{" "}
                                  {comment.product?.name || "Không có"}
                                </p>
                                <p>
                                  <strong>Giá:</strong>{" "}
                                  {comment.product?.price
                                    ? comment.product.price.toLocaleString() + "₫"
                                    : "Không có"}
                                </p>
                              </div>
                            </div>
                            <div className={styles.detailsSection}>
                              <h4>Ngày bình luận</h4>
                              <p>{formatDate(comment.createdAt)}</p>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            ) : (
              <tr>
                <td colSpan={6} className={styles.emptyState}>
                  <h3>Không có bình luận</h3>
                  <p>Chưa có bình luận nào phù hợp với bộ lọc.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className={styles.pagination}>
          {(() => {
            const { visiblePages, showPrevEllipsis, showNextEllipsis } = getPaginationInfo();
            return (
              <>
                {showPrevEllipsis && (
                  <>
                    <button
                      className={`${styles.pageLink} ${styles.firstLastPage}`}
                      onClick={() => handlePageChange(1)}
                      disabled={loading}
                      title="Trang đầu tiên"
                    >
                      1
                    </button>
                    <div
                      className={styles.ellipsis}
                      onClick={() => handlePageChange(Math.max(1, currentPage - 3))}
                      title="Trang trước đó"
                    >
                      ...
                    </div>
                  </>
                )}
                {visiblePages.map((page) => (
                  <button
                    key={page}
                    className={`${styles.pageLink} ${
                      currentPage === page ? styles.pageLinkActive : ""
                    }`}
                    onClick={() => handlePageChange(page)}
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
                      onClick={() => handlePageChange(Math.min(totalPages, currentPage + 3))}
                      title="Trang tiếp theo"
                    >
                      ...
                    </div>
                    <button
                      className={`${styles.pageLink} ${styles.firstLastPage}`}
                      onClick={() => handlePageChange(totalPages)}
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
  );
};

export default CommentPage;