import { Context } from 'aws-lambda'
// import cdk = require('@aws-cdk/core');

import https = require('https')
import util = require('util')

const knex = require('knex')({
  client: 'pg',
  version: '7.2',
  connection: {
    host : process.env.host,
    user : process.env.dbUser,
    password : process.env.dbPassword,
    database : 'Temperature_Postgres'
  }
})

export const handler = async function(event: any, context: Context) {

//   {
//     "message": "16.08",
//     "topic": "outTopic/BC:DD:C2:2D:C7:8C"
// }

  await knex.schema.hasTable('temperature').then(function(exists: any) {
    if (!exists) {
      return knex.schema.createTable('temperature', function(t: any) {
        t.increments('id').primary();
        t.float('temperature');
        t.string('deviceId', 100);
        t.timestamps();
      });
    }
  })

  await knex.schema.hasTable('device').then(function(exists: any) {
    if (!exists) {
      return knex.schema.createTable('device', function(t: any) {
        t.increments('id').primary();
        t.string('name', 100);
        t.string('mac_address', 100);
        t.timestamps();
      });
    }
  })

  const temp = JSON.parse(event.Records[0].Sns.Message).message

  const topicRaw = JSON.parse(event.Records[0].Sns.Message).topic

  const topicTokens = topicRaw.split('/')

  const macAddress = topicTokens[1]

  //knex.fn.now()

  const deviceOutput = await knex('device').where({
    mac_address: macAddress
  }).select('id')

  console.log(deviceOutput)

  console.log(process.env.test)

  // await knex('device').insert({name: macAddress, mac_address: macAddress, created_at: knex.fn.now(), updated_at: knex.fn.now()})

  await knex('temperature').insert({temperature: temp, deviceId: macAddress, created_at: knex.fn.now(), updated_at: knex.fn.now()})

  console.log(JSON.stringify(event, null, 2))
  console.log('From SNS:', event.Records[0].Sns.Message)

  console.log('temp:', temp)
  console.log('macAddress:', macAddress)

}