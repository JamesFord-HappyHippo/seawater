const { Client } = require('pg');
const AWS = require('aws-sdk');
const csvToJson = require('csvtojson');

async function generateLoadID(client) {
  const query = 'SELECT max(load_id) + 1 as new_load_id FROM public."Tmp_In_Employee";';
  const { rows } = await client.query(query);
  return rows[0].new_load_id;
}

async function insertRecord(client, record, loadID) {
    const query ='INSERT INTO public."Tmp_In_Employee" ("Client_ID", "Company_ID", "Employee_ID", "First_Name", "Last_Name", "Post_Code", "Annual_Salary", "Date_of_Birth", "Date_of_Hire", "Date_of_Termination", "Term_Reason", "Country", "Currency", "Performance_Review", "Work_Location_ID", "Department_ID", "Job_ID", "Reports_To", "Last_Salary_Adjustment_Date", "Address_1", "Address_2", "City", "State", "Flight_Risk_Score", "Gender", "Marital_Status", "EEO1", "Period_Date", "Last_Update", "load_id") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30) RETURNING "row_id";';
    console.log(`Record: ${JSON.stringify(record)}, Query: ${query}`);
    
    // Replace empty strings with null for date fields
    for (const key in record) {
      if (key === "Date_of_Birth" || key === "Date_of_Hire" || key === "Date_of_Termination" || key === "Last_Salary_Adjustment_Date" || key === "Period_Date" || key === "Last_Update") {
        if (record[key] === "") {
          record[key] = null;
        }
      }
    }
  
    const values = Object.values(record);
    values.push(loadID);
    const { rows } = await client.query(query, values);
    return rows[0].row_id;
  }
  
  
  
  

async function findDuplicates(client, loadID) {
  const query =
    'SELECT "Company_ID", "Employee_ID", "row_id" FROM public."Tmp_In_Employee" WHERE "load_id" = $1 GROUP BY "Company_ID", "Employee_ID", "row_id" HAVING COUNT(*) > 1;';
  const { rows } = await client.query(query, [loadID]);
  return rows;
}

exports.handler = async (event) => {
  const csvContent = event.body;

  const parsedRecords = await csvToJson().fromString(csvContent);
  const records = Array.isArray(parsedRecords) ? parsedRecords : [parsedRecords];
  console.log(`Total records: ${records.length}`);

  const client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
  });

  await client.connect();

  const loadID = await generateLoadID(client);
  console.log(`Generated load_id: ${loadID}`);

  for (const record of records) {
    await insertRecord(client, record, loadID);
  }

  const duplicates = await findDuplicates(client, loadID);
  await client.end();

  if (duplicates.length > 0) {
    console.log(`Duplicates found: ${duplicates}`);
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*', // Replace '*' with the appropriate origin or origins if needed
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({
        message: 'Duplicate Company_ID and Employee_ID combinations found',
        duplicates,
      }),
    };
  } else {
    console.log('File processed successfully');
    return {
        statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*', // Replace '*' with the appropriate origin or origins if needed
        'Access-Control-Allow-Headers': 'Content-Type',
      },
 body: JSON.stringify({ message: 'File processed successfully' }),
      };
      }
      };