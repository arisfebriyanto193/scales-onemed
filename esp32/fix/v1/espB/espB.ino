/**
 * ============================================================
 *  ESP32-B — UART Receiver + WebSocket Sender
 *  Alur: ESP32-A (BLE) → (UART TX→RX) → ESP32-B → WebSocket Server
 * ============================================================
 *
 *  Koneksi UART dari ESP32-A:
 *    ESP32-A TX2 (GPIO17) ──→ ESP32-B RX2 (GPIO16)
 *    ESP32-A GND           ──→ ESP32-B GND
 *
 *  Format data yang diterima dari espA via Serial2:
 *    "BERAT:xx.x;TINGGI:xxx.x;BMI:xx.x\n"
 *
 *  Format data yang dikirim ke WebSocket server:
 *    "USR_687de6987184f/snr_688038bc|xx.x"   (berat)
 *    "USR_687de6987184f/snr_68803df2|xxx.x"  (tinggi)
 *    Atau JSON: {"berat":xx.x,"tinggi":xxx.x,"bmi":xx.x}
 *
 *  Library yang diperlukan:
 *    - WiFi (bawaan ESP32)
 *    - WebSockets by Markus Sattler (Library Manager)
 * ============================================================
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WebSocketsClient.h>

// ─────────────────── Konfigurasi WiFi ───────────────────────
const char* ssid     = "TALAS 1";        // Ganti dengan SSID WiFi Anda
const char* password = "kitahebat";    // Ganti dengan password WiFi Anda

// ─────────────────── Konfigurasi WebSocket ──────────────────
const char* ws_host = "penting-be.qbyte.web.id";
const char* ws_path = "/ws";
const int   ws_port = 443;            // SSL/WSS

// ─────────────────── Topic WebSocket ────────────────────────
const char* TOPIC_BERAT  = "abcd/bb";
const char* TOPIC_TINGGI = "abcd/tb";
const char* TOPIC_BMI    = "abcd/bmi";       // opsional


// ─────────────────── Konfigurasi UART dari espA ─────────────
// Serial2: RX=GPIO16, TX=GPIO17 (TX tidak aktif di espB ini)
#define UART_BAUD   115200
#define UART_RX_PIN 16
#define UART_TX_PIN 17


// ─────────────────── State ──────────────────────────────────
WebSocketsClient webSocket;
bool wsConnected = false;

// Buffer penerimaan UART
String uartBuffer = "";

// ─────────────────── Callback WebSocket ─────────────────────
void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED:
      wsConnected = true;
      Serial.println("✅ [WS] WebSocket terhubung");

      // Subscribe topik relay (opsional, jika ingin terima perintah juga)
      // webSocket.sendTXT("{\"action\":\"subscribe\", \"topic\":\"USR_687de6987184f/relay\"}");
      break;

    case WStype_DISCONNECTED:
      wsConnected = false;
      Serial.println("❌ [WS] WebSocket terputus");
      break;

    case WStype_TEXT:
      // Terima pesan dari server (opsional: kontrol relay, ACK, dsb)
      Serial.printf("📨 [WS] Pesan masuk: %s\n", (char*)payload);
      break;

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
  // Cari "BERAT:"
  int idxB = line.indexOf("BERAT:");
  int idxT = line.indexOf(";TINGGI:");
  int idxM = line.indexOf(";BMI:");

  if (idxB < 0 || idxT < 0 || idxM < 0) return false;

  berat  = line.substring(idxB + 6, idxT).toFloat();
  tinggi = line.substring(idxT + 8, idxM).toFloat();
  bmi    = line.substring(idxM + 5).toFloat();

  return true;
}

// ─────────────────── Kirim data ke WebSocket ────────────────
void sendToWebSocket(float berat, float tinggi, float bmi) {
  if (!wsConnected) {
    Serial.println("[WS] Belum terhubung, data tidak dikirim.");
    return;
  }

  // Kirim berat (format: "topic|value")
  String msgBerat = String(TOPIC_BERAT) + "|" + String(berat, 3);
  webSocket.sendTXT(msgBerat);
  Serial.println("📤 [WS] " + msgBerat);

  // Kirim tinggi
  String msgTinggi = String(TOPIC_TINGGI) + "|" + String(tinggi, 1);
  webSocket.sendTXT(msgTinggi);
  Serial.println("📤 [WS] " + msgTinggi);

  // Kirim BMI (opsional)
  String msgBMI = String(TOPIC_BMI) + "|" + String(bmi, 1);
  webSocket.sendTXT(msgBMI);
  Serial.println("📤 [WS] " + msgBMI);

  // -- Alternatif kirim JSON (uncomment jika server menerima JSON) --
  // String json = "{\"berat\":" + String(berat,1) +
  //               ",\"tinggi\":" + String(tinggi,1) +
  //               ",\"bmi\":" + String(bmi,1) + "}";
  // webSocket.sendTXT(json);
}

// ─────────────────── Setup ──────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(500);

  // Inisialisasi UART dari ESP32-A
  Serial2.begin(UART_BAUD, SERIAL_8N1, UART_RX_PIN, UART_TX_PIN);
  Serial.println("[UART] Serial2 siap (RX=GPIO16, TX=GPIO17).");

  Serial.println("\n==============================================");
  Serial.println("  ESP32-B — UART Receiver + WebSocket Sender");
  Serial.println("==============================================");

  // Koneksi WiFi
  WiFi.begin(ssid, password);
  Serial.print("🔌 Menghubungkan ke WiFi");
  unsigned long t = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t < 15000) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi terhubung. IP: " + WiFi.localIP().toString());
  } else {
    Serial.println("\n❌ WiFi gagal terhubung! Restart...");
    ESP.restart();
  }

  // Inisialisasi WebSocket (SSL/WSS port 443)
  webSocket.beginSSL(ws_host, ws_port, ws_path);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);

  Serial.println("[WS] Menghubungkan ke WebSocket server...");
}

// ─────────────────── Loop ───────────────────────────────────
void loop() {
  // ── Handle WebSocket ──────────────────────────────────
  webSocket.loop();

  // ── Baca data dari espA via UART ──────────────────────
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
