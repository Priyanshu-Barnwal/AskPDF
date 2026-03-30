import { db } from "./src/client";
import { documents } from "./src/schema";

async function main() {
    await db.insert(documents).values({
        userId: "user-1",
        fileName: "test.pdf",
        s3Key: "test.pdf",
        fileSize: 1024,
        status: "uploaded",
    });
}

main();