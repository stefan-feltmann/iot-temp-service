#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import { IoTTempStack } from '../lib/iot-temp-stack';

const app = new cdk.App();
new IoTTempStack(app, 'IoTTempStack');
