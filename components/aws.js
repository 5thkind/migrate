const glob = require('glob');
const async = require('async');
const fs = require('fs');
const path = require('path');

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

    readDirectory(dir) {
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

            let prefix = this.prefix;
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

    ingestingAWS(files) {
        return new Promise((resolve, reject) => {
            async.eachSeries(files, (file, next) => {
                let destination = (this.prefix + '/' + this.uploadDirectory + '/' + this.userId + '/' + file.uploadFileId + '_0').replace("//", "/");
                let source = (this.bucket + '/' + this.prefix + '/' + file.filePath).replace("//", "/");
                let option = {
                    Bucket: this.bucket,
                    Key: destination,
                    CopySource: source
                };
                if (this.debug) {
                    console.log(option);
                }

                this.s3.copyObject(option, (err, result) => {
                  if (err) {
                      throw new Error('Copy Failed');
                  } else {
                      next();
                  }
                });
            }, () => {
                resolve(files);
            });
        });
    }
};