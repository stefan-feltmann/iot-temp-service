import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import cdk = require('@aws-cdk/core');
import IotTemp = require('../lib/iot-temp-stack');

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new IotTemp.IoTTempStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});