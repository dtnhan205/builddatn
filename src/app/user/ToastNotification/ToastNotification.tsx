import React, { useEffect, useState } from 'react';
import styles from './ToastNotification.module.css';

// Định nghĩa kiểu cho props
interface ToastNotificationProps {
  message: string;
  type: 'error' | 'success' | 'warning' | null;
  onClose: () => void;
}

const ToastNotification = ({ message, type, onClose }: ToastNotificationProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`${styles.toast} ${type ? styles[type] : ''} ${isVisible ? styles.show : styles.hide}`}>
      {message}
    </div>
  );
};

export default ToastNotification;