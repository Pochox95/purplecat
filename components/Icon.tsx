import type { CSSProperties } from "react";
const paths = {
  edit: "m16 3 5 5-12 12-6 1 1-6L16 3z M13 6l5 5",
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  box: "m3 7 9-4 9 4-9 4-9-4z M3 7v10l9 4 9-4V7 M12 11v10 M7.5 5l9 4",
  receipt: "M6 3h12v18l-3-2-3 2-3-2-3 2V3z M9 7h6 M9 11h6 M9 15h3",
  wallet: "M20 8V5H4a2 2 0 0 0 0 4h16v11H4a2 2 0 0 1-2-2V7 M16 12h6v5h-6z",
  history: "M3 11a9 9 0 1 1 2 7 M3 4v7h7 M12 7v5l3 2",
  users:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z",
  logout: "M9 21H4V3h5 M9 12h12 M17 8l4 4-4 4",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  search: "M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0z",
  menu: "M4 6h16 M4 12h16 M4 18h16",
  x: "m6 6 12 12 M6 18 18 6",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
  eyeOff:
    "m3 3 18 18 M10.5 5.1 12 5c6 0 10 7 10 7a21 21 0 0 1-3 4 M6 6a22 22 0 0 0-4 6s4 7 10 7a12 12 0 0 0 5-1 M10 10a3 3 0 0 0 4 4",
  chevron: "m9 5 7 7-7 7",
  check: "m5 12 4 4 10-10",
  plus: "M12 5v14 M5 12h14",
  filter: "M4 7h16 M7 12h10 M10 17h4",
  lock: "M5 10h14v11H5z M8 10V7a4 4 0 0 1 8 0v3 M12 14v3",
  sparkle: "m12 3 2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6L12 3z",
  alert: "m12 3 10 18H2L12 3z M12 9v4 M12 17v.01",
  download: "M12 3v12 m-5-5 5 5 5-5 M4 16v5h16v-5",
  refresh:
    "M20 7a9 9 0 0 0-15-2L2 8 M2 3v5h5 M4 17a9 9 0 0 0 15 2l3-3 M22 21v-5h-5",
} as const;
export type IconName = keyof typeof paths;
export default function Icon({
  name,
  size = 20,
  style,
}: {
  name: IconName;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <path d={paths[name]} />
    </svg>
  );
}
