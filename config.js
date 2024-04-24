const fs = require('fs');
const path = require('path');

let config = null;

function getConfig () {
  if (config === null) {
    try {
      const _configFileName = `${process?.env?.CARBONE_S3_CONFIG ?? 'config.json'}`
      const _path = process?.env?.CARBONE_S3_CONFIG_PATH ? path.join(process.env.CARBONE_S3_CONFIG_PATH, _configFileName) : path.join(__dirname, '..', 'config', _configFileName);
      config = JSON.parse(fs.readFileSync(_path, 'utf8'));
    }
    catch (e) {
      config = {};
    }
  }
  if (process?.env?.AWS_SECRET_ACCESS_KEY && process?.env?.AWS_ACCESS_KEY_ID && process?.env?.AWS_ENDPOINT_URL && process?.env?.AWS_REGION) {
    config.storageCredentials = {
      accessKeyId: process.env.AWS_SECRET_ACCESS_KEY,
      secretAccessKey: process.env.AWS_ACCESS_KEY_ID,
      url: process.env.AWS_ENDPOINT_URL,
      region: process.env.AWS_REGION
    }
  }
  if (process?.env?.BUCKET_RENDERS) {
    config.rendersBucket = process.env.BUCKET_RENDERS
  }
  if (process?.env?.BUCKET_TEMPLATES) {
    config.templatesBucket = process.env.BUCKET_TEMPLATES
  }
  return config;
}

function setConfig(newConfig) {
  config = newConfig;
}

module.exports = {
  getConfig,
  setConfig
};
