import { requireUser } from "@/lib/auth";
import { listThemes } from "@/lib/catalog";
import { Shell } from "@/components/shell";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const themes = await listThemes();

  return (
    <Shell
      user={{ name: user.name, role: user.role }}
      themes={themes.map((t) => ({ slug: t.slug, name: t.name, icon: t.icon }))}
    >
      {children}
    </Shell>
  );
}
