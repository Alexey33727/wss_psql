// const Pool = require('pg').Pool
// const pool = new Pool({
// user: 'postgres',
// password: '228335ad',
// host:  'localhost',
// port: 5432,
// database: 'messangerDB'
// })



// module.exports = pool
// const { Client } = require('pg');

// const client = new Client({
//     user: 'lorfi119',
//     host: 'ep-summer-unit-a5754h7c.us-east-2.aws.neon.tech',
//     database: 'messangerDB',
//     password: 'W4ydiaxVhpH5',
//     port: 5432, // Порт по умолчанию для PostgreSQL
//     ssl: 'require',
//     connectionString: 'project=ep-summer-unit-a5754h7c',
// });


// async function getpgversion() {
//     try {
// +        await client.connect();
// +        const result = await client.query('SELECT version()');
// +        console.log(result.rows[0].version);
// +    } finally {
// +        await client.end();
// +    }
// }

// getpgversion();

// module.exports = client;
const { Client } = require('pg');


const client = new Client({
    host: 'ep-summer-unit-a5754h7c.us-east-2.aws.neon.tech',
    database: 'messangerDB',
    user: 'lorfi119',
    password: 'GnjR4e6TcDrp',
    port: 5432,
    ssl: true,
    connectionString: `postgresql://lorfi119:GnjR4e6TcDrp@ep-summer-unit-a5754h7c.us-east-2.aws.neon.tech/messangerDB?sslmode=require`,
});

async function getPgVersion() {
    await client.connect();
    const result = await client.query('SELECT version()');
    console.log(result.rows[0].version);
}

getPgVersion();

module.exports = client