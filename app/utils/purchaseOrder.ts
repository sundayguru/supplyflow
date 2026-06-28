export const formatPurchaseOrderMoney = (value: number, currency: string) =>
  new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);

type PricedPurchaseOrderItem = {
  quantity: number;
  price: number;
};

export const calculatePurchaseOrderTotals = (
  items: PricedPurchaseOrderItem[],
  vatRate: number,
  applyVat: boolean,
) => {
  const subtotal = items.reduce(
    (total, item) => total + Math.round(item.price * item.quantity),
    0,
  );
  const vatValue = applyVat ? Math.round((subtotal * vatRate) / 100) : 0;
  return {
    subtotal,
    vatValue,
    totalValue: subtotal + vatValue,
  };
};
