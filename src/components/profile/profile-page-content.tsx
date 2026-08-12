"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2,
  Calendar,
  ChevronRight,
  Coins,
  GraduationCap,
  Heart,
  Mail,
  Shield,
  Star,
  User,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CosmeticBackgroundCard } from "@/components/cosmetics/cosmetic-background";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { UpdateProfileForm } from "@/components/profile/update-profile-form";
import { ChangePasswordForm } from "@/components/profile/change-password-form";
import { ROLE_LABELS, type UserRole } from "@/lib/constants";
import { cn } from "@/lib/utils";

const relationLabels: Record<string, string> = {
  mae: "Mãe",
  pai: "Pai",
  responsavel: "Responsável",
  avo: "Avô/Avó",
};

type ProfilePayload = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl: string | null;
  city?: string | null;
  state?: string | null;
  createdAt: string;
  school: { name: string; slug: string; city: string | null; state: string | null } | null;
  student: {
    id: string;
    enrollmentCode: string;
    level: number;
    xpTotal: number;
    coins: number;
    equippedFrame?: string | null;
    equippedBackground?: string | null;
    classGroup: { name: string } | null;
  } | null;
  parentLinks: {
    relation: string;
    student: {
      id: string;
      user: { fullName: string; avatarUrl: string | null };
      classGroup: { name: string } | null;
    };
  }[];
  taughtClasses: { id: string; name: string }[];
  notificationCount: number;
  createdAtLabel: string;
};

type TabId = "overview" | "edit" | "security";

const tabs: { id: TabId; label: string; short: string }[] = [
  { id: "overview", label: "Visão geral", short: "Conta" },
  { id: "edit", label: "Dados pessoais", short: "Dados" },
  { id: "security", label: "Segurança", short: "Senha" },
];

export function ProfilePageContent({ profile }: { profile: ProfilePayload }) {
  const [tab, setTab] = useState<TabId>("overview");
  const role = profile.role;

  return (
    <div className="space-y-6 sm:space-y-8">
      <nav
        className="sticky top-[var(--app-header-offset)] z-20 -mx-[var(--page-padding,1rem)] border-b border-slate-200 bg-white/95 px-[var(--page-padding,1rem)] backdrop-blur md:static md:mx-0 md:hidden md:border-0 md:bg-transparent md:px-0"
        aria-label="Seções do perfil"
      >
        <div className="touch-scroll-x flex gap-1 pb-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "min-h-11 shrink-0 border-b-2 px-4 text-sm font-medium transition-colors",
                tab === t.id
                  ? "border-[color:var(--school-primary,#4f46e5)] text-[color:var(--school-primary,#4f46e5)]"
                  : "border-transparent text-slate-500"
              )}
              aria-current={tab === t.id ? "page" : undefined}
            >
              {t.short}
            </button>
          ))}
        </div>
      </nav>

      <CosmeticBackgroundCard
        backgroundKey={profile.student?.equippedBackground}
        className={cn(
          tab !== "overview" && "hidden md:block"
        )}
      >
        <div className="flex flex-col items-center gap-5 p-5 text-center sm:flex-row sm:items-center sm:p-8 sm:text-left">
          <ProfileAvatar
            name={profile.fullName}
            avatarUrl={profile.avatarUrl}
            frameKey={profile.student?.equippedFrame}
            size="xl"
          />
          <div className="min-w-0 w-full flex-1 space-y-3">
            <div>
              <h2 className="text-xl font-bold sm:text-2xl">{profile.fullName}</h2>
              <p className="mt-1 flex items-center justify-center gap-2 break-all text-sm opacity-90 sm:justify-start">
                <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                {profile.email}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
              <Badge>{ROLE_LABELS[role]}</Badge>
              {profile.school && (
                <Badge variant="secondary" className="max-w-full gap-1">
                  <Building2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">{profile.school.name}</span>
                </Badge>
              )}
              <Badge variant="secondary" className="gap-1">
                <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
                Desde {profile.createdAtLabel}
              </Badge>
            </div>
          </div>
        </div>
      </CosmeticBackgroundCard>

      <div
        className={cn(
          "grid gap-6 md:grid-cols-2",
          tab === "edit" || tab === "security" ? "grid" : "hidden md:grid"
        )}
      >
        <Card className={cn(tab === "edit" ? "block" : "hidden md:block")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-indigo-600" aria-hidden="true" />
              Dados pessoais
            </CardTitle>
            <CardDescription>Nome e foto exibidos no sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <UpdateProfileForm
              fullName={profile.fullName}
              avatarUrl={profile.avatarUrl}
              city={profile.city}
              state={profile.state}
              showLocation={role === "teacher"}
            />
          </CardContent>
        </Card>

        <Card className={cn(tab === "security" ? "block" : "hidden md:block")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-indigo-600" aria-hidden="true" />
              Segurança
            </CardTitle>
            <CardDescription>Altere sua senha de acesso</CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </div>

      <div className={cn("grid gap-6 md:grid-cols-2", tab !== "overview" && "hidden md:grid")}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informações da conta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <InfoRow label="E-mail" value={profile.email} breakAll />
            <InfoRow label="Tipo de acesso" value={ROLE_LABELS[role]} />
            {profile.school && (
              <>
                <InfoRow label="Instituição" value={profile.school.name} />
                <InfoRow label="Código da escola" value={profile.school.slug} mono />
              </>
            )}
            <InfoRow label="Conta criada em" value={profile.createdAtLabel} />
          </CardContent>
        </Card>
        <RoleStatsCard profile={profile} role={role} />
      </div>

      <Card className={cn(tab !== "overview" && "hidden md:block")}>
        <CardHeader>
          <CardTitle className="text-lg">Atalhos</CardTitle>
          <CardDescription>Acesso rápido às áreas do sistema</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {role === "student" && profile.student && (
            <>
              <ShortcutLink href="/dashboard/aluno" label="Meu painel" />
              <ShortcutLink href={`/dashboard/alunos/${profile.student.id}/boletim`} label="Meu boletim" />
              <ShortcutLink href="/dashboard/loja" label="Loja de moedas" />
            </>
          )}
          {role === "parent" && <ShortcutLink href="/dashboard/responsavel" label="Meus filhos" />}
          {role === "teacher" && <ShortcutLink href="/dashboard/professor" label="Minhas turmas" />}
          {(role === "admin" || role === "director") && (
            <>
              <ShortcutLink href="/dashboard" label="Painel da escola" />
              <ShortcutLink href="/dashboard/configuracoes" label="Configurações" />
            </>
          )}
          <ShortcutLink href="/dashboard/notificacoes" label={`Notificações (${profile.notificationCount})`} />
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
  breakAll,
}: {
  label: string;
  value: string;
  mono?: boolean;
  breakAll?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-slate-100 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span
        className={cn(
          "font-medium text-slate-900 sm:max-w-[60%] sm:text-right",
          mono && "font-mono text-sm",
          breakAll && "break-all"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function ShortcutLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex min-h-12 items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition hover:border-indigo-200 hover:bg-indigo-50/50 active:bg-indigo-50"
    >
      {label}
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
    </Link>
  );
}

function RoleStatsCard({ profile, role }: { profile: ProfilePayload; role: UserRole }) {
  if (role === "student" && profile.student) {
    const s = profile.student;
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <GraduationCap className="h-5 w-5 text-indigo-600" aria-hidden="true" />
            Seu progresso
          </CardTitle>
        </CardHeader>
        <CardContent className="stat-grid gap-3">
          <StatBox label="Turma" value={s.classGroup?.name ?? "Sem turma"} className="col-span-2 sm:col-span-1" />
          <StatBox label="Matrícula" value={s.enrollmentCode} mono />
          <StatBox label="Nível" value={`Nv. ${s.level}`} icon={Star} />
          <StatBox label="XP total" value={String(s.xpTotal)} icon={Star} />
          <StatBox label="Moedas" value={String(s.coins)} icon={Coins} className="col-span-2 sm:col-span-1" />
        </CardContent>
      </Card>
    );
  }

  if (role === "parent" && profile.parentLinks.length > 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Heart className="h-5 w-5 text-rose-600" aria-hidden="true" />
            Filhos vinculados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {profile.parentLinks.map((link) => (
            <Link
              key={link.student.id}
              href={`/dashboard/responsavel/filho/${link.student.id}`}
              className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-100 px-4 py-3 text-sm transition hover:bg-slate-50 active:bg-slate-100"
            >
              <ProfileAvatar
                name={link.student.user.fullName}
                avatarUrl={link.student.user.avatarUrl}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <span className="font-medium text-slate-900">{link.student.user.fullName}</span>
                <span className="block text-slate-500">
                  {relationLabels[link.relation] ?? link.relation}
                  {link.student.classGroup?.name ? ` · ${link.student.classGroup.name}` : ""}
                </span>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (role === "teacher" && profile.taughtClasses.length > 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-emerald-600" aria-hidden="true" />
            Suas turmas ({profile.taughtClasses.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {profile.taughtClasses.map((c) => (
            <Badge key={c.id} variant="secondary">
              {c.name}
            </Badge>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Resumo</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-slate-600">
        {role === "parent" && profile.parentLinks.length === 0 && (
          <p>Nenhum filho vinculado ainda. Peça à secretaria para associar seu perfil.</p>
        )}
        {role === "teacher" && profile.taughtClasses.length === 0 && (
          <p>Você ainda não está atribuído a nenhuma turma.</p>
        )}
        {(role === "admin" || role === "director") && profile.school && (
          <p>
            Você gerencia <strong>{profile.school.name}</strong>
            {profile.school.city ? ` em ${profile.school.city}` : ""}.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function StatBox({
  label,
  value,
  mono,
  icon: Icon,
  className,
}: {
  label: string;
  value: string;
  mono?: boolean;
  icon?: typeof Star;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl bg-slate-50 p-4", className)}>
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={cn(
          "mt-1 flex items-center gap-1 font-bold text-slate-900",
          mono && "break-all font-mono text-sm"
        )}
      >
        {Icon && <Icon className="h-4 w-4 shrink-0 text-indigo-600" aria-hidden="true" />}
        <span className="min-w-0">{value}</span>
      </p>
    </div>
  );
}
