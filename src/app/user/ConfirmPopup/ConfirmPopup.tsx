
"use client";

import styles from "./ConfirmPopup.module.css";

interface ConfirmPopupProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmPopup({ isOpen, title, message, onConfirm, onCancel }: ConfirmPopupProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.popup}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.message}>{message}</p>
        <div className={styles.buttonGroup}>
          <button
            className={styles.confirmButton}
            onClick={onConfirm}
          >
            Xác nhận
          </button>
          <button
            className={styles.cancelButton}
            onClick={onCancel}
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
}
