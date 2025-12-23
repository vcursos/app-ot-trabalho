# 📱 Gerar APK Android - OT Telecom

## ✅ Projeto Pronto!

Seu projeto já está configurado para gerar APK no Android Studio.

## 🚀 Passo a Passo Rápido

### 1️⃣ Preparar antes de abrir o Android Studio

Sempre que fizer mudanças no código web (HTML, CSS, JS):

```powershell
npm run android
```

Ou manualmente:

```powershell
npm run cap:sync:android
npm run cap:open:android
```

### 2️⃣ No Android Studio

1. **Aguarde o Gradle Sync** finalizar (barra inferior)
2. **Build > Build Bundle(s) / APK(s) > Build APK(s)**
3. Quando terminar, clique em "locate" para ver o APK

**APK de Debug fica em:**
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### 3️⃣ Gerar APK Release Assinado (para publicar)

#### Criar Keystore (primeira vez apenas):

```powershell
keytool -genkeypair -v -storetype JKS -keystore ot-telecom-release.jks -alias ottelecom -keyalg RSA -keysize 2048 -validity 36500
```

**IMPORTANTE:** Guarde o arquivo `.jks` e as senhas em local seguro! Sem ele você não consegue atualizar o app na Play Store.

#### Gerar APK Assinado:

1. **Build > Generate Signed Bundle / APK...**
2. Escolha **APK** > Next
3. **Key store path:** selecione seu `.jks`
4. Digite as senhas
5. **Build Variants:** release
6. Marque **V1** e **V2** signature
7. Finish

**APK Release fica em:**
```
android/app/build/outputs/apk/release/app-release.apk
```

### 4️⃣ Atualizar Versão (obrigatório antes de cada release)

Edite `android/app/build.gradle`:

```groovy
versionCode 2        // Inteiro crescente: 1, 2, 3, 4...
versionName "1.0.1"  // String: "1.0.1", "1.1.0", "2.0.0"...
```

### 5️⃣ Testar no Celular

**USB Debug:**
1. Ative "Depuração USB" no celular (Configurações > Sobre > toque 7x em "Número da compilação" > Opções do desenvolvedor)
2. Conecte USB
3. No Android Studio: clique em Run ▶

**Instalar APK manualmente:**
1. Transfira o APK para o celular
2. Abra o arquivo e instale

## 📝 Workflow Diário

```powershell
# 1. Faça alterações no código (em www/)
# 2. Sincronize e abra Android Studio:
npm run android

# 3. No Android Studio: Build > Build APK(s)
# 4. Teste o APK
```

## 🔧 Configurações Atuais

- **App ID:** com.ot.telecom
- **App Name:** OT Telecom
- **Min SDK:** 22 (Android 5.1+)
- **Target SDK:** 34 (Android 14)
- **Compile SDK:** 34
- **Version:** 1.0.0 (Code: 1)

## 🆘 Problemas Comuns

**"SDK location not found":**
- File > Settings > Android SDK > Instale a SDK 34

**"JDK incompatível":**
- Settings > Build Tools > Gradle > Gradle JDK = Embedded JDK 17

**Mudanças não aparecem no app:**
- Rode `npm run cap:sync:android` antes de buildar

**Erro ao instalar APK:**
- Desinstale a versão anterior primeiro
- Ou incremente o versionCode

## 📦 Para Google Play Store

Use **Android App Bundle** (AAB) em vez de APK:
- Build > Generate Signed Bundle / APK > **Android App Bundle**

AABs são menores e otimizados pela Play Store.

## 🎯 Atalhos Úteis do package.json

```powershell
npm run android              # Sync + Abrir Android Studio
npm run cap:sync:android     # Apenas sincronizar
npm run cap:open:android     # Apenas abrir Android Studio
npm run cap:sync             # Sync todas as plataformas
```

---

**Pronto para gerar seu APK!** 🎉
