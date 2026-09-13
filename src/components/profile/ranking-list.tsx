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

        const rankBadgeStyle =
          item.rank === 1
            ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-xs shadow-amber-500/30 ring-2 ring-amber-400/30"
            : item.rank === 2
            ? "bg-gradient-to-br from-slate-300 to-slate-500 text-white shadow-xs"
            : item.rank === 3
            ? "bg-gradient-to-br from-amber-600 to-amber-800 text-white shadow-xs"
            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300";

        return (
          <li
            key={item.id}
            className={cn(
              rankingRowGrid,
              "rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm transition-all duration-150 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:shadow-2xs",
              kidFriendly && "border-2 border-indigo-100 bg-white"
            )}
          >
            <span
              className={cn(
                "row-span-2 flex shrink-0 items-center justify-center self-center rounded-full font-bold",
                rankBadgeStyle,
                kidFriendly ? "h-10 w-10 text-base" : "h-7 w-7 text-xs"
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
      {items.map((item) => {
        const rankBadgeStyle =
          item.rank === 1
            ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-2xs ring-2 ring-amber-400/30"
            : item.rank === 2
            ? "bg-gradient-to-br from-slate-300 to-slate-500 text-white shadow-2xs"
            : item.rank === 3
            ? "bg-gradient-to-br from-amber-600 to-amber-800 text-white shadow-2xs"
            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400";

        return (
          <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800/80 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
            <td className="py-3 pr-4 font-medium">
              <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold", rankBadgeStyle)}>
                {item.rank}
              </span>
            </td>
            <td className="max-w-[12rem] py-3 pr-4 sm:max-w-none">
              <UserIdentityCompact item={item} />
            </td>
            <td className="hidden max-w-[8rem] truncate py-3 pr-4 text-xs font-medium text-slate-500 sm:table-cell">{item.className}</td>
            <td className="py-3 pr-4">
              <Badge variant="secondary" className="text-xs font-semibold">Nv. {item.level}</Badge>
            </td>
            <td className="whitespace-nowrap py-3 font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
              {item.xp.toLocaleString("pt-BR")} XP
            </td>
          </tr>
        );
      })}
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
