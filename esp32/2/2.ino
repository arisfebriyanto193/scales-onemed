/**
 * ============================================================
 *  ESP32 BLE Client — SENSSUN GROWTH
 *  Framework : Arduino (ESP32 Arduino Core)
 *  Library   : BLE bawaan ESP32 Arduino Core
 * ============================================================
 *
 *  Target device  : SENSSUN GROWTH
 *  Service UUID   : 0000fff0-0000-1000-8000-00805f9b34fb
 *  Char RX (FFF1) : 0000fff1-0000-1000-8000-00805f9b34fb  (NOTIFY)
 *  Char TX (FFF2) : 0000fff2-0000-1000-8000-00805f9b34fb  (WRITE)
 *
 *  Format paket 13 byte:
 *    FF A5 [W_H] [W_L] [?] [?] [H_H] [H_L] [?] [?] [?] [SEQ] [CHK]
 *    Berat (kg)  = (byte[2]<<8 | byte[3]) / 1000.0
 *    Tinggi (cm) = (byte[6]<<8 | byte[7]) / 10.0
 * ============================================================
 */

#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEScan.h>
#include <BLEAdvertisedDevice.h>
#include <BLEClient.h>
#include <BLERemoteCharacteristic.h>/**
 * ============================================================
 *  ESP32 BLE Client — SENSSUN GROWTH
 *  Framework : Arduino (ESP32 Arduino Core)
 *  Library   : BLE bawaan ESP32 Arduino Core
 * ============================================================
 *
 *  Target device  : SENSSUN GROWTH
 *  Service UUID   : 0000fff0-0000-1000-8000-00805f9b34fb
 *  Char RX (FFF1) : 0000fff1-0000-1000-8000-00805f9b34fb  (NOTIFY)
 *  Char TX (FFF2) : 0000fff2-0000-1000-8000-00805f9b34fb  (WRITE)
 *
 *  Format paket 13 byte:
 *    FF A5 [W_H] [W_L] [?] [?] [H_H] [H_L] [?] [?] [?] [SEQ] [CHK]
 *    Berat (kg)  = (byte[2]<<8 | byte[3]) / 1000.0
 *    Tinggi (cm) = (byte[6]<<8 | byte[7]) / 10.0
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

// ───────────────────── Konfigurasi ──────────────────────────
static const char* TARGET_NAME   = "SENSSUN Growth";
static const char* SERVICE_UUID  = "0000fff0-0000-1000-8000-00805f9b34fb";
static const char* CHAR_RX_UUID  = "0000fff1-0000-1000-8000-00805f9b34fb";  // NOTIFY
static const char* CHAR_TX_UUID  = "0000fff2-0000-1000-8000-00805f9b34fb";  // WRITE
static const uint32_t SCAN_TIMEOUT_SEC = 15;
static const uint32_t RECONNECT_DELAY_MS = 5000;
// ─────────────────────────────────────────────────────────────

// ───────────────────── State global ─────────────────────────
static BLEClient*              pClient    = nullptr;
static BLERemoteCharacteristic* pCharRX   = nullptr;
static BLEAdvertisedDevice*    pTargetDev = nullptr;
static bool deviceFound    = false;
static bool isConnected    = false;
static bool doConnect      = false;
static bool doScan         = true;

// ───────────────── Parsing paket ────────────────────────────
void parseAndPrint(uint8_t* data, size_t len) {
  Serial.println("──────────────────────────────────────────────");

  // Cetak HEX mentah
  Serial.print("HEX: ");
  for (size_t i = 0; i < len; i++) {
    if (data[i] < 0x10) Serial.print("0");
    Serial.print(data[i], HEX);
    Serial.print(" ");
  }
  Serial.println();
  Serial.printf("LEN: %u\n", (unsigned)len);

  if (len < 8) {
    Serial.println("[!] Paket terlalu pendek, skip parse.");
    return;
  }

  uint16_t rawWeight = ((uint16_t)data[2] << 8) | data[3];
  uint16_t rawHeight = ((uint16_t)data[6] << 8) | data[7];

  float weightKg = rawWeight / 1000.0f;
  float heightCm = rawHeight / 10.0f;

  Serial.printf("Berat  : %.1f kg\n", weightKg);
  Serial.printf("Tinggi : %.1f cm\n", heightCm);

  // Hitung BMI jika data valid
  if (heightCm > 50.0f && weightKg > 1.0f) {
    float heightM = heightCm / 100.0f;
    float bmi = weightKg / (heightM * heightM);
    Serial.printf("BMI    : %.1f", bmi);
    if      (bmi < 18.5f) Serial.println("  (Kurus)");
    else if (bmi < 25.0f) Serial.println("  (Normal)");
    else if (bmi < 30.0f) Serial.println("  (Overweight)");
    else                  Serial.println("  (Obesitas)");
  }
}

// ───────────────── Callback notifikasi ──────────────────────
static void notifyCallback(
  BLERemoteCharacteristic* pChar,
  uint8_t* pData,
  size_t length,
  bool isNotify)
{
  parseAndPrint(pData, length);
}

// ───────────────── Callback koneksi ─────────────────────────
class ClientCallbacks : public BLEClientCallbacks {
  void onConnect(BLEClient* pclient) override {
    isConnected = true;
    Serial.println("[BLE] Terhubung.");
  }

  void onDisconnect(BLEClient* pclient) override {
    isConnected = false;
    doScan      = true;       // mulai scan ulang
    Serial.println("[BLE] Terputus. Akan scan ulang...");
  }
};

// ───────────────── Callback scan ────────────────────────────
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

// ───────────────── Fungsi koneksi ───────────────────────────
bool connectToDevice() {
  Serial.printf("[BLE] Menghubungkan ke %s ...\n",
    pTargetDev->getAddress().toString().c_str());

  if (pClient != nullptr) {
    delete pClient;
    pClient = nullptr;
  }

  pClient = BLEDevice::createClient();
  pClient->setClientCallbacks(new ClientCallbacks());

  if (!pClient->connect(pTargetDev)) {
    Serial.println("[BLE] Gagal connect.");
    return false;
  }

  // Cari service FFF0
  BLERemoteService* pService = pClient->getService(BLEUUID(SERVICE_UUID));
  if (pService == nullptr) {
    Serial.printf("[BLE] Service %s tidak ditemukan.\n", SERVICE_UUID);
    pClient->disconnect();
    return false;
  }

  // Cari characteristic FFF1 (NOTIFY)
  pCharRX = pService->getCharacteristic(BLEUUID(CHAR_RX_UUID));
  if (pCharRX == nullptr) {
    Serial.printf("[BLE] Char RX %s tidak ditemukan.\n", CHAR_RX_UUID);
    pClient->disconnect();
    return false;
  }

  // Subscribe notifikasi
  if (pCharRX->canNotify()) {
    pCharRX->registerForNotify(notifyCallback);
    Serial.println("[BLE] Subscribe NOTIFY berhasil.");
  } else {
    Serial.println("[BLE] Char RX tidak support NOTIFY.");
    pClient->disconnect();
    return false;
  }

  Serial.println("══════════════════════════════════════════════");
  Serial.println("  ESP32 BLE Monitor SENSSUN GROWTH — aktif");
  Serial.printf ("  Device  : %s\n", pTargetDev->getName().c_str());
  Serial.printf ("  Address : %s\n", pTargetDev->getAddress().toString().c_str());
  Serial.println("  Menunggu data dari timbangan...");
  Serial.println("══════════════════════════════════════════════");

  return true;
}

// ───────────────── Setup ─────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\n==============================================");
  Serial.println("  ESP32 BLE — SENSSUN GROWTH");
  Serial.println("==============================================");

  BLEDevice::init("ESP32_SENSSUN_CLIENT");
  Serial.println("[BLE] Init OK.");
}

// ───────────────── Loop ──────────────────────────────────────
void loop() {

  // ── Mulai scan ───────────────────────────────────────────
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

  // ── Hubungkan ────────────────────────────────────────────
  if (doConnect && !isConnected) {
    doConnect = false;
    if (!connectToDevice()) {
      Serial.println("[BLE] Koneksi gagal. Scan ulang...");
      delay(RECONNECT_DELAY_MS);
      doScan = true;
    }
  }

  // ── Cek koneksi masih hidup ──────────────────────────────
  if (isConnected && pClient != nullptr) {
    if (!pClient->isConnected()) {
      isConnected = false;
      doScan = true;
      Serial.println("[BLE] Koneksi putus terdeteksi. Scan ulang...");
    }
  }

  delay(500);
}

#include <BLERemoteService.h>

// ───────────────────── Konfigurasi ──────────────────────────
static const char* TARGET_NAME   = "SENSSUN Growth";
static const char* SERVICE_UUID  = "0000fff0-0000-1000-8000-00805f9b34fb";
static const char* CHAR_RX_UUID  = "0000fff1-0000-1000-8000-00805f9b34fb";  // NOTIFY
static const char* CHAR_TX_UUID  = "0000fff2-0000-1000-8000-00805f9b34fb";  // WRITE
static const uint32_t SCAN_TIMEOUT_SEC = 15;
static const uint32_t RECONNECT_DELAY_MS = 5000;
// ─────────────────────────────────────────────────────────────

// ───────────────────── State global ─────────────────────────
static BLEClient*              pClient    = nullptr;
static BLERemoteCharacteristic* pCharRX   = nullptr;
static BLEAdvertisedDevice*    pTargetDev = nullptr;
static bool deviceFound    = false;
static bool isConnected    = false;
static bool doConnect      = false;
static bool doScan         = true;

// ───────────────── Parsing paket ────────────────────────────
void parseAndPrint(uint8_t* data, size_t len) {
  Serial.println("──────────────────────────────────────────────");

  // Cetak HEX mentah
  Serial.print("HEX: ");
  for (size_t i = 0; i < len; i++) {
    if (data[i] < 0x10) Serial.print("0");
    Serial.print(data[i], HEX);
    Serial.print(" ");
  }
  Serial.println();
  Serial.printf("LEN: %u\n", (unsigned)len);

  if (len < 8) {
    Serial.println("[!] Paket terlalu pendek, skip parse.");
    return;
  }

  uint16_t rawWeight = ((uint16_t)data[2] << 8) | data[3];
  uint16_t rawHeight = ((uint16_t)data[6] << 8) | data[7];

  float weightKg = rawWeight / 1000.0f;
  float heightCm = rawHeight / 10.0f;

  Serial.printf("Berat  : %.1f kg\n", weightKg);
  Serial.printf("Tinggi : %.1f cm\n", heightCm);

  // Hitung BMI jika data valid
  if (heightCm > 50.0f && weightKg > 1.0f) {
    float heightM = heightCm / 100.0f;
    float bmi = weightKg / (heightM * heightM);
    Serial.printf("BMI    : %.1f", bmi);
    if      (bmi < 18.5f) Serial.println("  (Kurus)");
    else if (bmi < 25.0f) Serial.println("  (Normal)");
    else if (bmi < 30.0f) Serial.println("  (Overweight)");
    else                  Serial.println("  (Obesitas)");
  }
}

// ───────────────── Callback notifikasi ──────────────────────
static void notifyCallback(
  BLERemoteCharacteristic* pChar,
  uint8_t* pData,
  size_t length,
  bool isNotify)
{
  parseAndPrint(pData, length);
}

// ───────────────── Callback koneksi ─────────────────────────
class ClientCallbacks : public BLEClientCallbacks {
  void onConnect(BLEClient* pclient) override {
    isConnected = true;
    Serial.println("[BLE] Terhubung.");
  }

  void onDisconnect(BLEClient* pclient) override {
    isConnected = false;
    doScan      = true;       // mulai scan ulang
    Serial.println("[BLE] Terputus. Akan scan ulang...");
  }
};

// ───────────────── Callback scan ────────────────────────────
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

// ───────────────── Fungsi koneksi ───────────────────────────
bool connectToDevice() {
  Serial.printf("[BLE] Menghubungkan ke %s ...\n",
    pTargetDev->getAddress().toString().c_str());

  if (pClient != nullptr) {
    delete pClient;
    pClient = nullptr;
  }

  pClient = BLEDevice::createClient();
  pClient->setClientCallbacks(new ClientCallbacks());

  if (!pClient->connect(pTargetDev)) {
    Serial.println("[BLE] Gagal connect.");
    return false;
  }

  // Cari service FFF0
  BLERemoteService* pService = pClient->getService(BLEUUID(SERVICE_UUID));
  if (pService == nullptr) {
    Serial.printf("[BLE] Service %s tidak ditemukan.\n", SERVICE_UUID);
    pClient->disconnect();
    return false;
  }

  // Cari characteristic FFF1 (NOTIFY)
  pCharRX = pService->getCharacteristic(BLEUUID(CHAR_RX_UUID));
  if (pCharRX == nullptr) {
    Serial.printf("[BLE] Char RX %s tidak ditemukan.\n", CHAR_RX_UUID);
    pClient->disconnect();
    return false;
  }

  // Subscribe notifikasi
  if (pCharRX->canNotify()) {
    pCharRX->registerForNotify(notifyCallback);
    Serial.println("[BLE] Subscribe NOTIFY berhasil.");
  } else {
    Serial.println("[BLE] Char RX tidak support NOTIFY.");
    pClient->disconnect();
    return false;
  }

  Serial.println("══════════════════════════════════════════════");
  Serial.println("  ESP32 BLE Monitor SENSSUN GROWTH — aktif");
  Serial.printf ("  Device  : %s\n", pTargetDev->getName().c_str());
  Serial.printf ("  Address : %s\n", pTargetDev->getAddress().toString().c_str());
  Serial.println("  Menunggu data dari timbangan...");
  Serial.println("══════════════════════════════════════════════");

  return true;
}

// ───────────────── Setup ─────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\n==============================================");
  Serial.println("  ESP32 BLE — SENSSUN GROWTH");
  Serial.println("==============================================");

  BLEDevice::init("ESP32_SENSSUN_CLIENT");
  Serial.println("[BLE] Init OK.");
}

// ───────────────── Loop ──────────────────────────────────────
void loop() {

  // ── Mulai scan ───────────────────────────────────────────
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

  // ── Hubungkan ────────────────────────────────────────────
  if (doConnect && !isConnected) {
    doConnect = false;
    if (!connectToDevice()) {
      Serial.println("[BLE] Koneksi gagal. Scan ulang...");
      delay(RECONNECT_DELAY_MS);
      doScan = true;
    }
  }

  // ── Cek koneksi masih hidup ──────────────────────────────
  if (isConnected && pClient != nullptr) {
    if (!pClient->isConnected()) {
      isConnected = false;
      doScan = true;
      Serial.println("[BLE] Koneksi putus terdeteksi. Scan ulang...");
    }
  }

  delay(500);
}
