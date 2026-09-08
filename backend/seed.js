const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const initialNotes = [
  {
    title: '1. Mengizinkan Akses Remote MikroTik (WinBox & WebFig) via ZeroTier',
    content: '```routeros\n/ip firewall filter add chain=input in-interface=zero action=accept place-before=0 comment="Allow ZeroTier to MikroTik Service"\n```'
  },
  {
    title: '2. Mengizinkan Laptop ZeroTier Masuk/Forward ke Jaringan LAN',
    content: '```routeros\n/ip firewall filter add chain=forward in-interface=zero action=accept place-before=0 comment="Allow Zero to LAN"\n```'
  },
  {
    title: '3. NAT Masquerade (Agar Perangkat Lokal LAN Bisa Balas Paket ke ZeroTier)',
    content: '```routeros\n/ip firewall nat add chain=srcnat out-interface=bridge action=masquerade comment="NAT to Bridge LAN"\n```'
  },
  {
    title: '4. Perintah Cek Tabel Routing & Verifikasi Koneksi',
    content: 'Cek tabel rute:\n```routeros\n/ip route print\n```\nCek daftar IP yang aktif di router:\n```routeros\n/ip address print\n```\nJika suatu saat perlu mengizinkan kembali fitur ZeroTier setelah update/reset, perintah aktivasi lisensi sistemnya:\n```routeros\n/system/device-mode/update zerotier=yes\n```'
  }
];

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT DEFAULT 'General',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  const stmt = db.prepare('INSERT INTO notes (title, content, category) VALUES (?, ?, ?)');
  
  initialNotes.forEach(note => {
    stmt.run(note.title, note.content, 'MikroTik');
  });
  
  stmt.finalize();
  console.log('Seeded database with initial notes.');
});

db.close();
