require('dotenv').config();
const { checkPerson } = require('./script');
const fs = require('fs');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// Load configuration from environment
const CSV_PATH = process.env.DATA_FILE_PATH || './data/data.csv';
const DELAY_BETWEEN_PEOPLE = parseInt(process.env.DELAY_BETWEEN_PEOPLE || '15') * 1000;
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES_PER_PERSON || '1');
const RATE_LIMIT_WAIT_1ST = parseInt(process.env.RATE_LIMIT_WAIT_1ST || '2') * 60000;
const RATE_LIMIT_WAIT_2ND = parseInt(process.env.RATE_LIMIT_WAIT_2ND || '5') * 60000;
const RATE_LIMIT_WAIT_3RD = parseInt(process.env.RATE_LIMIT_WAIT_3RD || '10') * 60000;

// Global rate limit tracking
let rateLimitCount = 0;

function getRateLimitWaitTime() {
  if (rateLimitCount === 0) return RATE_LIMIT_WAIT_1ST;
  if (rateLimitCount === 1) return RATE_LIMIT_WAIT_2ND;
  return RATE_LIMIT_WAIT_3RD;
}

async function readCSV() {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(CSV_PATH)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

async function writeCSV(data) {
  const csvWriter = createCsvWriter({
    path: CSV_PATH,
    header: [
      { id: 'number', title: '#' },
      { id: 'Name', title: 'Name' },
      { id: 'NID', title: 'NID' },
      { id: 'Party', title: 'Party' },
      { id: 'Reg. Date', title: 'Reg. Date' },
      { id: 'Status', title: 'Status' },
      { id: 'Retry', title: 'Retry' }
    ]
  });

  await csvWriter.writeRecords(data);
}

(async () => {
  console.log('Reading CSV...');
  const data = await readCSV();
  console.log(`Total records: ${data.length}`);

  let processed = 0;
  let skipped = 0;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];

    // Skip if already successfully processed (found or notfound), but retry timeouts
    if (row.Status && (row.Status === 'found' || row.Status === 'notfound')) {
      skipped++;
      console.log(`\n[${i + 1}/${data.length}] Skipping ${row.Name} - Already processed (${row.Status})`);
      continue;
    }

    // If timeout, we'll retry it
    if (row.Status === 'timeout') {
      console.log(`\n[${i + 1}/${data.length}] Retrying timeout: ${row.Name} (${row.NID})`);
    }

    // Extract first name from full name
    const firstName = row.Name.split(' ')[0];
    const nid = row.NID;

    console.log(`\n[${i + 1}/${data.length}] Processing: ${row.Name} (${nid})`);

    let retryCount = parseInt(row.Retry || '0');
    let success = false;

    while (!success && retryCount <= MAX_RETRIES) {
      try {
        const result = await checkPerson(nid, firstName);

        if (result) {
          if (result.status === 'unknown') {
            // Debug case - log what was found
            console.log('⚠️  UNKNOWN PAGE CONTENT:');
            console.log('Debug info:', JSON.stringify(result.debug, null, 2));
            row.Status = 'timeout';
            row.Party = '';
            row['Reg. Date'] = '';
            row.Retry = retryCount.toString();
            processed++;
            success = true;
          } else {
            row.Status = result.status;
            row.Party = result.party || '';
            row['Reg. Date'] = result.reg_date || '';
            row.Retry = retryCount.toString();
            console.log(`✓ ${result.status.toUpperCase()}`);
            processed++;
            success = true;
          }
        } else {
          row.Status = 'timeout';
          row.Party = '';
          row['Reg. Date'] = '';
          row.Retry = retryCount.toString();
          console.log('✗ TIMEOUT - No result returned');
          processed++;
          success = true;
        }
      } catch (error) {
        if (error.isRateLimit) {
          retryCount++;
          rateLimitCount++;

          if (retryCount > MAX_RETRIES) {
            // Max retries reached for this person
            row.Status = 'timeout';
            row.Party = '';
            row['Reg. Date'] = '';
            row.Retry = retryCount.toString();
            console.log(`❌ Max retries (${MAX_RETRIES}) reached. Marking as timeout.`);
            processed++;
            success = true;
          } else {
            const waitTime = getRateLimitWaitTime();
            const minutes = waitTime / 60000;
            console.log(`⚠️  Rate limit hit! Waiting ${minutes} minutes before retry (${retryCount}/${MAX_RETRIES})...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            console.log('Retrying now...');
          }
        } else {
          console.error('Error:', error.message);
          row.Status = 'timeout';
          row.Party = '';
          row['Reg. Date'] = '';
          row.Retry = retryCount.toString();
          processed++;
          success = true;
        }
      }
    }

    // Ensure row has number field
    row.number = row['#'] || (i + 1).toString();

    // Save after each person
    await writeCSV(data);
    console.log(`Progress saved to CSV`);

    // Wait before next person
    if (i < data.length - 1) {
      const seconds = DELAY_BETWEEN_PEOPLE / 1000;
      console.log(`Waiting ${seconds} seconds before next person...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_PEOPLE));
    }
  }

  console.log('\n=================================');
  console.log('All done!');
  console.log(`Processed: ${processed}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Total: ${data.length}`);
  console.log('=================================');
})();
