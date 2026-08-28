import { prisma } from "@/lib/db";
import { cache } from "react";
import { PERIODS as DEFAULT_PERIODS } from "@/lib/constants";
import { CACHE_TTL, cacheGetOrSet } from "@/lib/runtime-cache";

export type ExercisePreset = {
  label: string;
  xp: number;
  coins: number;
  points: number;
};

export type CalendarEvent = {
  date: string;
  label: string;
  kind?: "exam" | "event" | "meeting";
};

export type SchoolHoliday = {
  date: string;
  label: string;
};

export type SchoolSettings = {
  xp: {
    perGradePoint: number;
    gradeBonusThreshold: number;
    gradeBonus: number;
    attendancePresent: number;
    attendanceLate: number;
    badgeUnlock: number;
    xpPerLevel: number;
  };
  missions: {
    defaultXp: number;
    defaultCoins: number;
  };
  exercises: {
    autoGradeEnabled: boolean;
    postGradeToBulletin: boolean;
    presets: ExercisePreset[];
  };
  academic: {
    subjects: string[];
    periods: string[];
    maxGrade: number;
    passGrade: number;
  };
  notifications: {
    parentsOnGrade: boolean;
    parentsOnAbsence: boolean;
    parentsOnMission: boolean;
    parentsOnShop: boolean;
    parentsOnExercise: boolean;
    parentsOnExerciseGraded: boolean;
    parentsOnOccurrence: boolean;
    parentsOnAnnouncement: boolean;
    studentOnAbsence: boolean;
    teacherOnSubmission: boolean;
  };
  shop: {
    teachersCanFulfill: boolean;
    requireStock: boolean;
  };
  calendar: {
    yearStart: string;
    yearEnd: string;
    classStartTime: string;
    classEndTime: string;
    schoolDays: number[];
    holidays: SchoolHoliday[];
    events: CalendarEvent[];
  };
  branding: {
    primaryColor: string;
    accentColor: string;
    tagline: string;
  };
  classGoals: {
    defaultTargetPercent: number;
    defaultXpBonus: number;
    defaultCoinBonus: number;
    autoAward: boolean;
  };
  diary: {
    notifyParentsOnOccurrence: boolean;
  };
  finance: {
    tuitionXp: number;
    tuitionCoins: number;
    perfectAttendanceXp: number;
    perfectAttendanceCoins: number;
    minSchoolDaysForPerfectMonth: number;
  };
  trails: {
    enabled: boolean;
    completionXpBonus: number;
  };
  ai: {
    enabled: boolean;
    assistantName: string;
  };
  gradeRules: {
    /** Peso por disciplina (1 = padrão) */
    subjectWeights: Record<string, number>;
    recoveryEnabled: boolean;
    /** Períodos fechados  -  notas não editáveis */
    closedPeriods: string[];
  };
  gamificationSeason: {
    enabled: boolean;
    name: string;
    startDate: string;
    endDate: string;
  };
  auth: {
    teacherSignupMode: "invite_only" | "open";
    studentSelfSignupMinAge: number;
    allowStudentPinLogin: boolean;
  };
  documents: {
    /** Modelo HTML exclusivo desta instituição (novos contratos). */
    contractTemplateHtml: string | null;
    contractTemplateSourceName: string | null;
    contractTemplateUpdatedAt: string | null;
  };
  permissions: {
    teacher: {
      createGrades: boolean;
      recordAttendance: boolean;
      createExercises: boolean;
      gradeExercises: boolean;
      createMissions: boolean;
      completeMissions: boolean;
      viewReports: boolean;
      accessShop: boolean;
      fulfillShop: boolean;
      manageDiary: boolean;
      createAnnouncements: boolean;
      createTrails: boolean;
      createClassGoals: boolean;
      createClasses: boolean;
      adjustPoints: boolean;
    };
    director: {
      editSettings: boolean;
      manageTeachers: boolean;
      manageRewards: boolean;
      adjustPoints: boolean;
    };
    student: {
      redeemShop: boolean;
      requestMission: boolean;
    };
    parent: {
      viewChildData: boolean;
    };
  };
};

export const DEFAULT_SCHOOL_SETTINGS: SchoolSettings = {
  xp: {
    perGradePoint: 5,
    gradeBonusThreshold: 9,
    gradeBonus: 50,
    attendancePresent: 10,
    attendanceLate: 5,
    badgeUnlock: 25,
    xpPerLevel: 300,
  },
  missions: {
    defaultXp: 100,
    defaultCoins: 30,
  },
  exercises: {
    autoGradeEnabled: true,
    postGradeToBulletin: true,
    presets: [
      { label: "Leve", xp: 50, coins: 15, points: 5 },
      { label: "Médio", xp: 80, coins: 25, points: 10 },
      { label: "Prova", xp: 150, coins: 40, points: 10 },
    ],
  },
  academic: {
    subjects: [],
    periods: [...DEFAULT_PERIODS],
    maxGrade: 10,
    passGrade: 7,
  },
  notifications: {
    parentsOnGrade: true,
    parentsOnAbsence: true,
    parentsOnMission: true,
    parentsOnShop: true,
    parentsOnExercise: true,
    parentsOnExerciseGraded: true,
    parentsOnOccurrence: true,
    parentsOnAnnouncement: true,
    studentOnAbsence: true,
    teacherOnSubmission: true,
  },
  shop: {
    teachersCanFulfill: true,
    requireStock: false,
  },
  calendar: {
    yearStart: "2026-02-01",
    yearEnd: "2026-12-15",
    classStartTime: "07:30",
    classEndTime: "12:00",
    schoolDays: [1, 2, 3, 4, 5],
    holidays: [
      { date: "2026-04-21", label: "Tiradentes" },
      { date: "2026-09-07", label: "Independência" },
    ],
    events: [
      { date: "2026-03-15", label: "Reunião de pais", kind: "meeting" },
    ],
  },
  branding: {
    primaryColor: "#4f46e5",
    accentColor: "#f59e0b",
    tagline: "Aprender, evoluir, conquistar",
  },
  classGoals: {
    defaultTargetPercent: 80,
    defaultXpBonus: 100,
    defaultCoinBonus: 50,
    autoAward: true,
  },
  diary: {
    notifyParentsOnOccurrence: true,
  },
  finance: {
    tuitionXp: 80,
    tuitionCoins: 25,
    perfectAttendanceXp: 60,
    perfectAttendanceCoins: 15,
    minSchoolDaysForPerfectMonth: 10,
  },
  trails: {
    enabled: true,
    completionXpBonus: 75,
  },
  ai: {
    enabled: true,
    assistantName: "Ecohub IA",
  },
  gradeRules: {
    subjectWeights: {},
    recoveryEnabled: true,
    closedPeriods: [],
  },
  gamificationSeason: {
    enabled: false,
    name: "Temporada 2026.1",
    startDate: "2026-02-01",
    endDate: "2026-06-30",
  },
  auth: {
    teacherSignupMode: "invite_only",
    studentSelfSignupMinAge: 18,
    allowStudentPinLogin: true,
  },
  documents: {
    contractTemplateHtml: null,
    contractTemplateSourceName: null,
    contractTemplateUpdatedAt: null,
  },
  permissions: {
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
      adjustPoints: true,
    },
    director: {
      editSettings: true,
      manageTeachers: true,
      manageRewards: true,
      adjustPoints: true,
    },
    student: {
      redeemShop: true,
      requestMission: true,
    },
    parent: {
      viewChildData: true,
    },
  },
};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function deepMerge<T extends Record<string, unknown>>(base: T, patch: unknown): T {
  if (!isObject(patch)) return base;
  const out = { ...base };
  for (const key of Object.keys(base) as (keyof T)[]) {
    const b = base[key];
    const p = patch[key as string];
    if (Array.isArray(b)) {
      if (Array.isArray(p) && p.length > 0) {
        out[key] = p as T[keyof T];
      }
    } else if (isObject(b as Record<string, unknown>)) {
      out[key] = deepMerge(b as Record<string, unknown>, p) as T[keyof T];
    } else if (p !== undefined) {
      out[key] = p as T[keyof T];
    }
  }
  return out;
}

export function parseSchoolSettings(raw: string | null | undefined): SchoolSettings {
  if (!raw || raw === "{}") return structuredClone(DEFAULT_SCHOOL_SETTINGS);
  try {
    const parsed = JSON.parse(raw) as unknown;
    return deepMerge(
      structuredClone(DEFAULT_SCHOOL_SETTINGS) as unknown as Record<string, unknown>,
      parsed
    ) as unknown as SchoolSettings;
  } catch {
    return structuredClone(DEFAULT_SCHOOL_SETTINGS);
  }
}

export const getSchoolSettings = cache(async (schoolId: string | null | undefined): Promise<SchoolSettings> => {
  if (!schoolId) return structuredClone(DEFAULT_SCHOOL_SETTINGS);
  const settings = await cacheGetOrSet(`school:${schoolId}:settings`, CACHE_TTL.schoolSettings, async () => {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { settings: true },
    });
    return parseSchoolSettings(school?.settings);
  });
  return structuredClone(settings);
});

export async function getSchoolSettingsForStudent(studentId: string): Promise<SchoolSettings> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { user: { select: { schoolId: true } } },
  });
  return getSchoolSettings(student?.user.schoolId);
}

export function mergeSchoolSettings(
  current: SchoolSettings,
  patch: Partial<SchoolSettings>
): SchoolSettings {
  return deepMerge(
    structuredClone(current) as unknown as Record<string, unknown>,
    patch
  ) as unknown as SchoolSettings;
}

export function stringifySchoolSettings(settings: SchoolSettings): string {
  return JSON.stringify(settings);
}
