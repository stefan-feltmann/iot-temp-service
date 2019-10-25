#!/usr/bin/env
mkdir project_key
ssh-keygen -t rsa -C "temp-key" -N "" -f project_key/temp-key
aws ec2 import-key-pair --key-name "temp-key" --public-key-material file://./project_key/temp-key.pub