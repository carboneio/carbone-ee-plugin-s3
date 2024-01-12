const fs = require('fs');
const path = require('path');

let config = null;

function getConfig () {
  if (config === null) {
    try {
      config = fs.readFileSync(path.join(__dirname, '..', 'config', 'config.json'), 'utf8');
      config = JSON.parse(config);
    }
    catch (e) {
      config = {};
    }
  }

  return config;
}

module.exports = {
  getConfig
};
