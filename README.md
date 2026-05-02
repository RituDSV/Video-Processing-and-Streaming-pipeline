# Video-Processing-and-Streaming-pipeline
Video Processing and Streaming pipeline - using tech stack like postgres, redis Bull, Kafka, NextJS and NestJS

npm install -g @nestjs/cli

npm run build --workspace packages/shared


npm exec prisma generate --workspace apps/api

npm exec prisma generate --workspace apps/worker 
npm exec prisma generate --workspace apps/worker --schema=../api/src/infra/db/prisma/schema.prisma


/videos/:id
/videos/:id/play
/videos/:id/manifest
/videos/:id/thumbnails


✅ What you can test without a UI
Using Postman + logs + filesystem + DB, you can verify:

✅ Video upload endpoint
✅ File streaming to disk
✅ Kafka video.uploaded event emission
✅ Worker consumption
✅ Redis idempotency
✅ ffmpeg execution
✅ Metadata extraction
✅ Renditions persisted in DB

That’s the entire system.

 docker run -it --rm confluentinc/cp-kafka kafka-storage random-uuid

npm run start:dev --workspace apps/api
npm run start:dev --workspace apps/worker

![alt text](image.png)