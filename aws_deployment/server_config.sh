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
rsync -P -v -e "ssh -i ../project_key/temp-key" ../mosquitto_install/install.sh ubuntu@$IOT_DOMAIN:~/
rsync -P -v -e "ssh -i ../project_key/temp-key" crontab ubuntu@$IOT_DOMAIN:~/
rsync -P -v -e "ssh -i ../project_key/temp-key" --exclude 'node_modules' -r ../node_mosquitto/ ubuntu@$IOT_DOMAIN:~/node_mosquitto/
ssh -i ../project_key/temp-key ubuntu@$IOT_DOMAIN "curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -"
ssh -i ../project_key/temp-key ubuntu@$IOT_DOMAIN "sudo apt-get update"
ssh -i ../project_key/temp-key ubuntu@$IOT_DOMAIN "sudo apt-get install -y nodejs"
ssh -i ../project_key/temp-key ubuntu@$IOT_DOMAIN "cd node_mosquitto && npm install"
ssh -i ../project_key/temp-key ubuntu@$IOT_DOMAIN "crontab -u ubuntu ~/crontab"
ssh -i ../project_key/temp-key ubuntu@$IOT_DOMAIN "bash install.sh"