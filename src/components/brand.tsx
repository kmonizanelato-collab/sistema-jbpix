import Image from "next/image";

/** Marca JBPIXS. O selo tem contraste próprio, então funciona nos dois temas. */
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <Image
        src="/logo.png"
        alt="JBPIXS"
        width={512}
        height={527}
        priority
        className="size-9 shrink-0 object-contain"
      />
      {!compact && (
        <span className="text-[15px] font-bold tracking-tight text-[var(--text)]">JBPIXS</span>
      )}
    </div>
  );
}
