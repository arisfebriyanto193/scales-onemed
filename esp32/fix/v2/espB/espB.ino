/**
 * ============================================================
 *  ESP32-B — UART Receiver + WebSocket Sender + RFID + OLED
 *  Alur: ESP32-A (BLE) → (UART TX→RX) → ESP32-B → WebSocket Server
 *        RFID RC522 → baca UID → WebSocket → Frontend → nama anak → OLED
 * ============================================================

 *  Koneksi UART dari ESP32-A:
 *    ESP32-A TX2 (GPIO17) ──→ ESP32-B RX2 (GPIO16)
 *    ESP32-A GND           ──→ ESP32-B GND
 *  Koneksi RFID RC522 (SPI):
 *    RC522 SDA/SS  ──→ GPIO5
 *    RC522 SCK     ──→ GPIO18
 *    RC522 MOSI    ──→ GPIO23
 *    RC522 MISO    ──→ GPIO19
 *    RC522 RST     ──→ GPIO4  (bukan GPIO22, itu untuk OLED SCL)
 *    RC522 3.3V    ──→ 3.3V
 *    RC522 GND     ──→ GND
 *
 *  Koneksi OLED SH1106 1.3" 128x64 (I2C):
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
 *    - Adafruit SH110X
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
#include <Adafruit_SH110X.h>
#include <WiFiManager.h>
#include <Preferences.h>

// logo 

// 'Gemini_Generated_Image_sy3ij3sy3ij3sy3i', 128x64px
const unsigned char epd_bitmap_Gemini_Generated_Image_sy3ij3sy3ij3sy3i [] PROGMEM = {
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xfe, 0x7f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xfc, 0x1f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xf8, 0x1f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xf0, 0x0f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xe0, 0x07, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xc0, 0x03, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x80, 0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xfc, 0x00, 0x00, 0x3f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xf8, 0x00, 0x00, 0x3f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xf0, 0x00, 0x00, 0x0f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xe0, 0x00, 0x00, 0x07, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xc0, 0x38, 0x00, 0x03, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x80, 0x7e, 0x00, 0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0xfe, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xfe, 0x01, 0xff, 0x00, 0x00, 0x7f, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xfc, 0x01, 0xff, 0x00, 0x00, 0x3f, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xf8, 0x01, 0xff, 0x00, 0x00, 0x1f, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xf0, 0x01, 0xff, 0x00, 0x00, 0x0f, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xe0, 0x00, 0xfe, 0x00, 0x00, 0x07, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xe0, 0x03, 0xfc, 0x00, 0x00, 0x07, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xfc, 0x1f, 0xf8, 0x0f, 0x80, 0x3f, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xfc, 0x3f, 0xfc, 0x1f, 0xc0, 0x3f, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xfc, 0x7f, 0xfe, 0x3f, 0xe0, 0x3f, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xfc, 0x7f, 0xfe, 0x3f, 0xe0, 0x3f, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xfc, 0xff, 0xfe, 0x3f, 0xe0, 0x3f, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xfc, 0xff, 0xf8, 0x1f, 0xe0, 0x3f, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xfc, 0xff, 0xf3, 0xff, 0xc0, 0x3f, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xfe, 0xff, 0xef, 0xff, 0xfc, 0x3f, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xfe, 0xff, 0xef, 0xff, 0xfe, 0x7f, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xfe, 0xff, 0xdf, 0xff, 0xff, 0x7f, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xfe, 0xff, 0xdf, 0xff, 0xff, 0x7f, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xfe, 0xff, 0xff, 0xff, 0xe7, 0x7f, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xc3, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x7f, 0xff, 0xff, 0x83, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xbf, 0xdf, 0xff, 0x87, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x87, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xdf, 0xef, 0xfe, 0x1f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xef, 0xef, 0xfc, 0x7f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xf3, 0xf7, 0xf8, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xfd, 0xfb, 0xfb, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xfe, 0xfd, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xfe, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x7f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff
};

// Array of all bitmaps for convenience. (Total bytes used to store images in PROGMEM = 1040)
const int epd_bitmap_allArray_LEN = 1;
const unsigned char* epd_bitmap_allArray[1] = {
	epd_bitmap_Gemini_Generated_Image_sy3ij3sy3ij3sy3i
};

Preferences preferences;

// ─────────────────── Konfigurasi WebSocket ──────────────────
String ws_host;
String ws_path;
int    ws_port;
String topic_prefix;

// ─────────────────── Topic WebSocket ────────────────────────
String TOPIC_BERAT;
String TOPIC_TINGGI;
String TOPIC_BMI;
String TOPIC_IDCARD;
String TOPIC_CHILDNAME;

bool shouldSaveConfig = false;
void saveConfigCallback() {
  shouldSaveConfig = true;
}

// ─────────────────── Konfigurasi Tombol HOLD/RESET ──────────
#define HOLD_PIN      13    // GPIO 13 (aman, bukan strapping pin)
#define DEBOUNCE_MS   50    // minimal tahan sebelum dihitung (ms)
unsigned long buttonPressTime = 0;
bool isButtonPressed = false;
bool isHold = false;
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
Adafruit_SH1106G oled(OLED_WIDTH, OLED_HEIGHT, &Wire, -1);

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
  oled.setTextColor(SH110X_WHITE);
}

void oledTitle(const char* title) {
  oled.setTextSize(1);
  oled.setCursor(0, 0);
  oled.println(title);
  oled.drawLine(0, 10, OLED_WIDTH, 10, SH110X_WHITE);
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

// Tampilan: Data pengukuran (BB, TB, BMI)
void oledShowData(float berat, float tinggi, float bmi) {
  oledClear();
  oledTitle("Hasil Pengukuran");
  
  oled.setTextSize(1);
  oled.setCursor(0, 16);
  oled.print("Berat  : ");
  oled.print(berat, 2);
  oled.println(" kg");

  oled.setCursor(0, 30);
  oled.print("Tinggi : ");
  oled.print(tinggi, 1);
  oled.println(" cm");

  oled.setCursor(0, 44);
  oled.print("BMI    : ");
  oled.println(bmi, 1);
  
  oled.display();
}

// ─────────────────── Callback WiFiManager AP Mode ───────────
void configModeCallback(WiFiManager *myWiFiManager) {
  oledShowStatus("AP Mode", myWiFiManager->getConfigPortalSSID().c_str(), WiFi.softAPIP().toString().c_str());
  Serial.println("[WIFI] Masuk AP Mode");
  Serial.println(myWiFiManager->getConfigPortalSSID());
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
  if (!oled.begin(OLED_ADDR, true)) {
    Serial.println("❌ OLED SH1106 tidak terdeteksi!");
  } else {
    Serial.println("✅ OLED siap");
    
    // Tampilkan Logo
    oled.clearDisplay();
    oled.drawBitmap(0, 0, epd_bitmap_Gemini_Generated_Image_sy3ij3sy3ij3sy3i, 128, 64, SH110X_WHITE);
    oled.display();
    delay(3000);

    oled.clearDisplay();
    oled.setTextColor(SH110X_WHITE);
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

  // ── Init Tombol HOLD ──────────────────────────────────────
  pinMode(HOLD_PIN, INPUT_PULLUP);

  // ── Init SPI + RFID RC522 ─────────────────────────────────
  SPI.begin(18, 19, 23, RFID_SS_PIN);  // SCK, MISO, MOSI, SS
  rfid.PCD_Init();
  rfid.PCD_DumpVersionToSerial();
  Serial.println("✅ RFID RC522 siap");
  oledShowStatus("RFID: OK", "Menghubungkan WiFi...", "");

  // ── Load Config dari NVS ──────────────────────────────────
  preferences.begin("config", false);
  ws_host = preferences.getString("ws_host", "penting-be.qbyte.web.id");
  ws_path = preferences.getString("ws_path", "/ws");
  ws_port = preferences.getInt("ws_port", 443);
  topic_prefix = preferences.getString("topic_prefix", "abcd");
  
  TOPIC_BERAT     = topic_prefix + "/bb";
  TOPIC_TINGGI    = topic_prefix + "/tb";
  TOPIC_BMI       = topic_prefix + "/bmi";
  TOPIC_IDCARD    = topic_prefix + "/idcard";
  TOPIC_CHILDNAME = topic_prefix + "/childname";

  // ── Koneksi WiFi (WiFiManager) ────────────────────────────
  WiFiManager wifiManager;
  wifiManager.setSaveConfigCallback(saveConfigCallback);
  wifiManager.setAPCallback(configModeCallback);
  
  WiFiManagerParameter custom_ws_host("ws_host", "WS Host", ws_host.c_str(), 60);
  WiFiManagerParameter custom_ws_path("ws_path", "WS Path", ws_path.c_str(), 40);
  char port_str[6];
  sprintf(port_str, "%d", ws_port);
  WiFiManagerParameter custom_ws_port("ws_port", "WS Port", port_str, 6);
  WiFiManagerParameter custom_topic_prefix("topic_prefix", "Topic Prefix", topic_prefix.c_str(), 40);

  wifiManager.addParameter(&custom_ws_host);
  wifiManager.addParameter(&custom_ws_path);
  wifiManager.addParameter(&custom_ws_port);
  wifiManager.addParameter(&custom_topic_prefix);

  wifiManager.setConnectTimeout(10);
  
  oledShowStatus("WiFi", "Menghubungkan...", "Atau buka AP Config");

  if (!wifiManager.autoConnect("ESP32_PENTING_Config")) {
    Serial.println("❌ WiFi gagal & timeout! Restart...");
    oledShowStatus("WiFi: GAGAL!", "Restart...", "");
    delay(2000);
    ESP.restart();
  }

  Serial.println("\n✅ WiFi terhubung. IP: " + WiFi.localIP().toString());
  oledShowStatus("WiFi: Terhubung", WiFi.SSID().c_str(), WiFi.localIP().toString().c_str());

  if (shouldSaveConfig) {
    ws_host = custom_ws_host.getValue();
    ws_path = custom_ws_path.getValue();
    ws_port = atoi(custom_ws_port.getValue());
    topic_prefix = custom_topic_prefix.getValue();
    
    preferences.putString("ws_host", ws_host);
    preferences.putString("ws_path", ws_path);
    preferences.putInt("ws_port", ws_port);
    preferences.putString("topic_prefix", topic_prefix);

    TOPIC_BERAT     = topic_prefix + "/bb";
    TOPIC_TINGGI    = topic_prefix + "/tb";
    TOPIC_BMI       = topic_prefix + "/bmi";
    TOPIC_IDCARD    = topic_prefix + "/idcard";
    TOPIC_CHILDNAME = topic_prefix + "/childname";
    
    Serial.println("✅ Konfigurasi baru disimpan!");
  }
  preferences.end();

  // ── Init WebSocket (Otomatis WS / WSS) ─────────────────────
  if (ws_port == 443) {
    webSocket.beginSSL(ws_host.c_str(), ws_port, ws_path.c_str());
    Serial.println("[WS] Menggunakan koneksi WSS (SSL)");
    Serial.println("HOST : " + ws_host);
    Serial.println("PORT : " + ws_port);
    Serial.println("PATH : " + ws_path);
  } else {
    webSocket.begin(ws_host.c_str(), ws_port, ws_path.c_str());
    Serial.println("HOST : " + ws_host);
    Serial.println("PORT : " + ws_port);
    Serial.println("PATH : " + ws_path);
    Serial.println("[WS] Menggunakan koneksi WS biasa (Non-SSL)");
  }
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
  Serial.println("[WS] Menghubungkan ke WebSocket server...");
}

// ─────────────────── Loop ───────────────────────────────────
void loop() {
  // ── Handle Tombol (Dual Function) ────────────────────────
  // Tahan < 5 detik saat lepas → toggle HOLD
  // Tahan >= 10 detik saat masih tertekan → reset WiFi ke AP mode
  bool btnNow = (digitalRead(HOLD_PIN) == LOW);
  if (btnNow) {
    if (!isButtonPressed) {
      // Catat waktu mulai tekan (debounce akan dicek saat lepas)
      buttonPressTime = millis();
      isButtonPressed = true;
    } else {
      unsigned long held = millis() - buttonPressTime;
      // Hanya proses jika sudah melewati debounce (pin benar-benar tertekan)
      if (held >= DEBOUNCE_MS && held >= 10000) {
        // Tahan 10 detik → reset WiFi
        isButtonPressed = false;
        Serial.println("[BTN] Tahan 10 detik → Reset WiFi");
        oledShowStatus("Reset WiFi", "Lupakan WiFi...", "AP Mode aktif");
        WiFiManager wifiManager;
        wifiManager.resetSettings();
        delay(2000);
        ESP.restart();
      }
    }
  } else {
    if (isButtonPressed) {
      unsigned long held = millis() - buttonPressTime;
      isButtonPressed = false;
      // Abaikan jika terlalu singkat (noise/glitch < debounce)
      if (held >= DEBOUNCE_MS && held < 5000) {
        // Lepas < 5 detik (dan bukan glitch) → toggle HOLD
        isHold = !isHold;
        Serial.println(isHold ? "[BTN] HOLD ON" : "[BTN] HOLD OFF");
        if (isHold) {
          oledShowStatus("HOLD AKTIF", "Data ditahan", "Tekan lagi utk lanjut");
        } else {
          oledShowStatus("HOLD MATI", "Data mengalir", "WS: Terhubung");
        }
      }
      // antara 5-10 detik → tidak ada aksi
    }
  }

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
          if (!isHold) {
            sendToWebSocket(berat, tinggi, bmi);
            // Tampilkan di OLED jika tidak sedang menampilkan data anak
            if (childName.length() == 0) {
              oledShowData(berat, tinggi, bmi);
            }
          } else {
            Serial.println("[HOLD] Data diabaikan (Hold Aktif)");
          }
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
