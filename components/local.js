const glob = require('glob');
const async = require('async');
const fs = require('fs');
const path = require('path');

module.exports = class local {

    constructor(options) {
        this.set(options);
    }

    set(options) {
        for (let a in options) {
            this[a] = options[a];
        }
        return this;
    }

    readDirectory(dir) {
        return new Promise((resolve, reject) => {
            glob(dir + '/**/*', (err, files) => {
                if (err) {
                    reject(err);
                }
                this.listOfFiles = [];
                async.each(files, (file, next) => {
                    fs.lstat(file, (err, stat) => {
                        if (stat.isFile()) {
                            this.listOfFiles.push({
                                path: file,
                                basename: path.basename(file),
                                size: stat.size
                            });
                        }
                        next();
                    });
                }, () => {
                    if (this.listOfFiles.length) {
                        resolve(this.listOfFiles);
                    } else {
                        reject('Unable to locate any files');
                    }
                });
            });
        });

    }
};