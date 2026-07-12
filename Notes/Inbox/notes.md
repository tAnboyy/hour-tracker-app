# notes

npx expo run:android --device RZCX316G9JN 2>&1 

adb -s RZCX316G9JN install /Users/das/hour-tracker-app/android/app/build/outputs/apk/release/app-release.apk

adb -s RZCX316G9JN install -r /Users/das/hour-tracker-app/android/app/build/outputs/apk/debug/app-debug.apk

start metro-
cd /Users/das/hour-tracker-app && nohup npx expo start --dev-client

cd /Users/das/hour-tracker-app/android && ./gradlew :app:assembleRelease
adb -s RZCX316G9JN install -r /Users/das/hour-tracker-app/android/app/build/outputs/apk/release/app-release.apk

