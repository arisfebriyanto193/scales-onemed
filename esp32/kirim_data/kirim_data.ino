/**
 * ============================================================
 *  ESP32 BLE + WebSocket — SENSSUN GROWTH → Publish BB & TB
 *  Framework : Arduino (ESP32 Arduino Core)
 * ============================================================
 *
 *  Alur kerja:
 *    1. Konek WiFi
 *    2. Konek WebSocket ke server-mqtt-js.qbyte.web.id
 *    3. BLE scan → cari "SENSSUN Growth"
 *    4. Terima notifikasi BLE (paket 13 byte)
 *    5. Parse → Berat (kg) & Tinggi (cm)
 *    6. Publish ke WebSocket via 2 topic:
 *         BB_TOPIC  → berat badan
 *         TB_TOPIC  → tinggi badan
 *
 *  Format paket SENSSUN (13 byte):
 *    FF A5 [W_H] [W_L] [?] [?] [H_H] [H_L] [?] [?] [?] [SEQ] [CHK]
 *    Berat  (kg) = (byte[2]<<8 | byte[3]) / 1000.0
 *    Tinggi (cm) = (byte[6]<<8 | byte[7]) / 10.0
 *
 *  Format publish WebSocket:
 *    "TOPIC|VALUE"
 *    Contoh BB: "USR_687de6987184f/snr_688038bc|7.50"
 *    Contoh TB: "USR_687de6987184f/snr_68803df2|70.5"
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

// ── WiFi ──────────────────────────────────────────────────────
const char* WIFI_SSID     = "esp1";
const char* WIFI_PASSWORD = "12345674";

// ── WebSocket ─────────────────────────────────────────────────
const char* WS_HOST = "server-mqtt-js.qbyte.web.id";
const int   WS_PORT = 443;          // SSL
const char* WS_PATH = "/";

// ── Topic Publish ─────────────────────────────────────────────
// Topic untuk Berat Badan (BB) dari SENSSUN
const char* BB_TOPIC = "USR_687de6987184f/snr_688038bc";
// Topic untuk Tinggi Badan (TB) dari SENSSUN
const char* TB_TOPIC = "USR_687de6987184f/snr_68803df2";

// ── BLE ───────────────────────────────────────────────────────
static const char* TARGET_NAME       = "SENSSUN Growth";
static const char* SERVICE_UUID      = "0000fff0-0000-1000-8000-00805f9b34fb";
static const char* CHAR_NOTIFY_UUID  = "0000fff1-0000-1000-8000-00805f9b34fb";  // NOTIFY
static const uint32_t SCAN_TIMEOUT_SEC   = 15;
static const uint32_t RECONNECT_DELAY_MS = 5000;

// ══════════════════════ STATE GLOBAL ══════════════════════════

WebSocketsClient webSocket;
bool wsConnected  = false;

static BLEClient*               pClient    = nullptr;
static BLERemoteCharacteristic* pCharRX    = nullptr;
static BLEAdvertisedDevice*     pTargetDev = nullptr;
static bool deviceFound = false;
static bool isConnected = false;
static bool doConnect   = false;
static bool doScan      = true;

// Data terakhir dari timbangan
static float lastWeightKg = 0.0f;
static float lastHeightCm = 0.0f;
static bool  newDataReady = false;

// ══════════════════════ WEBSOCKET ═════════════════════════════

void publishToWS(const char* topic, float value) {
  if (!wsConnected) {
    Serial.println("[WS] ⚠️  Tidak terhubung, data tidak terkirim.");
    return;
  }
  // Format: "TOPIC|VALUE"
  String msg = String(topic) + "|" + String(value, 2);
  webSocket.sendTXT(msg);
  Serial.printf("[WS] 📤 Publish → %s\n", msg.c_str());
}

void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {

    case WStype_CONNECTED:
      wsConnected = true;
      Serial.println("[WS] ✅ WebSocket terhubung");
      // Subscribe balik (opsional, untuk monitor ACK dari server)
      webSocket.sendTXT("{\"action\":\"subscribe\", \"topic\":\"" + String(BB_TOPIC) + "\"}");
      webSocket.sendTXT("{\"action\":\"subscribe\", \"topic\":\"" + String(TB_TOPIC) + "\"}");
      break;

    case WStype_DISCONNECTED:
      wsConnected = false;
      Serial.println("[WS] ❌ WebSocket terputus, mencoba reconnect...");
      break;

    case WStype_TEXT:
      // Bisa digunakan untuk konfirmasi dari server
      Serial.printf("[WS] 📩 Pesan: %s\n", (char*)payload);
      break;

    case WStype_ERROR:
      Serial.println("[WS] ⚠️  Error WebSocket");
      break;

    default:
      break;
  }
}

void setupWebSocket() {
  webSocket.beginSSL(WS_HOST, WS_PORT, WS_PATH);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
  Serial.printf("[WS] Menghubungkan ke wss://%s%s ...\n", WS_HOST, WS_PATH);
}

// ══════════════════════ BLE PARSING ═══════════════════════════

void parseAndPublish(uint8_t* data, size_t len) {
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

  // ── Parse berat & tinggi ──
  uint16_t rawWeight = ((uint16_t)data[2] << 8) | data[3];
  uint16_t rawHeight = ((uint16_t)data[6] << 8) | data[7];

  float weightKg = rawWeight / 1000.0f;
  float heightCm = rawHeight / 10.0f;

  // Filter nilai 0 (data tidak valid)
  if (weightKg < 0.1f || heightCm < 10.0f) {
    Serial.println("[!] Data tidak valid (0), diabaikan.");
    return;
  }

  Serial.printf("⚖️  Berat  : %.2f kg\n", weightKg);
  Serial.printf("📏 Tinggi : %.1f cm\n", heightCm);

  // Hitung BMI
  if (heightCm > 50.0f) {
    float heightM = heightCm / 100.0f;
    float bmi = weightKg / (heightM * heightM);
    Serial.printf("📊 BMI    : %.1f", bmi);
    if      (bmi < 18.5f) Serial.println(" (Kurus)");
    else if (bmi < 25.0f) Serial.println(" (Normal)");
    else if (bmi < 30.0f) Serial.println(" (Overweight)");
    else                  Serial.println(" (Obesitas)");
  }

  // ── Simpan & tandai data baru ──
  lastWeightKg = weightKg;
  lastHeightCm = heightCm;
  newDataReady = true;

  // ── Langsung publish ke WebSocket ──
  publishToWS(BB_TOPIC, weightKg);
  publishToWS(TB_TOPIC, heightCm);

  Serial.println("──────────────────────────────────────────────");
}

// ══════════════════════ BLE CALLBACKS ═════════════════════════

static void notifyCallback(
  BLERemoteCharacteristic* pChar,
  uint8_t* pData,
  size_t length,
  bool isNotify)
{
  parseAndPublish(pData, length);
}

class ClientCallbacks : public BLEClientCallbacks {
  void onConnect(BLEClient* pclient) override {
    isConnected = true;
    Serial.println("[BLE] ✅ Terhubung ke SENSSUN.");
  }
  void onDisconnect(BLEClient* pclient) override {
    isConnected = false;
    doScan = true;
    Serial.println("[BLE] ❌ Terputus. Scan ulang...");
  }
};

class ScanCallbacks : public BLEAdvertisedDeviceCallbacks {
  void onResult(BLEAdvertisedDevice advertisedDevice) override {
    String devName = advertisedDevice.getName().c_str();
    if (devName.indexOf(TARGET_NAME) >= 0) {
      Serial.printf("[SCAN] ✅ Ditemukan: %s (%s)\n",
        devName.c_str(),
        advertisedDevice.getAddress().toString().c_str());
      BLEDevice::getScan()->stop();
      pTargetDev  = new BLEAdvertisedDevice(advertisedDevice);
      deviceFound = true;
      doConnect   = true;
    }
  }
};

// ══════════════════════ BLE CONNECT ═══════════════════════════

bool connectToDevice() {
  Serial.printf("[BLE] Menghubungkan ke %s ...\n",
    pTargetDev->getAddress().toString().c_str());

  if (pClient != nullptr) { delete pClient; pClient = nullptr; }

  pClient = BLEDevice::createClient();
  pClient->setClientCallbacks(new ClientCallbacks());

  if (!pClient->connect(pTargetDev)) {
    Serial.println("[BLE] ❌ Gagal connect.");
    return false;
  }

  BLERemoteService* pService = pClient->getService(BLEUUID(SERVICE_UUID));
  if (!pService) {
    Serial.println("[BLE] Service FFF0 tidak ditemukan.");
    pClient->disconnect(); return false;
  }

  pCharRX = pService->getCharacteristic(BLEUUID(CHAR_NOTIFY_UUID));
  if (!pCharRX) {
    Serial.println("[BLE] Char FFF1 (NOTIFY) tidak ditemukan.");
    pClient->disconnect(); return false;
  }

  if (pCharRX->canNotify()) {
    pCharRX->registerForNotify(notifyCallback);
    Serial.println("[BLE] ✅ Subscribe NOTIFY OK.");
  } else {
    Serial.println("[BLE] Char tidak support NOTIFY.");
    pClient->disconnect(); return false;
  }

  Serial.println("══════════════════════════════════════════════");
  Serial.println("  ESP32 BLE → WebSocket — SENSSUN GROWTH");
  Serial.printf ("  Device  : %s\n", pTargetDev->getName().c_str());
  Serial.printf ("  BB Topic: %s\n", BB_TOPIC);
  Serial.printf ("  TB Topic: %s\n", TB_TOPIC);
  Serial.println("  Menunggu data dari timbangan...");
  Serial.println("══════════════════════════════════════════════");

  return true;
}

// ══════════════════════ SETUP ═════════════════════════════════

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\n==============================================");
  Serial.println("  SENSSUN GROWTH → WebSocket Publisher");
  Serial.println("==============================================");

  // ── Konek WiFi ──
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.printf("🔌 Konek ke WiFi: %s", WIFI_SSID);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500); Serial.print(".");
  }
  Serial.println();
  Serial.printf("✅ WiFi OK — IP: %s\n", WiFi.localIP().toString().c_str());

  // ── Setup WebSocket ──
  setupWebSocket();

  // ── Init BLE ──
  BLEDevice::init("ESP32_SENSSUN");
  Serial.println("✅ BLE Init OK.\n");
}

// ══════════════════════ LOOP ══════════════════════════════════

void loop() {
  // ── WebSocket loop (wajib dipanggil terus) ──
  webSocket.loop();

  // ── BLE Scan ────────────────────────────────────────────────
  if (doScan) {
    doScan = false; deviceFound = false; doConnect = false;

    Serial.printf("\n[SCAN] Mencari '%s' ...\n", TARGET_NAME);
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

  // ── BLE Connect ─────────────────────────────────────────────
  if (doConnect && !isConnected) {
    doConnect = false;
    if (!connectToDevice()) {
      Serial.println("[BLE] Gagal. Scan ulang...");
      delay(RECONNECT_DELAY_MS);
      doScan = true;
    }
  }

  // ── BLE Heartbeat check ─────────────────────────────────────
  if (isConnected && pClient != nullptr && !pClient->isConnected()) {
    isConnected = false;
    doScan = true;
    Serial.println("[BLE] Koneksi putus. Scan ulang...");
  }

  delay(50);  // kecil agar webSocket.loop() sering dipanggil
}
