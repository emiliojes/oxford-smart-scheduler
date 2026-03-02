-- DropForeignKey
ALTER TABLE "Assignment" DROP CONSTRAINT "Assignment_gradeId_fkey";

-- AlterTable
ALTER TABLE "Assignment" ALTER COLUMN "gradeId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE SET NULL ON UPDATE CASCADE;
