import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { UsersManager, type UserRow } from "@/components/admin/users-manager";

const formatador = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

export default async function FuncionariosPage() {
  const eu = await requireAdmin();
  const rows = await query<{
    id: number;
    username: string;
    name: string;
    role: "admin" | "funcionario";
    created_at: Date;
  }>("SELECT id, username, name, role, created_at FROM users ORDER BY role, name");

  const users: UserRow[] = rows.map((u) => ({
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    criadoEm: formatador.format(new Date(u.created_at)),
  }));

  return (
    <div className="space-y-7">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)]">Funcionários</h1>
        <p className="mt-1.5 text-[15px] text-[var(--text-muted)]">
          Quem pode entrar no painel.
        </p>
      </header>
      <UsersManager users={users} meuId={eu.id} />
    </div>
  );
}
