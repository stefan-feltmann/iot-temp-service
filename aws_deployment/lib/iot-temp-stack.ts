import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');

export class IoTTempStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new ec2.CfnInstance(this, 'MQTT_Broker', {
      imageId: 'ami-06d51e91cea0dac8d',
      instanceType: 't3.micro',
      keyName: 'temp-key',
      monitoring: false,
    })
  }
}
