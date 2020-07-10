const async = require('async');
const FormData = require('form-data');
const fs = require('fs');

module.exports = class upload {

    constructor(options) {
        this.set(options);
    }

    set(options) {
        for (let a in options) {
            this[a] = options[a];
        }
        return this;
    }

    uploadFilesSeg(files) {
        return new Promise((resolve, reject) => {
            let postingFiles = [], uploadGroupId;
            files.forEach(file => {
                postingFiles.push({
                    fileName: file['basename'],
                    fileSize: file['size'],
                    filePath: file['path']
                });
            });
            async.waterfall([
                (next) => {
                    this._callMeta('/uploads', 'post', {
                        transferType: "http",
                        files: postingFiles
                    }).then(results => {
                        uploadGroupId = results[0].uploadFileGroupId;
                        files = results;
                        next();
                    }).catch(e => {
                        console.log(e);
                    });
                }, (next) => {
                    if (!this.placeHolderUpload) {
                        this._callCRS('/uploads/token/' + files.length, 'get')
                            .then(result => {
                                next(null, result.uploadToken);
                            });
                    } else {
                        next(null, null);
                    }
                },  (uploadToken, next) => {
                    if (!this.placeHolderUpload) {
                        async.each(files, (file, nxt) => {
                            let formData = new FormData();
                            let key = 'files[' + file.uploadFileId + ']';
                            let stream = fs.createReadStream(file.filePath);
                            formData.append(key, stream);
                            let endPoint = '/uploads/' + uploadGroupId + '/' + uploadToken;
                            let config = {
                                headers: {
                                    ...formData.getHeaders()
                                }
                            };
                            this._callCRS(endPoint, "post", formData, config).then(res => {
                                nxt();
                            })
                        }, () => {
                            next();
                        })
                    } else {
                        next(null, null);
                    }
                }
            ], () => {
                resolve(files);
            });
        });
    }

    uploadFiles(files, chunk) {
        let tmp = [];
        files = files.filter(n => n.size);

        for (let i=0; i<files.length; i += chunk) {
            tmp.push(files.slice(i, i + chunk));
        }

        let importedFiles = [];
        return new Promise((resolve, reject) => {
            async.eachSeries(tmp, (groupOfFiles, next) => {
                this.uploadFilesSeg(groupOfFiles).then((files) => {
                    importedFiles = importedFiles.concat(files);
                    next();
                });
            }, () => {
                resolve(importedFiles);
            });
        });
    }

    updateUploadFiles(files) {
        return new Promise((resolve, reject) => {
            async.eachSeries(files, (file, next) => {
                this._callMeta('/uploads/files/' + file.uploadFileId, 'put', {
                    status: 'uploaded',
                    fileBytesReceived: Number(file.fileSize)
                }).then(result => {
                    console.log(result);
                    next();
                });
            }, () => {
                resolve();
            });
        });
    }

    fileTag(file, cb) {
        // need to look at this later, why i got a .
        let fileName = file.fileName;
        let fileArray = file.filePath.replace('./', '/').replace(fileName, '').split("/").filter(n => n);

        if (this.skipFirst === true) {
            fileArray = fileArray.slice(1, fileArray.length);
        }

        let taggingInfo = [{
            key: 'Domain Purpose',
            value: this.tagKeys.domainPurpose
        }];

        let missingKey = [];
        fileArray.forEach((fileSeg, index) => {
            if (fileSeg !== fileName && this.tagKeys.tags[index]) {
                if (fileSeg === '.' || fileSeg === '/') {
                    throw new Error('failed to map file path seg to tag values');
                } else {

                    taggingInfo.push({key: this.tagKeys.tags[index], value: fileSeg});
                }
            } else {
                missingKey.push(index+1);
            }
        });

        if (missingKey.length) {
            return this.tagsInstance.addTagKeys(missingKey).then(result => {
                result.forEach (tagKey => {
                   if (this.tagKeys.tags.indexOf(tagKey) === -1) {
                       this.tagKeys.tags.push(tagKey);
                   }
                });
                return this.fileTag(file, cb);
            });
        } else {
            let url = '/files/' + file.fileId + '/tags';

            let data = {
                tagValues: taggingInfo
            };

            this._callMeta(url, 'put', data).then(results => {
                return cb();
            }).catch(e => {
                console.log(e);
            });
        }
    }

    mapFileStructureToTagKeyStructure(files, tagKeys) {
        this.tagKeys = tagKeys;
        return new Promise((resolve, reject) => {
            async.eachSeries(files, (file, next) =>{
                this.fileTag(file, () => {
                    return next();
                });
            }, () => {
                resolve(files);
            });
        });
    }

    getUploadFileById(id) {
        return new Promise((resolve, reject) => {
            this._callMeta('/uploads/files/' + id, 'get').then(result => {
                resolve(result);
            })
        });
    }
};