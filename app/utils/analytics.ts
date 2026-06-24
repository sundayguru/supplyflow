type Gtag = (
  command: 'config' | 'event',
  target: string,
  parameters?: Record<string, string | number | undefined>,
) => void;

type AnalyticsWindow = Window & {
  GA_TRACKING_ID?: string;
  gtag?: Gtag;
};

const getAnalyticsWindow = () =>
  typeof window !== 'undefined' ? (window as AnalyticsWindow) : null;

export const getGAId = () => getAnalyticsWindow()?.GA_TRACKING_ID;

export const pageview = (url: string) => {
  const gaId = getGAId();
  const analyticsWindow = getAnalyticsWindow();
  if (analyticsWindow?.gtag && gaId) {
    analyticsWindow.gtag('config', gaId, {
      page_path: url,
    });
  }
};

export const event = ({
  action,
  category,
  label,
  value,
}: {
  action: string;
  category: string;
  label?: string;
  value?: number;
}) => {
  const analyticsWindow = getAnalyticsWindow();
  if (analyticsWindow?.gtag) {
    analyticsWindow.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

// Specific event helpers
export const trackEnrollNow = (courseTitle: string) => {
  event({
    action: 'enroll_now_click',
    category: 'engagement',
    label: courseTitle,
  });
};
