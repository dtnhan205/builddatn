"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { use } from "react";
import { User, Option } from "@/app/components/user_interface";
import styles from "./edituser.module.css";

const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("Không có token. Vui lòng đăng nhập.");
  }
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
};

export default function EditUser({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formData, setFormData] = useState<Partial<User>>({
    username: "",
    email: "",
    phone: "",
    address: {
      addressLine: "",
      ward: "",
      district: "",
      cityOrProvince: "",
    },
    birthday: "",
  });
  const [cities, setCities] = useState<Option[]>([]);
  const [districts, setDistricts] = useState<Option[]>([]);
  const [wards, setWards] = useState<Option[]>([]);
  const [addressParts, setAddressParts] = useState({
    addressLine: "",
    ward: "",
    district: "",
    cityOrProvince: "",
  });
  const router = useRouter();

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const token = localStorage.getItem("token");
        const userId = localStorage.getItem("userId");
        console.log("Fetching user_info - Token:", token);
        console.log("Fetching user_info - userId:", userId);
        console.log("Fetching user_info - Params id:", id);

        if (!token || !userId) {
          throw new Error("Không có token hoặc user_id. Vui lòng đăng nhập lại.");
        }
        if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
          throw new Error("user_id không hợp lệ. Vui lòng đăng nhập lại.");
        }
        if (!id || id === "undefined") {
          throw new Error("ID người dùng không hợp lệ. Vui lòng thử lại.");
        }
        if (userId !== id) {
          throw new Error("Bạn không có quyền chỉnh sửa personal_info này.");
        }

        const res = await fetchWithAuth(`https://api-zeal.onrender.com/api/users/userinfo?id=${userId}`);
        const responseData = await res.json();
        console.log("Userinfo response:", responseData);

        if (!res.ok) {
          if (res.status === 401) {
            throw new Error(responseData.error || "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
          } else if (res.status === 403) {
            throw new Error(responseData.error || "Bạn không có quyền truy cập user_info.");
          } else if (res.status === 404) {
            throw new Error(responseData.error || "Không tìm thấy user_record với user_id này.");
          } else if (res.status === 400) {
            throw new Error(responseData.message || "user_id không hợp lệ.");
          }
          throw new Error(responseData.message || responseData.error || "Lỗi khi tải user_info.");
        }

        const { password, passwordResetToken, emailVerificationToken, ...safeUserData } = responseData;

        // Chuyển đổi address từ chuỗi (nếu API trả về chuỗi) sang object
        const addressParts = responseData.address && typeof responseData.address === "string" && responseData.address.includes(", ")
          ? {
              addressLine: responseData.address.split(", ")[0]?.trim() || "",
              ward: responseData.address.split(", ")[1]?.trim() || "",
              district: responseData.address.split(", ")[2]?.trim() || "",
              cityOrProvince: responseData.address.split(", ")[3]?.trim() || "",
            }
          : {
              addressLine: "",
              ward: "",
              district: "",
              cityOrProvince: "",
            };

        setUser({ ...safeUserData });
        setFormData({
          username: safeUserData.username || "",
          email: safeUserData.email || "",
          phone: safeUserData.phone || "",
          address: addressParts,
          birthday: safeUserData.birthday ? responseData.birthday.split("T")[0] : "",
        });
        setAddressParts(addressParts);
        setLoading(false);
      } catch (err: any) {
        console.error("Lỗi trong fetchUserInfo:", err);
        setError(err.message || "Lỗi khi tải user_info.");
        setLoading(false);
        if (err.message.includes("đăng nhập")) {
          console.log("Clearing localStorage and redirecting to /user/login");
          localStorage.removeItem("token");
          localStorage.removeItem("userId");
          router.push("/user/login");
        }
      }
    };

    fetchUserInfo();
  }, [id, router]);

  useEffect(() => {
    fetch("https://provinces.open-api.vn/api/?depth=1")
      .then((res) => res.json())
      .then((data) => setCities(data))
      .catch(() => setError("Lỗi khi tải danh sách cityOrProvince."));
  }, []);

  useEffect(() => {
    if (addressParts.cityOrProvince) {
      const selectedCity = cities.find(
        (city) => city.name === addressParts.cityOrProvince
      );
      if (selectedCity) {
        fetch(`https://provinces.open-api.vn/api/p/${selectedCity.code}?depth=2`)
          .then((res) => res.json())
          .then((data) => setDistricts(data.districts || []))
          .catch(() => setError("Lỗi khi tải danh sách district."));
      }
    } else {
      setDistricts([]);
    }
    setWards([]);
  }, [addressParts.cityOrProvince, cities]);

  useEffect(() => {
    if (addressParts.district) {
      const selectedDistrict = districts.find(
        (district) => district.name === addressParts.district
      );
      if (selectedDistrict) {
        fetch(`https://provinces.open-api.vn/api/d/${selectedDistrict.code}?depth=2`)
          .then((res) => res.json())
          .then((data) => setWards(data.wards || []))
          .catch(() => setError("Lỗi khi tải danh sách ward."));
      }
    } else {
      setWards([]);
    }
  }, [addressParts.district, districts]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setAddressParts((prev) => {
      const newAddressParts = { ...prev, [name]: value };
      setFormData((prevFormData) => ({
        ...prevFormData,
        address: newAddressParts,
      }));
      return newAddressParts;
    });
    if (!["addressLine", "ward", "district", "cityOrProvince"].includes(name)) {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const userId = localStorage.getItem("userId");
      const token = localStorage.getItem("token");
      console.log("Submit action - Token:", token);
      console.log("Submit action - userId:", userId);
      console.log("Submit action - Params id:", id);

      if (!userId || userId !== id) {
        throw new Error("Bạn không có quyền thực hiện submit_action này.");
      }
      if (!token) {
        throw new Error("Không có token. Vui lòng đăng nhập lại.");
      }

      // Client-side validation
      if (!formData.email?.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        throw new Error("Email không hợp lệ.");
      }
      if (!user?.googleId && !formData.username) {
        throw new Error("Tên người dùng là bắt buộc.");
      }
      if (formData.phone && !formData.phone.match(/^0\d{9}$/)) {
        throw new Error("Số điện thoại phải có 10 chữ số, bắt đầu bằng 0.");
      }
      if (formData.birthday && isNaN(new Date(formData.birthday).getTime())) {
        throw new Error("Ngày sinh không hợp lệ.");
      }

      // Extend formattedData type to allow status for admin
      const formattedData: {
        username: string;
        email: string;
        phone: string;
        address: string;
        birthday: string | null;
        status?: string;
      } = {
        username: formData.username || "",
        email: formData.email || "",
        phone: formData.phone || "",
        // Chuyển address thành chuỗi nếu API yêu cầu chuỗi
        address: formData.address
          ? [
              formData.address.addressLine,
              formData.address.ward,
              formData.address.district,
              formData.address.cityOrProvince,
            ]
              .filter((part) => part)
              .join(", ") || ""
          : "",
        birthday: formData.birthday ? new Date(formData.birthday).toISOString() : null,
      };

      if (user?.role === "admin") {
        formattedData.status = user.status || "active";
        // Nếu interface User có role, cần thêm role vào formattedData
        // formattedData.role = user.role || "user";
      }

      console.log("Sending user_info for submit_action:", JSON.stringify(formattedData, null, 2));

      const res = await fetchWithAuth(`https://api-zeal.onrender.com/api/users/update/${id}`, {
        method: "PUT",
        body: JSON.stringify(formattedData),
      });

      const responseData = await res.json();
      console.log("Update response:", {
        status: res.status,
        statusText: res.statusText,
        data: responseData,
      });

      if (!res.ok) {
        const errorMessage = responseData.message || responseData.error || responseData.errors || "Lỗi không xác định.";
        if (res.status === 401) {
          throw new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
        } else if (res.status === 403) {
          throw new Error("Bạn không có quyền thực hiện thay đổi này. Vui lòng kiểm tra đăng nhập.");
        } else if (res.status === 400) {
          throw new Error(errorMessage.includes("phone") ? "Số điện thoại không hợp lệ." : errorMessage);
        } else if (res.status === 404) {
          throw new Error("Không tìm thấy người dùng.");
        } else if (res.status === 409) {
          throw new Error("Email đã tồn tại. Vui lòng chọn email khác.");
        } else {
          throw new Error(`Lỗi server (mã ${res.status}): ${errorMessage}`);
        }
      }

      if (responseData.message === "Cập nhật thành công") {
        alert("Cập nhật thông tin thành công!");
        router.push("/user/userinfo");
      } else {
        throw new Error("Cập nhật không thành công. Vui lòng thử lại.");
      }
    } catch (err: any) {
      console.error("Lỗi trong handleSubmit:", err);
      setError(err.message || "Lỗi khi gửi submit_action.");
      if (err.message.includes("đăng nhập")) {
        console.log("Clearing localStorage and redirecting to /user/login");
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        router.push("/user/login");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <p className={styles.loading}>Đang tải user_info...</p>;
  if (error) return <p className={styles.error}>{error}</p>;
  if (!user) return <p className={styles.error}>Không tìm thấy user_info.</p>;

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Chỉnh sửa user_info</h2>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="username" className={styles.label}>
            Tên:
          </label>
          <input
            id="username"
            type="text"
            name="username"
            value={formData.username || ""}
            onChange={handleInputChange}
            placeholder="Nhập tên"
            className={styles.input}
            required={!user.googleId}
          />  
        </div>
       <div className={styles.formGroup}>
  <label htmlFor="email" className={styles.label}>
    Email:
  </label>
  <input
    id="email"
    type="email"
    name="email"
    value={formData.email || ""}
    onChange={handleInputChange}
    required
    placeholder="Nhập email"
    className={styles.input}
    disabled // Add this to prevent email changes
  />
  <small className={styles.note}>Email không thể thay đổi.</small> {/* Optional: Inform the user */}
          </div>
        <div className={styles.formGroup}>
          <label htmlFor="phone" className={styles.label}>
            SĐT:
          </label>
          <input
            id="phone"
            type="text"
            name="phone"
            value={formData.phone || ""}
            onChange={handleInputChange}
            pattern="0[0-9]{9}"
            title="Số điện thoại phải có 10 chữ số, bắt đầu bằng 0"
            placeholder="Nhập số điện thoại (không bắt buộc)"
            className={styles.input}
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="addressLine" className={styles.label}>
            Địa chỉ cụ thể (số nhà, đường):
          </label>
          <input
            id="addressLine"
            type="text"
            name="addressLine"
            value={addressParts.addressLine || ""}
            onChange={handleInputChange}
            placeholder="Ví dụ: 391 Tô Ký (không bắt buộc)"
            className={styles.input}
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="cityOrProvince" className={styles.label}>
            Tỉnh/Thành phố:
          </label>
          <select
            id="cityOrProvince"
            name="cityOrProvince"
            value={addressParts.cityOrProvince || ""}
            onChange={handleInputChange}
            className={styles.select}
          >
            <option value="">Chọn tỉnh/thành phố (không bắt buộc)</option>
            {cities.map((city) => (
              <option key={city.code} value={city.name}>
                {city.name}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="district" className={styles.label}>
            Quận/Huyện:
          </label>
          <select
            id="district"
            name="district"
            value={addressParts.district || ""}
            onChange={handleInputChange}
            disabled={!addressParts.cityOrProvince}
            className={styles.select}
          >
            <option value="">Chọn quận/huyện (không bắt buộc)</option>
            {districts.map((district) => (
              <option key={district.code} value={district.name}>
                {district.name}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="ward" className={styles.label}>
            Phường/Xã:
          </label>
          <select
            id="ward"
            name="ward"
            value={addressParts.ward || ""}
            onChange={handleInputChange}
            disabled={!addressParts.district}
            className={styles.select}
          >
            <option value="">Chọn phường/xã (không bắt buộc)</option>
            {wards.map((ward) => (
              <option key={ward.code} value={ward.name}>
                {ward.name}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="birthday" className={styles.label}>
            Ngày sinh:
          </label>
          <input
            id="birthday"
            type="date"
            name="birthday"
            value={formData.birthday || ""}
            onChange={handleInputChange}
            placeholder="Chọn ngày sinh (không bắt buộc)"
            className={styles.input}
          />
        </div>
        <div className={styles.buttonGroup}>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
          <Link href="/user/userinfo">
            <button type="button" className={styles.cancelButton}>
              Hủy
            </button>
          </Link>
        </div>
      </form>
    </div>
  );
}