const shippingStatus = (items: { status: string }[]) =>
  items.every((item) =>
    ['shipped', 'delivered', 'received'].includes(item.status),
  )
    ? 'shipped'
    : 'partially_shipped';

export const statusAfterItemChanges = (
  items: { status: string }[],
  changedStatuses: { previous: string | undefined; next: string }[],
) => {
  if (
    changedStatuses.some(
      ({ previous, next }) => previous !== next && next === 'received',
    )
  ) {
    return items.every((item) => item.status === 'received')
      ? 'received'
      : 'partially_received';
  }
  if (
    changedStatuses.some(
      ({ previous, next }) => previous !== next && next === 'delivered',
    )
  ) {
    return items.every((item) => item.status === 'delivered')
      ? 'delivered'
      : 'partially_delivered';
  }
  if (
    changedStatuses.some(
      ({ previous, next }) => previous !== next && next === 'shipped',
    )
  ) {
    return shippingStatus(items);
  }
  if (
    changedStatuses.some(
      ({ previous, next }) => previous !== next && next === 'ordered',
    ) &&
    items.every((item) => item.status === 'ordered')
  ) {
    return 'accepted';
  }
  return null;
};
