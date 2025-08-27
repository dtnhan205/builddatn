"use client";

import { useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faCheck } from "@fortawesome/free-solid-svg-icons";
import styles from "../admin/coupons/coupon.module.css";
import type { User } from "@/app/components/coupon_interface";

interface FormData {
  _id?: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderValue: number;
  expiryDate: string | null;
  usageLimit: number | null;
  isActive: boolean;
  usedCount?: number;
  userId?: string | null;
  description: string; // Thêm trường mô tả
}

interface SingleCouponFormData {
  userId: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderValue: number;
  expiryDays: number;
  usageLimit: number | null;
  description: string; // Thêm trường mô tả
}

interface BulkCouponFormData {
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderValue: number;
  expiryDays: number;
  usageLimit: number | null;
  target: "all" | "selected";
  selectedUserIds: string[];
  description: string; // Thêm trường mô tả
}

type FormDataTypes = FormData | SingleCouponFormData | BulkCouponFormData;

interface CouponFormProps<T extends FormDataTypes> {
  formData: T;
  updateField: <K extends keyof T>(field: K, value: T[K]) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  title: string;
  isLoading: boolean;
  users: User[] | undefined; // Cho phép users là undefined
  isEdit?: boolean;
}

// Type guards
function isFormData(formData: FormDataTypes): formData is FormData {
  return "code" in formData && "isActive" in formData;
}

function isSingleCouponFormData(formData: FormDataTypes): formData is SingleCouponFormData {
  return "userId" in formData && "expiryDays" in formData;
}

function isBulkCouponFormData(formData: FormDataTypes): formData is BulkCouponFormData {
  return "target" in formData && "selectedUserIds" in formData;
}

const CouponForm = <T extends FormDataTypes>({
  formData,
  updateField,
  onSubmit,
  onCancel,
  title,
  isLoading,
  users = [], // Giá trị mặc định là mảng rỗng nếu undefined
  isEdit,
}: CouponFormProps<T>) => {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value, type } = e.target;

      if (type === "checkbox") {
        updateField(name as keyof T, (e.target as HTMLInputElement).checked as T[keyof T]);
      } else if (name === "selectedUserIds") {
        const selectedOptions = Array.from(
          (e.target as HTMLSelectElement).selectedOptions
        ).map((option) => option.value);
        updateField(name as keyof T, selectedOptions as T[keyof T]);
      } else if (name === "usageLimit") {
        const usageLimitValue = value ? Number(value) : null;
        updateField(name as keyof T, usageLimitValue as T[keyof T]);
      } else {
        updateField(name as keyof T, value as T[keyof T]);
      }
    },
    [updateField]
  );

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="coupon-form-title">
      <div className={styles.modalContent}>
        <button
          className={styles.closePopupBtn}
          onClick={onCancel}
          disabled={isLoading}
          title="Đóng"
          aria-label="Đóng form mã giảm giá"
        >
          <FontAwesomeIcon icon={faTimes} />
        </button>
        <h2 id="coupon-form-title" className={styles.modalContentTitle}>{title}</h2>
        <form onSubmit={onSubmit} className={styles.formContainer}>
          {isFormData(formData) && (
            <>
              <div className={styles.formGroup}>
                <label htmlFor="code">Mã giảm giá:</label>
                <input
                  type="text"
                  id="code"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  disabled={isLoading || isEdit}
                  required
                  maxLength={20}
                  placeholder="Nhập mã giảm giá..."
                  aria-required="true"
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="isActive">Trạng thái:</label>
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  disabled={isLoading}
                />
                <span>{formData.isActive ? "Hoạt động" : "Không hoạt động"}</span>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="expiryDate">Ngày hết hạn (tùy chọn):</label>
                <input
                  type="date"
                  id="expiryDate"
                  name="expiryDate"
                  value={formData.expiryDate ? formData.expiryDate.split("T")[0] : ""}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>
            </>
          )}
          {isSingleCouponFormData(formData) && (
            <>
              <div className={styles.formGroup}>
                <label htmlFor="userId">Người dùng:</label>
                <select
                  id="userId"
                  name="userId"
                  value={formData.userId}
                  onChange={handleChange}
                  disabled={isLoading}
                  required
                  aria-required="true"
                >
                  <option value="">Chọn người dùng</option>
                  {users && users.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.username} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="expiryDays">Số ngày hiệu lực:</label>
                <input
                  type="number"
                  id="expiryDays"
                  name="expiryDays"
                  value={formData.expiryDays}
                  onChange={handleChange}
                  disabled={isLoading}
                  required
                  min="1"
                  aria-required="true"
                />
              </div>
            </>
          )}
          {isBulkCouponFormData(formData) && (
            <>
              <div className={styles.formGroup}>
                <label htmlFor="target">Đối tượng:</label>
                <select
                  id="target"
                  name="target"
                  value={formData.target}
                  onChange={handleChange}
                  disabled={isLoading}
                  required
                  aria-required="true"
                >
                  <option value="all">Tất cả người dùng</option>
                  <option value="selected">Người dùng được chọn</option>
                </select>
              </div>
              {formData.target === "selected" && (
                <div className={styles.formGroup}>
                  <label htmlFor="selectedUserIds">Chọn người dùng:</label>
                  <select
                    id="selectedUserIds"
                    name="selectedUserIds"
                    multiple
                    value={formData.selectedUserIds}
                    onChange={handleChange}
                    disabled={isLoading}
                    required
                    aria-required="true"
                  >
                    {users && users.map((user) => (
                      <option key={user._id} value={user._id}>
                        {user.username} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className={styles.formGroup}>
                <label htmlFor="expiryDays">Số ngày hiệu lực:</label>
                <input
                  type="number"
                  id="expiryDays"
                  name="expiryDays"
                  value={formData.expiryDays}
                  onChange={handleChange}
                  disabled={isLoading}
                  required
                  min="1"
                  aria-required="true"
                />
              </div>
            </>
          )}
          <div className={styles.formGroup}>
            <label htmlFor="discountType">Loại giảm giá:</label>
            <select
              id="discountType"
              name="discountType"
              value={formData.discountType}
              onChange={handleChange}
              disabled={isLoading}
              required
              aria-required="true"
            >
              <option value="percentage">Phần trăm</option>
              <option value="fixed">Cố định</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="discountValue">Giá trị giảm:</label>
            <input
              type="number"
              id="discountValue"
              name="discountValue"
              value={formData.discountValue}
              onChange={handleChange}
              disabled={isLoading}
              required
              min="0"
              aria-required="true"
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="minOrderValue">Đơn hàng tối thiểu:</label>
            <input
              type="number"
              id="minOrderValue"
              name="minOrderValue"
              value={formData.minOrderValue}
              onChange={handleChange}
              disabled={isLoading}
              min="0"
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="usageLimit">Số lượt sử dụng (tùy chọn):</label>
            <input
              type="number"
              id="usageLimit"
              name="usageLimit"
              value={formData.usageLimit || ""}
              onChange={handleChange}
              disabled={isLoading}
              min="1"
            />
          </div>
          {(isFormData(formData) || isSingleCouponFormData(formData) || isBulkCouponFormData(formData)) && (
            <div className={styles.formGroup}>
              <label htmlFor="description">Mô tả (tùy chọn):</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                disabled={isLoading}
                maxLength={200}
                placeholder="Nhập mô tả mã giảm giá..."
                rows={4}
              />
            </div>
          )}
          <div className={styles.formActions}>
            <button
              type="submit"
              className={styles.confirmBtn}
              disabled={isLoading}
              aria-label={isEdit ? "Cập nhật mã giảm giá" : "Tạo mã giảm giá"}
            >
              <FontAwesomeIcon icon={faCheck} />
              {isLoading ? " Đang xử lý..." : isEdit ? " Cập nhật" : " Tạo"}
            </button>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onCancel}
              disabled={isLoading}
              aria-label="Hủy"
            >
              <FontAwesomeIcon icon={faTimes} />
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CouponForm;