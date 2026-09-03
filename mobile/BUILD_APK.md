# Mobile APK Build & Offline Mesh Setup

## Current Status
The mobile app is a functional **Expo React Native** prototype with all requested UI features:
- Notifications inbox
- Road status panel
- Evacuation routes
- SEVERE risk tier
- Camera capture + auto-geotag reporting
- Offline caching and queuing

However, **Expo Go** does not support custom native modules like Google Nearby Connections. To build an installable APK with mesh relay, you must convert to the **bare workflow**.

---

## Step 1: Convert to Bare Workflow

```bash
cd C:\Users\vbala\Downloads\SIH LANSLIDE\SIH LANSLIDE\mobile
npx expo prebuild
```

This generates `android/` and `ios/` native projects.

---

## Step 2: Add Nearby Connections Dependency

Edit `android/build.gradle`:
```gradle
dependencies {
    classpath("com.android.tools.build:gradle:8.2.0")
    classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.0")
}
```

Edit `android/app/build.gradle`:
```gradle
dependencies {
    implementation("com.google.android.gms:play-services-nearby:18.7.0")
}
```

Edit `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
<uses-permission android:name="android.permission.CHANGE_WIFI_STATE" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.CAMERA" />
```

---

## Step 3: Create Native Module Wrapper

Create `android/app/src/main/java/com/mobile/NearbyConnectionsModule.java`:
```java
package com.mobile;

import android.content.Context;
import android.util.Log;
import com.facebook.react.bridge.*;
import com.google.android.gms.nearby.Nearby;
import com.google.android.gms.nearby.connection.*;

public class NearbyConnectionsModule extends ReactContextBaseJavaModule {
    private static final String TAG = "NearbyConnections";
    private ConnectionsClient connectionsClient;
    private boolean advertising = false;

    public NearbyConnectionsModule(ReactApplicationContext context) {
        super(context);
        connectionsClient = Nearby.getConnectionsClient(context);
    }

    @Override
    public String getName() {
        return "NearbyConnectionsModule";
    }

    @ReactMethod
    public void startAdvertising(ReadableMap options, Promise promise) {
        AdvertisingOptions advertisingOptions = new AdvertisingOptions.Builder().build();
        connectionsClient.startAdvertising(
            "LandslideMesh",
            "com.mobile",
            new ConnectionLifecycleCallback() {
                @Override
                public void onConnectionInitiated(String endpointId, ConnectionInfo info) {
                    connectionsClient.acceptConnection(endpointId, new PayloadCallback() {
                        @Override
                        public void onPayloadReceived(String endpointId, Payload payload) {
                            WritableMap msg = new WritableNativeMap();
                            msg.putString("zone_code", payload.asBytes() != null ? new String(payload.asBytes()) : "");
                            // Parse and emit to JS via event emitter
                        }
                        @Override public void onPayloadTransferUpdate(String endpointId, PayloadTransferUpdate update) {}
                    });
                }
                @Override public void onConnectionResult(String endpointId, ConnectionResolution result) {}
                @Override public void onDisconnected(String endpointId) {}
            },
            advertisingOptions
        ).addOnSuccessListener(aVoid -> {
            advertising = true;
            promise.resolve(true);
        }).addOnFailureListener(e -> promise.reject("ADVERT_FAIL", e));
    }

    @ReactMethod
    public void stopAdvertising(Promise promise) {
        if (advertising) {
            connectionsClient.stopAdvertising();
            advertising = false;
        }
        promise.resolve(true);
    }

    @ReactMethod
    public void sendMessage(String message, Promise promise) {
        try {
            Payload payload = Payload.fromBytes(message.getBytes());
            connectionsClient.sendPayload("ALL_ENDPOINTS", payload);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("SEND_FAIL", e);
        }
    }
}
```

---

## Step 4: Build the APK

```bash
cd C:\Users\vbala\Downloads\SIH LANSLIDE\SIH LANSLIDE\mobile\android
./gradlew assembleDebug
```

The APK will be at:
`android/app/build/outputs/apk/debug/app-debug.apk`

Or for release:
```bash
./gradlew assembleRelease
```

---

## Step 5: Install on Physical Devices

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Testing Mesh Relay

1. **Phone A**: Open app, ensure it has a cached alert (simulate by going offline, or use admin web to issue an alert).
2. **Phone B**: Install same APK, ensure no internet (airplane mode + BT/WiFi on).
3. **Both phones**: Keep app in foreground. The mesh service broadcasts cached alerts every 30 seconds.
4. **Bring phones within ~5-10 meters**: Phone B should receive the alert within seconds, show "Received via mesh" tag, and auto-rebroadcast if TTL > 0.
5. **Phone A (with internet later)**: When connectivity returns, mesh alerts are POSTed to backend via `meshService.postMeshAlertsToBackend()`.

---

## Important Notes

- **Nearby Connections requires physical devices** — emulators cannot test BT/WiFi mesh.
- The JS `meshService` is already implemented with seen-cache, TTL decrement, and backend re-ingestion hooks.
- The native module wrapper above is a minimal skeleton; for production, add proper endpoint management and JSON serialization.
- For hackathon demo, you can also simulate mesh by sharing alerts via Android `Intent`/`BroadcastReceiver` if Nearby Connections setup is too heavy.
