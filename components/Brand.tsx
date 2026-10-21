import Link from "next/link";
export default function Brand({
  href = "/",
  subtitle = "WEAR YOUR MAGIC",
}: {
  href?: string;
  subtitle?: string;
}) {
  return (
    <Link className="brand" href={href} aria-label="Purple Cat · Inicio">
      <img src="/logo-purple-cat.png" width="48" height="48" alt="" />
      <span>
        <strong>
          Purple Cat<span className="brand-dot">✦</span>
        </strong>
        <small>{subtitle}</small>
      </span>
    </Link>
  );
}
