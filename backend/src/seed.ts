/**
 * Script per popolare il database con dati iniziali
 * Esegui con: npm run db:seed
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // Crea alcuni tavoli di esempio
  const tables = [
    { id: 'A1', code: 'ALPHA01' },
    { id: 'A2', code: 'ALPHA02' },
    { id: 'B1', code: 'BRAVO01' },
    { id: 'B2', code: 'BRAVO02' },
    { id: 'C1', code: 'CHARLIE01' },
  ];

  console.log('📋 Creating tables...');
  for (const table of tables) {
    await prisma.table.upsert({
      where: { id: table.id },
      update: {},
      create: table
    });
    console.log(`  ✅ Table ${table.id} created (code: ${table.code})`);
  }

  // Inizializza sessione di gioco
  console.log('\n🎮 Initializing game session...');
  await prisma.gameSession.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, status: 'not_started' }
  });
  console.log('  ✅ Game session initialized');

  // Inizializza countdown
  console.log('\n⏱️ Initializing countdown...');
  await prisma.countdown.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, active: false }
  });
  console.log('  ✅ Countdown initialized');

  console.log('\n✨ Seeding complete!\n');
  console.log('📊 Database summary:');
  console.log(`  - Tables: ${tables.length}`);
  console.log(`  - Game status: not_started`);
  console.log(`  - Countdown: inactive`);

  console.log('\n🔑 Table codes for testing:');
  for (const table of tables) {
    console.log(`  Table ${table.id}: ${table.code}`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
