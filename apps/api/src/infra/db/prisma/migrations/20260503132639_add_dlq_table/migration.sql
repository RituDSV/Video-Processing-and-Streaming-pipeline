-- CreateTable
CREATE TABLE "VideoDeadLetter" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "errorMessage" TEXT NOT NULL,
    "retryCount" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoDeadLetter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoDeadLetter_videoId_idx" ON "VideoDeadLetter"("videoId");
