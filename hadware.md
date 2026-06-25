# Dokumentasi Hardware: Sistem Timbangan Pintar (ESP-A & ESP-B)

Dokumen ini menjelaskan arsitektur, hubungan, dan alur kerja antara dua mikrokontroler ESP32 (`espA` dan `espB`) yang digunakan dalam sistem timbangan pintar terintegrasi RFID dan IoT.

## 1. Hubungan ESP-A dan ESP-B

Kedua modul ESP32 ini memiliki peran yang dipisah (decoupled) agar kinerja sistem lebih stabil dan tidak saling membebani:
*   **ESP-A (Bluetooth Gateway):** Dikhususkan untuk menangani komunikasi Bluetooth Low Energy (BLE) yang seringkali intensif dan membutuhkan *real-time scanning*.
*   **ESP-B (Main Controller & IoT):** Berfungsi sebagai otak utama yang mengurus antarmuka pengguna (OLED), pembacaan identitas (RFID), dan komunikasi dua arah ke server (WiFi & WebSocket).

**Jalur Komunikasi:**
Kedua ESP ini berkomunikasi satu arah menggunakan pin **Serial UART (Hardware Serial2)**. 
*   **ESP-A (TX: GPIO17)** ──Kabel Data──> **ESP-B (RX: GPIO16)**
*   **ESP-A (GND)** ────────Kabel GND───> **ESP-B (GND)**

---

## 2. Skema Pin dan Wiring (Pinout)

Sistem ini menggunakan dua mikrokontroler ESP32 dengan pengkabelan sebagai berikut:

### Komunikasi Antar ESP32 (UART)
| ESP-A (Bluetooth) | ESP-B (Main Controller) | Keterangan |
| :--- | :--- | :--- |
| TX (GPIO 17) | RX (GPIO 16) | Mengirim data pengukuran |
| RX (GPIO 16) | TX (GPIO 17) | (Opsional, saat ini hanya searah) |
| GND | GND | Wajib disambung agar referensi tegangan sama |

### Modul RFID (RC522) -> ESP-B
Komunikasi menggunakan antarmuka **SPI**.
| Pin RC522 | Pin ESP-B | Keterangan |
| :--- | :--- | :--- |
| SDA / SS | GPIO 5 | Chip Select / Slave Select |
| SCK | GPIO 18 | Serial Clock |
| MOSI | GPIO 23 | Master Out Slave In |
| MISO | GPIO 19 | Master In Slave Out |
| RST | GPIO 4 | Reset (Jangan gunakan 22 karena dipakai OLED) |
| 3.3V | 3.3V | Power (Tegangan wajib 3.3V) |
| GND | GND | Ground |

### Layar OLED (SH1106 1.3" 128x64) -> ESP-B
Komunikasi menggunakan antarmuka **I2C**.
| Pin OLED | Pin ESP-B | Keterangan |
| :--- | :--- | :--- |
| SDA | GPIO 21 | Serial Data |
| SCL | GPIO 22 | Serial Clock |
| VCC | 3.3V | Power |
| GND | GND | Ground |

### Tombol (Push Button) -> ESP-B
| Pin Tombol | Pin ESP-B | Keterangan |
| :--- | :--- | :--- |
| Kaki 1 | GPIO 13 | Pin Input Pullup (Tombol HOLD/Reset) |
| Kaki 2 | GND | Trigger aktif LOW saat ditekan |

---

## 3. Fungsi dan Alur Kerja ESP-A (Pengambil Data BLE)

File: `espA.ino`

1.  **Scanning & Koneksi BLE:** ESP-A secara terus-menerus memindai perangkat BLE di sekitarnya untuk mencari timbangan dengan nama `SENSSUN Growth`. Setelah ditemukan, ESP-A akan melakukan koneksi ke perangkat tersebut.
2.  **Berlangganan Data (Notify):** Setelah terhubung, ESP-A mendengarkan (subscribe) pada karakteristik khusus (UUID: `0000fff1...`) untuk menerima notifikasi secara otomatis setiap kali timbangan mengukur atau datanya stabil.
3.  **Parsing Data Mentah (Hex):** Saat data masuk (`notifyCallback`), ESP-A menerima *array of bytes* (`uint8_t* data`) dari timbangan. Susunan data *byte* dari timbangan diurai sebagai berikut:
    *   **Berat Badan (kg):** Diambil dari index ke-2 dan ke-3 dalam *array* data (`data[2]` dan `data[3]`). Dua *byte* tersebut digabungkan (di-*shift* 8 bit) menjadi satu angka `uint16_t`, lalu dibagi `1000.0f` untuk mendapatkan angka aktual dalam satuan kilogram (kg).
    *   **Tinggi Badan (cm):** Diambil dari index ke-6 dan ke-7 (`data[6]` dan `data[7]`). Sama seperti berat, dua *byte* ini digabungkan menjadi `uint16_t` lalu dibagi `10.0f` untuk mendapatkan angka dalam satuan sentimeter (cm).
    *   **Kalkulasi BMI:** ESP-A akan menghitung *Body Mass Index* secara internal menggunakan rumus standar `BMI = Berat(kg) / (Tinggi(m) * Tinggi(m))`.
4.  **Pengiriman via UART:** Data yang sudah matang dan mudah dibaca kemudian dirakit menjadi satu baris teks sederhana (contoh: `BERAT:15.200;TINGGI:102.5;BMI:14.5\n`) lalu dikirimkan ke ESP-B melalui pin TX UART.

---

## 4. Fungsi dan Alur Kerja ESP-B (Main Controller & IoT)

File: `espB.ino`

ESP-B adalah titik kumpul dari semua fitur perangkat keras dan pengirim data akhir ke *cloud*. Berikut adalah penjabaran fungsinya:

### A. Mengambil Data RFID (MFRC522)
*   Menggunakan antarmuka **SPI** (Pin SCK=18, MISO=19, MOSI=23, SS=5).
*   Secara terus-menerus memantau apakah ada kartu atau *tag* RFID anak yang ditempelkan ke sensor.
*   Jika terdeteksi, ia membaca **UID (Unique ID)** kartu tersebut. Terdapat mekanisme *cooldown* 3 detik agar kartu yang sama tidak terbaca berkali-kali secara instan saat ditahan.

### B. Menampilkan di Layar (OLED SH1106)
*   Menggunakan antarmuka **I2C** (SDA=21, SCL=22).
*   Layar berfungsi sebagai indikator visual yang dinamis:
    *   **Status Sistem:** Menampilkan status koneksi WiFi, koneksi WebSocket, alamat IP, atau Mode AP saat awal dinyalakan.
    *   **Identifikasi Kartu:** Menampilkan UID Kartu saat baru saja di-tap dan menunggu respon server.
    *   **Nama Anak:** Menampilkan nama anak (selama 10 detik) setelah mendapatkan balasan/konfirmasi dari server IoT.
    *   **Data Pengukuran:** Menampilkan *Berat, Tinggi, dan BMI* yang dikirim dari ESP-A. Layar ini tampil jika tidak sedang mengutamakan tampilan nama anak.

### C. Komunikasi IoT (WebSocket)
ESP-B terhubung ke server *backend* menggunakan protokol **WebSocket (Secure / WSS)**. Ini membuat pertukaran data terjadi secara *real-time* dan sangat cepat.
1.  **Kirim UID:** Saat RFID di-tap, UID langsung dilempar ke server (Topik: `.../idcard|UID`).
2.  **Menerima Nama Anak:** Server memeriksa UID tersebut di database. Jika terdaftar, server membalas (mengirim topik `.../childname`) berisi nama anak yang bersangkutan. ESP-B menangkap data ini dan menampilkannya di OLED.
3.  **Kirim Data Timbangan:** Saat ESP-B menerima data teks ukur dari ESP-A melalui UART, ESP-B akan memecah (parse) kembali teks tersebut. Jika sistem tidak sedang di-*pause* (tombol HOLD mati), data tersebut langsung disiarkan ke server WebSocket satu per satu untuk topik berat, tinggi, dan bmi. Halaman web/frontend yang juga terhubung ke WebSocket akan langsung berkedip menampilkan angka ukur tanpa perlu me-refresh halaman.

### D. Fitur Tambahan (Konfigurasi & Tombol Pintar)
*   **WiFiManager:** Jika ESP-B baru dipasang atau gagal terhubung ke router WiFi, ia otomatis membuat Hotspot (AP Mode) bernama `ESP32_PENTING_Config`. Anda dapat terhubung ke *hotspot* ini melalui HP untuk mengatur SSID dan Password WiFi baru, serta mengisi konfigurasi alamat Server IoT (Host, Port, Prefix Topik). Setingan ini tersimpan di memori internal ESP.
*   **Tombol Fisik (GPIO 13):**
    *   **Tekan Singkat (< 5 detik):** Mengaktifkan/mematikan fitur **HOLD**. Jika fitur HOLD aktif, data angka dari timbangan akan *ditahan* dan tidak akan terkirim ke server (berguna ketika anak sedang banyak bergerak di atas timbangan sehingga angkanya belum akurat).
    *   **Tekan Lama (> 10 detik):** Melakukan **Factory Reset WiFi**. Alat akan menghapus memori WiFi yang tersimpan lalu *restart* untuk masuk kembali ke mode AP.

---

## 5. Desain Case (Perangkat Keras)

Berikut adalah rancangan 3D dari wadah (*case*) untuk merakit komponen-komponen *hardware* ke dalam satu kesatuan sistem:

![Desain Case 1](/img/Desain%20Case.png)

![Desain Case 2](/img/desain2.png)
