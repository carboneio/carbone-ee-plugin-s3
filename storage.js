
const fs = require('fs');
const path = require('path');
const config = require('./config');

const _config = config.getConfig();
const templateDir =_config.templatePath || path.join(__dirname, '..', 'template');
const renderDir =_config.renderPath || path.join(__dirname, '..', 'render');
let s3 = {};
let isS3Enabled = false;

if (_config?.storageCredentials) {
  isS3Enabled = true;
  s3 = require('tiny-storage-client')(_config.storageCredentials);
  s3.setTimeout(30000)
  connection("Templates", (err) => {
    if (err) {
      console.log("🔴 S3 Connection |", err.toString());
    }
    connection("Renders", (err) => {
      if (err) {
        console.log("🔴 S3 Connection |", err.toString());
      }
    })
  })
} else if (_config?.templatesBucket || _config?.rendersBucket) {
  console.log("🔴 S3 Connection | S3 credentials are missing, buckets are ignored and files are stored locally");
}

function writeTemplate (req, res, templateId, templatePath, callback) {
    const _s3Header = {};

    if (!getBucket('templatesBucket')) {
      return callback(null, templateId);
    }

    if (req.headers?.['carbone-template-mimetype']) {
        _s3Header['content-type'] = req.headers['carbone-template-mimetype'];
    }

    s3.uploadFile(getBucket('templatesBucket'), templateId, templatePath, { headers: _s3Header }, (err, resp) => {
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

  if (!getBucket('templatesBucket')) {
    return callback(null, templatePath);
  }

  fs.access(templatePath, fs.F_OK, (err) => {
    if (err) {      
      return s3.downloadFile(getBucket('templatesBucket'), templateId, (err, resp) => {
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
  const templatePath = path.join(templateDir, templateId);
  if (!getBucket('templatesBucket')) {
    return callback(null, templatePath);
  }
  s3.deleteFile(getBucket('templatesBucket'), templateId, (err, resp) => {
    if (err) {
      return callback(err);
    }
    if (resp?.statusCode >= 300 || resp.statusCode < 200) {
      return callback(new Error(`Status: ${resp?.statusCode} | Body: ${ resp?.body?.error?.code ?? resp?.body?.toString()}` ))
    }
    return callback(null, templatePath);
  });
}

function afterRender (req, res, err, reportPath, reportName, stats, callback) {
    if (err) {
        return callback(err);
    }
    if (!getBucket('rendersBucket')) {
      return callback();
    }
    const _filename = reportName && reportName?.length > 0 ? reportName : path.basename(reportPath);
    s3.uploadFile(getBucket('rendersBucket'), _filename, reportPath, (err, resp) => {
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

  if (!getBucket('rendersBucket')) {
    return callback(null, renderPath);
  }

  return fs.access(renderPath, fs.F_OK, (err) => {
    if (err) {
      return s3.downloadFile(getBucket('rendersBucket'), renderId, (err, resp) => {
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
          return s3.deleteFile(getBucket('rendersBucket'), renderId, (err) => {
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
    s3.deleteFile(getBucket('rendersBucket'), renderId, (err) => {
      if (err) {
        console.log("🔴 S3 Delete Render |", renderId, "|", err.toString());
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
 * Return the bucket name, or undefined if the S3 client is not initialized (missing credentials)
 *
 * @param {string} keyName 'templatesBucket' or 'rendersBucket'
 * @returns {string|undefined}
 */
function getBucket(keyName) {
  if (!isS3Enabled) {
    return undefined;
  }
  return config.getConfig()?.[keyName];
}

/**
 * Test the connection to the S3 storage
 * 
 * @param {function} callback (err) => {} 
 */
function connection(type, callback) {
  const _keyName = type === 'Templates' ? 'templatesBucket' : 'rendersBucket';

  if (config.getConfig()?.[_keyName]) {
    return s3.headBucket(config.getConfig()?.[_keyName], function(err, resp) {
      if (err) {
        return callback(new Error(`${type} S3 Bucket Connection | ${config.getConfig()?.[_keyName]} | ${err.toString()}`));
      }
      if (resp?.statusCode !== 200) {
        return callback(new Error(`${type} S3 Bucket Connection | ${config.getConfig()?.[_keyName]} | Status ` + resp?.statusCode + ' | Response: ' + resp?.body?.error?.message ?? resp?.body ));
      }
      console.log(`${type} S3 Bucket Connected | ${config.getConfig()?.[_keyName]} | Status ${resp?.statusCode}`);
      return callback();
    })
  } else {
    return callback();
  }
}