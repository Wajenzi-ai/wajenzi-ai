import Link from "next/link";

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Wajenzi.ai home">
      wajenzi<span>.ai</span>
    </Link>
  );
}
