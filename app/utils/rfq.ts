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
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  shippingCost: number;
};

export const calculateRfqItemAmounts = (item: PricedRfqItem) => {
  const lineBase = Math.round(item.price * item.quantity);
  const lineMarkup = Math.round((lineBase * item.priceMarkup) / 100);
  const lineBeforeDiscount = lineBase + lineMarkup;
  const rawDiscount =
    item.discountType === 'percentage'
      ? Math.round((lineBeforeDiscount * item.discountValue) / 100)
      : item.discountValue;
  const lineDiscount = Math.min(lineBeforeDiscount, Math.max(0, rawDiscount));
  const lineShipping = Math.max(0, item.shippingCost);
  return {
    lineBase,
    lineMarkup,
    lineBeforeDiscount,
    lineDiscount,
    lineShipping,
    lineTotal: lineBeforeDiscount - lineDiscount + lineShipping,
  };
};

export const calculateRfqTotals = (
  items: PricedRfqItem[],
  vatRate: number,
  applyVat: boolean,
) => {
  const amounts = items.map(calculateRfqItemAmounts);
  const subtotal = amounts.reduce((total, item) => total + item.lineBase, 0);
  const markupValue = amounts.reduce(
    (total, item) => total + item.lineMarkup,
    0,
  );
  const discountValue = amounts.reduce(
    (total, item) => total + item.lineDiscount,
    0,
  );
  const shippingValue = amounts.reduce(
    (total, item) => total + item.lineShipping,
    0,
  );
  const valueBeforeVat = subtotal + markupValue - discountValue + shippingValue;
  const vatValue = applyVat ? Math.round((valueBeforeVat * vatRate) / 100) : 0;
  return {
    subtotal,
    markupValue,
    discountValue,
    shippingValue,
    vatValue,
    totalValue: valueBeforeVat + vatValue,
  };
};
