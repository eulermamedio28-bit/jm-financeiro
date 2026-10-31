#!/usr/bin/env bash
set -euo pipefail
capture_evidence() {
  adb logcat -d -s AndroidRuntime:E > android-runtime.log || true
  adb exec-out screencap -p > android-installed.png || true
}
trap capture_evidence EXIT
adb install apk/app-debug.apk
adb shell am start -W -n br.com.restaurantejm.financeiro/.MainActivity
sleep 10
app_pid=$(adb shell pidof br.com.restaurantejm.financeiro | tr -d '\r')
test -n "$app_pid"
adb forward tcp:9222 localabstract:webview_devtools_remote_$app_pid
node scripts/android-webview-smoke.cjs
node scripts/android-export-smoke.cjs
adb shell dumpsys activity activities | grep -F 'br.com.restaurantejm.financeiro/.MainActivity'
capture_evidence
! grep -q 'FATAL EXCEPTION' android-runtime.log
