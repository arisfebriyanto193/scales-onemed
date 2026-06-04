/**
 * ============================================================
 *  ESP32 BLE Scanner — DEBUG
 *  Tujuan: Temukan semua perangkat BLE di sekitar
 *          untuk verifikasi nama & address timbangan
 * ============================================================
 */

#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEScan.h>
#include <BLEAdvertisedDevice.h>

static int scanNumber = 0;

class ScanCallbacks : public BLEAdvertisedDeviceCallbacks {
  void onResult(BLEAdvertisedDevice dev) override {
    String name    = dev.getName().c_str();
    String address = dev.getAddress().toString().c_str();
    int    rssi    = dev.getRSSI();

    // Tampilkan SEMUA device, nama kosong sekalipun
    Serial.printf("  [%s]  RSSI: %3d dBm  Nama: \"%s\"",
      address.c_str(), rssi, name.c_str());

    // Tandai jika ada service UUID
    if (dev.haveServiceUUID()) {
      Serial.printf("  SVC: %s", dev.getServiceUUID().toString().c_str());
    }

    // Tandai jika ada manufacturer data
    if (dev.haveManufacturerData()) {
      String mfr = dev.getManufacturerData();
      Serial.print("  MFR: ");
      for (size_t i = 0; i < (size_t)mfr.length(); i++) {
        uint8_t b = (uint8_t)mfr[i];
        if (b < 0x10) Serial.print("0");
        Serial.print(b, HEX);
        Serial.print(" ");
      }
    }

    Serial.println();
  }
};

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n==============================================");
  Serial.println("  ESP32 BLE Scanner — DEBUG MODE");
  Serial.println("  Pastikan timbangan MENYALA");
  Serial.println("  Scan setiap 10 detik, terus menerus");
  Serial.println("==============================================\n");

  BLEDevice::init("ESP32_SCAN_DEBUG");
}

void loop() {
  scanNumber++;
  Serial.printf("──── Scan #%d ────────────────────────────────\n", scanNumber);

  BLEScan* pScan = BLEDevice::getScan();
  pScan->setAdvertisedDeviceCallbacks(new ScanCallbacks(), true); // dedup=true
  pScan->setActiveScan(true);   // minta nama lengkap (active scan)
  pScan->setInterval(100);
  pScan->setWindow(99);

  BLEScanResults* results = pScan->start(10, false); // scan 10 detik

  Serial.printf("──── Total ditemukan: %d perangkat ──────────\n\n",
    results->getCount());

  pScan->clearResults();
  delay(3000); // jeda 3 detik sebelum scan berikutnya
}
