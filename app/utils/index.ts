import dayjs from 'dayjs';

export const formatDateTime = (dateTimeString: string): string => {
  return new Date(dateTimeString).toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  });
};

export const formatDate = (date: Date): string => {
  return dayjs(date).format('YYYY-MM-DD');
};

export const cleanString = (str: string): string => {
  return str
    .replaceAll('_', ' ')
    .split(/(?=[A-Z])/)
    .join(' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};
