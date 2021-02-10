const async = require('async');
const path = require('path');
const axios = require('axios');
const s3UploadStream = require('s3-upload-stream');

module.exports = class local {

    constructor(config) {
        this.set(config);
    }

    set(options) {
        for (let a in options) {
            this[a] = options[a];
        }
        return this;
    }

    connect() {
        const AWS = require('aws-sdk');

        this.s3 = new AWS.S3({
            accessKeyId: this.key,
            secretAccessKey: this.secret,
            region: this.region,
        });
        return this;
    }

    readDirectory(dir, prefix) {
        return new Promise((resolve, reject) => {
            const listAllContents = async ({ Bucket, Prefix }) => {
                let list = [];
                let shouldContinue = true;
                let nextContinuationToken = null;
                while (shouldContinue) {
                    let res = await this.s3
                        .listObjectsV2({
                            Bucket: Bucket,
                            Prefix: Prefix,
                            ContinuationToken: nextContinuationToken || undefined,
                        })
                        .promise();
                    list = [...list, ...res.Contents];

                    if (!res.IsTruncated) {
                        shouldContinue = false;
                        nextContinuationToken = null;
                    } else {
                        nextContinuationToken = res.NextContinuationToken;
                    }
                }
                return list;
            };

            if (!prefix) {
                prefix = this.prefix;
            }

            if (this.debug) {
                console.log('Scanning', prefix + '/' + dir);
            }
            listAllContents({
                Bucket: this.bucket,
                Prefix: prefix + '/' + dir
            }).then(fileList => {
                let files = fileList.map(file => {
                    file.path = file.Key.replace(prefix, '');
                    file.basename = path.basename(file.Key);
                    file.size = file.Size;
                    return file;
                });
                resolve(files);
            });

        });
    }

    ingestingAWS(files, prefix) {
        return new Promise((resolve, reject) => {
            if (!prefix) {
                this.prefix = prefix;
            }
            async.eachSeries(files, (file, next) => {
                let destination = (this.prefix + '/' + this.uploadDirectory + '/' + this.userId + '/' + file.uploadFileId + '_0').replace("//", "/");
                let source = (prefix + '/' + file.filePath).replace("//", "/");
                const url = this.s3.getSignedUrl('getObject', {
                    Bucket: this.bucket,
                    Key: source,
                    Expires: 300
                });
                let s3Uploader = s3UploadStream(this.s3);
                let upload = s3Uploader.upload({
                    "Bucket": this.bucket,
                    "Key": destination
                });
                upload.maxPartSize(20971520); // 20 MB
                upload.concurrentParts(5);
                upload.on('error',  (error) => {
                    console.log(error);
                });
                upload.on('part',  (details) => {
                    console.log(details);
                });
                upload.on('uploaded',  (details) => {
                    console.log("uploaded");
                    next();
                });
                axios({
                    method: 'get',
                    url: url,
                    responseType:'stream'
                }).then(res => {
                    res.data.pipe(upload);
                });
            }, () => {
                resolve(files);
            });
        });
    }
};