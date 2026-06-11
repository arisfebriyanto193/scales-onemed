# scales-onemed

## Cara Menjalankan Program

### 1. Persiapan Database & Backend
Pastikan MySQL sudah berjalan di komputer Anda.

1. Buka terminal dan masuk ke folder `backend`:
   ```bash
   cd backend
   ```
2. Install semua dependencies:
   ```bash
   npm install
   ```
3. Buat file `.env` berdasarkan file contoh (salin isi `.env.example` ke file baru bernama `.env`):
   ```bash
   cp .env.example .env
   ```
   *Sesuaikan konfigurasi database (DB_USER, DB_PASSWORD, dll) di file `.env` jika diperlukan.*
4. Jalankan migrasi database untuk membuat tabel dan data awal (seeding):
   ```bash
   node migrations/run_migrations.js
   ```
5. Jalankan server backend:
   ```bash
   npm run dev
   ```
   *(Backend akan berjalan di port yang ditentukan di `.env`, biasanya `http://localhost:5000`)*

### 2. Persiapan Frontend
Buka tab terminal baru untuk menjalankan frontend.

1. Masuk ke folder `frontend`:
   ```bash
   cd frontend
   ```
2. Install semua dependencies:
   ```bash
   npm install
   ```
3. Pastikan ada file `.env.local` (jika diperlukan) untuk mengatur URL API backend (contoh: `NEXT_PUBLIC_API_URL=http://localhost:5000/api`).
4. Jalankan aplikasi frontend:
   ```bash
   npm run dev
   ```
   *(Frontend akan berjalan di port default Next.js, biasanya `http://localhost:3000`)*

Sekarang Anda bisa mengakses aplikasi melalui browser di `http://localhost:3000`.
