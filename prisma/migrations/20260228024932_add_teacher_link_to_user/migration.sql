-- AlterTable
ALTER TABLE "User" ADD COLUMN     "teacherId" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
