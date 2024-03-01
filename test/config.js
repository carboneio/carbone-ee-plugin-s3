const config = require('../config');
const assert = require('assert');

describe('Config', function () {
    it('should set a custom config from the `setConfig` function', function (done) {
        const _expectedConfig = {
            storageCredentials : {
                accessKeyId     : 'accessKeyId1',
                secretAccessKey : 'secretAccessKey1',
                url             : 's3.paris.first.cloud.test',
                region          : 'paris'
            },
            rendersBucket  : 'rendersBucket1',
            templatesBucket: 'templatesBucket1'
        }
        config.setConfig(_expectedConfig);
        const _config = config.getConfig();
        assert.strictEqual(JSON.stringify(_config), JSON.stringify(_expectedConfig));
        done();
    })

    it('should load a custom named config from the environment variable', function (done) {
        process.env.CARBONE_S3_CONFIG = 'config-test.json';
        process.env.CARBONE_S3_CONFIG_PATH = './test/datasets'

        config.setConfig(null);
        const _expectedConfig = require('./datasets/config-test.json')
        const _config = config.getConfig();
        assert.strictEqual(JSON.stringify(_config), JSON.stringify(_expectedConfig));
        done()
    })
})