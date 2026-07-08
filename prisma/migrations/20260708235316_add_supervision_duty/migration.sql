-- CreateTable
CREATE TABLE "SupervisionDuty" (
    "id" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "dayPattern" TEXT NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "level" TEXT NOT NULL DEFAULT 'SECONDARY',
    "teacherId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupervisionDuty_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SupervisionDuty" ADD CONSTRAINT "SupervisionDuty_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
