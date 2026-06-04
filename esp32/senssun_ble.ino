/**
 * ============================================================
 *  ESP32 BLE Client — SENSSUN GROWTH
 *  Library : ESP32 BLE Arduino (built-in pada ESP32 core)
 *
 *  Protokol paket (13 byte):
 *    FF A5 [W_H] [W_L] [??] [??] [H_H] [H_L] [??] [??] [??] [SEQ] [CHK]
 *    Berat  (kg) = ((W_H << 8) | W_L) / 1000.0
 *    Tinggi (cm) = ((H_H << 8) | H_L) / 10.0
 * ============================================================
 */

#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEScan.h>
#include <BLEClient.h>
#include <BLERemoteCharacteristic.h>

// ──────────────────────── Konfigurasi ────────────────────────
#define TARGET_NAME   "SENSSUN GROWTH"
#define SERVICE_UUID  "0000fff0-0000-1000-8000-00805f9b34fb"
#define CHAR_RX_UUID  "0000fff1-0000-1000-8000-00805f9b34fb"  // NOTIFY
#define SCAN_TIME     15   // detik per sesi scan
// ──────────────────────────────────────────────────────────────

static BLEClient*               pClient      = nullptr;
static BLERemoteCharacteristic* pCharRX      = nullptr;
static BLEAdvertisedDevice*     targetDevice = nullptr;

static bool deviceFound = false;
static bool connected   = false;
static bool doConnect   = false;

// ──────────────────── Parse & print data ─────────────────────
void parseAndPrint(uint8_t* data, size_t len) {
  if (len < 8) return;
  if (data[0] != 0xFF || data[1] != 0xA5) return;

  uint16_t rawWeight = ((uint16_t)data[2] << 8) | data[3];
  uint16_t rawHeight = ((uint16_t)data[6] << 8) | data[7];

  float weightKg = rawWeight / 1000.0f;
  float heightCm = rawHeight / 10.0f;

  Serial.println("────────────────────────────────");
  Serial.printf("Berat  : %.3f kg\n", weightKg);
  Serial.printf("Tinggi : %.1f cm\n", heightCm);
  Serial.println("────────────────────────────────");
}

// ─────────────── Callback notifikasi BLE ─────────────────────
static void notifyCallback(BLERemoteCharacteristic* pBLERemoteChar,
                           uint8_t* pData, size_t length, bool isNotify) {
  parseAndPrint(pData, length);
}

// ─────────────── Callback status koneksi ─────────────────────
class ClientCallbacks : public BLEClientCallbacks {
  void onConnect(BLEClient* pclient) override {
    connected = true;
    Serial.println("[BLE] Terhubung!");
  }
  void onDisconnect(BLEClient* pclient) override {
    connected = false;
    deviceFound = false;
    Serial.println("[BLE] Koneksi terputus.");
  }
};

// ─────────────── Callback scan BLE ───────────────────────────
class AdvertisedDeviceCallbacks : public BLEAdvertisedDeviceCallbacks {
  void onResult(BLEAdvertisedDevice advertisedDevice) override {
    // Debug: print semua device yang ditemukan
    String name = advertisedDevice.getName().c_str();
    String addr = advertisedDevice.getAddress().toString().c_str();
    int    rssi = advertisedDevice.getRSSI();

    if (name.length() > 0) {
      Serial.printf("  [FOUND] Name: %-22s | Addr: %s | RSSI: %d\n",
                    name.c_str(), addr.c_str(), rssi);
    }

    // Cocokkan nama (case-insensitive contains)
    String nameLower = name;
    nameLower.toLowerCase();
    String targetLower = TARGET_NAME;
    targetLower.toLowerCase();

    if (nameLower.indexOf(targetLower) >= 0) {
      Serial.printf("\n>>> TARGET DITEMUKAN: %s (%s)\n\n", name.c_str(), addr.c_str());
      BLEDevice::getScan()->stop();
      if (targetDevice != nullptr) {
        delete targetDevice;
      }
      targetDevice = new BLEAdvertisedDevice(advertisedDevice);
      deviceFound  = true;
      doConnect    = true;
    }
  }
};

// ──────────────── Koneksi dan subscribe ──────────────────────
bool connectToDevice() {
  Serial.printf("[BLE] Menghubungkan ke %s ...\n",
                targetDevice->getAddress().toString().c_str());

  if (pClient != nullptr) {
    delete pClient;
  }
  pClient = BLEDevice::createClient();
  pClient->setClientCallbacks(new ClientCallbacks());

  if (!pClient->connect(targetDevice)) {
    Serial.println("[BLE] Gagal terhubung! Pastikan alat tidak terhubung ke perangkat lain.");
    return false;
  }

  BLERemoteService* pRemoteService = pClient->getService(SERVICE_UUID);
  if (pRemoteService == nullptr) {
    Serial.println("[BLE] Service FFF0 tidak ditemukan!");
    pClient->disconnect();
    return false;
  }

  pCharRX = pRemoteService->getCharacteristic(CHAR_RX_UUID);
  if (pCharRX == nullptr) {
    Serial.println("[BLE] Characteristic FFF1 tidak ditemukan!");
    pClient->disconnect();
    return false;
  }

  if (pCharRX->canNotify()) {
    pCharRX->registerForNotify(notifyCallback);
    Serial.println("[BLE] Notify aktif. Menunggu data berat & tinggi...\n");
  } else {
    Serial.println("[BLE] FFF1 tidak support NOTIFY!");
    pClient->disconnect();
    return false;
  }

  return true;
}

// ─────────────── Mulai scan ──────────────────────────────────
void startScan() {
  Serial.printf("[SCAN] Mencari '%s' (timeout %ds)...\n", TARGET_NAME, SCAN_TIME);
  Serial.println("[SCAN] Device BLE yang terdeteksi:");
  BLEDevice::getScan()->clearResults();
  BLEDevice::getScan()->start(SCAN_TIME, false);
}

// ──────────────────────── Setup ──────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n=============================");
  Serial.println(" ESP32 BLE - SENSSUN GROWTH  ");
  Serial.println("=============================\n");

  BLEDevice::init("ESP32-SENSSUN");

  BLEScan* pBLEScan = BLEDevice::getScan();
  pBLEScan->setAdvertisedDeviceCallbacks(new AdvertisedDeviceCallbacks());
  pBLEScan->setActiveScan(true);   // aktif = dapat scan response (nama device)
  pBLEScan->setInterval(100);
  pBLEScan->setWindow(99);

  startScan();
}

// ──────────────────────── Loop ───────────────────────────────
void loop() {
  if (doConnect) {
    doConnect = false;
    delay(500);
    if (!connectToDevice()) {
      deviceFound = false;
      delay(2000);
      startScan();
    }
  }

  // Jika koneksi terputus, scan ulang
  if (!deviceFound && !connected && !BLEDevice::getScan()->isScanning()) {
    delay(3000);
    startScan();
  }

  delay(100);
}
