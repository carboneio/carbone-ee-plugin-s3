
const fs = require('fs');
const path = require('path');
const config = require('./config');

const s3 = require('tiny-storage-client')(config.getConfig().storageCredentials);
s3.setTimeout(30000)

const _config = config.getConfig();
const templateDir =_config.templatePath || path.join(__dirname, '..', 'template');
const renderDir =_config.renderPath || path.join(__dirname, '..', 'render');

if (!_config?.storageCredentials) {
  console.log("🔴 Plugin error: missing config 'storageCredentials'");
  process.exit(1);
}

if (!_config?.rendersBucket) {
  console.log("🔴 Plugin error: missing config 'rendersBucket'");
  process.exit(1);
}

if (!_config?.templatesBucket) {
  console.log("🔴 Plugin error: missing config 'templatesBucket'");
  process.exit(1);
}

connection((err) => {
  if (err) {
    console.log("🔴 S3 error:", err.toString());
    process.exit(1);
  }
})

function writeTemplate (req, res, templateId, templatePath, callback) {
    const _s3Header = {};

    if (req.headers?.['carbone-template-mimetype']) {
        _s3Header['content-type'] = req.headers['carbone-template-mimetype'];
    }

    s3.uploadFile(config.getConfig().templatesBucket, templateId, templatePath, { headers: _s3Header }, (err, resp) => {
        if (err) {
        return callback(err, templateId);
        }
        if (resp?.statusCode !== 200) {
            return callback(new Error(`Status: ${resp?.statusCode} | Body: ${ resp?.body?.error?.code ?? resp?.body?.toString()}` ))
        }
        return callback(null, templateId);
    });
}

function readTemplate (req, res, templateId, callback) {
  const templatePath = path.join(templateDir, templateId);

  fs.access(templatePath, fs.F_OK, (err) => {
    if (err) {      
      return s3.downloadFile(config.getConfig().templatesBucket, templateId, (err, resp) => {
        if (err) {
          return callback(err);
        }
        if (resp?.statusCode === 404) {
          return callback(new Error('File does not exist'))
        }
        if (resp?.statusCode !== 200) {
          return callback(new Error(`Status: ${resp?.statusCode} | Body: ${ resp?.body?.error?.code ?? resp?.body?.toString()}` ))
        }
        fs.writeFile(templatePath, resp.body, (err) => {
          if (err) {
            return callback(err);
          }
          return callback(null, templatePath);
        });
      });
    }
    return callback(null, templatePath);
  });
}

function deleteTemplate (req, res, templateId, callback) {
  s3.deleteFile(config.getConfig().templatesBucket, templateId, (err, resp) => {
    if (err) {
      return callback(err);
    }
    if (resp?.statusCode >= 300 || resp.statusCode < 200) {
      return callback(new Error(`Status: ${resp?.statusCode} | Body: ${ resp?.body?.error?.code ?? resp?.body?.toString()}` ))
    }
    return callback(null, path.join(templateDir, templateId));
  });
}

function afterRender (req, res, err, reportPath, reportName, stats, callback) {
    if (err) {
        return callback(err);
    }
    s3.uploadFile(config.getConfig().rendersBucket, reportName, reportPath, (err, resp) => {
        if (err) {
          return callback(err);
        }
        if (resp?.statusCode !== 200) {
          return callback(new Error(`Status: ${resp?.statusCode} | Body: ${ resp?.body?.error?.code ?? resp?.body?.toString()}` ))
        }
        return callback();
    });
}

function readRender (req, res, renderId, callback) {
  const renderPath = path.join(renderDir, renderId);

  fs.access(renderPath, fs.F_OK, (err) => {
    if (err) {
      return s3.downloadFile(config.getConfig().rendersBucket, renderId, (err, resp) => {
        if (err) {
          return callback(err);
        }
        if (resp?.statusCode === 404) {
          return callback(new Error('File does not exist'))
        }
        if (resp?.statusCode !== 200) {
          return callback(new Error(`Status: ${resp?.statusCode} | Body: ${ resp?.body?.error?.code ?? resp?.body?.toString()}` ))
        }
        fs.writeFile(renderPath, resp.body, (err) => {
          if (err) {
            return callback(err);
          }
          /** If you want to keep the generated document into S3, uncomment the following line */
          // return callback(null, renderPath);
          return s3.deleteFile(config.getConfig().rendersBucket, renderId, (err) => {
            if (err) {
              return callback(err);
            }
            return callback(null, renderPath);
          });
        });
      });
    }
    
    /** If you want to keep the generated document into S3, uncomment the following line */
    // return callback(null, renderPath);

    /** 
     * If the generated document is loaded from the cache, the stored file must be deleted
     * Non-blocking delete file 
     */
    s3.deleteFile(config.getConfig().rendersBucket, renderId, (err) => {
      if (err) {
        return callback(err);
      }
    });
    return callback(null, renderPath);
  });
}

module.exports = {
  writeTemplate,
  readTemplate,
  deleteTemplate,
  readRender,
  afterRender
};

/**
 * ====== PRIVATE FUNCTION =======
 */


/**
 * Test the connection to the S3 storage
 * 
 * @param {function} callback (err) => {} 
 */
function connection(callback) {
  s3.listBuckets((err, res) => {
    if (err) {
      return callback(err);
    }
    /** If the connection gets an error, the storage-client may have switched to another storage, the activeStorage must be 0 */
    if (s3.getConfig().activeStorage !== 0) {
      return callback(new Error('Something went wrong when connecting to the S3.'));
      
    }
    logListBuckets(err, res, s3.getConfig()?.storages[0]);
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
