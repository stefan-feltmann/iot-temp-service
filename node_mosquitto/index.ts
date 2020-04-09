const mqtt = require('mqtt')
// Load the AWS SDK for Node.js
var AWS = require('aws-sdk');

require('dotenv').config()

const dbPassword: string = process.env.DB_PASSWORD as string
const dbUser: string = process.env.DB_USER as string
const rootDomainName: string = process.env.ROOT_DOMAIN as string
const dbSubDomainName = `iot-db.${rootDomainName}`

const knex = require('knex')({
  client: 'pg',
  version: '7.2',
  connection: {
    host : dbSubDomainName,
    user : dbUser,
    password : dbPassword,
    database : 'Temperature_Postgres'
  }
})

console.log(`dbSubDomainName: ${dbSubDomainName}`)
console.log(`dbUser: ${dbUser}`)
console.log(`dbPassword: ${dbPassword}`)


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
  let query = `SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE  table_schema = 'public'
    AND    table_name   = 'device'
    )`
  knex.schema.hasTable('device').then(function(exists: any) {
      if (!exists) {
        return knex.schema.createTable('device', function(t: any) {
          t.increments('id').primary();
          t.string('name', 100);
          t.string('mac_address', 100);
          t.timestamps();
        });
      }
      return
    }).then(function() {
      return knex('device')
        .select()
        .where('mac_address', deviceMac)
      .then(function(rows) {
        if (rows.length===0) {
          // no matching records found
          return knex('device').insert({'mac_address': deviceMac, "name": deviceMac, created_at: knex.fn.now(), updated_at: knex.fn.now()})
        } else {
          // return or throw - duplicate name found
          return
      }
      })
    })
    .then(function() {
      knex('device')
      .select()
      .where('mac_address', deviceMac)
      .then(function(rows) {
        // console.log(rows)
        client.publish(`deviceName/${rows[0].name}`, deviceMac, {
          retain: true
        })
      })
    })
  // knex.raw(query).then(function(existsData: any) {
  //   console.log(existsData.rows[0].exists)
  //   client.publish(`deviceName/${deviceMac}`, deviceMac, {
  //     retain: true
  //   })
  // })
}

function publishTemp(params: { Message: string; /* required */ TopicArn: string; }) {
  const publishTextPromise = new AWS.SNS({ apiVersion: '2010-03-31' }).publish(params).promise();
  // Handle promise's fulfilled/rejected states
  publishTextPromise.then(function (data) {
    // console.log(`Message ${params.Message} send sent to the topic ${params.TopicArn}`);
    // console.log("MessageID is " + data.MessageId);
  }).catch(function (err) {
    console.error(err, err.stack);
  });
}
