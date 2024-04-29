const config = require('../config');
const assert = require('assert');

describe('Config', function () {

    it('should return an empty object if config.json does not exist, and environment variables are not available.', function (done) {
        const _config = config.getConfig();
        assert.strictEqual(JSON.stringify(_config), '{}');
        done();
    })

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
        delete process.env.CARBONE_S3_CONFIG;
        delete process.env.CARBONE_S3_CONFIG_PATH;
        done()
    })


    it('should provide configurations as environment variables', function (done) {
        config.setConfig(null);
        process.env.AWS_ACCESS_KEY_ID = 'accessKeyId2';
        process.env.AWS_SECRET_ACCESS_KEY = 'secretAccessKey1';
        process.env.AWS_ENDPOINT_URL = 's3.us-east-1.first.cloud.test';
        process.env.AWS_REGION = 'us-east-1';
        process.env.BUCKET_RENDERS = 'rendersBucket2';
        process.env.BUCKET_TEMPLATES = 'templatesBucket2'
        const _expectedConfig = {
            "storageCredentials": { 
                "accessKeyId" : "accessKeyId2",
                "secretAccessKey" : "secretAccessKey1",
                "url" : "s3.us-east-1.first.cloud.test",
                "region" : "us-east-1"
            },
            "rendersBucket" : "rendersBucket2",
            "templatesBucket" : "templatesBucket2"
        }
        const _config = config.getConfig();
        assert.strictEqual(JSON.stringify(_config), JSON.stringify(_expectedConfig));
        delete process.env.AWS_SECRET_ACCESS_KEY;
        delete process.env.AWS_ACCESS_KEY_ID;
        delete process.env.AWS_ENDPOINT_URL;
        delete process.env.AWS_REGION
        delete process.env.BUCKET_RENDERS;
        delete process.env.BUCKET_TEMPLATES;
        done();
    })
})