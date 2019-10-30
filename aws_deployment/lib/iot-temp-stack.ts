import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import rds = require('@aws-cdk/aws-rds');

export class IoTTempStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);


    const vpc = new ec2.Vpc(this, 'IoTVPC', {
      cidr: "10.0.0.0/16"
   })

    new ec2.CfnInstance(this, 'MQTT_Broker', {
      imageId: 'ami-06d51e91cea0dac8d',
      instanceType: 't3.micro',
      keyName: 'temp-key',
      monitoring: false,
    })

    const instance = new  rds.DatabaseInstance(this, 'Instance', {
      engine: rds.DatabaseInstanceEngine.POSTGRES,
      instanceClass: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      masterUsername: 'syscdk',
      vpc
  });
  }
}
