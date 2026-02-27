# Guía de Implementación: Timbre Escolar con Arduino (ESP32/ESP8266)

Esta guía explica cómo conectar y programar un Arduino (recomendado ESP32 por su WiFi integrado) para que funcione con el sistema de horarios.

## Componentes Requeridos

1. **ESP32 DevKit** (o ESP8266 NodeMCU)
2. **Módulo Relé de 5V** (1 canal)
3. **Timbre Escolar** (110V/220V AC)
4. **Fuente de alimentación** 5V/2A para el Arduino
5. **Cables jumper** y caja protectora

## Diagrama de Conexión

1. **ESP32 -> Relé**:
   - VCC -> 5V (o VIN)
   - GND -> GND
   - IN -> Pin D2 (configurable en el código)
2. **Relé -> Timbre**:
   - Conectar el cable de fase del timbre en serie con los terminales COM y NO (Normalmente Abierto) del relé.
   - **PRECAUCIÓN**: Estás manejando corriente alterna de alto voltaje. Realiza esto con el timbre desconectado y preferiblemente bajo supervisión de un electricista.

## Código del Arduino (C++)

Copia este código en tu IDE de Arduino. Asegúrate de instalar la librería `ArduinoJson` desde el gestor de librerías.

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// --- CONFIGURACIÓN ---
const char* ssid = "TU_WIFI_SSID";
const char* password = "TU_WIFI_PASSWORD";
// Cambia esto por la IP de tu servidor o dominio
const char* serverUrl = "http://TU_IP_SERVIDOR:3000/api/bell/trigger"; 

const int RELAY_PIN = 2; // Pin donde conectaste el relé
const int POLLING_INTERVAL = 30000; // 30 segundos (en ms)

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW); // Timbre apagado por defecto

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Conectado!");
}

void activateBell(int duration, String pattern) {
  Serial.println("¡Activando timbre! Patrón: " + pattern);
  
  if (pattern == "DOUBLE") {
    // 2 toques
    digitalWrite(RELAY_PIN, HIGH);
    delay(duration / 2);
    digitalWrite(RELAY_PIN, LOW);
    delay(500);
    digitalWrite(RELAY_PIN, HIGH);
    delay(duration / 2);
    digitalWrite(RELAY_PIN, LOW);
  } else if (pattern == "TRIPLE") {
    // 3 toques
    for(int i=0; i<3; i++) {
      digitalWrite(RELAY_PIN, HIGH);
      delay(duration / 3);
      digitalWrite(RELAY_PIN, LOW);
      if(i < 2) delay(400);
    }
  } else {
    // SINGLE o cualquier otro (1 toque continuo)
    digitalWrite(RELAY_PIN, HIGH);
    delay(duration);
    digitalWrite(RELAY_PIN, LOW);
  }
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    int httpCode = http.GET();

    if (httpCode == 200) {
      String payload = http.getString();
      StaticJsonDocument<200> doc;
      deserializeJson(doc, payload);

      bool shouldRing = doc["ring"];
      if (shouldRing) {
        int duration = doc["duration"];
        String pattern = doc["pattern"];
        activateBell(duration, pattern);
      }
    }
    http.end();
  }
  delay(POLLING_INTERVAL);
}
```

## Configuración en el Sistema Web

1. Dirígete a la pestaña **Timbre** en la aplicación.
2. Asegúrate de que el Arduino esté llamando a la URL correcta.
3. Puedes realizar una prueba presionando el botón **"TOCAR AHORA"** en el dashboard.
4. Programa los timbres automáticos según los cambios de bloque (ej. 7:30, 8:30, etc.).

## Notas de Seguridad

- Usa un relé que soporte al menos 10A para el timbre.
- Instala todo en una caja plástica aislante para evitar cortocircuitos.
- Si el WiFi de la escuela es inestable, considera usar un Arduino con Shield Ethernet.
