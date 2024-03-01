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
  return config;
}

function setConfig(newConfig) {
  config = newConfig;
}

module.exports = {
  getConfig,
  setConfig
};
