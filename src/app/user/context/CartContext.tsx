"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { CheckoutData } from "../../components/checkout_interface";

interface CartContextType {
  checkoutData: CheckoutData | null;
  setCheckoutData: (data: CheckoutData | null) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(() => {
    if (typeof window !== "undefined") {
      const savedData = localStorage.getItem("checkoutData");
      return savedData ? JSON.parse(savedData) : null;
    }
    return null;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (checkoutData) {
        localStorage.setItem("checkoutData", JSON.stringify(checkoutData));
      } else {
        localStorage.removeItem("checkoutData");
      }
    }
  }, [checkoutData]);

  return (
    <CartContext.Provider value={{ checkoutData, setCheckoutData }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}