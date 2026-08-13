import Link from "next/link";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type RankingItem = {
  rank: number;
  id: string;
  name: string;
  avatarUrl?: string | null;
  xp: number;
  level: number;
  coins?: number;
  className?: string;
};

const rankingRowGrid =
  "grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5";

export function RankingList({
  items,
  kidFriendly = false,
  showClass = true,
  linkStudents = true,
}: {
  items: RankingItem[];
  kidFriendly?: boolean;
  showClass?: boolean;
  linkStudents?: boolean;
}) {
  return (
    <ol className="space-y-2">
      {items.map((item) => {
        const metaParts = [
          showClass && item.className ? item.className : null,
          `Nv. ${item.level}`,
          item.coins !== undefined ? `${item.coins.toLocaleString("pt-BR")} moedas` : null,
        ].filter(Boolean);

        return (
          <li
            key={item.id}
            className={cn(
              rankingRowGrid,
              "rounded-xl p-3",
              kidFriendly ? "border-2 border-indigo-100 bg-white" : "bg-slate-50"
            )}
          >
            <span
              className={cn(
                "row-span-2 flex shrink-0 items-center justify-center self-center rounded-full bg-indigo-600 font-bold text-white",
                kidFriendly ? "h-10 w-10 text-base" : "h-8 w-8 text-sm"
              )}
              aria-hidden="true"
            >
              {item.rank}
            </span>

            <div className="row-span-2 shrink-0 self-center">
              <ProfileAvatar name={item.name} avatarUrl={item.avatarUrl} size={kidFriendly ? "md" : "sm"} />
            </div>

            <div className="min-w-0 self-center">
              {linkStudents ? (
                <Link
                  href={`/dashboard/alunos/${item.id}`}
                  className="block truncate font-medium text-indigo-600 hover:underline"
                >
                  {item.name}
                </Link>
              ) : (
                <p className="block truncate font-medium text-slate-900">{item.name}</p>
              )}
            </div>

            <div className="shrink-0 self-center text-right">
              <p className="whitespace-nowrap font-bold text-indigo-600">
                {item.xp.toLocaleString("pt-BR")} XP
              </p>
            </div>

            {metaParts.length > 0 && (
              <p className="col-span-2 col-start-3 truncate text-xs text-slate-500">{metaParts.join(" · ")}</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function RankingTableRows({ items }: { items: RankingItem[] }) {
  return (
    <>
      {items.map((item) => (
        <tr key={item.id} className="border-b border-slate-100">
          <td className="py-3 pr-4 font-medium">{item.rank}</td>
          <td className="max-w-[12rem] py-3 pr-4 sm:max-w-none">
            <UserIdentityCompact item={item} />
          </td>
          <td className="hidden max-w-[8rem] truncate py-3 pr-4 sm:table-cell">{item.className}</td>
          <td className="py-3 pr-4">
            <Badge>Nv. {item.level}</Badge>
          </td>
          <td className="whitespace-nowrap py-3 font-semibold text-indigo-600">
            {item.xp.toLocaleString("pt-BR")}
          </td>
        </tr>
      ))}
    </>
  );
}

/** @deprecated use RankingTableRows */
export function RankingTable({ items }: { items: RankingItem[] }) {
  return (
    <tbody>
      <RankingTableRows items={items} />
    </tbody>
  );
}

function UserIdentityCompact({ item }: { item: RankingItem }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <ProfileAvatar name={item.name} avatarUrl={item.avatarUrl} size="xs" className="shrink-0" />
      <Link href={`/dashboard/alunos/${item.id}`} className="block min-w-0 truncate text-indigo-600 hover:underline">
        {item.name}
      </Link>
    </div>
  );
}
