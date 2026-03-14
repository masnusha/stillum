-- AlterTable
ALTER TABLE "Track" ADD COLUMN     "buyLink" TEXT,
ADD COLUMN     "isExplicit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recordLabel" TEXT,
ADD COLUMN     "releaseDate" TEXT;
