const mqtt = require('mqtt')
require('dotenv').config()

const rootDomainName: string = process.env.ROOT_DOMAIN as string
const mqttSubDomainName = `mqtt://iot-temp.${rootDomainName}`

const username: string = process.env.MQTT_USERNAME as string
const password: string = process.env.MQTT_PASSWORD as string

const channel: string = 'outTopic/#'

console.log(username)
console.log(password)

const client  = mqtt.connect(`${mqttSubDomainName}`, {
  username: username,
  password: password
})
 
client.on('connect', function () {
  console.log('connect')
  client.subscribe(channel, function (err) {
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
  // message is Buffer
  console.log(`message: ${message.toString()}`)
  console.log(`topic: ${topic.toString()}`)
  // client.end()
})

console.log(mqttSubDomainName)