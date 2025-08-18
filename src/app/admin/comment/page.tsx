"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./comment.module.css";
import Head from "next/head";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRedo, faTimes, faEdit } from "@fortawesome/free-solid-svg-icons";
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

interface AdminReply {
  user: User | null;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

interface Media {
  url: string;
  public_id: string;
}

interface Comment {
  _id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: User | null;
  product: Product | null;
  rating: number;
  adminReply: AdminReply | null;
  images: Media[];
  videos: Media[];
}

const CommentPage: React.FC = () => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [filteredComments, setFilteredComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [replyContent, setReplyContent] = useState<{ [key: string]: string }>({});
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isEditingReply, setIsEditingReply] = useState<{ [key: string]: boolean }>({});
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

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
  };

  const handleViewDetails = (commentId: string) => {
    setSelectedCommentId(commentId);
  };

  const handleCloseDetails = () => {
    setSelectedCommentId(null);
    setIsEditingReply({});
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setSelectedCommentId(null);
      setSelectedImage(null);
      setIsEditingReply({});
    }
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
          throw new Error(`Lỗi khi tải danh sách Đánh giá: ${res.status}`);
        }

        const data: Comment[] = await res.json();
        if (!Array.isArray(data)) {
          throw new Error("Dữ liệu Đánh giá không hợp lệ");
        }
        setComments(data);
        setFilteredComments(data);
      } catch (error: any) {
        const errorMessage = error.message || "Không thể tải danh sách Đánh giá.";
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
          comment.product.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (comment.adminReply?.content &&
          comment.adminReply.content.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (comment.videos &&
          comment.videos.some((video) =>
            video.public_id.toLowerCase().includes(searchQuery.toLowerCase())
          )) ||
        (comment.images &&
          comment.images.some((image) =>
            image.public_id.toLowerCase().includes(searchQuery.toLowerCase())
          ));
      return matchesSearch;
    });
    setFilteredComments(filtered);
    setCurrentPage(1);
  }, [searchQuery, comments]);

  const handleReplySubmit = async (commentId: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Không tìm thấy token. Vui lòng đăng nhập lại.");
      }

      const content = replyContent[commentId]?.trim();
      if (!content) {
        showNotification("Nội dung phản hồi không được để trống.", "error");
        return;
      }

      const res = await fetch(`https://api-zeal.onrender.com/api/comments/${commentId}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });

      if (res.status === 401 || res.status === 403) {
        showNotification("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!", "error");
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        router.push("/user/login");
        return;
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Lỗi khi gửi phản hồi.");
      }

      const updatedComment = await res.json();
      setComments((prevComments) =>
        prevComments.map((c) =>
          c._id === commentId ? updatedComment.comment : c
        )
      );
      setFilteredComments((prevComments) =>
        prevComments.map((c) =>
          c._id === commentId ? updatedComment.comment : c
        )
      );
      setReplyContent((prev) => ({ ...prev, [commentId]: "" }));
      showNotification("Phản hồi đã được gửi thành công!", "success");
      setSelectedCommentId(null);
    } catch (error: any) {
      showNotification(error.message || "Lỗi khi gửi phản hồi.", "error");
    }
  };

  const handleUpdateReply = async (commentId: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Không tìm thấy token. Vui lòng đăng nhập lại.");
      }

      const content = replyContent[commentId]?.trim();
      if (!content) {
        showNotification("Nội dung phản hồi không được để trống.", "error");
        return;
      }

      console.log(`Sending PUT request to /api/comments/reply/${commentId}`);
      const res = await fetch(`https://api-zeal.onrender.com/api/comments/reply/${commentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });

      if (res.status === 401 || res.status === 403) {
        showNotification("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!", "error");
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        router.push("/user/login");
        return;
      }

      if (res.status === 404) {
        showNotification("Bình luận không tồn tại hoặc endpoint không khả dụng.", "error");
        return;
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Lỗi khi cập nhật phản hồi.");
      }

      const updatedComment = await res.json();
      setComments((prevComments) =>
        prevComments.map((c) =>
          c._id === commentId ? updatedComment.comment : c
        )
      );
      setFilteredComments((prevComments) =>
        prevComments.map((c) =>
          c._id === commentId ? updatedComment.comment : c
        )
      );
      setReplyContent((prev) => ({ ...prev, [commentId]: "" }));
      setIsEditingReply((prev) => ({ ...prev, [commentId]: false }));
      showNotification("Phản hồi đã được cập nhật thành công!", "success");
      setSelectedCommentId(null);
    } catch (error: any) {
      console.error("Error updating reply:", error);
      showNotification(error.message || "Lỗi khi cập nhật phản hồi.", "error");
    }
  };

  const handleEditReplyClick = (commentId: string, currentContent: string) => {
    setIsEditingReply((prev) => ({ ...prev, [commentId]: true }));
    setReplyContent((prev) => ({ ...prev, [commentId]: currentContent }));
  };

  const handleCancelEdit = (commentId: string) => {
    setIsEditingReply((prev) => ({ ...prev, [commentId]: false }));
    setReplyContent((prev) => ({ ...prev, [commentId]: "" }));
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
          <p>Đang tải danh sách Đánh giá...</p>
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
                  throw new Error(`Lỗi khi tải danh sách Đánh giá: ${res.status}`);
                }

                const data: Comment[] = await res.json();
                if (!Array.isArray(data)) {
                  throw new Error("Dữ liệu Đánh giá không hợp lệ");
                }
                setComments(data);
                setFilteredComments(data);
              } catch (error: any) {
                const errorMessage = error.message || "Không thể tải danh sách Đánh giá.";
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

  const selectedComment = comments.find((comment) => comment._id === selectedCommentId);

  return (
    <div className={styles.commentManagementContainer}>
      <Head>
        <title>Quản Lý Đánh giá</title>
      </Head>
      {notification.show && (
        <ToastNotification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification({ show: false, message: "", type: "success" })}
        />
      )}
      {selectedImage && (
        <div className={styles.imageModal} onClick={handleOverlayClick}>
          <div className={styles.modalContent}>
            <button
              className={styles.closeModalButton}
              onClick={closeImageModal}
              title="Đóng hình ảnh"
              aria-label="Đóng hình ảnh phóng to"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
            <img
              src={selectedImage}
              alt="Hình ảnh phóng to"
              className={styles.modalImage}
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg";
              }}
            />
          </div>
        </div>
      )}
      {selectedComment && (
        <div className={styles.imageModal} onClick={handleOverlayClick}>
          <div className={styles.modalContent} style={{ maxHeight: "80vh", overflowY: "auto" }}>
            <button
              className={styles.closeModalButton}
              onClick={handleCloseDetails}
              title="Đóng chi tiết"
              aria-label="Đóng chi tiết đánh giá"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
            <h2>Chi tiết Đánh giá</h2>
            <div className={styles.commentDetails}>
              <div className={styles.detailsContainer}>
                <div className={styles.detailsSection}>
                  <h4>Thông tin người dùng</h4>
                  <div className={styles.detailsGrid}>
                    <p>
                      <strong>Tên người dùng:</strong>{" "}
                      {selectedComment.user?.username || "Không có"}
                    </p>
                    <p>
                      <strong>Email:</strong> {selectedComment.user?.email || "Không có"}
                    </p>
                  </div>
                </div>
                <div className={styles.detailsSection}>
                  <h4>Nội dung Đánh giá</h4>
                  <p>{selectedComment.content}</p>
                </div>
                <div className={styles.detailsSection}>
                  <h4>Số sao</h4>
                  <p>{renderStars(selectedComment.rating)} ({selectedComment.rating || 0}/5)</p>
                </div>
                <div className={styles.detailsSection}>
                  <h4>Thông tin sản phẩm</h4>
                  <div className={styles.detailsGrid}>
                    <p>
                      <strong>Tên sản phẩm:</strong>{" "}
                      {selectedComment.product?.name || "Không có"}
                    </p>
                  </div>
                </div>
                <div className={styles.detailsSection}>
                  <h4>Ngày Đánh giá</h4>
                  <p>{formatDate(selectedComment.createdAt)}</p>
                </div>
                <div className={styles.detailsSection}>
                  <h4>Hình ảnh</h4>
                  {selectedComment.images && selectedComment.images.length > 0 ? (
                    <div className={styles.mediaContainer}>
                      {selectedComment.images.map((image, index) => (
                        <div key={index} className={styles.mediaItem}>
                          <img
                            src={normalizeImageUrl(image.url)}
                            alt={`Hình ảnh ${image.public_id}`}
                            width={160}
                            height={160}
                            className={styles.commentImage}
                            onClick={() => handleImageClick(normalizeImageUrl(image.url))}
                            style={{ cursor: "pointer" }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg";
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>Không có hình ảnh nào được đính kèm.</p>
                  )}
                </div>
                <div className={styles.detailsSection}>
                  <h4>Video</h4>
                  {selectedComment.videos && selectedComment.videos.length > 0 ? (
                    <div className={styles.mediaContainer}>
                      {selectedComment.videos.map((video, index) => (
                        <div key={index} className={styles.mediaItem}>
                          <video
                            src={normalizeImageUrl(video.url)}
                            controls
                            width={320}
                            height={180}
                            className={styles.commentVideo}
                            onError={(e) => {
                              (e.target as HTMLVideoElement).poster =
                                "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg";
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>Không có video nào được đính kèm.</p>
                  )}
                </div>
                <div className={styles.detailsSection}>
                  <h4>Phản hồi từ admin</h4>
                  {selectedComment.adminReply ? (
                    isEditingReply[selectedComment._id] ? (
                      <div>
                        <textarea
                          value={replyContent[selectedComment._id] || ""}
                          onChange={(e) =>
                            setReplyContent({
                              ...replyContent,
                              [selectedComment._id]: e.target.value,
                            })
                          }
                          placeholder="Chỉnh sửa phản hồi của bạn..."
                          className={styles.replyInput}
                          aria-label="Chỉnh sửa phản hồi từ admin"
                        />
                        <div className={styles.buttonGroup}>
                          <button
                            onClick={() => handleUpdateReply(selectedComment._id)}
                            className={styles.replyButton}
                            disabled={!replyContent[selectedComment._id]?.trim()}
                            title="Cập nhật phản hồi"
                            aria-label="Cập nhật phản hồi từ admin"
                          >
                            Cập nhật phản hồi
                          </button>
                          <button
                            onClick={() => handleCancelEdit(selectedComment._id)}
                            className={styles.cancelButton}
                            title="Hủy chỉnh sửa"
                            aria-label="Hủy chỉnh sửa phản hồi"
                          >
                            Hủy
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className={styles.detailsGrid}>
                        <p>
                          <strong>Người phản hồi:</strong>{" "}
                          {selectedComment.adminReply.user?.username || "Không có"}
                        </p>
                        <p>
                          <strong>Nội dung:</strong> {selectedComment.adminReply.content}
                        </p>
                        <p>
                          <strong>Ngày phản hồi:</strong>{" "}
                          {formatDate(selectedComment.adminReply.createdAt)}
                        </p>
                        {selectedComment.adminReply.updatedAt && (
                          <p>
                            <strong>Ngày cập nhật:</strong>{" "}
                            {formatDate(selectedComment.adminReply.updatedAt)}
                          </p>
                        )}
                        <button
                          onClick={() =>
                            handleEditReplyClick(
                              selectedComment._id,
                              selectedComment.adminReply!.content
                            )
                          }
                          className={styles.editButton}
                          title="Chỉnh sửa phản hồi"
                          aria-label="Chỉnh sửa phản hồi từ admin"
                        >
                          <FontAwesomeIcon icon={faEdit} /> Chỉnh sửa
                        </button>
                      </div>
                    )
                  ) : (
                    <div>
                      <p>Chưa có phản hồi</p>
                      <textarea
                        value={replyContent[selectedComment._id] || ""}
                        onChange={(e) =>
                          setReplyContent({
                            ...replyContent,
                            [selectedComment._id]: e.target.value,
                          })
                        }
                        placeholder="Nhập phản hồi của bạn..."
                        className={styles.replyInput}
                        aria-label="Phản hồi từ admin"
                      />
                      <button
                        onClick={() => handleReplySubmit(selectedComment._id)}
                        className={styles.replyButton}
                        disabled={!replyContent[selectedComment._id]?.trim()}
                        title="Gửi phản hồi"
                        aria-label="Gửi phản hồi từ admin"
                      >
                        Gửi phản hồi
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {loading && comments.length > 0 && (
        <div className={styles.processingIndicator}>
          <FontAwesomeIcon icon={faRedo} spin /> Đang xử lý...
        </div>
      )}
      <div className={styles.titleContainer}>
        <h1>QUẢN LÝ ĐÁNH GIÁ</h1>
        <div className={styles.filterContainer}>
          <input
            type="text"
            placeholder="Tìm kiếm theo nội dung, người dùng, sản phẩm, phản hồi, video ID, hình ảnh ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
            aria-label="Tìm kiếm Đánh giá"
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
              <th>Ngày Đánh giá</th>
            </tr>
          </thead>
          <tbody>
            {currentComments.length > 0 ? (
              currentComments.map((comment) => (
                <tr
                  key={comment._id}
                  onClick={() => handleViewDetails(comment._id)}
                  className={styles.commentRow}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        comment.product?.images &&
                          comment.product.images.length > 0 &&
                          handleImageClick(normalizeImageUrl(comment.product.images[0]));
                      }}
                      style={{ cursor: "pointer" }}
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
              ))
            ) : (
              <tr>
                <td colSpan={6} className={styles.emptyState}>
                  <h3>Không có Đánh giá</h3>
                  <p>Chưa có Đánh giá nào phù hợp với bộ lọc.</p>
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