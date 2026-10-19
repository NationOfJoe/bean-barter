#!/usr/bin/env bash
# Builds android/out/BeanBarter.apk with the plain Android SDK tools (no Gradle needed).
# Needs: the Android SDK (platform android-29, build-tools 29.0.2), a JDK, Node, and Python 3.
# Usage: bash android/build-apk.sh
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
SDK="${ANDROID_HOME:-$LOCALAPPDATA/Android/Sdk}"
SDK="$(cygpath -u "$SDK" 2>/dev/null || echo "$SDK")"
BT="$SDK/build-tools/29.0.2"
JAR="$SDK/platforms/android-29/android.jar"
OUT="$HERE/out"
TMP="$HERE/.build"
KEYSTORE="$HERE/beanbarter.keystore"
STOREPASS_FILE="$HERE/keystore-password.txt"

[ -f "$JAR" ] || { echo "Missing $JAR. Install 'Android SDK Platform 29' in Android Studio's SDK Manager."; exit 1; }
tool() { if [ -f "$BT/$1.bat" ]; then echo "$BT/$1.bat"; else echo "$BT/$1"; fi; }
D8="$(tool d8)"; APKSIGNER="$(tool apksigner)"
[ -x "$BT/aapt2.exe" ] || [ -x "$BT/aapt2" ] || { echo "Missing build-tools 29.0.2 in $BT."; exit 1; }

rm -rf "$TMP"; mkdir -p "$TMP/flat" "$TMP/gen" "$TMP/classes" "$TMP/dex" "$OUT"

echo "1/6 Packing the game page"
node "$HERE/make-assets.js"

echo "2/6 Compiling resources"
"$BT/aapt2" compile --dir "$HERE/res" -o "$TMP/flat/res.zip"
"$BT/aapt2" link -I "$JAR" --manifest "$HERE/AndroidManifest.xml" -A "$HERE/assets" \
  --java "$TMP/gen" -o "$TMP/unsigned.apk" "$TMP/flat/res.zip" --auto-add-overlay

echo "3/6 Compiling Java"
javac -source 1.8 -target 1.8 -encoding UTF-8 -bootclasspath "$JAR" -d "$TMP/classes" \
  $(find "$HERE/src" "$TMP/gen" -name '*.java') 2>&1 | grep -v "bootstrap classpath" || true
[ -f "$TMP/classes/com/nationofjoe/beanbarter/MainActivity.class" ] || { echo "Java compile failed"; exit 1; }

echo "4/6 Converting to Android bytecode"
"$D8" --release --lib "$JAR" --min-api 21 --output "$TMP/dex" $(find "$TMP/classes" -name '*.class')

echo "5/6 Adding code to the package"
python -c "import zipfile,sys; z=zipfile.ZipFile(sys.argv[1],'a',zipfile.ZIP_DEFLATED); z.write(sys.argv[2],'classes.dex'); z.close()" \
  "$(cygpath -w "$TMP/unsigned.apk" 2>/dev/null || echo "$TMP/unsigned.apk")" "$(cygpath -w "$TMP/dex/classes.dex" 2>/dev/null || echo "$TMP/dex/classes.dex")"
"$BT/zipalign" -f -p 4 "$TMP/unsigned.apk" "$TMP/aligned.apk"

echo "6/6 Signing"
if [ ! -f "$KEYSTORE" ]; then
  # One key for all future builds: Android only installs an update signed with the same key.
  PASS="$(head -c 24 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 20)"
  echo "$PASS" > "$STOREPASS_FILE"
  keytool -genkeypair -keystore "$KEYSTORE" -alias beanbarter -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass "$PASS" -keypass "$PASS" -dname "CN=Bean Barter" >/dev/null 2>&1
  echo "   Created a new signing key: $KEYSTORE (password in $STOREPASS_FILE). Keep both; they are not in git."
fi
PASS="$(cat "$STOREPASS_FILE")"
"$APKSIGNER" sign --ks "$KEYSTORE" --ks-key-alias beanbarter --ks-pass "pass:$PASS" --key-pass "pass:$PASS" \
  --out "$OUT/BeanBarter.apk" "$TMP/aligned.apk"
"$APKSIGNER" verify "$OUT/BeanBarter.apk"

echo "Done: $OUT/BeanBarter.apk ($(du -k "$OUT/BeanBarter.apk" | cut -f1) KB)"
