const mqtt = require('mqtt')
// Load the AWS SDK for Node.js
var AWS = require('aws-sdk');

require('dotenv').config()

const rootDomainName: string = process.env.ROOT_DOMAIN as string
const mqttSubDomainName = `mqtt://iot-temp.${rootDomainName}`

const username: string = process.env.MQTT_USERNAME as string
const password: string = process.env.MQTT_PASSWORD as string

const outTopicChannel: string = 'outTopic/#'
const registerChannel: string = 'register/#'
const testChannel: string = 'deviceName/#'

// Set region
AWS.config.update({region: 'us-west-2'});

console.log(username)
console.log(password)

const client  = mqtt.connect(`${mqttSubDomainName}`, {
  username: username,
  password: password
})
 
client.on('connect', function () {
  console.log('connect')
  client.subscribe(outTopicChannel, function (err) {
    // if (!err) {
    //   client.publish(channel, 'Hello mqtt')
    // }
    if (err) {
      console.error(err)
    }
  })
  client.subscribe(registerChannel, function (err) {
    // if (!err) {
    //   client.publish(channel, 'Hello mqtt')
    // }
    if (err) {
      console.error(err)
    }
  })
  client.subscribe(testChannel, function (err) {
    // if (!err) {
    //   client.publish(channel, 'Hello mqtt')
    // }
    if (err) {
      console.error(err)
    }
  })
})

client.on('error', function (error) {
  console.error(error)
})
 
client.on('message', function (topic, message) {

  let snsMessage = {
    message: message.toString(),
    topic: topic.toString()
  }
  // Create publish parameters
  const params = {
    Message: JSON.stringify(snsMessage), /* required */
    TopicArn: `arn:aws:sns:us-west-2:${process.env.ACCOUNT_NUMBER}:tempToPostGresTopic`
  }

  // console.log(params)

  // message is Buffer
  // console.log(`message: ${message.toString()}`)
  // console.log(`topic: ${topic.toString()}`)
  // client.end()
  if (topic.toString().includes('register')) {
    console.log(`register message: ${message.toString()}`)
    console.log(`register topic: ${topic.toString()}`)
    registerDevice(message.toString())
  } else if (topic.toString().includes('outTopic')) {
    // // Create promise and SNS service object
    publishTemp(params);
  } else if (topic.toString().includes('deviceName')) {
    console.log(`deviceName message: ${message.toString()}`)
    console.log(`deviceName topic: ${topic.toString()}`)
    // // Create promise and SNS service object
    // publishTemp(params);
  }
})

console.log(mqttSubDomainName)

function registerDevice(deviceMac: string) {
  // TODO: Make ACTUALY registration code.
  client.publish(`deviceName/${deviceMac}`, deviceMac, {
    retain: true
  })
}

function publishTemp(params: { Message: string; /* required */ TopicArn: string; }) {
  const publishTextPromise = new AWS.SNS({ apiVersion: '2010-03-31' }).publish(params).promise();
  // Handle promise's fulfilled/rejected states
  publishTextPromise.then(function (data) {
    console.log(`Message ${params.Message} send sent to the topic ${params.TopicArn}`);
    console.log("MessageID is " + data.MessageId);
  }).catch(function (err) {
    console.error(err, err.stack);
  });
}
