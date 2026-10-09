const assert = require('assert');
const nock = require('nock');
const fs = require('fs');
const path = require('path');
const config = require('../config');

const _rendersBucket = 'renders-bucket';
const _templatesBucket = 'templates-bucket';

const pathFileTxt = path.join(__dirname, 'datasets', 'file.txt');

const url1S3 = 'https://s3.gra.first.cloud.test';

describe('Storage', function () {
  let storage = null;

  before(function (done) {

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
    });

    const _listFilesResponse = `<?xml version='1.0' encoding='UTF-8'?><ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Name>Bucket</Name><Prefix/><KeyCount>4</KeyCount><MaxKeys>1</MaxKeys><IsTruncated>false</IsTruncated><Contents><Key>file-1.docx</Key><LastModified>2023-03-07T17:03:54.000Z</LastModified><ETag>"7ad22b1297611d62ef4a4704c97afa6b"</ETag><Size>61396</Size><StorageClass>STANDARD</StorageClass></Contents></ListBucketResult>`;

    /** S3 Call for testing storage connection */
    nock(url1S3)
      .intercept(`/${_templatesBucket}`, "HEAD")
      .reply(200, _listFilesResponse);
    
    nock(url1S3)
      .intercept(`/${_rendersBucket}`, "HEAD")
      .reply(200, _listFilesResponse);

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

      storage.writeTemplate({}, {}, 'templateId', pathFileTxt, (err, templateName) => {
        assert.strictEqual(err.toString().includes(403), true);
        assert.strictEqual(err.toString().includes('AccessDenied'), true);
        assert.strictEqual(templateName, 'templateId');
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
    const _renderId = path.basename(pathFileTxt);

    it('should save a generated doccument into the Renders Bucket with the render ID as key, even if a reportName is provided', function(done) {
        nock(url1S3)
            .put(uri => uri.includes(`/${_rendersBucket}/${_renderId}`))
            .reply(200);

        storage.afterRender({}, {}, null, pathFileTxt, _renderName, {}, (err) => {
            assert.strictEqual(err, undefined);
            assert.strictEqual(nock.isDone(), true);
            done();
        });
    });

    it('should save a generated doccument into the Renders Bucket even if the filename is not provided', function(done) {
      nock(url1S3)
          .put(uri => uri.includes(`/${_rendersBucket}/${_renderId}`))
          .reply(200);

      storage.afterRender({}, {}, null, pathFileTxt, '', {}, (err) => {
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
            .put(uri => uri.includes(`/${_rendersBucket}/${_renderId}`))
            .reply(403);
  
        storage.afterRender({}, {}, null, pathFileTxt, _renderName, {}, (err) => {
          assert.strictEqual(err.toString().includes(403), true);
          done();
        });
      });
  
    it('should return an error if s3 return an error 500', (done) => {
        nock(url1S3)
            .put(uri => uri.includes(`/${_rendersBucket}/${_renderId}`))
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
    
    it('should call the callback only once if the s3 delete fails when the document is loaded from the cache folder', function(done) {

        const _renderID3 = 'document-3.pdf'

        fs.copyFileSync(path.join(__dirname, 'datasets', 'file.txt'), path.join(__dirname, 'datasets', _renderID3))

        nock(url1S3)
            .delete(uri => uri.includes(`/${_rendersBucket}/${_renderID3}`))
            .replyWithError('Network error');

        let _nbCalls = 0;
        storage.readRender({}, {}, _renderID3, function(err, renderPath) {
            _nbCalls++;
            assert.strictEqual(null, err);
            assert.strictEqual(renderPath.includes('datasets/' + _renderID3), true)
            toDelete.push(renderPath);
        });
        setTimeout(() => {
            assert.strictEqual(_nbCalls, 1);
            assert.strictEqual(nock.isDone(), true);
            done();
        }, 200);
    });

    it('should log an error if s3 refuses to delete the generated document loaded from the cache folder', function(done) {

        const _renderID4 = 'document-4.pdf'
        const _logs = [];
        const _consoleLog = console.log;

        fs.copyFileSync(path.join(__dirname, 'datasets', 'file.txt'), path.join(__dirname, 'datasets', _renderID4))
        toDelete.push(path.join(__dirname, 'datasets', _renderID4));

        nock(url1S3)
            .delete(uri => uri.includes(`/${_rendersBucket}/${_renderID4}`))
            .reply(403, '<?xml version="1.0" encoding="UTF-8"?><Error><Code>AccessDenied</Code><Message>Access Denied.</Message></Error>', { 'content-type': 'application/xml' });

        const _calls = [];
        console.log = (...args) => { _logs.push(args.join(' ')); };
        storage.readRender({}, {}, _renderID4, function(err, renderPath) {
            _calls.push({ err, renderPath });
        });
        setTimeout(() => {
            console.log = _consoleLog;
            assert.strictEqual(_calls.length, 1);
            assert.strictEqual(_calls[0].err, null);
            assert.strictEqual(_logs.includes(`🔴 S3 Delete Render | ${_renderID4} | Status: 403 | Body: AccessDenied`), true, _logs.join('\n'));
            done();
        }, 200);
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

    it('should return the generated document downloaded from s3 even if the s3 delete fails', function(done) {

        const _renderID = 'dj39dk20dk3odk2.pdf';
        const _expectedPath = path.join(__dirname, 'datasets', _renderID);

        /** The document must not be in the cache folder, otherwise it is not downloaded from s3 */
        toDelete.push(_expectedPath);
        if (fs.existsSync(_expectedPath)) {
            fs.unlinkSync(_expectedPath);
        }

        nock(url1S3)
            .get(uri => uri.includes(`/${_rendersBucket}/${_renderID}`))
            .reply(200, () => {
                return fs.createReadStream(pathFileTxt);
            });

        nock(url1S3)
            .delete(uri => uri.includes(`/${_rendersBucket}/${_renderID}`))
            .replyWithError('Network error');

        const _calls = [];
        storage.readRender({}, {}, _renderID, function(err, renderPath) {
            _calls.push({ err, renderPath });
        });
        setTimeout(() => {
            assert.strictEqual(_calls.length, 1);
            assert.strictEqual(_calls[0].err, null);
            assert.strictEqual(_calls[0].renderPath, _expectedPath);
            assert.strictEqual(fs.readFileSync(_expectedPath, 'utf8'), fs.readFileSync(pathFileTxt, 'utf8'));
            assert.strictEqual(nock.isDone(), true);
            done();
        }, 200);
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

  describe('Buckets configured without S3 credentials', function () {
    let storageNoCredentials = null;
    let _previousConfig = null;

    before(function () {
      _previousConfig = config.getConfig();
      config.setConfig({
        rendersBucket  : _rendersBucket,
        templatesBucket: _templatesBucket,
        templatePath: path.join(__dirname, 'datasets'),
        renderPath: path.join(__dirname, 'datasets')
      });
      delete require.cache[require.resolve('../storage')];
      storageNoCredentials = require('../storage');
    });

    after(function () {
      config.setConfig(_previousConfig);
      delete require.cache[require.resolve('../storage')];
    });

    it('should not call S3 when writing a template', (done) => {
      storageNoCredentials.writeTemplate({}, {}, 'templateId', pathFileTxt, (err, templateName) => {
        assert.strictEqual(err, null);
        assert.strictEqual(templateName, 'templateId');
        done();
      });
    });

    it('should return the local path when reading a template', (done) => {
      storageNoCredentials.readTemplate({}, {}, 'templateId', (err, templatePath) => {
        assert.strictEqual(err, null);
        assert.strictEqual(templatePath, path.join(__dirname, 'datasets', 'templateId'));
        done();
      });
    });

    it('should return the local path when deleting a template', (done) => {
      storageNoCredentials.deleteTemplate({}, {}, 'templateId', (err, templatePath) => {
        assert.strictEqual(err, null);
        assert.strictEqual(templatePath, path.join(__dirname, 'datasets', 'templateId'));
        done();
      });
    });

    it('should not call S3 after a render', (done) => {
      storageNoCredentials.afterRender({}, {}, null, pathFileTxt, 'report.pdf', {}, (err) => {
        assert.strictEqual(err, undefined);
        done();
      });
    });

    it('should return the local path when reading a render', (done) => {
      storageNoCredentials.readRender({}, {}, 'renderId.pdf', (err, renderPath) => {
        assert.strictEqual(err, null);
        assert.strictEqual(renderPath, path.join(__dirname, 'datasets', 'renderId.pdf'));
        done();
      });
    });
  })

  describe('Bucket connection errors at startup', function () {
    let _previousConfig = null;
    const _logs = [];
    const _consoleLog = console.log;

    before(function (done) {
      _previousConfig = config.getConfig();
      config.setConfig({
        storageCredentials : _previousConfig.storageCredentials,
        rendersBucket  : _rendersBucket,
        templatesBucket: _templatesBucket
      });

      nock(url1S3)
        .intercept(`/${_templatesBucket}`, "HEAD")
        .reply(403);

      nock(url1S3)
        .intercept(`/${_rendersBucket}`, "HEAD")
        .reply(403, '', { 'content-type': 'application/xml' });

      console.log = (...args) => { _logs.push(args.join(' ')); };
      delete require.cache[require.resolve('../storage')];
      require('../storage');
      setTimeout(() => {
        console.log = _consoleLog;
        done();
      }, 500);
    });

    after(function () {
      console.log = _consoleLog;
      config.setConfig(_previousConfig);
      delete require.cache[require.resolve('../storage')];
    });

    it('should log the status code of the HEAD bucket request', function () {
      assert.strictEqual(_logs.includes(`🔴 S3 Connection | Error: Templates S3 Bucket Connection | ${_templatesBucket} | Status 403`), true, _logs.join('\n'));
    });

    it('should log the status code of the HEAD bucket request if S3 returns an XML content-type', function () {
      assert.strictEqual(_logs.includes(`🔴 S3 Connection | Error: Renders S3 Bucket Connection | ${_rendersBucket} | Status 403`), true, _logs.join('\n'));
    });
  })
});
