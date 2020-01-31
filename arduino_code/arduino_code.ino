#include <ESP8266WiFi.h>
#include <PubSubClient.h>


#include "config.h"
#define aref_voltage 3.3  
//#include "DHT.h"

//#define DHTPIN 14
//#define DHTTYPE DHT11

const int sensorPin = A0;

const char* ssid     = WIFI_SSID;
const char* password = WIFI_PASSWORD;

const char* host = IOT_HOST;

const char* iotClientId = IOT_CLIENT_ID;
const char* iotClientUser = IOT_CLIENT_USER;
const char* iotClientPassword = IOT_CLIENT_PASSWORD;

boolean needName = true;

void callback(char* topic, byte* payload, unsigned int length) {
  // handle message arrived
   // Print the message
  Serial.println(topic);

  Serial.print("Message: ");
  for(int i = 0; i < length; i ++)
  {
    Serial.print(char(payload[i]));
  }
 
  // Print a newline
  Serial.println("");

  needName = false;
}


WiFiClient wifiClient;

String deviceName;

//DHT dht(DHTPIN, DHTTYPE);

PubSubClient client(host, 1883, callback, wifiClient);

void setup() {
//  analogReference(EXTERNAL);
  Serial.begin(115200);
  delay(100);

  // We start by connecting to a WiFi network

  Serial.println();
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  deviceName = WiFi.macAddress();
//  deviceName = "deviceName";
  String deviceNameString = String(deviceName);
  char deviceNameChar[deviceNameString.length()];
  deviceNameString.toCharArray(deviceNameChar, deviceNameString.length()+1);

  String channelName = "register";
//  String channelName = "outTopic/register";
  String channelNameString = String(channelName);
  char channelNameChar[channelNameString.length()];
  channelNameString.toCharArray(channelNameChar, channelNameString.length()+1);

  Serial.println("");
  Serial.println("WiFi connected");  
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
//  Serial.println("MAC Address: ");
//  Serial.println(macAddress);

//  client.setCallback(callback);

  while (!client.connect(iotClientId, iotClientUser, iotClientPassword)) {
      Serial.println("");
      Serial.println("CONNECTING");  
      Serial.println("");
  }

//  if (client.connect(iotClientId, iotClientUser, iotClientPassword)) {
  
  boolean subbed = client.subscribe("deviceName/#");
  if(subbed) {
    Serial.println("Subbed");
  } else {
    Serial.println("Not Subbed");
  }
    client.publish(channelNameChar,deviceNameChar);
//  }
//  dht.begin();

  while (needName) {
      client.loop();
      Serial.println("");
      Serial.println("WAITING FOR NAME");  
      Serial.println("");
      delay(5000);
  }
}

float getTemp() {
  //getting the voltage reading from the temperature sensor
  int reading = analogRead(sensorPin);
  Serial.print(reading); Serial.println(" reading");  
 
  // converting that reading to voltage, for 3.3v arduino use 3.3
  float voltage = reading * aref_voltage;
  voltage /= 1024.0;

  Serial.print(voltage); Serial.println(" unmodified volts");

  // I'm not 100% sure why this is needed.
  voltage = voltage / 3.438438438;
 
  // print out the voltage
  Serial.print(voltage); Serial.println(" volts");
 
  // now print out the temperature
  float temperatureC = (voltage - 0.5) * 100 ;  //converting from 10 mv per degree wit 500 mV offset
                                               //to degrees ((voltage - 500mV) times 100)
  Serial.print(temperatureC); Serial.println(" degrees C");

  // now convert to Fahrenheit
  float temperatureF = (temperatureC * 9.0 / 5.0) + 32.0;
  Serial.print(temperatureF); Serial.println(" degrees F");

  return temperatureC;
}

void loop() {
  updateMqtt();
  client.loop();
  delay(5000);
}

void updateMqtt() {
  unsigned long time = millis();
  
  String tempString = String(getTemp());
  char tempChar[tempString.length()];
  tempString.toCharArray(tempChar, tempString.length()+1);
  
  String channel = "outTopic/"+deviceName;
  char channelChar[channel.length()];
  channel.toCharArray(channelChar, channel.length()+1);

  Serial.println(channelChar);
  Serial.println(tempChar);
  
  client.publish(channelChar, tempChar);
}
