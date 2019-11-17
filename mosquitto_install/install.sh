#!/bin/bash
sudo apt-get update
sudo apt-get install -y certbot
sudo apt-get install -y mosquitto
sudo apt-get install -y mosquitto-clients
sudo touch /etc/mosquitto/passwd
sudo mosquitto_passwd -b /etc/mosquitto/passwd iot_temp test # TODO: <-- Unhardcode this
sudo touch /etc/mosquitto/conf.d/default.conf
sudo echo "allow_anonymous false" | sudo tee -a /etc/mosquitto/conf.d/default.conf
sudo echo "password_file /etc/mosquitto/passwd" | sudo tee -a /etc/mosquitto/conf.d/default.conf
sudo systemctl restart mosquitto
sudo reboot now
#mosquitto_pub -h <URL> -t "inTopic" -m "hello world" -u "iot_temp" -P "test"
#mosquitto_sub -h <URL> -t outTopic -u "iot_temp" -P "test"