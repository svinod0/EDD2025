/*
  Randomized Heartbeat Thump with Potentiometer Volume Control
  ------------------------------------------------------------
  Buzzer: digital pin 9
  Potentiometer: analog pin A1
  Frequency: ~50 Hz
  Volume: controlled by potentiometer (A1)
  Rhythm: 
    - 75% chance of a single "lub"
    - 25% chance of a "lub-dub" double beat
*/

#define BUZZER_PIN 9
#define POT_PIN A1

void setup() {
  Serial.begin(9600);
  pinMode(BUZZER_PIN, OUTPUT);
  randomSeed(analogRead(0)); // use floating analog input for randomness
  Serial.println("Random heartbeat thump test started...");
}

void loop() {
  // Read potentiometer for volume
  int potValue = analogRead(POT_PIN);
  int duty = map(potValue, 0, 1023, 0, 255);

  int period = 20; // ms = 50 Hz
  int onTime = (period * duty) / 255;
  int offTime = period - onTime;

  // Decide which pattern to play
  int pattern = random(0, 100); // 0–99
  if (pattern < 75) {
    // 75% chance: single thump ("lub")
    Serial.println("Pattern: single LUB");
    playThump(onTime, offTime, 80); // one short pulse
  } else {
    // 25% chance: double thump ("lub-dub")
    Serial.println("Pattern: LUB-DUB");
    playThump(onTime, offTime, 80);
    delay(100); // brief pause between lub & dub
    playThump(onTime, offTime, 60);
  }

  // Pause between beats (simulate heartbeat rest)
  delay(700 + random(-100, 200)); // vary timing slightly for realism
}

// Function to generate a low-frequency thump
void playThump(int onTime, int offTime, int totalDuration) {
  unsigned long start = millis();
  while (millis() - start < totalDuration) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(onTime);
    digitalWrite(BUZZER_PIN, LOW);
    delay(offTime);
  }
}