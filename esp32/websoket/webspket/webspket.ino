/**
 * ============================================================
 *  ESP32 DUAL-CORE — SENSSUN GROWTH BLE → WebSocket
 *  Framework : Arduino (ESP32 Arduino Core)
 * ============================================================
 *
 *  ARSITEKTUR DUAL-CORE:
 *    Core 0  → Task BLE (Scan, Connect, Notify)
 *    Core 1  → Arduino Main Loop (WiFi, WebSocket)
 *
 *  Data antar core dikirim via FreeRTOS Queue.
 *
 *  FIX:
 *    - BLEDevice::init() dipindah ke setup() (bukan di dalam task)
 *    - BLE task priority diturunkan ke 1 agar WebSocket tetap jalan
 *    - WiFi.setAutoReconnect aktif
 *    - Guard WiFi disconnect di loop()
 * ============================================================
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WebSocketsClient.h>
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

const char* WS_HOST = "server-iot-qbyte.qbyte.web.id";
const int   WS_PORT = 443;
const char* WS_PATH = "/ws";

// ⚠️  Sesuaikan topic dengan format server kamu
// Contoh dari program sederhana: "USR_687de6987184f/snr_688038bc"
const char* BB_TOPIC = "onemed/bb";   // ganti jika perlu
const char* TB_TOPIC = "onemed/tb";   // ganti jika perlu

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

WebSocketsClient webSocket;
volatile bool wsConnected = false;

static BLEClient*               pClient    = nullptr;
static BLERemoteCharacteristic* pCharRX    = nullptr;
static BLEAdvertisedDevice*     pTargetDev = nullptr;

static volatile bool bleDeviceFound = false;
static volatile bool bleConnected   = false;
static volatile bool bleDoConnect   = false;
static volatile bool bleDoScan      = true;
static volatile bool bleScanRunning = false;

// ══════════════════════ WEBSOCKET (Core 1) ════════════════════

void publishToWS(const char* topic, float value) {
  if (!wsConnected) {
    Serial.printf("[WS] ⚠️  Tidak terhubung — %s tidak terkirim.\n", topic);
    return;
  }
  // Format: "topic|nilai" — sama persis dengan program sederhana
  String msg = String(topic) + "|" + String(value, 2);
  webSocket.sendTXT(msg);
  Serial.printf("[WS] 📤 Publish → %s\n", msg.c_str());
}

void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED:
      wsConnected = true;
      Serial.println("[WS] ✅ WebSocket terhubung");
      // Subscribe topic BB dan TB
      webSocket.sendTXT(
        "{\"action\":\"subscribe\",\"topic\":\"" + String(BB_TOPIC) + "\"}"
      );
      webSocket.sendTXT(
        "{\"action\":\"subscribe\",\"topic\":\"" + String(TB_TOPIC) + "\"}"
      );
      break;

    case WStype_DISCONNECTED:
      wsConnected = false;
      Serial.println("[WS] ❌ WebSocket terputus — auto-reconnect...");
      break;

    case WStype_TEXT:
      Serial.printf("[WS] 📩 Pesan masuk: %s\n", (char*)payload);
      break;

    case WStype_ERROR:
      Serial.println("[WS] ⚠️  WebSocket Error");
      break;

    default:
      break;
  }
}

// ══════════════════════ BLE CALLBACK & PARSER (Core 0) ════════

void parseAndEnqueue(uint8_t* data, size_t len) {
  if (len < 8) return;

  uint16_t rawWeight = ((uint16_t)data[2] << 8) | data[3];
  uint16_t rawHeight = ((uint16_t)data[6] << 8) | data[7];

  float weightKg = rawWeight / 1000.0f;
  float heightCm = rawHeight / 10.0f;

  // Abaikan paket standby / noise
  if (weightKg < 0.1f || heightCm < 10.0f) return;

  Serial.printf("[BLE] ⚖️  BB=%.2f kg  📏 TB=%.1f cm\n", weightKg, heightCm);

  SensorData pkt = { weightKg, heightCm };
  if (xQueueSend(dataQueue, &pkt, 0) != pdTRUE) {
    Serial.println("[BLE] ⚠️  Queue penuh, data dibuang.");
  }
}

static void notifyCallback(
  BLERemoteCharacteristic* pChar,
  uint8_t* pData,
  size_t length,
  bool isNotify)
{
  parseAndEnqueue(pData, length);
}

// ── BLE Client Callbacks ──────────────────────────────────────
class BleClientCB : public BLEClientCallbacks {
  void onConnect(BLEClient* c) override {
    bleConnected = true;
    Serial.println("[BLE] ✅ Terhubung ke timbangan.");
  }
  void onDisconnect(BLEClient* c) override {
    bleConnected   = false;
    bleDoScan      = true;
    bleScanRunning = false;
    Serial.println("[BLE] ❌ Terputus dari timbangan — scan ulang...");
  }
};

// ── BLE Scan Callbacks ────────────────────────────────────────
class BleScanCB : public BLEAdvertisedDeviceCallbacks {
  void onResult(BLEAdvertisedDevice dev) override {
    if (String(dev.getName().c_str()).indexOf(TARGET_NAME) >= 0) {
      Serial.printf("[BLE] ✅ Ditemukan: %s (%s)\n",
        dev.getName().c_str(),
        dev.getAddress().toString().c_str()
      );
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
  if (!bleDeviceFound) {
    Serial.println("[BLE] Scan selesai, perangkat tidak ditemukan. Retry...");
  }
}

// ── BLE Connect ───────────────────────────────────────────────
bool connectToBLE() {
  if (!pTargetDev) return false;
  Serial.printf("[BLE] Menghubungkan ke %s...\n",
    pTargetDev->getAddress().toString().c_str()
  );

  if (pClient) {
    pClient->disconnect();
    delete pClient;
    pClient = nullptr;
  }

  pClient = BLEDevice::createClient();
  pClient->setClientCallbacks(new BleClientCB());

  if (!pClient->connect(pTargetDev)) {
    Serial.println("[BLE] ❌ Gagal connect ke timbangan.");
    return false;
  }

  auto* svc = pClient->getService(BLEUUID(SERVICE_UUID));
  if (!svc) {
    Serial.println("[BLE] ❌ Service tidak ditemukan.");
    pClient->disconnect();
    return false;
  }

  pCharRX = svc->getCharacteristic(BLEUUID(CHAR_NOTIFY_UUID));
  if (!pCharRX || !pCharRX->canNotify()) {
    Serial.println("[BLE] ❌ Karakteristik notify tidak tersedia.");
    pClient->disconnect();
    return false;
  }

  pCharRX->registerForNotify(notifyCallback);
  Serial.println("[BLE] ✅ Notify aktif — menunggu data timbangan...");
  return true;
}

// ══════════════════════ TASK BLE (Core 0) ═════════════════════

void taskBLE(void* param) {
  Serial.println("[BLE] Task BLE mulai di Core 0.");

  // ⚠️  BLEDevice::init() sudah dipanggil di setup()
  // Jangan panggil lagi di sini!

  for (;;) {
    // 1. Mulai scan jika perlu
    if (bleDoScan && !bleScanRunning && !bleConnected) {
      bleDoScan      = false;
      bleDeviceFound = false;
      bleDoConnect   = false;
      bleScanRunning = true;

      Serial.printf("[BLE] Memulai scan '%s'...\n", TARGET_NAME);

      BLEScan* sc = BLEDevice::getScan();
      sc->clearResults();
      sc->setAdvertisedDeviceCallbacks(new BleScanCB(), true);
      sc->setActiveScan(true);
      sc->setInterval(100);
      sc->setWindow(99);
      sc->start(SCAN_DURATION_SEC, scanDoneCB, false);
    }

    // 2. Jika scan selesai dan tidak ketemu, tunggu lalu scan lagi
    if (!bleScanRunning && !bleDeviceFound && !bleConnected && !bleDoScan) {
      vTaskDelay(pdMS_TO_TICKS(RECONNECT_DELAY_MS));
      bleDoScan = true;
    }

    // 3. Connect jika perangkat ditemukan
    if (bleDoConnect && !bleConnected && !bleScanRunning) {
      bleDoConnect = false;
      if (!connectToBLE()) {
        vTaskDelay(pdMS_TO_TICKS(RECONNECT_DELAY_MS));
        bleDoScan = true;
      }
    }

    // 4. Deteksi disconnect yang tidak terpantau callback
    if (bleConnected && pClient && !pClient->isConnected()) {
      bleConnected   = false;
      bleScanRunning = false;
      bleDoScan      = true;
    }

    // ✅ Delay cukup agar Core 0 tidak 100% dipakai BLE
    // Ini memberi kesempatan WiFi internal (juga Core 0) untuk bernafas
    vTaskDelay(pdMS_TO_TICKS(100));
  }
}

// ══════════════════════ SETUP (Core 1) ════════════════════════

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\n==============================================");
  Serial.println("  SENSSUN GROWTH — DUAL CORE BLE + WebSocket");
  Serial.println("==============================================\n");

  // ── 1. Buat queue data BLE → WebSocket ──
  dataQueue = xQueueCreate(5, sizeof(SensorData));

  // ── 2. Init BLE di sini (BUKAN di dalam task!) ──
  //       Ini fix utama agar tidak ada race condition
  BLEDevice::init("ESP32_SENSSUN");
  Serial.println("[BLE] BLEDevice initialized.");

  // ── 3. Konek WiFi ──
  WiFi.setAutoReconnect(true);
  WiFi.persistent(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("[WiFi] Connecting");
  uint8_t wifiRetry = 0;
  while (WiFi.status() != WL_CONNECTED && wifiRetry < 40) {
    delay(500);
    Serial.print(".");
    wifiRetry++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WiFi] ✅ Terhubung. IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n[WiFi] ❌ Gagal terhubung. Restart...");
    ESP.restart();
  }

  // ── 4. Setup WebSocket (SSL, sama persis dengan program sederhana) ──
  webSocket.beginSSL(WS_HOST, WS_PORT, WS_PATH);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
  Serial.println("[WS] WebSocket client initialized.");

  // ── 5. Start BLE Task di Core 0 ──
  xTaskCreatePinnedToCore(
    taskBLE,     // Fungsi task
    "TaskBLE",   // Nama task
    8192,        // Stack size (bytes)
    nullptr,     // Parameter
    1,           // ✅ Priority 1 (bukan 2) — agar tidak mencekik WiFi
    nullptr,     // Handle (tidak dipakai)
    0            // Pinned ke Core 0
  );

  Serial.println("[SYS] Setup selesai. Menunggu data...\n");
}

// ══════════════════════ LOOP (Core 1) ═════════════════════════

void loop() {
  // Guard: reconnect WiFi jika putus
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] ⚠️  Terputus — menunggu reconnect...");
    delay(1000);
    return; // Jangan jalankan webSocket.loop() saat WiFi mati
  }

  // Jalankan WebSocket loop di Core 1
  webSocket.loop();

  // Ambil data dari BLE queue dan publish ke WebSocket
  SensorData incoming;
  if (xQueueReceive(dataQueue, &incoming, 0) == pdTRUE) {
    publishToWS(BB_TOPIC, incoming.weightKg);
    publishToWS(TB_TOPIC, incoming.heightCm);
  }
}