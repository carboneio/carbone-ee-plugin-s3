const assert = require('assert');
const nock = require('nock');
const fs = require('fs');
const path = require('path');
const config = require('../config');

const _rendersBucket = 'renders-bucket';
const _templatesBucket = 'templates-bucket';

config.setConfig({
    storageCredentials : {
        accessKeyId     : 'accessKeyId',
        secretAccessKey : 'secretAccessKey',
        url             : 's3.gra.first.cloud.test',
        region          : 'gra'
    },
    rendersBucket  : _rendersBucket,
    templatesBucket: _templatesBucket,
    templatePath: path.join(__dirname, 'datasets'),
    renderPath: path.join(__dirname, 'datasets')
})

const pathFileTxt = path.join(__dirname, 'datasets', 'file.txt');

const url1S3 = 'https://s3.gra.first.cloud.test';

describe('Storage', function () {
  let storage = null;

  before(function (done) {
    /** S3 Call for testing storage connection */
    nock(url1S3)
      .get('/')
      .reply(200, '<?xml version="1.0" encoding="UTF-8"?><ListAllMyBucketsResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Owner><ID>89123456:user-feiowjfOEIJW</ID><DisplayName>12345678:user-feiowjfOEIJW</DisplayName></Owner><Buckets><Bucket><Name>templates-bucket</Name><CreationDate>2023-02-27T11:46:24.000Z</CreationDate></Bucket><Bucket><Name>renders-bucket</Name><CreationDate>2023-02-27T11:46:24.000Z</CreationDate></Bucket></Buckets></ListAllMyBucketsResult>');

    storage = require('../storage');
    setTimeout(done, 500);
  });

  describe('Write template', function () {
    
    it('should write template on s3', (done) => {
      nock(url1S3)
        .put(uri => uri.includes(`/${_templatesBucket}/templateId`))
        .reply(200);

      storage.writeTemplate({}, {}, 'templateId', pathFileTxt, (err, templateName) => {
        assert.strictEqual(err, null);
        assert.strictEqual(templateName, 'templateId');
        done();
      });
    });

    it('should return an error if file cannot be write on s3', (done) => {
      nock(url1S3)
        .defaultReplyHeaders({ 'content-type' : 'application/xml' })
        .put(uri => uri.includes(`/${_templatesBucket}/templateId`))
        .reply(403, '<?xml version="1.0" encoding="UTF-8"?><Error><Code>AccessDenied</Code><Message>Access Denied.</Message><RequestId>tx439620795cdd41b08c58c-0064186222</RequestId></Error>');

      storage.writeTemplate({}, {}, 'templateId', pathFileTxt, (err) => {
        console.log(err);
        assert.strictEqual(err.toString().includes(403), true);
        assert.strictEqual(err.toString().includes('AccessDenied'), true);
        done();
      });
    });

    it('should return an error if file cannot be write on s3', (done) => {
      nock(url1S3)
        .defaultReplyHeaders({ 'content-type' : 'application/xml' })
        .put(uri => uri.includes(`/${_templatesBucket}/templateId`))
        .replyWithError('Server unavailable');

      storage.writeTemplate({}, {}, 'templateId', pathFileTxt, (err) => {
        assert.strictEqual(err.toString(), 'Error: All S3 storages are not available');
        done();
      });
    });
  });

  describe('Read template', () => {
    const toDelete = [];

    afterEach(() => {
      for (let i = 0; i < toDelete.length; i++) {
        const filePath = path.join(__dirname, 'datasets', toDelete[i]);

        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    });


    it('should read a template', (done) => {
      nock(url1S3)
        .get(uri => uri.includes(`/${_templatesBucket}/`))
        .reply(200, () => {
          return fs.createReadStream(pathFileTxt);
        });

      storage.readTemplate({ }, {}, 'template.odt', (err, templatePath) => {
        assert.strictEqual(err, null);
        assert.strictEqual(path.basename(templatePath), 'template.odt');
        assert.strictEqual(fs.existsSync(templatePath), true);
        assert.strictEqual(fs.readFileSync(templatePath, 'utf8'), 'With some content\n');
        toDelete.push(path.basename(templatePath));
        done();
      });
    });

    it('should return an error if s3 return an error 403', (done) => {
      nock(url1S3)
        .get(uri => uri.includes(`/${_templatesBucket}/`))
        .reply(404);

      storage.readTemplate({}, {}, 'template.odt', (err) => {
        assert.strictEqual(err.message, 'File does not exist');
        done();
      });
    });

    it('should return an error if s3 return an error 500', (done) => {
      nock(url1S3)
        .get(uri => uri.includes(`/${_templatesBucket}/`))
        .replyWithError('Server unavailable');

      storage.readTemplate({}, {}, 'template.odt', (err) => {
        assert.strictEqual(err.toString(), 'Error: All S3 storages are not available');
        done();
      });
    });

    it('should not call s3 if file already exists', (done) => {
      storage.readTemplate({}, {}, 'file.txt', (err, templatePath) => {
        assert.strictEqual(err, null);
        assert.strictEqual(templatePath.endsWith('/test/datasets/file.txt'), true);
        done();
      });
    });
  });

  describe('Delete template', () => {
    let templatePath = path.join(__dirname, 'datasets', 'template.docx');

    beforeEach(() => {
      fs.writeFileSync(templatePath, 'File content');
    });

    afterEach(() => {
      if (fs.existsSync(templatePath)) {
        fs.unlinkSync(templatePath);
      }
    });

    it('should delete the template', (done) => {
      nock(url1S3)
        .delete(uri => uri.includes(`/${_templatesBucket}`))
        .reply(200);

      const res = {
        send (result) {
          assert.deepStrictEqual(result, {
            success : true,
            message : 'Template deleted'
          });
          done();
        }
      };

      storage.deleteTemplate({}, res, 'template.docx', (err, templatePath) => {
        assert.strictEqual(err, null);
        assert.strictEqual(templatePath.endsWith('/test/datasets/template.docx'), true);
        done();
      });
    });

    it('should return an error if s3 return an error 400', (done) => {
      nock(url1S3)
        .delete(uri => uri.includes(`/${_templatesBucket}`))
        .reply(403);

      const res = {};

      storage.deleteTemplate({}, res, path.join('..', 'test', 'datasets', 'template.docx'), (err) => {
        assert.strictEqual(err.toString().includes(403), true);
        done();
      });
    });

    it('should return an error if s3 return an error 500', (done) => {
      nock(url1S3)
        .delete(uri => uri.includes(`/${_templatesBucket}`))
        .replyWithError('Server Unavailable');

      const res = {};

      storage.deleteTemplate({}, res, path.join('..', 'test', 'datasets', 'template.docx'), (err) => {
        assert.strictEqual(err.toString(), 'Error: All S3 storages are not available');
        done();
      });
    });
  });

    // Those tests should be skip while the line which send carbone statistics is commented
  // You can unskip it when the line is uncommented
  describe('After render', () => {
    
    const _renderName = "render-1234.pdf";

    it('should save a generated doccument into the Renders Bucket', function(done) {
        nock(url1S3)
            .put(uri => uri.includes(`/${_rendersBucket}/${_renderName}`))
            .reply(200);

        storage.afterRender({}, {}, null, pathFileTxt, _renderName, {}, (err) => {
            assert.strictEqual(err, undefined);
            done();
        });
    });

    it('should return an error if the rendering failled', function(done) {
        storage.afterRender({}, {}, new Error('Something went wrong'), pathFileTxt, _renderName, {}, (err) => {
            assert.strictEqual(err.toString(), 'Error: Something went wrong');
            done();
        });
    });

    it('should return an error if s3 return an error 400', (done) => {
        nock(url1S3)
            .put(uri => uri.includes(`/${_rendersBucket}/${_renderName}`))
            .reply(403);
  
        storage.afterRender({}, {}, null, pathFileTxt, _renderName, {}, (err) => {
          assert.strictEqual(err.toString().includes(403), true);
          done();
        });
      });
  
    it('should return an error if s3 return an error 500', (done) => {
        nock(url1S3)
            .put(uri => uri.includes(`/${_rendersBucket}/${_renderName}`))
            .replyWithError('Server Unavailable');

        storage.afterRender({}, {}, null, pathFileTxt, _renderName, {}, (err) => {
            assert.strictEqual(err.toString(), 'Error: All S3 storages are not available');
            done();
        });
    });
  });

  describe('readRender', function() {

    const toDelete = [];

    afterEach(() => {
      for (let i = 0; i < toDelete.length; i++) {
        if (fs.existsSync(toDelete[i])) {
          fs.unlinkSync(toDelete[i]);
        }
      }
    });

    
    it('should download the generated document from the cache folder and must delete the file from s3', function(done) {
        
        const _renderID2 = 'document-2.pdf'

        fs.copyFileSync(path.join(__dirname, 'datasets', 'file.txt'), path.join(__dirname, 'datasets', _renderID2))
        
        nock(url1S3)
            .delete(uri => uri.includes(`/${_rendersBucket}/${_renderID2}`))
            .reply(200);

        storage.readRender({}, {}, _renderID2, function(err, renderPath) {
            assert.strictEqual(null, err);
            assert.strictEqual(renderPath.includes('datasets/' + _renderID2), true)
            console.log(renderPath);
            toDelete.push(renderPath);
            done();
        });
    });
    
    it('should download and delete the generated document from s3', function(done) {

        const _renderID = '89rf2jd9302jf329sok.pdf';

        nock(url1S3)
            .get(uri => uri.includes(`/${_rendersBucket}/${_renderID}`))
            .reply(200, () => {
                return fs.createReadStream(pathFileTxt);
            });
        
        nock(url1S3)
            .delete(uri => uri.includes(`/${_rendersBucket}/${_renderID}`))
            .reply(200);

        storage.readRender({}, {}, _renderID, function(err, renderPath) {
            assert.strictEqual(null, err);
            assert.strictEqual(renderPath.includes('datasets/' + _renderID), true)
            toDelete.push(renderPath);
            done();
        });
    });

    it('should return an error if the file does not exist', (done) => {

        const _renderID = '00289rf2jd9302jf329sok.pdf';

        nock(url1S3)
            .get(uri => uri.includes(`/${_rendersBucket}/${_renderID}`))
            .reply(404);

        storage.readRender({}, {}, _renderID, function(err, renderPath) {
            assert.strictEqual('Error: File does not exist', err.toString());
            done();
        });
    });

    it('should return an error if s3 return an error 400', (done) => {
        const _renderID = '39djndewoi02msok.pdf';

        nock(url1S3)
            .get(uri => uri.includes(`/${_rendersBucket}/${_renderID}`))
            .reply(403, '<?xml version="1.0" encoding="UTF-8"?><Error><Code>AccessDenied</Code><Message>Access Denied.</Message><RequestId>tx439620795cdd41b08c58c-0064186222</RequestId></Error>');

        storage.readRender({}, {}, _renderID, function(err, renderPath) {
            assert.strictEqual(err.toString().includes(403), true);
            done();
        });
    });

    it('should return an error if s3 return an error 500', (done) => {
        const _renderID = 'ffioewOFIEJmsok.pdf';

        nock(url1S3)
            .get(uri => uri.includes(`/${_rendersBucket}/${_renderID}`))
            .replyWithError('Server Unavailable');

        storage.readRender({}, {}, _renderID, function(err, renderPath) {
            assert.strictEqual(err.toString(), 'Error: All S3 storages are not available');
            done();
        });
    });
  })
});
