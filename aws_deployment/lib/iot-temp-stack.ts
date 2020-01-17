import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import rds = require('@aws-cdk/aws-rds');
import sns = require('@aws-cdk/aws-sns');
import snsSubs = require('@aws-cdk/aws-sns-subscriptions')
import lambda = require('@aws-cdk/aws-lambda');
import route53 = require('@aws-cdk/aws-route53')
import route53Targets = require('@aws-cdk/aws-route53-targets')
import certmgr = require('@aws-cdk/aws-certificatemanager')
import secretsmanager = require('@aws-cdk/aws-secretsmanager');
import { UserPool, SignInType } from '@aws-cdk/aws-cognito';
import { GraphQLApi, FieldLogLevel, UserPoolDefaultAction, MappingTemplate } from '@aws-cdk/aws-appsync';
import { Table, BillingMode, AttributeType} from '@aws-cdk/aws-dynamodb';

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

    
    const dbPassword: string = process.env.DB_PASSWORD as string
    const dbUser: string = process.env.DB_USER as string

    const instance = new  rds.DatabaseInstance(this, 'Temperature_Postgres', {
      engine: rds.DatabaseInstanceEngine.POSTGRES,
      instanceClass: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      masterUsername: dbUser,
      masterUserPassword: new cdk.SecretValue(dbPassword),
      databaseName: 'Temperature_Postgres',
      securityGroups: [iot_db_security_group],
      vpcPlacement: {
        subnetType: ec2.SubnetType.PUBLIC
      },
      vpc,
      deletionProtection: false,
      deleteAutomatedBackups: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    })


    const rootDomainName: string = process.env.ROOT_DOMAIN as string
    const zone = route53.HostedZone.fromLookup(this, 'IoT-Zone', { domainName: rootDomainName })
    const mqttSubDomainName = `iot-temp.${rootDomainName}`
    const dbSubDomainName = `iot-db.${rootDomainName}`

    // const cert = new certmgr.DnsValidatedCertificate(this, `${mqttSubDomainName}-cert`, {
    //   domainName: mqttSubDomainName,
    //   hostedZone: zone,
    // })

    new route53.ARecord(this, `${mqttSubDomainName}-MqttCustomDomainAliasRecord`, {
      recordName: mqttSubDomainName,
      zone: zone,
      target: route53.AddressRecordTarget.fromIpAddresses(ec2Instance.attrPublicIp),
    })

    const dbEndpoint = instance.dbInstanceEndpointAddress

    new route53.CnameRecord(this, `${mqttSubDomainName}-DbCustomDomainAliasRecord`, {
      recordName: dbSubDomainName,
      zone: zone,
      domainName: dbEndpoint,
    })

    const tempToPostGresTopic = new sns.Topic(this, 'tempToPostGresTopic', {
      topicName: 'tempToPostGresTopic'
    })

    const tempToPostGresLambda = new lambda.Function(this, 'tempToPostGresLambda', {
      description: 'Push Temp data to PostGres',
      runtime: lambda.Runtime.NODEJS_10_X,
      code: lambda.Code.asset('handlers/tempToPostGres'),
      handler: 'index.handler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 128,
      environment: {
        dbUser: dbUser,
        dbPassword: dbPassword,
        host: dbSubDomainName
      }
    })

    tempToPostGresTopic.addSubscription(new snsSubs.LambdaSubscription(tempToPostGresLambda))

    

    const userPool = new UserPool(this, 'TemperatureUserPool', {
      signInType: SignInType.USERNAME,
    })

    const tempTableDefinition = `type Temperature {
      id: ID!
      temperature: Float!
      deviceId: String!
      timestamp: Int!
  }
  
  input SaveTemperatureInput {
      temperature: Float!
      deviceId: String!
      timestamp: Int!
  }
  
  type Query {
      getTemperatures: [Temperature]
      getTemperature(id: String): Temperature
  }
  
  type Mutation {
      addTemperature(temperature: SaveTemperatureInput!): Temperature
      saveTemperature(id: String!, temperature: SaveTemperatureInput!): Temperature
      removeTemperature(id: String!): Temperature
  }`

    const api = new GraphQLApi(this, 'Api', {
      name: `TemperatureApi`,
      logConfig: {
        fieldLogLevel: FieldLogLevel.ALL,
      },
      userPoolConfig: {
        userPool,
        defaultAction: UserPoolDefaultAction.ALLOW,
      },
      schemaDefinition: tempTableDefinition
    });
    const temperatureTable = new Table(this, 'TemperatureTable', {
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'id',
        type: AttributeType.STRING,
      },
    });
    const temperatureDS = api.addDynamoDbDataSource('Temperature', 'The temperature data source', temperatureTable);
    temperatureDS.createResolver({
      typeName: 'Query',
      fieldName: 'getTemperatures',
      requestMappingTemplate: MappingTemplate.dynamoDbScanTable(),
      responseMappingTemplate: MappingTemplate.dynamoDbResultList(),
    })
    temperatureDS.createResolver({
      typeName: 'Query',
      fieldName: 'getTemperature',
      requestMappingTemplate: MappingTemplate.dynamoDbGetItem('id', 'id'),
      responseMappingTemplate: MappingTemplate.dynamoDbResultItem(),
    });
    temperatureDS.createResolver({
      typeName: 'Mutation',
      fieldName: 'addTemperature',
      requestMappingTemplate: MappingTemplate.dynamoDbPutItem('id', 'temperature'),
      responseMappingTemplate: MappingTemplate.dynamoDbResultItem(),
    });
    temperatureDS.createResolver({
      typeName: 'Mutation',
      fieldName: 'saveTemperature',
      requestMappingTemplate: MappingTemplate.dynamoDbPutItem('id', 'temperature', 'id'),
      responseMappingTemplate: MappingTemplate.dynamoDbResultItem(),
    });
    temperatureDS.createResolver({
      typeName: 'Mutation',
      fieldName: 'removeTemperature',
      requestMappingTemplate: MappingTemplate.dynamoDbDeleteItem('id', 'id'),
      responseMappingTemplate: MappingTemplate.dynamoDbResultItem(),
    });
  }
}
