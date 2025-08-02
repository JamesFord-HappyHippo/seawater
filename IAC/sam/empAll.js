const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

exports.handler = async (event) => {
  const companyIDs = event.queryStringParameters.company_ids.split(',');

  const query = `
    SELECT * FROM public."Employee"
    WHERE "Company_ID" = ANY($1::varchar[]);
  `;

  try {
    const result = await pool.query(query, [companyIDs]);
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*', // Replace '*' with the appropriate origin or origins if needed
        'Access-Control-Allow-Headers': 'Content-Type',
      },
body: JSON.stringify(result.rows),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*', // Replace '*' with the appropriate origin or origins if needed
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

