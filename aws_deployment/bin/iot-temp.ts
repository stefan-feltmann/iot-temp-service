#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import { IoTTempStack } from '../lib/iot-temp-stack';
require('dotenv').config()

const app = new cdk.App();
new IoTTempStack(app, 'IoTTempStack',{
    env: {
        region: 'us-west-2', // TODO: <-- Un-hardcode this
        account: process.env.AWS_ACCOUNT_NUMBER
    } 
});
