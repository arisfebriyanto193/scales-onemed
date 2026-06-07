/**
 * ============================================================
 *  ESP32-A — BLE Client SENSSUN GROWTH
 *  Alur: Timbangan BLE → ESP32-A → (UART TX→RX) → ESP32-B
 * ============================================================
 *
 *  Koneksi UART ke ESP32-B:
 *    ESP32-A TX2 (GPIO17) ──→ ESP32-B RX2 (GPIO16)
 *    ESP32-A GND           ──→ ESP32-B GND
 *
 *  Format data yang dikirim ke espB via Serial2:
 *    "BERAT:xx.x;TINGGI:xxx.x;BMI:xx.x\n"
 *
 *  Library yang diperlukan:
 *    - BLE (bawaan ESP32 Arduino Core)
 * ============================================================
 */

#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEScan.h>
#include <BLEAdvertisedDevice.h>
#include <BLEClient.h>
#include <BLERemoteCharacteristic.h>
#include <BLERemoteService.h>

// ─────────────────── Konfigurasi BLE ────────────────────────
static const char* TARGET_NAME       = "SENSSUN Growth";
static const char* SERVICE_UUID      = "0000fff0-0000-1000-8000-00805f9b34fb";
static const char* CHAR_RX_UUID      = "0000fff1-0000-1000-8000-00805f9b34fb";  // NOTIFY
static const char* CHAR_TX_UUID      = "0000fff2-0000-1000-8000-00805f9b34fb";  // WRITE
static const uint32_t SCAN_TIMEOUT_SEC  = 15;
static const uint32_t RECONNECT_DELAY_MS = 5000;

// ─────────────────── Konfigurasi UART ke espB ───────────────
// Serial2: TX=GPIO17, RX=GPIO16  (RX tidak dipakai di sini)
#define UART_BAUD   115200
#define UART_TX_PIN 17
#define UART_RX_PIN 16

// ─────────────────── State global ───────────────────────────
static BLEClient*               pClient    = nullptr;
static BLERemoteCharacteristic* pCharRX    = nullptr;
static BLEAdvertisedDevice*     pTargetDev = nullptr;
static bool deviceFound  = false;
static bool isConnected  = false;
static bool doConnect    = false;
static bool doScan       = true;

// ─────────────────── Parse & Kirim via UART ─────────────────
void parseAndSend(uint8_t* data, size_t len) {
  Serial.println("──────────────────────────────────────────────");

  // Cetak HEX mentah
  Serial.print("HEX: ");
  for (size_t i = 0; i < len; i++) {
    if (data[i] < 0x10) Serial.print("0");
    Serial.print(data[i], HEX);
    Serial.print(" ");
  }
  Serial.println();

  if (len < 8) {
    Serial.println("[!] Paket terlalu pendek, skip.");
    return;
  }

  uint16_t rawWeight = ((uint16_t)data[2] << 8) | data[3];
  uint16_t rawHeight = ((uint16_t)data[6] << 8) | data[7];

  float weightKg = rawWeight / 1000.0f;
  float heightCm = rawHeight / 10.0f;

  Serial.printf("Berat  : %.3f kg\n", weightKg);
  Serial.printf("Tinggi : %.1f cm\n", heightCm);

  float bmi = 0.0f;
  if (heightCm > 50.0f && weightKg > 1.0f) {
    float heightM = heightCm / 100.0f;
    bmi = weightKg / (heightM * heightM);
    Serial.printf("BMI    : %.1f\n", bmi);
  }

  // ── Kirim ke espB via UART Serial2 ─────────────────────
  // Format: "BERAT:xx.xxx;TINGGI:xxx.x;BMI:xx.x\n"
  String msg = "BERAT:" + String(weightKg, 3) +
               ";TINGGI:" + String(heightCm, 1) +
               ";BMI:" + String(bmi, 1) + "\n";

  Serial2.print(msg);
  Serial.print("[UART→espB] Terkirim: ");
  Serial.print(msg);
}

// ─────────────────── Callback notifikasi BLE ────────────────
static void notifyCallback(
  BLERemoteCharacteristic* pChar,
  uint8_t* pData,
  size_t length,
  bool isNotify)
{
  parseAndSend(pData, length);
}

// ─────────────────── Callback koneksi BLE ───────────────────
class ClientCallbacks : public BLEClientCallbacks {
  void onConnect(BLEClient* pclient) override {
    isConnected = true;
    Serial.println("[BLE] Terhubung.");
  }
  void onDisconnect(BLEClient* pclient) override {
    isConnected = false;
    doScan      = true;
    Serial.println("[BLE] Terputus. Akan scan ulang...");
  }
};

// ─────────────────── Callback scan BLE ──────────────────────
class ScanCallbacks : public BLEAdvertisedDeviceCallbacks {
  void onResult(BLEAdvertisedDevice advertisedDevice) override {
    String devName = advertisedDevice.getName().c_str();
    if (devName.indexOf(TARGET_NAME) >= 0) {
      Serial.printf("[SCAN] Ditemukan: %s  (%s)\n",
        devName.c_str(),
        advertisedDevice.getAddress().toString().c_str());
      BLEDevice::getScan()->stop();
      pTargetDev  = new BLEAdvertisedDevice(advertisedDevice);
      deviceFound = true;
      doConnect   = true;
    }
  }
};

// ─────────────────── Fungsi koneksi BLE ─────────────────────
bool connectToDevice() {
  Serial.printf("[BLE] Menghubungkan ke %s ...\n",
    pTargetDev->getAddress().toString().c_str());

  if (pClient != nullptr) { delete pClient; pClient = nullptr; }

  pClient = BLEDevice::createClient();
  pClient->setClientCallbacks(new ClientCallbacks());

  if (!pClient->connect(pTargetDev)) {
    Serial.println("[BLE] Gagal connect.");
    return false;
  }

  BLERemoteService* pService = pClient->getService(BLEUUID(SERVICE_UUID));
  if (!pService) {
    Serial.println("[BLE] Service tidak ditemukan.");
    pClient->disconnect();
    return false;
  }

  pCharRX = pService->getCharacteristic(BLEUUID(CHAR_RX_UUID));
  if (!pCharRX) {
    Serial.println("[BLE] Char RX tidak ditemukan.");
    pClient->disconnect();
    return false;
  }

  if (pCharRX->canNotify()) {
    pCharRX->registerForNotify(notifyCallback);
    Serial.println("[BLE] Subscribe NOTIFY berhasil.");
  } else {
    Serial.println("[BLE] Char RX tidak support NOTIFY.");
    pClient->disconnect();
    return false;
  }

  Serial.println("══════════════════════════════════════════════");
  Serial.println("  ESP32-A aktif — menunggu data dari timbangan...");
  Serial.println("══════════════════════════════════════════════");
  return true;
}

// ─────────────────── Setup ──────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(500);

  // Inisialisasi UART ke ESP32-B
  Serial2.begin(UART_BAUD, SERIAL_8N1, UART_RX_PIN, UART_TX_PIN);
  Serial.println("[UART] Serial2 siap (TX=GPIO17, RX=GPIO16).");

  Serial.println("\n==============================================");
  Serial.println("  ESP32-A — BLE SENSSUN GROWTH");
  Serial.println("  Data → espB via UART Serial2");
  Serial.println("==============================================");

  BLEDevice::init("ESP32A_SENSSUN_CLIENT");
  Serial.println("[BLE] Init OK.");
}

// ─────────────────── Loop ───────────────────────────────────
void loop() {
  // ── Scan BLE ──────────────────────────────────────────
  if (doScan) {
    doScan      = false;
    deviceFound = false;
    doConnect   = false;

    Serial.printf("\n[SCAN] Mencari '%s' ... (timeout %us)\n",
      TARGET_NAME, SCAN_TIMEOUT_SEC);

    BLEScan* pScan = BLEDevice::getScan();
    pScan->setAdvertisedDeviceCallbacks(new ScanCallbacks());
    pScan->setActiveScan(true);
    pScan->setInterval(100);
    pScan->setWindow(99);
    pScan->start(SCAN_TIMEOUT_SEC, false);

    if (!deviceFound) {
      Serial.printf("[SCAN] '%s' tidak ditemukan. Coba lagi...\n", TARGET_NAME);
      delay(RECONNECT_DELAY_MS);
      doScan = true;
    }
  }

  // ── Hubungkan BLE ─────────────────────────────────────
  if (doConnect && !isConnected) {
    doConnect = false;
    if (!connectToDevice()) {
      Serial.println("[BLE] Koneksi gagal. Scan ulang...");
      delay(RECONNECT_DELAY_MS);
      doScan = true;
    }
  }

  // ── Cek koneksi masih hidup ───────────────────────────
  if (isConnected && pClient != nullptr) {
    if (!pClient->isConnected()) {
      isConnected = false;
      doScan      = true;
      Serial.println("[BLE] Koneksi putus. Scan ulang...");
    }
  }

  delay(500);
}
