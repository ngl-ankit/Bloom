/** Shared, decorative outline icons. Interactive controls supply their own labels. */
const paths = {
  home: "m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z",
  calendar: "M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm3 10h2m4 0h2m-8 4h2",
  journal: "M14 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9M16 3l5 5m-11 6 2-5 6-6a2 2 0 0 1 3 3l-6 6-5 2Z",
  chart: "M3 3v18h18M7 14l4-4 4 3 6-8m-5 0h5v5",
  heart: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z",
  cookie: "M21 12a9 9 0 1 1-9-9 4 4 0 0 0 4 4 5 5 0 0 0 5 5ZM8 8h.01M7 14h.01M12 12h.01M12 17h.01M17 15h.01",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.9M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm7 .2a4 4 0 0 1 0 7.6",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Zm-8 13h4",
  book: "M12 5v16m0-16C9 3 5 3 2 4v16c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Z",
  checklist: "M9 5h12M9 12h12M9 19h12M2 5l1 1 2-2m-3 8 1 1 2-2m-3 8 1 1 2-2",
  settings: "M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1 1-3Zm3 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
  bandage: "m4 14 10-10a4.2 4.2 0 0 1 6 6L10 20a4.2 4.2 0 0 1-6-6Zm4-4 6 6m-4-8 6 6m-5-3h.01m2 2h.01",
  sprout: "M12 22v-9M12 13C5 13 3 9 3 4c6 0 9 3 9 9Zm0 4c0-7 3-10 9-10 0 6-3 10-9 10Z",
  flower: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm-3-5a3 3 0 0 1 6 0v2l2-1a3 3 0 0 1 3 5l-2 2 2 2a3 3 0 0 1-3 5l-2-1v2a3 3 0 0 1-6 0v-2l-2 1a3 3 0 0 1-3-5l2-2-2-2a3 3 0 0 1 3-5l2 1V4Z",
  mail: "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm-2 3 10 6L22 7",
  alert: "m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0ZM12 9v4m0 4h.01",
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-6v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4m0-14.2-1.4 1.4M6.3 17.7l-1.4 1.4",
  moon: "M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z",
  trash: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7",
  logout: "M9 3H4a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h5m7-14 5 5-5 5m-7-5h12",
  check: "m5 12 4 4L19 6",
  compass: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4 6-3 5-5 3 3-5 5-3Z",
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 20, className = "" }: {
  name: IconName; size?: number; className?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false" className={`inline-block shrink-0 align-middle ${className}`}>
      <path d={paths[name]} />
    </svg>
  );
}
