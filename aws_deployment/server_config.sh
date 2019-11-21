#!/bin/bash
source .env
IOT_DOMAIN="iot-temp.$ROOT_DOMAIN"
echo $IOT_DOMAIN
UNEDITED_IP=$(nslookup $IOT_DOMAIN | grep "Address: ")
STRINGTOREMOVE="Address: "
echo $UNEDITED_IP
IP_ADRESS=$(printf '%s\n' "${UNEDITED_IP//$STRINGTOREMOVE/}")
echo $IP_ADRESS
ssh-keygen -R $IOT_DOMAIN
ssh-keygen -R $IP_ADRESS
ssh-keygen -R $IOT_DOMAIN,$IP_ADRESS
ssh-keyscan -H $IOT_DOMAIN,$IP_ADRESS >> ~/.ssh/known_hosts
ssh-keyscan -H $IP_ADRESS >> ~/.ssh/known_hosts
ssh-keyscan -H $IOT_DOMAIN >> ~/.ssh/known_hosts
scp -i ../project_key/temp-key ubuntu@$IOT_DOMAIN ../mosquitto_install/install.sh ubuntu@$IOT_DOMAIN:~/
ssh -i ../project_key/temp-key ubuntu@$IOT_DOMAIN "bash install.sh"