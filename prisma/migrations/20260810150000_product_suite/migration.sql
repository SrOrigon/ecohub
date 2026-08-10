-- CreateTable
CREATE TABLE "AnnouncementPoll" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "announcementId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    CONSTRAINT "AnnouncementPoll_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AnnouncementPoll_announcementId_key" ON "AnnouncementPoll"("announcementId");

CREATE TABLE "AnnouncementPollOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pollId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "AnnouncementPollOption_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "AnnouncementPoll" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "AnnouncementPollVote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pollId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "votedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnnouncementPollVote_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "AnnouncementPoll" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AnnouncementPollVote_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "AnnouncementPollOption" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AnnouncementPollVote_pollId_userId_key" ON "AnnouncementPollVote"("pollId", "userId");

CREATE TABLE "EnrollmentApplication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "birthDate" DATETIME NOT NULL,
    "parentName" TEXT NOT NULL,
    "parentEmail" TEXT NOT NULL,
    "parentPhone" TEXT,
    "gradeLevel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" DATETIME,
    "studentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EnrollmentApplication_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EnrollmentApplication_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EnrollmentApplication_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "EnrollmentApplication_schoolId_status_idx" ON "EnrollmentApplication"("schoolId", "status");

CREATE TABLE "AuthorizationForm" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "classId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "deadline" DATETIME,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuthorizationForm_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AuthorizationForm_classId_fkey" FOREIGN KEY ("classId") REFERENCES "ClassGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuthorizationForm_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "AuthorizationResponse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "formId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "studentId" TEXT,
    "signedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    CONSTRAINT "AuthorizationResponse_formId_fkey" FOREIGN KEY ("formId") REFERENCES "AuthorizationForm" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AuthorizationResponse_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AuthorizationResponse_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AuthorizationResponse_formId_parentId_studentId_key" ON "AuthorizationResponse"("formId", "parentId", "studentId");

CREATE TABLE "ChatThread" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "subject" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChatThread_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChatThread_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChatThread_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ChatThread_schoolId_studentId_parentId_key" ON "ChatThread"("schoolId", "studentId", "parentId");
CREATE INDEX "ChatThread_schoolId_idx" ON "ChatThread"("schoolId");

CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "threadId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" DATETIME,
    CONSTRAINT "ChatMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ChatThread" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ChatMessage_threadId_createdAt_idx" ON "ChatMessage"("threadId", "createdAt");

CREATE TABLE "ClassScheduleSlot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "room" TEXT,
    CONSTRAINT "ClassScheduleSlot_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClassScheduleSlot_classId_fkey" FOREIGN KEY ("classId") REFERENCES "ClassGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ClassScheduleSlot_classId_weekday_idx" ON "ClassScheduleSlot"("classId", "weekday");

CREATE TABLE "IssuedDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "issuedById" TEXT NOT NULL,
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IssuedDocument_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IssuedDocument_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IssuedDocument_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "AiChatLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiChatLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AiChatLog_userId_createdAt_idx" ON "AiChatLog"("userId", "createdAt");
