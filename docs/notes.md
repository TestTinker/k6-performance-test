# k6 Performance Test Notes

## Struktur

Project ini disusun per area:

- `config/` untuk konfigurasi umum dan daftar environment.
- `scenarios/` untuk flow per fitur, misalnya login dan case management.
- `utils/` untuk helper seperti token handling.
- `tests/` untuk entry function per test flow.

Struktur yang saat ini benar-benar ada:

- `script.js` sebagai entry point utama.
- `config/config.js` untuk opsi run k6.
- `config/environments.js` untuk daftar environment yang tersedia.
- `scenarios/authentication/` untuk flow OAuth login, token dan logout.
- `scenarios/case-management/` untuk placeholder flow create case.
- `tests/login-test.js` untuk orkestrasi login end-to-end.
- `utils/auth.js` dan `utils/pkce.js` untuk token state dan PKCE helper.
- `docs/notes.md` untuk catatan implementasi.

## Menjalankan Test

Contoh run untuk environment `dev`:

```bash
k6 run -e ENV=dev -e USERNAME=admin -e PASSWORD=Poiuy09876% script.js
```

Jika ingin mengirim hasil run ke InfluxDB agar dapat ditampilkan di Grafana:

```bash
k6 run -e ENV=dev -e USERNAME=admin -e PASSWORD=Poiuy09876% --out influxdb=http://localhost:8086/k6 script.js
```

Gunakan password yang valid untuk akun target. Flow login bergantung pada
redirect dari Identity Provider, sehingga kredensial yang salah biasanya akan
berhenti di halaman login dan tidak menghasilkan `Location` header lanjutan.

Contoh untuk environment lain setelah ditambahkan ke `config/environments.js`:

```bash
k6 run -e ENV=sit -e USERNAME=admin -e PASSWORD=password123! script.js
```

## Catatan

- [script.js](./script.js) saat ini hanya memanggil `executeLogin()` dan mengekspor `options`.
- [config.js](./config/config.js) masih menggunakan mode validasi sederhana: `vus: 1`, `iterations: 1`, dan `thresholds` masih di-comment.
- [environments.js](./config/environments.js) baru memiliki environment `dev`.
- Flow login yang sudah berhasil di [login-test.js](./tests/login-test.js) saat ini mencakup:
  1. authorization request
  2. buka halaman login
  3. ekstraksi `__RequestVerificationToken`
  4. ekstraksi `ReturnUrl`
  5. submit username/password
  6. follow authorization callback
  7. exchange authorization code ke token endpoint
  8. ekstraksi `accessToken` dan `idToken`
  9. simpan `accessToken` ke memory per VU
  10. mengembalikan `accessToken` dan `idToken` untuk dipakai skenario lain
- Flow logout di [logout.js](./scenarios/authentication/logout.js) sudah tervalidasi dengan pola:
  1. `GET /identityprovider/connect/endsession` mengembalikan `302`
  2. `GET /identityprovider/Account/Logout?logoutId=...` mengembalikan `200`
  3. callback `/identityprovider/connect/endsession/callback?endSessionId=...` mengembalikan `200`
- `executeLogout(idToken)` sekarang berdiri sendiri dan tidak dipanggil otomatis oleh `executeLogin()`, sehingga logout bisa dipakai terpisah dari skenario lain.
- `idToken` dipakai sebagai `id_token_hint` untuk logout. Token tidak di-log secara full; log hanya menampilkan `Boolean(...)` untuk menghindari kebocoran credential sensitif.
- Login membaca `USERNAME` dan `PASSWORD` dari environment variable dan akan gagal langsung jika nilainya tidak diberikan.
- Flow login/logout masih berbasis parsing redirect dan HTML response. Jika struktur halaman Identity Provider berubah, ekstraksi `__RequestVerificationToken`, authorization code, atau `endSessionId` bisa ikut rusak.
- Pada run yang sukses saat ini, `endSessionId` tidak muncul langsung sebagai header redirect dari `Account/Logout`; nilainya ditemukan dari konten HTML/JavaScript response step tersebut.
- [new-case.js](./scenarios/case-management/new-case.js) masih placeholder dan endpoint `'/api/case'` belum tervalidasi.
- [new-case.js](./scenarios/case-management/new-case.js) mengimpor `getAuthHeaders()` dari [auth.js](./utils/auth.js), tetapi fungsi tersebut belum ada, jadi flow create case belum siap dipakai.
