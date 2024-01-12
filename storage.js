const s3Storage = require('./objectStorage')
const config = require('./config');
const fs = require('fs');
const path = require('path');
const templateDir = config.getConfig().templatePath || path.join(__dirname, '..', 'template');
const renderDir = config.getConfig().renderPath || path.join(__dirname, '..', 'render');

// {
//     storageCredentials
//     renderContainerName
//     templateContainerName
// }

s3Storage.connection((err) => {
    if (err) {
        console.log("Object storage error", err)
        process.exit(1);
    }
})

function writeTemplate (req, res, templateId, templatePath, callback) {
    const _s3Header = {
        'x-amz-meta-persist': true,
        'x-amz-meta-ext'    : req.headers?.['carbone-template-extension'] ?? ''
    };

    if (req.headers?.['carbone-template-mimetype']) {
        _s3Header['content-type'] = req.headers['carbone-template-mimetype'];
    }

    s3Storage.uploadFile(config.getConfig().templateContainerName, templateId, templatePath, { headers: _s3Header }, (err, resp) => {
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
      return s3Storage.downloadFile(config.getConfig().templateContainerName, templateId, (err, resp) => {
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
  s3Storage.deleteFile(config.getConfig().templateContainerName, templateId, (err, resp) => {
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
    s3Storage.uploadFile(config.getConfig().renderContainerName, reportName, reportPath, (err, resp) => {
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
          return s3Storage.downloadFile(config.getConfig().renderContainerName, templateId, (err, resp) => {
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
              return callback(null, renderPath);
            });
          });
        }
        return callback(null, renderPath);
      });

    return callback(null, renderPath);
}

module.exports = {
  writeTemplate,
  readTemplate,
  deleteTemplate,
  readRender,
  afterRender
};
