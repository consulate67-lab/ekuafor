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
Android Studio'yu açıp projeyi çalıştırmak için:
```bash
npm run mobile:open:android --workspace=client
```

Xcode'u (Mac'te) açıp projeyi çalıştırmak için:
```bash
npm run mobile:open:ios --workspace=client
```

### Android Studio Olmadan APK Hazırlama (GitHub Actions)
Eğer bilgisayarınıza Android Studio kurmak istemiyorsanız, GitHub üzerinden otomatik APK oluşturabilirsiniz:

1. Projenizi GitHub'a push edin (`npm run deploy:all`).
2. GitHub deponuzda **Actions** sekmesine gidin.
3. Sol menüden **Build Android APK** akışını seçin.
4. **Run workflow** butonuna tıklayın.
5. İşlem bittiğinde (yaklaşık 3-5 dk), build özetinin altındaki **Artifacts** bölümünden `saloon-app-debug` dosyasını indirip telefonunuza kurabilirsiniz.

### Önemli Notlar
- Mobil uygulama otomatik olarak `https://web-production-db847.up.railway.app/api` adresine bağlanacak şekilde ayarlanmıştır.
- Uygulama içi yönlendirmeler (routing) otomatik olarak Capacitor tarafından yönetilir.
- Web sürümü hala GitHub Pages üzerinden `/ekuafor/` altında çalışmaya devam eder.
- Mobil sürüm otomatik olarak kök dizinden (`/`) çalışacak şekilde konfigüre edilmiştir.

