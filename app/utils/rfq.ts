export const formatRfqMoney = (value: number, currency: string) =>
  new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);

type PricedRfqItem = {
  quantity: number;
  price: number;
  priceMarkup: number;
};

export const calculateRfqTotals = (
  items: PricedRfqItem[],
  vatRate: number,
  applyVat: boolean,
) => {
  const subtotal = items.reduce(
    (total, item) => total + Math.round(item.price * item.quantity),
    0,
  );
  const markupValue = items.reduce(
    (total, item) =>
      total + Math.round((item.price * item.quantity * item.priceMarkup) / 100),
    0,
  );
  const valueBeforeVat = subtotal + markupValue;
  const vatValue = applyVat ? Math.round((valueBeforeVat * vatRate) / 100) : 0;
  return {
    subtotal,
    markupValue,
    vatValue,
    totalValue: valueBeforeVat + vatValue,
  };
};
