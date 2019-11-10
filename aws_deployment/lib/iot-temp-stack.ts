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

    /*
    TCP 1883 for unsecured MQQT broker communication via TCP
    TCP 1884 for secured MQQT broker communication via TCP
    TCP 3033 for unsecured communication via Websocket
    TCP 8033 for secured communcation via Websocket
    TCP 80 is needed for CertBot verfication process
    */

    iot_security_group.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(1883), 'TCP 1883 for unsecured MQQT broker communication via TCP');
    iot_security_group.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(1884), 'TCP 1884 for secured MQQT broker communication via TCP');
    iot_security_group.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(3033), 'TCP 3033 for unsecured communication via Websocket');
    iot_security_group.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(8033), 'TCP 8033 for secured communcation via Websocket');
    iot_security_group.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'TCP 80 is needed for CertBot verfication process');
    iot_security_group.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'SSH form anywhere');

    const linux = new ec2.GenericLinuxImage({
      'us-west-2': 'ami-06d51e91cea0dac8d',
    })

    const ec2Instance = new ec2.CfnInstance(this, "MQTT_Broker", {
      imageId: linux.getImage(this).imageId,
      keyName: 'temp-key',
      instanceType: "t3.micro",
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
    })
  }
}
