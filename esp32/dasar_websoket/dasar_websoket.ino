#include <WiFi.h>
#include <WebSocketsClient.h>

const char* ssid = "esp1";
const char* password = "12345674";

const char* websocket_host = "server-mqtt-js.qbyte.web.id";
const char* websocket_path = "/";

WebSocketsClient webSocket;

#define RELAY_PIN  4  // Ganti sesuai pin relay kamu

const char* relayTopic = "USR_687de6987184f/1defa9dd";

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED:
      Serial.println("✅ WebSocket connected");

      // Subscribe ke 1 topik relay
      webSocket.sendTXT("{\"action\":\"subscribe\", \"topic\":\"USR_687de6987184f/1defa9dd\"}");
      Serial.println("📡 Subscribed to: relay");
      break;

    case WStype_TEXT: {
      // Contoh pesan: {"topic":"USR_687de6987184f/1defa9dd", "payload":1}
      String msg = String((char*)payload);
    //  Serial.println("📨 Message: " + msg);

      // Ambil topic dan payload dari JSON
      if (msg.indexOf(relayTopic) != -1) {
        if (msg.indexOf("\"payload\":1") != -1) {
          digitalWrite(RELAY_PIN, HIGH);
          Serial.println("⚡ Relay ON");
        } else if (msg.indexOf("\"payload\":0") != -1) {
          digitalWrite(RELAY_PIN, LOW);
          Serial.println("💤 Relay OFF");
        }
      }
      break;
    }

    default:
      break;
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);

  WiFi.begin(ssid, password);
  Serial.print("🔌 Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500); Serial.print(".");
  }
  Serial.println("\n✅ WiFi connected");

  webSocket.beginSSL(websocket_host, 443, websocket_path);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);  
}

void loop() {
   webSocket.loop();

//   // Simulasi kirim suhu setiap 5 detik
  static unsigned long lastSend = 0;
  if (millis() - lastSend > 1000) {
    float temperature = random(200, 350) / 10.0;  // antara 20.0 - 35.0
   float temperature2 = random(1, 30) / 10.0; 
   // String topic = "USR_687de6987184f/snr_688038bc"; //snr_68803df2
   // String msg = topic + "|" + String(temperature);
  webSocket.sendTXT(String("USR_687de6987184f/snr_688038bc") + "|" + String(temperature));
 webSocket.sendTXT(String("USR_687de6987184f/snr_68803df2") + "|" + String(temperature2));
   // Serial.println("📤 Sent: " + msg);
    lastSend = millis();
  }
}