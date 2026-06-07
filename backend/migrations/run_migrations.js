// =====================================================
// run_migrations.js
// Script untuk menjalankan semua file migrasi SQL
// Aplikasi: PENTING (Pencegahan Stunting Terintegrasi)
// Tanggal: 2026-06-04
// =====================================================
// Cara pakai:
//   1. Pastikan MySQL sudah berjalan
//   2. Buat file .env di folder backend/ (lihat .env.example)
//   3. Jalankan: node migrations/run_migrations.js
// =====================================================

require('dotenv').config({ path: __dirname + '/../.env' });
const mysql = require('mysql2/promise');
const fs    = require('fs');
const path  = require('path');

// ── Konfigurasi koneksi dari environment variables ──
const DB_CONFIG = {
  host    : process.env.DB_HOST     || 'localhost',
  port    : parseInt(process.env.DB_PORT || '3306'),
  user    : process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'penting_db',
  multipleStatements: true, // wajib untuk eksekusi banyak statement
};

// ── Daftar file migrasi (urutan penting!) ──
const MIGRATION_FILES = [
  '001_create_users.sql',
  '002_create_children.sql',
  '003_create_measurements.sql',
  '004_create_nutritional_status.sql',
  '005_create_growth_references.sql',
  '006_create_temp_measurements.sql',
  '007_add_rfid_to_children.sql',
  '008_update_measurements_constraints.sql',
];

// ── Warna terminal untuk output ──
const RESET  = '\x1b[0m';
const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN   = '\x1b[36m';
const BOLD   = '\x1b[1m';

async function createDatabase(connection) {
  const dbName = process.env.DB_NAME || 'penting_db';
  console.log(`${CYAN}📦 Membuat database "${dbName}" jika belum ada...${RESET}`);
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${dbName}\` 
     CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await connection.query(`USE \`${dbName}\``);
  console.log(`${GREEN}✅ Database "${dbName}" siap.${RESET}\n`);
}

async function createMigrationsTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`_migrations\` (
      \`id\`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`filename\`   VARCHAR(255) NOT NULL,
      \`executed_at\` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uq_filename\` (\`filename\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function isAlreadyMigrated(connection, filename) {
  const [rows] = await connection.query(
    'SELECT id FROM `_migrations` WHERE `filename` = ?',
    [filename]
  );
  return rows.length > 0;
}

async function markAsMigrated(connection, filename) {
  await connection.query(
    'INSERT INTO `_migrations` (`filename`) VALUES (?)',
    [filename]
  );
}

async function runMigrations() {
  console.log(`\n${BOLD}${CYAN}╔══════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}${CYAN}║   PENTING - Database Migration Runner    ║${RESET}`);
  console.log(`${BOLD}${CYAN}╚══════════════════════════════════════════╝${RESET}\n`);

  // Koneksi awal tanpa specify database (untuk bisa CREATE DATABASE)
  const initConfig = { ...DB_CONFIG, database: undefined };
  let connection;

  try {
    connection = await mysql.createConnection(initConfig);
    console.log(`${GREEN}✅ Terhubung ke MySQL: ${DB_CONFIG.host}:${DB_CONFIG.port}${RESET}`);

    // Buat database jika belum ada
    await createDatabase(connection);

    // Buat tabel tracking migrasi
    await createMigrationsTable(connection);

    let successCount = 0;
    let skipCount    = 0;
    let errorCount   = 0;

    for (const filename of MIGRATION_FILES) {
      const filePath = path.join(__dirname, filename);

      // Cek apakah file ada
      if (!fs.existsSync(filePath)) {
        console.log(`${YELLOW}⚠️  File tidak ditemukan: ${filename} (dilewati)${RESET}`);
        continue;
      }

      // Cek apakah sudah dijalankan
      const migrated = await isAlreadyMigrated(connection, filename);
      if (migrated) {
        console.log(`${YELLOW}⏭️  Sudah dijalankan sebelumnya: ${filename}${RESET}`);
        skipCount++;
        continue;
      }

      // Baca dan jalankan SQL
      try {
        console.log(`${CYAN}🔄 Menjalankan: ${filename}...${RESET}`);
        const sql = fs.readFileSync(filePath, 'utf8');
        await connection.query(sql);
        await markAsMigrated(connection, filename);
        console.log(`${GREEN}✅ Berhasil: ${filename}${RESET}`);
        successCount++;
      } catch (err) {
        console.error(`${RED}❌ Gagal: ${filename}${RESET}`);
        console.error(`${RED}   Error: ${err.message}${RESET}`);
        errorCount++;
        // Lanjut ke file berikutnya meskipun ada error
      }
    }

    // Ringkasan hasil
    console.log(`\n${BOLD}─────────────────────────────────────────${RESET}`);
    console.log(`${BOLD}📊 Ringkasan Migrasi:${RESET}`);
    console.log(`   ${GREEN}✅ Berhasil : ${successCount} file${RESET}`);
    console.log(`   ${YELLOW}⏭️  Dilewati  : ${skipCount} file${RESET}`);
    console.log(`   ${RED}❌ Gagal    : ${errorCount} file${RESET}`);
    console.log(`${BOLD}─────────────────────────────────────────${RESET}\n`);

    if (errorCount === 0) {
      console.log(`${GREEN}${BOLD}🎉 Semua migrasi selesai dengan sukses!${RESET}\n`);
    } else {
      console.log(`${RED}${BOLD}⚠️  Ada ${errorCount} migrasi yang gagal. Cek error di atas.${RESET}\n`);
      process.exit(1);
    }

  } catch (err) {
    console.error(`${RED}${BOLD}💥 Koneksi ke MySQL gagal!${RESET}`);
    console.error(`${RED}   Host     : ${DB_CONFIG.host}:${DB_CONFIG.port}${RESET}`);
    console.error(`${RED}   User     : ${DB_CONFIG.user}${RESET}`);
    console.error(`${RED}   Database : ${DB_CONFIG.database}${RESET}`);
    console.error(`${RED}   Error    : ${err.message}${RESET}\n`);
    console.error(`${YELLOW}💡 Tips: Pastikan .env sudah dikonfigurasi dengan benar${RESET}\n`);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log(`${CYAN}🔌 Koneksi MySQL ditutup.${RESET}`);
    }
  }
}

// Jalankan!
runMigrations();
