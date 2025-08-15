"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./brand.module.css";
import { Brand } from "@/app/components/Brand_interface";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPenToSquare,
  faEye,
  faEyeSlash,
  faTrash,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import ToastNotification from "../../user/ToastNotification/ToastNotification";

export default function Brands() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [filteredBrands, setFilteredBrands] = useState<Brand[]>([]);
  const [productCounts, setProductCounts] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [showConfirmEditPopup, setShowConfirmEditPopup] = useState(false);
  const [showConfirmHidePopup, setShowConfirmHidePopup] = useState(false);
  const [showConfirmDeletePopup, setShowConfirmDeletePopup] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [newBrandName, setNewBrandName] = useState("");
  const [newBrandStatus, setNewBrandStatus] = useState<"show" | "hidden">("show");
  const [newBrandLogo, setNewBrandLogo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [searchName, setSearchName] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "show" | "hidden">("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | "none">("none");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error";
  }>({
    show: false,
    message: "",
    type: "success",
  });

  const router = useRouter();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ show: true, message, type });
  };

  const fetchProductCounts = async () => {
    if (!token || role !== "admin") return;
    try {
      const productsRes = await fetch("https://api-zeal.onrender.com/api/products", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!productsRes.ok) throw new Error("Lỗi khi tải danh sách sản phẩm");
      const productsData = await productsRes.json();
      const counts = productsData.reduce(
        (acc: { [key: string]: number }, product: any) => {
          if (product.id_brand) {
            acc[product.id_brand] = (acc[product.id_brand] || 0) + 1;
          }
          return acc;
        },
        {}
      );
      setProductCounts(counts);
    } catch (error: any) {
      showNotification(`Lỗi khi tải số lượng sản phẩm: ${error.message}`, "error");
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!token || role !== "admin") {
        showNotification("Bạn cần quyền admin để truy cập trang này.", "error");
        router.push("/user/login");
        return;
      }

      try {
        const brandsRes = await fetch("https://api-zeal.onrender.com/api/brands", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (brandsRes.status === 401 || brandsRes.status === 403) {
          showNotification("Phiên đăng nhập hết hạn hoặc không có quyền admin.", "error");
          localStorage.removeItem("token");
          localStorage.removeItem("role");
          localStorage.removeItem("email");
          router.push("/user/login");
          return;
        }
        if (!brandsRes.ok) {
          const errorText = await brandsRes.text();
          throw new Error(`Lỗi khi tải danh sách thương hiệu: ${brandsRes.status} ${errorText}`);
        }
        const brandsData: Brand[] = await brandsRes.json();
        setBrands(brandsData);
        setFilteredBrands(brandsData);
      } catch (error: any) {
        showNotification(`Lỗi khi tải dữ liệu: ${error.message}`, "error");
      } finally {
        setLoading(false);
        fetchProductCounts();
      }
    };
    fetchData();
  }, [router, token, role]);

  useEffect(() => {
    let filtered = [...brands];
    if (searchName.trim()) {
      filtered = filtered.filter((b) =>
        b.name.toLowerCase().includes(searchName.toLowerCase())
      );
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((b) => b.status === statusFilter);
    }
    if (sortOrder !== "none") {
      filtered.sort((a, b) => {
        const countA = productCounts[a._id] || 0;
        const countB = productCounts[b._id] || 0;
        return sortOrder === "asc" ? countA - countB : countB - countA;
      });
    }
    setFilteredBrands(filtered);
  }, [searchName, statusFilter, sortOrder, brands, productCounts]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    if (file) {
      const validFormats = [
        "image/jpeg",
        "image/png",
        "image/jpg",
        "image/gif",
        "image/webp",
        "image/svg+xml",
      ];
      const maxSize = 20 * 1024 * 1024; // 20MB
      if (!validFormats.includes(file.type)) {
        showNotification("Chỉ hỗ trợ file ảnh (jpg, jpeg, png, gif, webp, svg)", "error");
        return;
      }
      if (file.size > maxSize) {
        showNotification("Kích thước file vượt quá 20MB", "error");
        return;
      }
      setNewBrandLogo(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setNewBrandLogo(null);
      setPreviewUrl(null);
    }
  };

  const resetForm = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setShowAddPopup(false);
    setShowEditPopup(false);
    setShowConfirmEditPopup(false);
    setShowConfirmHidePopup(false);
    setShowConfirmDeletePopup(false);
    setSelectedBrand(null);
    setNewBrandName("");
    setNewBrandStatus("show");
    setNewBrandLogo(null);
    setPreviewUrl(null);
  };

  const handleToggleStatus = async (id: string) => {
    if (!token || role !== "admin") {
      showNotification("Bạn cần quyền admin để thực hiện hành động này.", "error");
      router.push("/user/login");
      return;
    }

    const brand = brands.find((b) => b._id === id);
    if (!brand) {
      showNotification("Không tìm thấy thương hiệu. Vui lòng thử lại.", "error");
      return;
    }

    const productCount = productCounts[id] || 0;
    if (brand.status === "show" && productCount > 0) {
      setSelectedBrand(brand);
      setShowConfirmHidePopup(true);
      return;
    }

    try {
      const newStatus = brand.status === "show" ? "hidden" : "show";
      const res = await fetch(
        `https://api-zeal.onrender.com/api/brands/${id}/toggle-visibility`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );
      if (res.status === 401 || res.status === 403) {
        showNotification("Phiên đăng nhập hết hạn hoặc không có quyền admin.", "error");
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("email");
        router.push("/user/login");
        return;
      }
      if (!res.ok) {
        const errorData = await res.json();
        let errorMessage = "Lỗi khi thay đổi trạng thái";
        if (res.status === 400) {
          errorMessage = errorData.message || "Dữ liệu không hợp lệ";
        } else if (res.status === 500) {
          errorMessage = "Lỗi máy chủ, có thể do kết nối database hoặc xử lý file";
        } else {
          errorMessage = `Lỗi: ${res.status} ${await res.text()}`;
        }
        throw new Error(errorMessage);
      }
      const result = await res.json();
      setBrands((prev) => prev.map((b) => (b._id === id ? result.brand : b)));
      fetchProductCounts();
      showNotification(result.message || "Thay đổi trạng thái thành công!", "success");
    } catch (error: any) {
      showNotification(error.message, "error");
    }
  };

  const confirmHideBrand = async () => {
    if (!selectedBrand || !token || role !== "admin") {
      showNotification("Bạn cần quyền admin để thực hiện hành động này.", "error");
      router.push("/user/login");
      return;
    }

    try {
      const productsRes = await fetch(
        `https://api-zeal.onrender.com/api/products?id_brand=${selectedBrand._id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }
      );
      if (!productsRes.ok) throw new Error("Lỗi khi tải danh sách sản phẩm");
      const products = await productsRes.json();
      const hasStock = products.some((product: any) => product.stock > 0);

      const res = await fetch(
        `https://api-zeal.onrender.com/api/brands/${selectedBrand._id}/toggle-visibility`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: "hidden" }),
        }
      );
      if (res.status === 401 || res.status === 403) {
        showNotification("Phiên đăng nhập hết hạn hoặc không có quyền admin.", "error");
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("email");
        router.push("/user/login");
        return;
      }
      if (!res.ok) {
        const errorData = await res.json();
        let errorMessage = "Lỗi khi ẩn thương hiệu";
        if (res.status === 400) {
          errorMessage = errorData.message || "Dữ liệu không hợp lệ";
        } else if (res.status === 500) {
          errorMessage = "Lỗi máy chủ, có thể do kết nối database hoặc xử lý file";
        } else {
          errorMessage = `Lỗi: ${res.status} ${await res.text()}`;
        }
        throw new Error(errorMessage);
      }
      const result = await res.json();
      setBrands((prev) =>
        prev.map((b) => (b._id === selectedBrand._id ? result.brand : b))
      );
      fetchProductCounts();
      showNotification(
        hasStock
          ? `Cảnh báo: Thương hiệu "${selectedBrand.name}" được ẩn nhưng vẫn còn sản phẩm có tồn kho!`
          : `Đã ẩn thương hiệu "${selectedBrand.name}" và các sản phẩm liên quan thành công!`,
        hasStock ? "error" : "success"
      );
    } catch (error: any) {
      showNotification(error.message, "error");
    } finally {
      setShowConfirmHidePopup(false);
      setSelectedBrand(null);
    }
  };

  const handleAddBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || role !== "admin") {
      showNotification("Bạn cần quyền admin để thực hiện hành động này.", "error");
      router.push("/user/login");
      return;
    }
    if (!newBrandName.trim()) {
      showNotification("Tên thương hiệu không được để trống", "error");
      return;
    }
    if (!newBrandLogo) {
      showNotification("Vui lòng tải lên logo thương hiệu", "error");
      return;
    }

    const formData = new FormData();
    formData.append("name", newBrandName);
    formData.append("status", newBrandStatus);
    formData.append("logoImg", newBrandLogo);

    try {
      const res = await fetch("https://api-zeal.onrender.com/api/brands", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      if (res.status === 401 || res.status === 403) {
        showNotification("Phiên đăng nhập hết hạn hoặc không có quyền admin.", "error");
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("email");
        router.push("/user/login");
        return;
      }
      if (!res.ok) {
        const errorData = await res.json();
        let errorMessage = "Lỗi khi thêm thương hiệu";
        if (res.status === 400) {
          if (errorData.message.includes("Tên thương hiệu đã tồn tại")) {
            errorMessage = "Tên thương hiệu đã tồn tại. Vui lòng chọn tên khác.";
          } else if (errorData.message.includes("Vui lòng upload hình ảnh logo")) {
            errorMessage = "Vui lòng tải lên hình ảnh logo.";
          } else if (errorData.message.includes("Chỉ hỗ trợ file ảnh")) {
            errorMessage = "Chỉ hỗ trợ file ảnh (jpg, jpeg, png, gif, webp, svg).";
          } else {
            errorMessage = errorData.message || "Dữ liệu không hợp lệ";
          }
        } else if (res.status === 500) {
          errorMessage = "Lỗi máy chủ, có thể do kết nối database hoặc xử lý file";
        } else {
          errorMessage = `Lỗi: ${res.status} ${await res.text()}`;
        }
        throw new Error(errorMessage);
      }
      const result = await res.json();
      setBrands((prev) => [...prev, result.brand]);
      fetchProductCounts();
      showNotification(result.message, "success");
      resetForm();
    } catch (error: any) {
      showNotification(error.message, "error");
    }
  };

  const handleEditBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBrand || !token || role !== "admin") {
      showNotification("Bạn cần quyền admin để thực hiện hành động này.", "error");
      router.push("/user/login");
      return;
    }
    if (!newBrandName.trim()) {
      showNotification("Tên thương hiệu không được để trống", "error");
      return;
    }

    const formData = new FormData();
    formData.append("name", newBrandName);
    formData.append("status", newBrandStatus);
    if (newBrandLogo) {
      formData.append("logoImg", newBrandLogo);
    }

    try {
      const res = await fetch(
        `https://api-zeal.onrender.com/api/brands/${selectedBrand._id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );
      if (res.status === 401 || res.status === 403) {
        showNotification("Phiên đăng nhập hết hạn hoặc không có quyền admin.", "error");
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("email");
        router.push("/user/login");
        return;
      }
      if (!res.ok) {
        const errorData = await res.json();
        let errorMessage = "Lỗi khi cập nhật thương hiệu";
        if (res.status === 400) {
          if (errorData.message.includes("Tên thương hiệu đã tồn tại")) {
            errorMessage = "Tên thương hiệu đã tồn tại. Vui lòng chọn tên khác.";
          } else {
            errorMessage = errorData.message || "Dữ liệu không hợp lệ";
          }
        } else if (res.status === 500) {
          errorMessage = "Lỗi máy chủ, có thể do kết nối database hoặc xử lý file";
        } else {
          errorMessage = `Lỗi: ${res.status} ${await res.text()}`;
        }
        throw new Error(errorMessage);
      }
      const result = await res.json();
      setBrands((prev) =>
        prev.map((b) => (b._id === selectedBrand._id ? result.brand : b))
      );
      fetchProductCounts();
      showNotification(result.message, "success");
      resetForm();
    } catch (error: any) {
      showNotification(error.message, "error");
    }
  };

  const handleDeleteBrand = async (brand: Brand) => {
    if (!token || role !== "admin") {
      showNotification("Bạn cần quyền admin để thực hiện hành động này.", "error");
      router.push("/user/login");
      return;
    }

    setSelectedBrand(brand);
    setShowConfirmDeletePopup(true);
  };

  const confirmDeleteBrand = async () => {
    if (!selectedBrand || !token || role !== "admin") {
      showNotification("Bạn cần quyền admin để thực hiện hành động này.", "error");
      router.push("/user/login");
      return;
    }

    const productCount = productCounts[selectedBrand._id] || 0;
    let hasStock = false;

    if (productCount > 0) {
      try {
        const productsRes = await fetch(
          `https://api-zeal.onrender.com/api/products?id_brand=${selectedBrand._id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          }
        );
        if (productsRes.status === 401 || productsRes.status === 403) {
          showNotification("Phiên đăng nhập hết hạn hoặc không có quyền admin.", "error");
          localStorage.removeItem("token");
          localStorage.removeItem("role");
          localStorage.removeItem("email");
          router.push("/user/login");
          return;
        }
        if (!productsRes.ok) {
          throw new Error(`Lỗi khi tải sản phẩm: ${productsRes.status}`);
        }
        const products: any[] = await productsRes.json();
        console.log("Products fetched for delete:", products);
        hasStock = products.some((product) => product.stock > 0);

        for (const product of products) {
          if (product.status === "show") {
            const updateRes = await fetch(
              `https://api-zeal.onrender.com/api/products/${product._id}`,
              {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status: "hidden" }),
              }
            );
            if (!updateRes.ok) {
              const errorText = await updateRes.text();
              throw new Error(`Lỗi khi ẩn sản phẩm ${product._id}: ${updateRes.status} ${errorText}`);
            }
          }
        }
      } catch (error: any) {
        showNotification(`Lỗi khi ẩn sản phẩm liên quan: ${error.message}`, "error");
        return;
      }
    }

    try {
      console.log("Deleting brand ID:", selectedBrand._id);
      const res = await fetch(
        `https://api-zeal.onrender.com/api/brands/${selectedBrand._id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (res.status === 401 || res.status === 403) {
        showNotification("Phiên đăng nhập hết hạn hoặc không có quyền admin.", "error");
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("email");
        router.push("/user/login");
        return;
      }
      if (!res.ok) {
        const errorData = await res.json();
        let errorMessage = "Lỗi khi xóa thương hiệu";
        if (res.status === 400) {
          errorMessage = errorData.message || "Dữ liệu không hợp lệ";
        } else if (res.status === 500) {
          errorMessage = "Lỗi máy chủ, có thể do kết nối database hoặc xử lý file";
        } else {
          errorMessage = `Lỗi: ${res.status} ${await res.text()}`;
        }
        throw new Error(errorMessage);
      }
      const result = await res.json();
      setBrands((prev) => {
        const newBrands = prev.filter((b) => b._id !== selectedBrand._id);
        console.log("Brands after delete:", newBrands);
        return newBrands;
      });
      fetchProductCounts();
      showNotification(
        productCount > 0
          ? hasStock
            ? `Cảnh báo: Đã ẩn ${productCount} sản phẩm và xóa thương hiệu "${selectedBrand.name}" nhưng vẫn còn sản phẩm có tồn kho!`
            : `Đã ẩn ${productCount} sản phẩm và xóa thương hiệu "${selectedBrand.name}" thành công!`
          : `Đã xóa thương hiệu "${selectedBrand.name}" thành công!`,
        hasStock ? "error" : "success"
      );
      resetForm();
    } catch (error: any) {
      showNotification(error.message, "error");
    } finally {
      setShowConfirmDeletePopup(false);
      setSelectedBrand(null);
    }
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredBrands.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredBrands.length / itemsPerPage);

  const paginate = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  return (
    <div className={styles.NewManagementContainer}>
      {notification.show && (
        <ToastNotification
          message={notification.message}
          type={notification.type}
          onClose={() =>
            setNotification({ show: false, message: "", type: "success" })
          }
        />
      )}
      <div className={styles.titleContainer}>
        <h1>QUẢN LÝ THƯƠNG HIỆU</h1>
        <div className={styles.filterContainer}>
          <input
            type="text"
            placeholder="Tìm theo tên..."
            className={styles.searchInput}
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
          />
          <select
            className={styles.categorySelect}
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "all" | "show" | "hidden")
            }
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="show">Hiển thị</option>
            <option value="hidden">Ẩn</option>
          </select>
          <select
            className={styles.categorySelect}
            value={sortOrder}
            onChange={(e) =>
              setSortOrder(e.target.value as "asc" | "desc" | "none")
            }
          >
            <option value="none">Sắp xếp mặc định</option>
            <option value="asc">Số sản phẩm: Ít nhất</option>
            <option value="desc">Số sản phẩm: Nhiều nhất</option>
          </select>
          <button
            className={styles.addProductBtn}
            onClick={() => setShowAddPopup(true)}
          >
            <FontAwesomeIcon icon={faPlus} /> Thêm thương hiệu
          </button>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.productTable}>
          <thead className={styles.productTableThead}>
            <tr>
              <th>Logo</th>
              <th>Tên</th>
              <th>Số sản phẩm</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className={styles.errorContainer}>
                  Đang tải danh sách thương hiệu...
                </td>
              </tr>
            ) : currentItems.length === 0 ? (
              <tr>
                <td colSpan={5} className={styles.errorContainer}>
                  Không có thương hiệu nào phù hợp.
                </td>
              </tr>
            ) : (
              currentItems.map((brand) => (
                <tr key={brand._id} className={styles.productRow}>
                  <td>
                    <img
                      src={brand.logoImg}
                      alt={brand.name}
                      className={styles.brandLogo}
                      onError={(e) => {
                        e.currentTarget.src =
                          "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg";
                      }}
                    />
                  </td>
                  <td>{brand.name}</td>
                  <td>{productCounts[brand._id] || 0}</td>
                  <td>
                    <span
                      className={
                        brand.status === "show"
                          ? styles.statusShow
                          : styles.statusHidden
                      }
                    >
                      {brand.status === "show" ? "Hiển thị" : "Ẩn"}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actionButtons}>
                      <button
                        className={styles.editBtn}
                        onClick={() => {
                          setSelectedBrand(brand);
                          setNewBrandName(brand.name);
                          setNewBrandStatus(brand.status);
                          setPreviewUrl(brand.logoImg);
                          setShowConfirmEditPopup(true);
                        }}
                        title="Chỉnh sửa"
                      >
                        <FontAwesomeIcon icon={faPenToSquare} />
                      </button>
                      <button
                        className={styles.toggleStatusBtn}
                        onClick={() => handleToggleStatus(brand._id)}
                        title={
                          brand.status === "show"
                            ? "Ẩn thương hiệu"
                            : "Hiển thị thương hiệu"
                        }
                      >
                        <FontAwesomeIcon
                          icon={brand.status === "show" ? faEyeSlash : faEye}
                        />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            onClick={() => paginate(currentPage - 1)}
            disabled={currentPage === 1}
            className={styles.paginationBtn}
          >
            Trước
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => paginate(i + 1)}
              className={`${styles.paginationBtn} ${
                currentPage === i + 1 ? styles.active : ""
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => paginate(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={styles.paginationBtn}
          >
            Sau
          </button>
        </div>
      )}

      {showAddPopup && (
        <div className={styles.popupOverlay}>
          <div className={styles.popupForm}>
            <h2 className={styles.popupTitle}>Thêm Thương Hiệu Mới</h2>
            <form onSubmit={handleAddBrand}>
              <div className={styles.formGroup}>
                <label>Tên Thương Hiệu:</label>
                <input
                  type="text"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  className={styles.brand_input}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Logo Thương Hiệu:</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,image/gif,image/webp,image/svg+xml"
                  onChange={handleFileChange}
                  className={styles.brand_input}
                  required
                />
                {previewUrl && (
                  <div className={styles.previewContainer}>
                    <img
                      src={previewUrl}
                      alt="Logo Preview"
                      className={styles.previewImage}
                    />
                  </div>
                )}
              </div>
              <div className={styles.formGroup}>
                <label>Trạng Thái:</label>
                <select
                  value={newBrandStatus}
                  onChange={(e) =>
                    setNewBrandStatus(e.target.value as "show" | "hidden")
                  }
                  className={styles.categorySelect}
                >
                  <option value="show">Hiển thị</option>
                  <option value="hidden">Ẩn</option>
                </select>
              </div>
              <div className={styles.formActions}>
                <button type="submit" className={styles.addProductBtn}>
                  <FontAwesomeIcon icon={faPlus} /> Thêm
                </button>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={resetForm}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showConfirmEditPopup && selectedBrand && (
        <div className={styles.popupOverlay}>
          <div className={styles.popupForm}>
            <h2 className={styles.popupTitle}>Xác Nhận Chỉnh Sửa</h2>
            <p>
              Bạn có chắc chắn muốn chỉnh sửa thương hiệu "{selectedBrand.name}" ?
            </p>
            <div className={styles.formActions}>
              <button
                className={styles.addProductBtn}
                onClick={() => {
                  setShowConfirmEditPopup(false);
                  setShowEditPopup(true);
                }}
              >
                Xác nhận
              </button>
              <button className={styles.cancelBtn} onClick={resetForm}>
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditPopup && (
        <div className={styles.popupOverlay}>
          <div className={styles.popupForm}>
            <h2 className={styles.popupTitle}>Chỉnh Sửa Thương Hiệu</h2>
            <form onSubmit={handleEditBrand}>
              <div className={styles.formGroup}>
                <label>Tên Thương Hiệu:</label>
                <input
                  type="text"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  className={styles.brand_input}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Logo Thương Hiệu:</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,image/gif,image/webp,image/svg+xml"
                  onChange={handleFileChange}
                  className={styles.brand_input}
                />
                {previewUrl && (
                  <div className={styles.previewContainer}>
                    <img
                      src={previewUrl}
                      alt="Logo Preview"
                      className={styles.previewImage}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://png.pngtree.com/png-vector/20210227/ourlarge/pngtree-error-404-glitch-effect-png-image_2943478.jpg";
                      }}
                    />
                  </div>
                )}
              </div>
              <div className={styles.formGroup}>
                <label>Trạng Thái:</label>
                <select
                  value={newBrandStatus}
                  onChange={(e) =>
                    setNewBrandStatus(e.target.value as "show" | "hidden")
                  }
                  className={styles.categorySelect}
                >
                  <option value="show">Hiển thị</option>
                  <option value="hidden">Ẩn</option>
                </select>
              </div>
              <div className={styles.formActions}>
                <button type="submit" className={styles.addProductBtn}>
                  <FontAwesomeIcon icon={faPenToSquare} /> Lưu
                </button>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={resetForm}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showConfirmHidePopup && selectedBrand && (
        <div className={styles.popupOverlay}>
          <div className={styles.popupForm}>
            <h2 className={styles.popupTitle}>Xác Nhận Ẩn Thương Hiệu</h2>
            <p>
              Thương hiệu "{selectedBrand.name}" có{" "}
              {productCounts[selectedBrand._id] || 0} sản phẩm. Ẩn thương hiệu
              sẽ ẩn tất cả các sản phẩm liên quan. Bạn có chắc chắn muốn tiếp
              tục?
            </p>
            <div className={styles.formActions}>
              <button
                className={styles.addProductBtn}
                onClick={confirmHideBrand}
              >
                Xác nhận
              </button>
              <button className={styles.cancelBtn} onClick={resetForm}>
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmDeletePopup && selectedBrand && (
        <div className={styles.popupOverlay}>
          <div className={styles.popupForm}>
            <h2 className={styles.popupTitle}>Xác Nhận Xóa Thương Hiệu</h2>
            <p>
              Bạn có chắc chắn muốn xóa thương hiệu "{selectedBrand.name}"?{" "}
              {productCounts[selectedBrand._id] > 0 && (
                <span>
                  Thương hiệu này có {productCounts[selectedBrand._id]} sản phẩm, chúng sẽ được ẩn.
                </span>
              )}
            </p>
            <div className={styles.formActions}>
              <button
                className={styles.addProductBtn}
                onClick={confirmDeleteBrand}
              >
                Xác nhận
              </button>
              <button className={styles.cancelBtn} onClick={resetForm}>
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}