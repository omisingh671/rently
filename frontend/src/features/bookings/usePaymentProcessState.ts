import { useState, type ChangeEvent } from "react";
import type { PaymentMethodTab } from "./components/payment/PaymentMethodTabs";

export function usePaymentProcessState() {
  const [activeTab, setActiveTab] = useState<PaymentMethodTab>("card");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [upiId, setUpiId] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleCardNumberChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.replace(/\D/g, "");
    const formatted = value.match(/.{1,4}/g)?.join(" ") || "";
    setCardNumber(formatted.substring(0, 19));
  };

  const handleExpiryChange = (event: ChangeEvent<HTMLInputElement>) => {
    let value = event.target.value.replace(/\D/g, "");
    if (value.length > 2) {
      value = `${value.substring(0, 2)}/${value.substring(2, 4)}`;
    }
    setExpiry(value.substring(0, 5));
  };

  const handleCvvChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.replace(/\D/g, "");
    setCvv(value.substring(0, 3));
  };

  const validatePaymentForm = () => {
    const errors: Record<string, string> = {};

    if (activeTab === "card") {
      if (!cardName.trim()) {
        errors.cardName = "Cardholder name is required";
      }

      const cleanNumber = cardNumber.replace(/\s+/g, "");
      if (cleanNumber.length !== 16 || !/^\d+$/.test(cleanNumber)) {
        errors.cardNumber = "Card number must be 16 digits";
      }

      if (!/^\d{2}\/\d{2}$/.test(expiry)) {
        errors.expiry = "Expiry must be MM/YY format";
      } else {
        const [month] = expiry.split("/").map(Number);
        if (!month || month < 1 || month > 12) {
          errors.expiry = "Invalid expiry month";
        }
      }

      if (cvv.length !== 3 || !/^\d+$/.test(cvv)) {
        errors.cvv = "CVV must be 3 digits";
      }
    } else if (!upiId.trim() || !upiId.includes("@")) {
      errors.upiId = "Enter a valid UPI ID (e.g. name@upi)";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetPaymentForm = () => {
    setFormErrors({});
    setCardName("");
    setCardNumber("");
    setExpiry("");
    setCvv("");
    setUpiId("");
  };

  return {
    activeTab,
    cardName,
    cardNumber,
    expiry,
    cvv,
    upiId,
    formErrors,
    setActiveTab,
    setCardName,
    setUpiId,
    handleCardNumberChange,
    handleExpiryChange,
    handleCvvChange,
    validatePaymentForm,
    resetPaymentForm,
  };
}
