/**
 * seed.ts — Development-only seed data
 *
 * Run with:  npm run db:seed  (from packages/db)
 *            or
 *            npm run db:seed --workspace=db  (from root)
 *
 * This inserts a test user + one document so you can develop against real rows
 * without going through the full upload flow every time.
 *
 * ⚠️  Never run against production.
 */
import { db } from './src/client';
import { users, documents } from './src/schema';

async function main() {
    console.log('🌱 Seeding database...');

    // 1. Insert a test user
    const [user] = await db
        .insert(users)
        .values({
            clerkId: 'user_test_seed_001',
            email: 'dev@askpdf.local',
            name: 'Dev User',
            isActive: true,
            plan: 'free',
        })
        .onConflictDoNothing()   // idempotent: safe to re-run
        .returning();

    if (!user) {
        console.log('ℹ️  Seed user already exists — skipping document insert.');
        process.exit(0);
    }

    // 2. Insert a test document owned by that user
    await db
        .insert(documents)
        .values({
            userId: user.id,
            fileName: 'drizzle-docs.pdf',
            fileSize: 204800,           // 200 KB
            fileType: 'application/pdf',
            pageCount: 12,
            s3Key: 'uploads/user_test_seed_001/drizzle-docs.pdf',
            status: 'completed',
        })
        .onConflictDoNothing();

    console.log('✅ Seed complete. Inserted user:', user.email);
    process.exit(0);
}

main().catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});