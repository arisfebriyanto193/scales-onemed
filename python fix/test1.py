"""
=============================================================
  BLE Reader - SENSSUN GROWTH
  Library : bleak
  Install : pip install bleak
=============================================================
"""

import asyncio
import sys
from datetime import datetime
from bleak import BleakScanner, BleakClient
from bleak.exc import BleakError

# ─────────────────────────── Konfigurasi ────────────────────────────
TARGET_NAME     = "SENSSUN GROWTH"
SERVICE_UUID    = "0000fff0-0000-1000-8000-00805f9b34fb"
CHAR_RX_UUID    = "0000fff1-0000-1000-8000-00805f9b34fb"   # READ + NOTIFY
CHAR_TX_UUID    = "0000fff2-0000-1000-8000-00805f9b34fb"   # WRITE
SCAN_TIMEOUT    = 15.0   # detik untuk scan
# ─────────────────────────────────────────────────────────────────────


def separator(char="─", width=55):
    print(char * width)


def parse_data(data: bytearray):
    """
    Parse paket 13-byte dari SENSSUN GROWTH.
    Format: FF A5 [W_H] [W_L] [?] [?] [H_H] [H_L] [?] [?] [?] [SEQ] [CHK]
      - Berat (kg) : byte[2] << 8 | byte[3], dibagi 10
      - Tinggi (cm): byte[6] << 8 | byte[7], dibagi 10
    """
    if len(data) < 8:
        return None, None

    raw_weight = (data[2] << 8) | data[3]
    raw_height = (data[6] << 8) | data[7]

    weight_kg = raw_weight / 1000.0
    height_cm = raw_height / 10.0

    return weight_kg, height_cm


def notification_handler(sender, data: bytearray):
    """Callback dipanggil setiap ada notifikasi masuk dari FFF1."""
    timestamp  = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    hex_string = " ".join(f"{byte:02X}" for byte in data)
    length     = len(data)

    weight_kg, height_cm = parse_data(data)

    separator()
    print(f"[{timestamp}]")
    print(f"HEX: {hex_string}")
    print(f"LEN: {length}")
    if weight_kg is not None:
        print(f"⚖️   Berat  : {weight_kg:.1f} kg")
        print(f"📏  Tinggi : {height_cm:.1f} cm")


async def scan_device():
    """Scan BLE dan kembalikan perangkat pertama yang cocok dengan TARGET_NAME."""
    print(f"\n🔍  Scanning '{TARGET_NAME}' ... (timeout {SCAN_TIMEOUT}s)")

    device = await BleakScanner.find_device_by_filter(
        lambda d, _: d.name and TARGET_NAME.lower() in d.name.lower(),
        timeout=SCAN_TIMEOUT,
    )
    return device


async def run():
    # ── 1. Scan ──────────────────────────────────────────────────────
    device = await scan_device()

    if device is None:
        print(f"\n❌  Perangkat '{TARGET_NAME}' tidak ditemukan.")
        print("    Pastikan perangkat menyala dan berada dalam jangkauan.")
        sys.exit(1)

    print(f"✅  Ditemukan : {device.name}")
    print(f"    Address   : {device.address}")

    # ── 2. Connect ───────────────────────────────────────────────────
    print(f"\n🔗  Menghubungkan ke {device.address} ...")

    async with BleakClient(device.address) as client:
        if not client.is_connected:
            print("❌  Gagal terhubung.")
            sys.exit(1)

        print("✅  Terhubung!\n")

        # ── 3. Cek service & characteristic ──────────────────────────
        services = client.services
        service  = services.get_service(SERVICE_UUID)

        if service is None:
            print(f"⚠️   Service {SERVICE_UUID} tidak ditemukan.")
            print("    Services tersedia:")
            for svc in services:
                print(f"      {svc.uuid}")
            sys.exit(1)

        char_rx = service.get_characteristic(CHAR_RX_UUID)
        if char_rx is None:
            print(f"⚠️   Characteristic RX {CHAR_RX_UUID} tidak ditemukan.")
            sys.exit(1)

        # ── 4. Subscribe NOTIFY ke FFF1 ──────────────────────────────
        await client.start_notify(CHAR_RX_UUID, notification_handler)

        separator("═")
        print(f"  BLE Monitor SENSSUN GROWTH — aktif")
        print(f"  Service  : {SERVICE_UUID}")
        print(f"  Char RX  : {CHAR_RX_UUID}  (NOTIFY)")
        print(f"  Char TX  : {CHAR_TX_UUID}  (WRITE)")
        separator("═")
        print("  Menunggu data ... tekan Ctrl+C untuk berhenti.\n")

        # ── 5. Loop — tunggu notifikasi sampai dihentikan ─────────────
        try:
            while client.is_connected:
                await asyncio.sleep(1)
        except asyncio.CancelledError:
            pass
        finally:
            await client.stop_notify(CHAR_RX_UUID)
            separator()
            print("🔌  Koneksi ditutup.")


# ─────────────────────────── Entry Point ─────────────────────────────
if __name__ == "__main__":
    try:
        asyncio.run(run())
    except BleakError as e:
        print(f"\n❌  BleakError: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n\n👋  Dihentikan oleh pengguna.")