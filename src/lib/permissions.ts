import type { UserRole } from "@/lib/constants";
import type { SchoolSettings } from "@/lib/school-settings";

export type PermissionKey =
  | "teacher.createGrades"
  | "teacher.recordAttendance"
  | "teacher.createExercises"
  | "teacher.gradeExercises"
  | "teacher.createMissions"
  | "teacher.completeMissions"
  | "teacher.viewReports"
  | "teacher.accessShop"
  | "teacher.fulfillShop"
  | "teacher.manageDiary"
  | "teacher.createAnnouncements"
  | "teacher.createTrails"
  | "teacher.createClassGoals"
  | "teacher.createClasses"
  | "director.editSettings"
  | "director.manageTeachers"
  | "director.manageRewards"
  | "student.redeemShop"
  | "student.requestMission"
  | "parent.viewChildData";

const DEFAULT_PERMISSIONS: SchoolSettings["permissions"] = {
  teacher: {
    createGrades: true,
    recordAttendance: true,
    createExercises: true,
    gradeExercises: true,
    createMissions: true,
    completeMissions: true,
    viewReports: true,
    accessShop: true,
    fulfillShop: true,
    manageDiary: true,
    createAnnouncements: true,
    createTrails: true,
    createClassGoals: true,
    createClasses: true,
  },
  director: {
    editSettings: true,
    manageTeachers: true,
    manageRewards: true,
  },
  student: {
    redeemShop: true,
    requestMission: true,
  },
  parent: {
    viewChildData: true,
  },
};

export function getDefaultPermissions() {
  return structuredClone(DEFAULT_PERMISSIONS);
}

export function hasPermission(
  role: UserRole,
  settings: SchoolSettings | SchoolSettings["permissions"],
  key: PermissionKey
): boolean {
  if (role === "admin") return true;

  const perms =
    "permissions" in settings && settings.permissions
      ? settings.permissions
      : (settings as SchoolSettings["permissions"]);

  const [group, action] = key.split(".") as [keyof SchoolSettings["permissions"], string];

  if (role === "director") {
    if (group === "director") {
      return perms.director[action as keyof typeof perms.director] ?? true;
    }
    return true;
  }

  if (role === "secretary") {
    if (group === "director" && action === "editSettings") return false;
    return true;
  }

  if (role === "teacher" && group === "teacher") {
    return perms.teacher[action as keyof typeof perms.teacher] ?? false;
  }

  if (role === "student" && group === "student") {
    return perms.student[action as keyof typeof perms.student] ?? false;
  }

  if (role === "parent" && group === "parent") {
    return perms.parent[action as keyof typeof perms.parent] ?? false;
  }

  return false;
}

export function assertPermission(
  role: UserRole,
  settings: SchoolSettings,
  key: PermissionKey,
  message = "Sem permissão para esta ação."
) {
  if (!hasPermission(role, settings, key)) {
    throw new Error(message);
  }
}

export type NavPermission =
  | "teacher.createGrades"
  | "teacher.recordAttendance"
  | "teacher.createExercises"
  | "teacher.createMissions"
  | "teacher.viewReports"
  | "teacher.accessShop"
  | "teacher.manageDiary"
  | "teacher.createAnnouncements"
  | "teacher.createTrails"
  | "teacher.createClassGoals"
  | "teacher.createClasses"
  | "director.manageTeachers"
  | "director.editSettings"
  | "director.manageRewards"
  | "student.redeemShop";

export function canAccessNav(
  role: UserRole,
  permissions: SchoolSettings["permissions"],
  permission?: NavPermission
): boolean {
  if (role === "secretary") {
    if (!permission) return true;
    if (permission === "director.editSettings") return false;
    return true;
  }
  if (!permission) return true;
  return hasPermission(role, permissions, permission);
}

export function canSeeGamificacao(role: UserRole, permissions: SchoolSettings["permissions"]) {
  if (role !== "teacher") return true;
  return (
    hasPermission(role, permissions, "teacher.createMissions") ||
    hasPermission(role, permissions, "teacher.completeMissions")
  );
}

export function canSeeExerciciosStaff(role: UserRole, permissions: SchoolSettings["permissions"]) {
  if (role !== "teacher") return true;
  return (
    hasPermission(role, permissions, "teacher.createExercises") ||
    hasPermission(role, permissions, "teacher.gradeExercises")
  );
}
