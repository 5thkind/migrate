const fifthKind = require('../fifthKind');
const async = require('async');

(async () => {

    let p = new fifthKind();

    await p.login({
        type: "password"
    }).then().catch(error => {
        console.log(error.message);
    });

    let ids = process.argv[2].split(",");

    async.eachSeries(ids, (id, next) => {

        p.upload().getUploadFileById(id).then(result => {
            let filePath = result[0].path;
            let fileSize = result[0].size;
            let uploadFileId = result[0].id;
            return {
                filePath, fileSize, uploadFileId
            }
        }).then(data => {
            return p.aws().ingestingAWS([{
                filePath: data.filePath, fileSize: data.fileSize, uploadFileId: data.uploadFileId
            }]);
        }).then(result => {
            return p.upload().updateUploadFiles(result);
        }).then(() => {
            next();
        });

    }, () => {
        console.log('all done');
    });


})();

