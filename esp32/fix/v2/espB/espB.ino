/**
 * ============================================================
 *  ESP32-B — UART Receiver + WebSocket Sender + RFID + OLED
 *  Alur: ESP32-A (BLE) → (UART TX→RX) → ESP32-B → WebSocket Server
 *        RFID RC522 → baca UID → WebSocket → Frontend → nama anak → OLED
 * ============================================================
 *
 *  Koneksi UART dari ESP32-A:
 *    ESP32-A TX2 (GPIO17) ──→ ESP32-B RX2 (GPIO16)
 *    ESP32-A GND           ──→ ESP32-B GND
 *
 *  Koneksi RFID RC522 (SPI):
 *    RC522 SDA/SS  ──→ GPIO5
 *    RC522 SCK     ──→ GPIO18
 *    RC522 MOSI    ──→ GPIO23
 *    RC522 MISO    ──→ GPIO19
 *    RC522 RST     ──→ GPIO4  (bukan GPIO22, itu untuk OLED SCL)
 *    RC522 3.3V    ──→ 3.3V
 *    RC522 GND     ──→ GND
 *
 *  Koneksi OLED SSD1306 0.96" 128x64 (I2C):
 *    OLED SDA ──→ GPIO21
 *    OLED SCL ──→ GPIO22
 *    OLED VCC ──→ 3.3V
 *    OLED GND ──→ GND
 *
 *  Topic WebSocket:
 *    Publish  → "abcd/bb|xx.x"          (berat dari espA)
 *    Publish  → "abcd/tb|xxx.x"         (tinggi dari espA)
 *    Publish  → "abcd/bmi|xx.x"         (BMI dari espA)
 *    Publish  → "abcd/idcard|XXXXXXXX"  (UID RFID)
 *    Subscribe← "abcd/childname|Nama"   (nama anak dari frontend)
 *
 *  Library yang diperlukan (Library Manager):
 *    - WiFi (bawaan ESP32)
 *    - WebSockets by Markus Sattler
 *    - MFRC522 by GithubCommunity
 *    - Adafruit SSD1306
 *    - Adafruit GFX Library
 * ============================================================
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WebSocketsClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ─────────────────── Konfigurasi WiFi ───────────────────────
const char* ssid     = "TALAS 1";
const char* password = "kitahebat";

// ─────────────────── Konfigurasi WebSocket ──────────────────
const char* ws_host = "penting-be.qbyte.web.id";
const char* ws_path = "/ws";
const int   ws_port = 443;

// ─────────────────── Topic WebSocket ────────────────────────
const char* TOPIC_BERAT     = "abcd/bb";
const char* TOPIC_TINGGI    = "abcd/tb";
const char* TOPIC_BMI       = "abcd/bmi";
const char* TOPIC_IDCARD    = "abcd/idcard";
const char* TOPIC_CHILDNAME = "abcd/childname";

// ─────────────────── Konfigurasi UART dari espA ─────────────
#define UART_BAUD   115200
#define UART_RX_PIN 16
#define UART_TX_PIN 17

// ─────────────────── Konfigurasi RFID RC522 (SPI) ───────────
#define RFID_SS_PIN  5
#define RFID_RST_PIN 4
MFRC522 rfid(RFID_SS_PIN, RFID_RST_PIN);

// ─────────────────── Konfigurasi OLED 128x64 (I2C) ──────────
#define OLED_WIDTH  128
#define OLED_HEIGHT 64
#define OLED_ADDR   0x3C
Adafruit_SSD1306 oled(OLED_WIDTH, OLED_HEIGHT, &Wire, -1);

// ─────────────────── State ──────────────────────────────────
WebSocketsClient webSocket;
bool wsConnected   = false;
String uartBuffer  = "";

// RFID State
String lastUID         = "";
unsigned long uidTimestamp = 0;
#define UID_COOLDOWN_MS 3000   // minimal jarak tap kartu yang sama

// Nama anak dari frontend (via WS)
String childName = "";
unsigned long childNameTimestamp = 0;
#define CHILDNAME_DISPLAY_MS 10000  // tampilkan nama selama 10 detik

// ─────────────────── Helper: UID → String HEX ────────────────
String getUIDString(MFRC522& reader) {
  String uid = "";
  for (byte i = 0; i < reader.uid.size; i++) {
    if (reader.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(reader.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  return uid;
}

// ─────────────────── OLED Helpers ────────────────────────────
void oledClear() {
  oled.clearDisplay();
  oled.setTextColor(SSD1306_WHITE);
}

void oledTitle(const char* title) {
  oled.setTextSize(1);
  oled.setCursor(0, 0);
  oled.println(title);
  oled.drawLine(0, 10, OLED_WIDTH, 10, SSD1306_WHITE);
}

// Tampilan: status sistem
void oledShowStatus(const char* line1, const char* line2 = "", const char* line3 = "") {
  oledClear();
  oledTitle("ESP32-B  PENTING");
  oled.setTextSize(1);
  oled.setCursor(0, 14);
  oled.println(line1);
  oled.setCursor(0, 26);
  oled.println(line2);
  oled.setCursor(0, 38);
  oled.println(line3);
  oled.display();
}

// Tampilan: UID kartu terdeteksi
void oledShowUID(const String& uid) {
  oledClear();
  oledTitle("Kartu Terdeteksi");
  oled.setTextSize(1);
  oled.setCursor(0, 14);
  oled.println("UID:");
  oled.setTextSize(1);
  oled.setCursor(0, 26);
  oled.println(uid);
  oled.setCursor(0, 40);
  oled.println("Mencari data...");
  oled.display();
}

// Tampilan: nama anak ditemukan
void oledShowChild(const String& uid, const String& nama) {
  oledClear();
  oledTitle("Anak Teridentifikasi");
  oled.setTextSize(1);
  oled.setCursor(0, 14);
  oled.println("Nama:");
  oled.setTextSize(1);
  oled.setCursor(0, 26);

  // Wrap teks jika nama panjang
  if (nama.length() <= 21) {
    oled.println(nama);
  } else {
    oled.println(nama.substring(0, 21));
    oled.setCursor(0, 36);
    oled.println(nama.substring(21, 42));
  }

  oled.setTextSize(1);
  oled.setCursor(0, 52);
  oled.print("UID: ");
  oled.print(uid.length() > 10 ? uid.substring(0, 10) + ".." : uid);
  oled.display();
}

// Tampilan: kartu tidak terdaftar
void oledShowUnknown(const String& uid) {
  oledClear();
  oledTitle("Kartu Tidak Dikenal");
  oled.setTextSize(1);
  oled.setCursor(0, 14);
  oled.println("UID:");
  oled.setCursor(0, 26);
  oled.println(uid);
  oled.setCursor(0, 40);
  oled.println("Daftar di website!");
  oled.display();
}

// ─────────────────── Callback WebSocket ─────────────────────
void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED:
      wsConnected = true;
      Serial.println("✅ [WS] WebSocket terhubung");

      // Subscribe topic nama anak (dikirim balik dari frontend)
      webSocket.sendTXT(
        String("{\"action\":\"subscribe\",\"topic\":\"") + TOPIC_CHILDNAME + "\"}"
      );
      oledShowStatus("WiFi: OK", "WS: Terhubung", "Tap kartu RFID...");
      break;

    case WStype_DISCONNECTED:
      wsConnected = false;
      Serial.println("❌ [WS] WebSocket terputus");
      oledShowStatus("WS: Terputus", "Reconnecting...", "");
      break;

    case WStype_TEXT: {
      String msg = String((char*)payload);
      Serial.println("📨 [WS] Pesan: " + msg);

      // ── Format "topic|value" ──────────────────────────────
      if (msg.indexOf('|') >= 0) {
        int sep = msg.indexOf('|');
        String topic = msg.substring(0, sep);
        String value = msg.substring(sep + 1);
        topic.trim(); value.trim();

        if (topic == TOPIC_CHILDNAME) {
          childName = value;
          childNameTimestamp = millis();
          Serial.println("👶 Nama anak: " + childName);
          oledShowChild(lastUID, childName);
        }
        return;
      }

      // ── Format JSON {"topic":"...","payload":"..."} ───────
      // Parsing manual ringan (tanpa library JSON besar)
      if (msg.indexOf("\"topic\"") >= 0 && msg.indexOf("\"payload\"") >= 0) {
        // Ekstrak topic
        int tStart = msg.indexOf("\"topic\":\"") + 9;
        int tEnd   = msg.indexOf("\"", tStart);
        String topic = (tStart > 9 && tEnd > tStart) ? msg.substring(tStart, tEnd) : "";

        // Ekstrak payload
        int pStart = msg.indexOf("\"payload\":\"") + 11;
        int pEnd   = msg.indexOf("\"", pStart);
        String value = (pStart > 11 && pEnd > pStart) ? msg.substring(pStart, pEnd) : "";

        if (topic == TOPIC_CHILDNAME && value.length() > 0) {
          childName = value;
          childNameTimestamp = millis();
          Serial.println("👶 Nama anak (JSON): " + childName);
          oledShowChild(lastUID, childName);
        }
      }
      break;
    }

    case WStype_ERROR:
      Serial.println("⚠️  [WS] Error WebSocket");
      break;

    default:
      break;
  }
}

// ─────────────────── Parse string UART ──────────────────────
// Format: "BERAT:xx.x;TINGGI:xxx.x;BMI:xx.x"
bool parseUartLine(const String& line, float& berat, float& tinggi, float& bmi) {
  int idxB = line.indexOf("BERAT:");
  int idxT = line.indexOf(";TINGGI:");
  int idxM = line.indexOf(";BMI:");

  if (idxB < 0 || idxT < 0 || idxM < 0) return false;

  berat  = line.substring(idxB + 6, idxT).toFloat();
  tinggi = line.substring(idxT + 8, idxM).toFloat();
  bmi    = line.substring(idxM + 5).toFloat();

  return true;
}

// ─────────────────── Kirim data sensor ke WebSocket ─────────
void sendToWebSocket(float berat, float tinggi, float bmi) {
  if (!wsConnected) {
    Serial.println("[WS] Belum terhubung, data tidak dikirim.");
    return;
  }

  String msgBerat  = String(TOPIC_BERAT)  + "|" + String(berat, 3);
  String msgTinggi = String(TOPIC_TINGGI) + "|" + String(tinggi, 1);
  String msgBMI    = String(TOPIC_BMI)    + "|" + String(bmi, 1);

  webSocket.sendTXT(msgBerat);
  webSocket.sendTXT(msgTinggi);
  webSocket.sendTXT(msgBMI);

  Serial.println("📤 [WS] " + msgBerat);
  Serial.println("📤 [WS] " + msgTinggi);
  Serial.println("📤 [WS] " + msgBMI);
}

// ─────────────────── Kirim UID RFID ke WebSocket ─────────────
void sendRFIDtoWebSocket(const String& uid) {
  if (!wsConnected) {
    Serial.println("[WS] Belum terhubung, UID tidak dikirim.");
    return;
  }
  String msg = String(TOPIC_IDCARD) + "|" + uid;
  webSocket.sendTXT(msg);
  Serial.println("📤 [WS RFID] " + msg);
}

// ─────────────────── Setup ──────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(500);

  // ── Init OLED ─────────────────────────────────────────────
  Wire.begin(21, 22);  // SDA=21, SCL=22
  if (!oled.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
    Serial.println("❌ OLED SSD1306 tidak terdeteksi!");
  } else {
    Serial.println("✅ OLED siap");
    oled.clearDisplay();
    oled.setTextColor(SSD1306_WHITE);
    oled.setTextSize(1);
    oled.setCursor(0, 0);
    oled.println("ESP32-B  PENTING");
    oled.println("================");
    oled.println("Inisialisasi...");
    oled.display();
  }

  // ── Init UART dari ESP32-A ────────────────────────────────
  Serial2.begin(UART_BAUD, SERIAL_8N1, UART_RX_PIN, UART_TX_PIN);
  Serial.println("[UART] Serial2 siap (RX=GPIO16, TX=GPIO17).");

  // ── Init SPI + RFID RC522 ─────────────────────────────────
  SPI.begin(18, 19, 23, RFID_SS_PIN);  // SCK, MISO, MOSI, SS
  rfid.PCD_Init();
  rfid.PCD_DumpVersionToSerial();
  Serial.println("✅ RFID RC522 siap");
  oledShowStatus("RFID: OK", "Menghubungkan WiFi...", "");

  // ── Koneksi WiFi ──────────────────────────────────────────
  WiFi.begin(ssid, password);
  Serial.print("🔌 Menghubungkan ke WiFi");
  unsigned long t = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t < 15000) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi terhubung. IP: " + WiFi.localIP().toString());
    oledShowStatus("WiFi: Terhubung", WiFi.localIP().toString().c_str(), "Menyambung WS...");
  } else {
    Serial.println("\n❌ WiFi gagal! Restart...");
    oledShowStatus("WiFi: GAGAL!", "Restart...", "");
    delay(2000);
    ESP.restart();
  }

  // ── Init WebSocket (SSL) ───────────────────────────────────
  webSocket.beginSSL(ws_host, ws_port, ws_path);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
  Serial.println("[WS] Menghubungkan ke WebSocket server...");
}

// ─────────────────── Loop ───────────────────────────────────
void loop() {
  // ── Handle WebSocket ──────────────────────────────────────
  webSocket.loop();

  // ── Reset nama anak setelah timeout display ───────────────
  if (childName.length() > 0 && millis() - childNameTimestamp > CHILDNAME_DISPLAY_MS) {
    childName = "";
    if (wsConnected) {
      oledShowStatus("WiFi: OK", "WS: Terhubung", "Tap kartu RFID...");
    }
  }

  // ── Scan RFID ─────────────────────────────────────────────
  if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
    String uid = getUIDString(rfid);
    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();

    // Cooldown: hindari kirim UID berulang saat kartu ditahan
    bool isSameUID    = (uid == lastUID);
    bool withinCooldown = (millis() - uidTimestamp < UID_COOLDOWN_MS);

    if (!isSameUID || !withinCooldown) {
      lastUID = uid;
      uidTimestamp = millis();
      childName = "";  // reset nama lama

      Serial.println("🎫 [RFID] Kartu terdeteksi: " + uid);
      oledShowUID(uid);
      sendRFIDtoWebSocket(uid);
    }
  }

  // ── Baca data dari espA via UART ──────────────────────────
  while (Serial2.available()) {
    char c = (char)Serial2.read();
    if (c == '\n') {
      uartBuffer.trim();
      if (uartBuffer.length() > 0) {
        Serial.println("[UART] Diterima: " + uartBuffer);

        float berat = 0, tinggi = 0, bmi = 0;
        if (parseUartLine(uartBuffer, berat, tinggi, bmi)) {
          Serial.printf("[PARSE] Berat=%.3f kg | Tinggi=%.1f cm | BMI=%.1f\n",
                        berat, tinggi, bmi);
          sendToWebSocket(berat, tinggi, bmi);
        } else {
          Serial.println("[PARSE] ⚠️  Format tidak dikenali: " + uartBuffer);
        }
      }
      uartBuffer = "";
    } else {
      uartBuffer += c;
    }
  }

  delay(10);
}
