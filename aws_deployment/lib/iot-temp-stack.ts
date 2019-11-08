import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import rds = require('@aws-cdk/aws-rds');

export class IoTTempStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'IoTVPC', {
      cidr: "10.0.0.0/16"
    })

    const iot_security_group = new ec2.SecurityGroup(this, `iot-security-group`, {
      vpc: vpc,
      allowAllOutbound: true,
      description: 'iot CDK Security Group'
    })

    iot_security_group.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'SSH form anywhere');

    const amznLinux = new ec2.AmazonLinuxImage({
      generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX,
      edition: ec2.AmazonLinuxEdition.STANDARD,
      virtualization: ec2.AmazonLinuxVirt.HVM,
      storage: ec2.AmazonLinuxStorage.GENERAL_PURPOSE,
    })

    const ec2Instance = new ec2.CfnInstance(this, "MQTT_Broker", {
      imageId: amznLinux.getImage(this).imageId,
      instanceType: "t2.micro",
      monitoring: false,
      tags: [
        {"key": "Name", "value": "MQTT_Broker"}
      ],
      networkInterfaces: [
        {
          deviceIndex: "0",
          associatePublicIpAddress: true,
          subnetId: vpc.publicSubnets[0].subnetId,
          groupSet: [iot_security_group.securityGroupId]
        }
      ]
    })

    const iot_db_security_group = new ec2.SecurityGroup(this, `iot-db-security-group`, {
      vpc: vpc,
      allowAllOutbound: true,
      description: 'iot DB CDK Security Group'
    })

    iot_db_security_group.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(5432), 'Postgres form anywhere');

    const instance = new  rds.DatabaseInstance(this, 'Temperature_Postgres', {
      engine: rds.DatabaseInstanceEngine.POSTGRES,
      instanceClass: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      masterUsername: 'syscdk',
      databaseName: 'Temperature_Postgres',
      securityGroups: [iot_db_security_group],
      vpc,
      deletionProtection: false,
      deleteAutomatedBackups: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
  }
}
