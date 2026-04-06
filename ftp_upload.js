const ftp = require("basic-ftp")
const path = require("path")

async function deploy() {
    const client = new ftp.Client()
    client.ftp.verbose = true
    try {
        console.log("🚀 Baglanti kuruluyor: 89.19.30.85...")
        await client.access({
            host: "89.19.30.85",
            user: "u2620314",
            password: "ZxqQioS$s60yzu%1",
            secure: false
        })
        
        console.log("📂 /httpdocs klasörüne geciliyor...")
        await client.ensureDir("/httpdocs")
        
        console.log("📤 Dosyalar yukleniyor (client/dist -> /httpdocs)...")
        // Önce temizlik (isteğe bağlı, ama temiz kurulum iyidir)
        // await client.clearWorkingDir() 
        
        // Yerel build klasörünü sunucuya yükle
        await client.uploadFromDir(path.join(__dirname, "client", "dist"))
        
        console.log("✅ FTP Yuklemesi Basariyla Tamamlandi!")
    }
    catch(err) {
        console.log("❌ FTP Hatasi:", err)
    }
    client.close()
}

deploy()
