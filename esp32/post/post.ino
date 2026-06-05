/**
 * ============================================================
 *  ESP32 DUAL-CORE — SENSSUN GROWTH BLE → HTTP POST
 *  Core 0 : BLE Task
 *  Core 1 : WiFi + HTTP POST
 * ============================================================
 */

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEScan.h>
#include <BLEAdvertisedDevice.h>
#include <BLEClient.h>
#include <BLERemoteCharacteristic.h>
#include <BLERemoteService.h>

// ══════════════════════ KONFIGURASI ═══════════════════════════

const char* WIFI_SSID     = "TALAS 1";
const char* WIFI_PASSWORD = "kitahebat";

// Ganti dengan endpoint HTTP POST server kamu
const char* SERVER_URL = "https://penting-be.qbyte.web.id/api/hardware/data";

// ID unik perangkat ESP32
const char* DEV_ID = "ESP32_ONEMED_01";



static const char* TARGET_NAME      = "SENSSUN Growth";
static const char* SERVICE_UUID     = "0000fff0-0000-1000-8000-00805f9b34fb";
static const char* CHAR_NOTIFY_UUID = "0000fff1-0000-1000-8000-00805f9b34fb";

static const uint32_t SCAN_DURATION_SEC  = 10;
static const uint32_t RECONNECT_DELAY_MS = 5000;

// ══════════════════════ RTOS QUEUE ════════════════════════════

struct SensorData {
  float weightKg;
  float heightCm;
};
QueueHandle_t dataQueue;

// ══════════════════════ STATE GLOBAL ══════════════════════════

static BLEClient*               pClient    = nullptr;
static BLERemoteCharacteristic* pCharRX    = nullptr;
static BLEAdvertisedDevice*     pTargetDev = nullptr;

static volatile bool bleDeviceFound = false;
static volatile bool bleConnected   = false;
static volatile bool bleDoConnect   = false;
static volatile bool bleDoScan      = true;
static volatile bool bleScanRunning = false;

// ══════════════════════ HTTP POST (Core 1) ════════════════════

void postToServer(float weightKg, float heightCm) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] ⚠️  WiFi tidak terhubung.");
    return;
  }

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  // Payload sesuai dengan schema backend
  String payload = "{\"dev_id\":\"" + String(DEV_ID) + "\",\"bb\":" + String(weightKg, 2) + ",\"tb\":" + String(heightCm, 1) + "}";

  Serial.printf("[HTTP] 📤 POST → %s\n", payload.c_str());

  int httpCode = http.POST(payload);
  if (httpCode > 0) {
    Serial.printf("[HTTP] ✅ Response: %d\n", httpCode);
  } else {
    Serial.printf("[HTTP] ❌ Gagal: %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
}

// ══════════════════════ BLE (Core 0) ══════════════════════════

void parseAndEnqueue(uint8_t* data, size_t len) {
  if (len < 8) return;

  uint16_t rawWeight = ((uint16_t)data[2] << 8) | data[3];
  uint16_t rawHeight = ((uint16_t)data[6] << 8) | data[7];

  float weightKg = rawWeight / 1000.0f;
  float heightCm = rawHeight / 10.0f;

  if (weightKg < 0.1f || heightCm < 10.0f) return;

  Serial.printf("[BLE] ⚖️  BB=%.2f kg  📏 TB=%.1f cm\n", weightKg, heightCm);

  SensorData pkt = { weightKg, heightCm };
  if (xQueueSend(dataQueue, &pkt, 0) != pdTRUE) {
    Serial.println("[BLE] ⚠️  Queue penuh, data dibuang.");
  }
}

static void notifyCallback(
  BLERemoteCharacteristic* pChar,
  uint8_t* pData, size_t length, bool isNotify)
{
  parseAndEnqueue(pData, length);
}

class BleClientCB : public BLEClientCallbacks {
  void onConnect(BLEClient* c) override {
    bleConnected = true;
    Serial.println("[BLE] ✅ Terhubung ke timbangan.");
  }
  void onDisconnect(BLEClient* c) override {
    bleConnected   = false;
    bleDoScan      = true;
    bleScanRunning = false;
    Serial.println("[BLE] ❌ BLE terputus — scan ulang...");
  }
};

class BleScanCB : public BLEAdvertisedDeviceCallbacks {
  void onResult(BLEAdvertisedDevice dev) override {
    if (String(dev.getName().c_str()).indexOf(TARGET_NAME) >= 0) {
      Serial.printf("[BLE] ✅ Ditemukan: %s\n", dev.getName().c_str());
      BLEDevice::getScan()->stop();
      if (pTargetDev) delete pTargetDev;
      pTargetDev     = new BLEAdvertisedDevice(dev);
      bleDeviceFound = true;
      bleDoConnect   = true;
      bleScanRunning = false;
    }
  }
};

void scanDoneCB(BLEScanResults r) {
  bleScanRunning = false;
  if (!bleDeviceFound) Serial.println("[BLE] Tidak ditemukan. Retry...");
}

bool connectToBLE() {
  if (!pTargetDev) return false;
  Serial.printf("[BLE] Menghubungkan ke %s...\n",
    pTargetDev->getAddress().toString().c_str());

  if (pClient) { pClient->disconnect(); delete pClient; pClient = nullptr; }

  pClient = BLEDevice::createClient();
  pClient->setClientCallbacks(new BleClientCB());

  if (!pClient->connect(pTargetDev)) {
    Serial.println("[BLE] ❌ Gagal connect."); return false;
  }
  auto* svc = pClient->getService(BLEUUID(SERVICE_UUID));
  if (!svc) { pClient->disconnect(); return false; }

  pCharRX = svc->getCharacteristic(BLEUUID(CHAR_NOTIFY_UUID));
  if (!pCharRX || !pCharRX->canNotify()) { pClient->disconnect(); return false; }

  pCharRX->registerForNotify(notifyCallback);
  Serial.println("[BLE] ✅ Menunggu data timbangan...");
  return true;
}

void taskBLE(void* param) {
  Serial.println("[BLE] Task mulai (Core 0).");

  for (;;) {
    if (bleDoScan && !bleScanRunning && !bleConnected) {
      bleDoScan = false; bleDeviceFound = false;
      bleDoConnect = false; bleScanRunning = true;

      BLEScan* sc = BLEDevice::getScan();
      sc->clearResults();
      sc->setAdvertisedDeviceCallbacks(new BleScanCB(), true);
      sc->setActiveScan(true);
      sc->setInterval(100);
      sc->setWindow(99);
      sc->start(SCAN_DURATION_SEC, scanDoneCB, false);
    }

    if (!bleScanRunning && !bleDeviceFound && !bleConnected && !bleDoScan) {
      vTaskDelay(pdMS_TO_TICKS(RECONNECT_DELAY_MS));
      bleDoScan = true;
    }

    if (bleDoConnect && !bleConnected && !bleScanRunning) {
      bleDoConnect = false;
      if (!connectToBLE()) {
        vTaskDelay(pdMS_TO_TICKS(RECONNECT_DELAY_MS));
        bleDoScan = true;
      }
    }

    if (bleConnected && pClient && !pClient->isConnected()) {
      bleConnected = false; bleScanRunning = false; bleDoScan = true;
    }

    vTaskDelay(pdMS_TO_TICKS(100));
  }
}

// ══════════════════════ SETUP & LOOP ══════════════════════════

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\n=== SENSSUN GROWTH — BLE + HTTP POST ===\n");

  dataQueue = xQueueCreate(5, sizeof(SensorData));

  // Init BLE di setup() — WAJIB sebelum task dibuat
  BLEDevice::init("ESP32_SENSSUN");

  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("[WiFi] Connecting");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500); Serial.print(".");
  }
  Serial.printf("\n[WiFi] ✅ IP: %s\n", WiFi.localIP().toString().c_str());

  xTaskCreatePinnedToCore(taskBLE, "TaskBLE", 8192, nullptr, 1, nullptr, 0);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    delay(500);
    return;
  }

  SensorData incoming;
  if (xQueueReceive(dataQueue, &incoming, pdMS_TO_TICKS(10)) == pdTRUE) {
    // Kirim satu request yang berisi BB dan TB sekaligus
    postToServer(incoming.weightKg, incoming.heightCm);
  }
}