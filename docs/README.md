# MIKROTIK SERVICE

## 1. Mengizinkan Akses Remote MikroTik (WinBox & WebFig) via ZeroTier

```bash
/ip firewall filter add chain=input in-interface=zero action=accept place-before=0 comment="Allow ZeroTier to MikroTik Service"
```

## 2. Mengizinkan Laptop ZeroTier Masuk/Forward ke Jaringan LAN

```bash
/ip firewall filter add chain=forward in-interface=zero action=accept place-before=0 comment="Allow Zero to LAN"
```

## 3. NAT Masquerade (Agar Perangkat Lokal LAN Bisa Balas Paket ke ZeroTier)

```bash
/ip firewall nat add chain=srcnat out-interface=bridge action=masquerade comment="NAT to Bridge LAN"
```

## 4. Perintah Cek Tabel Routing & Verifikasi Koneksi

Cek tabel rute:

```bash
/ip route print
```

Cek daftar IP yang aktif di router:

```bash
/ip address print
```

Jika suatu saat perlu mengizinkan kembali fitur ZeroTier setelah update/reset, perintah aktivasi lisensi sistemnya:

```bash
/system/device-mode/update zerotier=yes
```
