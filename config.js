const fs = require('fs');
const path = require('path');

let config = null;

function getConfig () {
  if (config === null) {
    try {
      const _path = path.join(__dirname, '..', 'config', 'config.json');
      config = fs.readFileSync(_path, 'utf8');
      config = JSON.parse(config);
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
