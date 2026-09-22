"use server";

import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getSchoolSettings } from "@/lib/school-settings";

export interface PedagogicalSummaryResponse {
  success?: boolean;
  summary?: string;
  error?: string;
  data?: {
    studentName: string;
    freqRate: number;
    strongSubjects: string[];
    needAttentionSubjects: string[];
  };
}

/**
 * Server Action para geração automática de parecer descritivo pedagógico
 * baseado no histórico real do aluno (notas, frequências e ocorrências).
 */
export async function generatePedagogicalSummary(
  studentId: string
): Promise<PedagogicalSummaryResponse> {
  try {
    const user = await requireSession([
      "admin",
      "director",
      "secretary",
      "teacher",
      "parent",
    ]);

    if (!studentId || typeof studentId !== "string") {
      return { error: "Identificador do estudante não informado." };
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
          },
        },
        classGroup: {
          select: {
            name: true,
            gradeLevel: true,
          },
        },
        grades: {
          orderBy: { createdAt: "desc" },
          take: 80,
          select: {
            subject: true,
            value: true,
            maxValue: true,
            period: true,
          },
        },
        attendance: {
          orderBy: { date: "desc" },
          take: 120,
          select: {
            status: true,
            date: true,
          },
        },
        occurrences: {
          orderBy: { date: "desc" },
          take: 15,
          select: {
            kind: true,
            description: true,
            date: true,
          },
        },
      },
    });

    if (!student) {
      return { error: "Estudante não encontrado no sistema." };
    }

    const settings = user.schoolId ? await getSchoolSettings(user.schoolId) : null;
    const passGrade = settings?.academic.passGrade ?? 6.0;
    const maxGrade = settings?.academic.maxGrade ?? 10.0;

    // 1. Processamento e cálculo de médias por disciplina
    const subjectMap = new Map<string, { total: number; count: number }>();
    for (const g of student.grades) {
      const normalizedValue =
        g.maxValue > 0 ? (g.value / g.maxValue) * maxGrade : g.value;
      const current = subjectMap.get(g.subject) ?? { total: 0, count: 0 };
      current.total += normalizedValue;
      current.count += 1;
      subjectMap.set(g.subject, current);
    }

    const subjectStats = Array.from(subjectMap.entries()).map(([subject, data]) => ({
      subject,
      average: Number((data.total / data.count).toFixed(1)),
    }));

    subjectStats.sort((a, b) => b.average - a.average);

    const strongSubjects = subjectStats.filter((s) => s.average >= passGrade);
    const needAttentionSubjects = subjectStats.filter((s) => s.average < passGrade);

    // 2. Frequência recente
    const totalAttendance = student.attendance.length;
    const presentCount = student.attendance.filter(
      (a) => a.status === "present" || a.status === "justified"
    ).length;
    const lateCount = student.attendance.filter((a) => a.status === "late").length;
    const absentCount = student.attendance.filter((a) => a.status === "absent").length;
    const freqRate =
      totalAttendance > 0
        ? Math.round(((presentCount + lateCount) / totalAttendance) * 100)
        : 100;

    // 3. Ocorrências comportamentais e registros de destaque
    const positiveOccurrences = student.occurrences.filter(
      (o) =>
        o.kind === "praise" ||
        o.kind === "elogio" ||
        /elogio|destaque|participa|parabéns/i.test(o.description)
    );
    const attentionOccurrences = student.occurrences.filter(
      (o) =>
        o.kind === "warning" ||
        o.kind === "advertencia" ||
        /atencao|atenção|indisciplina|desatento|conversa|falta de foco/i.test(
          o.description
        )
    );

    const firstName = student.user.fullName.split(" ")[0];

    // Bloco A: Pontos fortes e disciplinas de maior destaque
    let blockA = "";
    if (strongSubjects.length > 0) {
      const topList = strongSubjects
        .slice(0, 3)
        .map((s) => `${s.subject} (média ${s.average})`)
        .join(", ");
      blockA = `O(A) estudante ${firstName} tem apresentado notável comprometimento acadêmico, destacando-se com excelente rendimento nas disciplinas de ${topList}. Demonstra facilidade na apreensão dos conteúdos, interesse pelas discussões em aula e cooperação contínua com os educadores e colegas de turma.`;
      if (positiveOccurrences.length > 0) {
        blockA += ` Destacam-se também registros pedagógicos elogiosos quanto à sua proatividade e espírito colaborativo.`;
      }
    } else {
      blockA = `O(A) estudante ${firstName} demonstra potencial de desenvolvimento e disposição para aprender, participando das atividades propostas e mantendo convivência respeitosa no ambiente escolar.`;
    }

    // Bloco B: Habilidades e matérias que demandam atenção/reforço
    let blockB = "";
    if (needAttentionSubjects.length > 0) {
      const needList = needAttentionSubjects
        .map((s) => `${s.subject} (média ${s.average})`)
        .join(", ");
      blockB = `Identificou-se a necessidade de intervenção pedagógica e reforço direcionado nas matérias de: ${needList}. É essencial intensificar a realização dos exercícios de fixação, esclarecer dúvidas pontuais com os professores e priorizar a revisão dos tópicos estruturais dessas disciplinas.`;
    } else {
      blockB = `O estudante mantém rendimento sólido e satisfatório em todo o currículo pedagógico, sem registros de defasagens conceituais significativas nas matérias avaliadas.`;
    }

    if (freqRate < 75) {
      blockB += ` Ressalta-se que a assiduidade recente está em ${freqRate}% (${absentCount} faltas computadas), sendo urgente a redução das ausências para não comprometer o ritmo de assimilação curricular.`;
    } else if (lateCount >= 3) {
      blockB += ` Observaram-se pontuais atrasos na entrada (${lateCount} registros), recomendando-se atenção aos horários de início das aulas.`;
    } else if (attentionOccurrences.length > 0) {
      blockB += ` Recomenda-se ainda atenção ao foco e disciplina durante as explicações em sala para evitar dispersões.`;
    }

    // Bloco C: Recomendação acolhedora para os responsáveis apoiarem a rotina de estudos em casa
    let blockC = `Para potencializar o desenvolvimento de ${firstName}, recomendamos aos responsáveis estruturar uma rotina acolhedora e constante em casa, com 30 a 45 minutos diários de estudo em local calmo, além do acompanhamento regular das tarefas pelo portal escolar. Dialogar sobre o cotidiano das aulas e incentivar a leitura são atitudes que fortalecem a autoconfiança estudantil. A união entre família e escola é a chave do sucesso!`;

    const formattedSummary = `1. Pontos Fortes e Destaques Acadêmicos:
${blockA}

2. Habilidades e Matérias que Demandam Atenção:
${blockB}

3. Recomendações e Parceria com a Família:
${blockC}`;

    return {
      success: true,
      summary: formattedSummary,
      data: {
        studentName: student.user.fullName,
        freqRate,
        strongSubjects: strongSubjects.map((s) => s.subject),
        needAttentionSubjects: needAttentionSubjects.map((s) => s.subject),
      },
    };
  } catch (error) {
    console.error("[generatePedagogicalSummary] Erro ao sintetizar parecer:", error);
    return {
      error: "Ocorreu uma instabilidade temporária ao sintetizar o parecer pedagógico.",
    };
  }
}
