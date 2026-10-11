---
description: Nasıl Android ve iPhone uygulaması oluşturulur
---
Bu proje Capacitor kullanılarak mobil uygulamaya dönüştürülmüştür.

### Gerekli Araçlar
1. **Android İçin:** [Android Studio](https://developer.android.com/studio) kurulu olmalıdır.
2. **iPhone İçin:** [Xcode](https://developer.apple.com/xcode/) ve bir Mac bilgisayar gereklidir.

### Uygulamayı Hazırlama ve Senkronizasyon
Herhangi bir kod değişikliği yaptıktan sonra mobil uygulamaları güncellemek için:
```bash
npm run mobile:sync --workspace=client
```
Bu komut projeyi derler ve dosyaları `android` ve `ios` klasörlerine kopyalar.

### Uygulamayı Başlatma
```bash
npm run mobile:open:android --workspace=client
npm run mobile:open:ios --workspace=client
```

### Android Studio Olmadan APK Hazırlama (GitHub Actions)
1. Değişiklikleri GitHub'a push edin.
2. GitHub deposunda **Actions** → **Build Android APK** → **Run workflow**.
3. İşlem bitince **Artifacts** bölümünden `saloon-app-debug` dosyasını indirin.

### Önemli Notlar
- Mobil uygulama `https://web-production-db847.up.railway.app/api` adresine bağlanır.
- Web sürümü de Railway üzerinden aynı sunucudan servis edilir.
