const tStorage = require('tiny-storage-client')
const config = require('./config');

const s3Storage = tStorage(config.getConfig().storageCredentials);
s3Storage.setTimeout(30000)

/**
 * Test the connection to the S3 storage
 * 
 * @param {function} callback (err) => {} 
 */
function connection(callback) {
  s3Storage.listBuckets((err, res) => {
    if (err) {
      return callback(err);
    }
    /** If the connection gets an error, the storage-client may have switched to another storage, the activeStorage must be 0 */
    if (s3Storage.getConfig().activeStorage !== 0) {
      return callback(new Error('Something went wrong when connecting to the S3.'));
      
    }
    logListBuckets(err, res, s3Storage.getConfig()?.storages[0]);
    return callback();
  })
}

function logListBuckets(err, res, store) {
  if(err) {
    console.log( "🚩 Storage error " + store?.url + " | " + store?.region + " | Error: " + err?.toString());
  } else if (res?.statusCode !== 200) {
    console.log( "🚩 Storage error " + store?.url + " | " + store?.region + " | Status" + res?.statusCode + '| Response: ' + res?.body);
  } else {
    console.log(`Storage ok | ` + store?.url + " | " + store?.region + " | Status " + res?.statusCode + ' | Buckets: ' + res.body?.bucket?.reduce((total, val) => total += '[ ' + val?.name + ' ]', ''));
  }
}

module.exports = {
  connection,
  ...s3Storage
}