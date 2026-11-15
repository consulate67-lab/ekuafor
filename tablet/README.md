# Saloon Tablet

Offline-first tablet paneli. Kurulum, personel (fotoğraflar dahil), parametreler, randevu/izin/masraf cihazda tutulur.

## Veri saklama (ek uygulama gerekmez)

| Durum | Ne olur |
|--------|---------|
| Uygulama kapanır / tablet yeniden açılır | `localStorage` + Preferences → **doğrudan panel** (firma, personel, foto, parametre) |
| APK silinir, yeniden yüklenir | `SaloonTablet/setup-backup.json` (Documents + ExternalStorage) yedeğinden geri yüklenir |
| Parametre → Kurulumu sıfırla | Yerel veri + yedek silinir |

**Ek uygulama kurulmaz.** Yedek aynı tabletin depolamasında tutulur; Capacitor Filesystem + Preferences yeterli.

## Geliştirme (tarayıcı)

```bash
cd tablet
npm install
npm run dev
```

http://localhost:5180 — tarayıcıda kalıcı yedek yok; kapanıp açılınca localStorage yeter.

## APK (Android)

Önkoşul: Android Studio + JDK.

```bash
cd tablet
npm install
npm run build
npx cap add android    # bir kez
npm run cap:sync
npx cap open android   # Android Studio → Build → Build APK(s)
```

veya:

```bash
npm run apk:debug
```

Çıktı: `tablet/android/app/build/outputs/apk/debug/app-debug.apk`

APK tablete kopyalanıp yüklenir; kurulum sihirbazı bir kez yapılır, sonraki açılışlarda panel gelir.
