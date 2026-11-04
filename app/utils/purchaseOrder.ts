export const formatPurchaseOrderMoney = (value: number, currency: string) =>
  new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);

type PricedPurchaseOrderItem = {
  quantity: number;
  price: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  shippingCost?: number;
};

export const calculatePurchaseOrderItemTotal = (
  item: PricedPurchaseOrderItem,
) => {
  const gross = Math.round(item.price * item.quantity);
  const discount =
    item.discountType === 'fixed'
      ? (item.discountValue ?? 0)
      : Math.round((gross * (item.discountValue ?? 0)) / 100);
  return Math.max(0, gross - discount) + (item.shippingCost ?? 0);
};

export const calculatePurchaseOrderTotals = (
  items: PricedPurchaseOrderItem[],
  vatRate: number,
  applyVat: boolean,
) => {
  const subtotal = items.reduce((total, item) => {
    return total + calculatePurchaseOrderItemTotal(item);
  }, 0);
  const vatValue = applyVat ? Math.round((subtotal * vatRate) / 100) : 0;
  return {
    subtotal,
    vatValue,
    totalValue: subtotal + vatValue,
  };
};
