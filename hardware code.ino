#include <Adafruit_GFX.h>
#include <Adafruit_ST7735.h>
#include <SPI.h>
#include <SimpleDHT.h>
#include <WiFi.h>
#include <HTTPClient.h>

// ================= TFT PINS =================
#define TFT_CS    5
#define TFT_RST   4
#define TFT_DC    2
#define TFT_MOSI  23
#define TFT_SCK   18

// ================= SENSOR PINS =================
#define DHT11_PIN 15
#define RAIN_SENSOR_AO 36
#define RAIN_SENSOR_DO 39
#define MOISTURE_SENSOR_AO 34
#define MOISTURE_SENSOR_DO 35
#define LDR_SENSOR_PIN 32

// ================= RELAY & LED =================
#define RELAY_PUMP1 13   // INLET
#define RELAY_PUMP2 12   // OUTLET
#define PUMP1_LED_PIN 14
#define PUMP2_LED_PIN 26

// ================= WIFI =================
char ssid[] = "your wifi name";
<<<<<<< HEAD
char pass[] = "wifi password";

// ================= THINGSPEAK =================
const char* thingSpeakAPIKey = "thinkspeak api key";
=======
char pass[] = "your wifi password";

// ================= THINGSPEAK =================
const char* thingSpeakAPIKey = "api key";
>>>>>>> 6b9026def3c4489a1b82d12dc5f8b8deb703f959
const char* thingSpeakServer = "api.thingspeak.com";

// ================= OBJECTS =================
Adafruit_ST7735 tft = Adafruit_ST7735(TFT_CS, TFT_DC, TFT_MOSI, TFT_SCK, TFT_RST);
SimpleDHT11 dht11(DHT11_PIN);

// ================= VARIABLES =================
byte temperature = 0, humidity = 0;
int rainAnalogValue, moistureAnalogValue, ldrValue;
int lightIntensity;
String moistureStatus, lightStatus;

bool pump1State = false;
bool pump2State = false;
bool isRaining = false;
bool wifiConnected = false;

unsigned long pump1StartTime = 0;
unsigned long pump2StartTime = 0;
unsigned long rainStartTime = 0;
unsigned long lastUpdate = 0;
unsigned long lastCloudUpdate = 0;

// ================= CONSTANTS =================
#define UPDATE_INTERVAL 2000
#define CLOUD_UPDATE_INTERVAL 15000
#define MAX_INLET_PUMP_TIME 300000
#define MAX_OUTLET_PUMP_TIME 180000
#define RAIN_OUTLET_DELAY 60000

// ================= SETUP =================
void setup() {
  Serial.begin(115200);

  pinMode(RELAY_PUMP1, OUTPUT);
  pinMode(RELAY_PUMP2, OUTPUT);
  pinMode(PUMP1_LED_PIN, OUTPUT);
  pinMode(PUMP2_LED_PIN, OUTPUT);

  digitalWrite(RELAY_PUMP1, LOW);
  digitalWrite(RELAY_PUMP2, LOW);

  tft.initR(INITR_BLACKTAB);
  tft.setRotation(3);
  tft.fillScreen(ST77XX_BLACK);

  showStartupScreen();
  delay(2000);

  WiFi.begin(ssid, pass);
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 20) {
    delay(500);
    tries++;
  }

  if (WiFi.status() == WL_CONNECTED) wifiConnected = true;
}

// ================= LOOP =================
void loop() {
  unsigned long now = millis();

  if (now - lastUpdate >= UPDATE_INTERVAL) {
    lastUpdate = now;

    if (dht11.read(&temperature, &humidity, NULL) == SimpleDHTErrSuccess) {
      readRain();
      readMoisture();
      readLDR();

      controlInletPump();
      controlOutletPump(now);

      displayDashboard();

      if (wifiConnected && now - lastCloudUpdate > CLOUD_UPDATE_INTERVAL) {
        sendToThingSpeak();
        lastCloudUpdate = now;
      }
    }
  }
}

// ================= SENSOR READ =================
void readRain() {
  rainAnalogValue = analogRead(RAIN_SENSOR_AO);
  isRaining = (rainAnalogValue < 2000);

  if (isRaining && rainStartTime == 0) rainStartTime = millis();
  if (!isRaining) rainStartTime = 0;
}

void readMoisture() {
  moistureAnalogValue = analogRead(MOISTURE_SENSOR_AO);

  if (moistureAnalogValue > 3500) moistureStatus = "VERY DRY";
  else if (moistureAnalogValue > 2800) moistureStatus = "DRY";
  else if (moistureAnalogValue > 2000) moistureStatus = "MOIST";
  else if (moistureAnalogValue > 1200) moistureStatus = "WET";
  else moistureStatus = "SATURATED";
}

void readLDR() {
  ldrValue = analogRead(LDR_SENSOR_PIN);
  lightIntensity = map(ldrValue, 4095, 0, 0, 100);
  lightIntensity = constrain(lightIntensity, 0, 100);

  if (lightIntensity > 80) lightStatus = "VERY BRIGHT";
  else if (lightIntensity > 60) lightStatus = "BRIGHT";
  else if (lightIntensity > 40) lightStatus = "MEDIUM";
  else if (lightIntensity > 20) lightStatus = "LOW";
  else lightStatus = "DARK";
}

// ================= CONTROL LOGIC =================
void controlInletPump() {
  if ((moistureStatus == "VERY DRY" || moistureStatus == "DRY") &&
      !pump1State && !isRaining && lightIntensity > 20) {

    pump1State = true;
    pump1StartTime = millis();
    digitalWrite(RELAY_PUMP1, HIGH);
    digitalWrite(PUMP1_LED_PIN, HIGH);
  }

  if ((moistureStatus == "MOIST" || moistureStatus == "WET" || moistureStatus == "SATURATED") && pump1State) {
    pump1State = false;
    digitalWrite(RELAY_PUMP1, LOW);
    digitalWrite(PUMP1_LED_PIN, LOW);
  }

  if (pump1State && millis() - pump1StartTime > MAX_INLET_PUMP_TIME) {
    pump1State = false;
    digitalWrite(RELAY_PUMP1, LOW);
    digitalWrite(PUMP1_LED_PIN, LOW);
  }
}

void controlOutletPump(unsigned long now) {
  if (moistureStatus == "SATURATED" && !pump2State) {
    pump2State = true;
    pump2StartTime = millis();
    digitalWrite(RELAY_PUMP2, HIGH);
    digitalWrite(PUMP2_LED_PIN, HIGH);
  }

  if (isRaining && rainStartTime > 0 && !pump2State &&
      now - rainStartTime >= RAIN_OUTLET_DELAY) {

    pump2State = true;
    pump2StartTime = millis();
    digitalWrite(RELAY_PUMP2, HIGH);
    digitalWrite(PUMP2_LED_PIN, HIGH);
  }

  if (pump2State && millis() - pump2StartTime > MAX_OUTLET_PUMP_TIME) {
    pump2State = false;
    digitalWrite(RELAY_PUMP2, LOW);
    digitalWrite(PUMP2_LED_PIN, LOW);
  }
}

// ================= TFT DISPLAY =================
void displayDashboard() {
  tft.fillScreen(ST77XX_BLACK);

  tft.setTextColor(ST77XX_WHITE);
  tft.setCursor(10, 5);
  tft.print("ADV FARMING SYSTEM");

  tft.setCursor(5, 30);
  tft.print("Temp: ");
  tft.print(temperature);
  tft.print("C");

  tft.setCursor(5, 45);
  tft.print("Hum: ");
  tft.print(humidity);
  tft.print("%");

  tft.setCursor(5, 60);
  tft.print("Rain: ");
  tft.print(isRaining ? "YES" : "NO");

  tft.setCursor(5, 75);
  tft.print("Soil: ");
  tft.print(moistureStatus);

  tft.setCursor(5, 90);
  tft.print("Light: ");
  tft.print(lightIntensity);
  tft.print("% ");
  tft.print(lightStatus);

  tft.setCursor(5, 105);
  tft.print("INLET: ");
  tft.print(pump1State ? "ADDING" : "STOPPED");

  // 🔥 REPLACED PART
  tft.setCursor(5, 120);
  tft.print("OUT Status: ");
  tft.print(pump2State ? "DRAINING" : "STOPPED");

  tft.setCursor(5, 135);
  tft.print("WiFi: ");
  tft.print(wifiConnected ? "ON" : "OFF");
}

// ================= THINGSPEAK =================
void sendToThingSpeak() {
  HTTPClient http;

  String url = "http://" + String(thingSpeakServer) +
               "/update?api_key=" + thingSpeakAPIKey +
               "&field1=" + String(temperature) +
               "&field2=" + String(humidity) +
               "&field3=" + String(ldrValue) +
               "&field4=" + String(pump1State ? 1 : 0) +
               "&field5=" + String(pump2State ? 1 : 0) +
               "&field6=" + String(moistureAnalogValue) +
               "&field7=" + String(lightIntensity);

  http.begin(url);
  http.GET();
  http.end();
}

// ================= STARTUP =================
void showStartupScreen() {
  tft.setTextColor(ST77XX_CYAN);
  tft.setCursor(10, 40);
  tft.print("IRRIGATION &");
  tft.setCursor(10, 60);
  tft.print("DRAINAGE SYSTEM");
}
