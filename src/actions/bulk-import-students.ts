"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/security/password-policy";
import { logAuditEvent } from "@/lib/audit-logger";
import { normalizeWhatsAppNumber } from "@/lib/whatsapp-billing";

export interface StudentImportRecord {
  studentName: string;
  birthDate?: string | null;
  parentName: string;
  parentPhone?: string | null;
  parentEmail?: string | null;
  className: string;
}

export async function bulkImportStudentsAction(records: StudentImportRecord[]) {
  const user = await requireSession(["admin", "director", "secretary"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  if (!Array.isArray(records) || records.length === 0) {
    return { error: "Nenhum registro fornecido para importação." };
  }

  const defaultPasswordHash = await hashPassword("Mudar123!");
  const schoolId = user.schoolId;

  try {
    const result = await prisma.$transaction(async (tx) => {
      let importedCount = 0;
      let createdClassesCount = 0;

      const classMap = new Map<string, string>();
      const existingClasses = await tx.classGroup.findMany({
        where: { schoolId },
        select: { id: true, name: true },
      });
      for (const c of existingClasses) {
        classMap.set(c.name.trim().toLowerCase(), c.id);
      }

      for (let i = 0; i < records.length; i++) {
        const item = records[i];
        const studentName = item.studentName?.trim();
        const parentName = item.parentName?.trim();
        const className = item.className?.trim();

        if (!studentName || !parentName || !className) {
          continue;
        }

        // 1. Resolve Turma
        const classKey = className.toLowerCase();
        let classId = classMap.get(classKey);
        if (!classId) {
          const newClass = await tx.classGroup.create({
            data: {
              schoolId,
              name: className,
              gradeLevel: className,
              year: new Date().getFullYear(),
            },
          });
          classId = newClass.id;
          classMap.set(classKey, classId);
          createdClassesCount++;
        }

        // 2. Resolve Responsável
        const parentEmail = item.parentEmail?.trim().toLowerCase() || null;
        const rawParentPhone = item.parentPhone?.trim() || "";
        const parentPhone = normalizeWhatsAppNumber(rawParentPhone);

        let parentUser = null;

        if (parentEmail) {
          parentUser = await tx.user.findFirst({
            where: { schoolId, email: parentEmail },
          });
        }

        if (!parentUser && parentPhone) {
          parentUser = await tx.user.findFirst({
            where: { schoolId, phone: parentPhone, role: "parent" },
          });
        }

        if (!parentUser) {
          const generatedEmail = parentEmail || `resp_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}@escola.local`;
          parentUser = await tx.user.create({
            data: {
              fullName: parentName,
              email: generatedEmail,
              passwordHash: defaultPasswordHash,
              role: "parent",
              phone: parentPhone,
              schoolId,
            },
          });
        }

        // 3. Criar Aluno (User + Student)
        const studentEnrollmentCode = `MAT-${Date.now().toString().slice(-6)}-${i + 1}`;
        const studentEmail = `aluno_${studentEnrollmentCode.toLowerCase()}@escola.local`;

        let parsedBirthDate: Date | null = null;
        if (item.birthDate) {
          const parts = item.birthDate.split(/[-/]/);
          if (parts.length === 3) {
            if (parts[0].length === 4) {
              parsedBirthDate = new Date(`${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`);
            } else if (parts[2].length === 4) {
              parsedBirthDate = new Date(`${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`);
            }
          }
        }

        const studentUser = await tx.user.create({
          data: {
            fullName: studentName,
            email: studentEmail,
            passwordHash: defaultPasswordHash,
            role: "student",
            schoolId,
          },
        });

        const newStudent = await tx.student.create({
          data: {
            userId: studentUser.id,
            enrollmentCode: studentEnrollmentCode,
            birthDate: parsedBirthDate,
            classId,
            provisionedById: user.id,
          },
        });

        // 4. Vincular Responsável x Aluno
        await tx.parentStudent.upsert({
          where: {
            parentId_studentId: {
              parentId: parentUser.id,
              studentId: newStudent.id,
            },
          },
          create: {
            parentId: parentUser.id,
            studentId: newStudent.id,
            relation: "responsavel",
          },
          update: {},
        });

        // 5. Matrícula ativa na turma
        await tx.studentClassEnrollment.upsert({
          where: {
            studentId_classId: {
              studentId: newStudent.id,
              classId,
            },
          },
          create: {
            studentId: newStudent.id,
            classId,
            status: "active",
          },
          update: {
            status: "active",
          },
        });

        importedCount++;
      }

      return { importedCount, createdClassesCount };
    });

    await logAuditEvent({
      schoolId: user.schoolId,
      actorId: user.id,
      actorRole: user.role,
      action: "STUDENT_BULK_IMPORT",
      entityType: "Student",
      diffAfter: {
        totalRecordsProcessed: records.length,
        studentsImported: result.importedCount,
        classesCreated: result.createdClassesCount,
      },
    });

    revalidatePath("/dashboard/matriculas");
    revalidatePath("/dashboard/alunos");
    revalidatePath("/dashboard/turmas");

    return {
      success: true,
      importedCount: result.importedCount,
      createdClassesCount: result.createdClassesCount,
      message: `${result.importedCount} aluno(s) importado(s) e ${result.createdClassesCount} turma(s) criada(s) com sucesso!`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Ocorreu um erro ao processar a importação em massa.";
    console.error("Erro na importação em massa:", err);
    return { error: errorMsg };
  }
}
