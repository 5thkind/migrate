require('dotenv').config();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const async = require('async');
const glob = require('glob');
const fs = require('fs');
const path = require("path");
const FormData = require('form-data');

const Login =require('./components/login');
const Tags =require('./components/tags');
const Local =require('./components/local');
const Upload =require('./components/upload');
const AWS =require('./components/aws');
const File = require('./components/file');

module.exports = class fifthKind {

    _camelToSnake(string) {
        return string.replace(/[\w]([A-Z])/g, function(m) {
            return m[0] + "_" + m[1];
        }).toLowerCase();
    }

    constructor(options) {
        let required = ['authEndpoint', 'metaEndpoint', 'crsEndpoint', 'cdsEndpoint', 'clientId'];
        let optional = ['clientSecret', 'username', 'password', 'key', 'secret', 'region', 'bucket', 'bucket', 'prefix', 'uploadDirectory', 'debug'];

        required.concat(optional).forEach(config => {
            if (process.env[this._camelToSnake(config)]) {
                this[config] = process.env[this._camelToSnake(config)];
            }
        });

        for(let a in options) {
            if (required.concat(optional).indexOf(a) !== -1) {
                this[a] = options[a];
            }
        }

        required.forEach(requiredVariable => {
            if (this[requiredVariable] === undefined) {
                console.log('MISSING REQUIRED VARIABLE(S)', requiredVariable);
                process.exit();
            }
        });

        this.loginInstance = new Login(this);

        this.tagsInstance = new Tags({
            _callMeta: this._callMeta,
            _preMeta: this._preMeta,
        });

        this.localInstance = new Local({
            _callMeta: this._callMeta,
            _preMeta: this._preMeta,
        });

        this.awsInstance = new AWS({
            _callMeta: this._callMeta,
            _preMeta: this._preMeta,
        });

        this.uploadInstance = new Upload({
            _callMeta: this._callMeta,
            _preMeta: this._preMeta,
            _callCRS: this._callCRS,
            _preCRS: this._preCRS
        });

        this.fileInstance = new File({
            _callMeta: this._callMeta,
            _preMeta: this._preMeta,
            _callCRS: this._callCRS,
            _preCRS: this._preCRS
        });
    }

    login(method) {
        this.loginInstance.set(this);
        return new Promise((resolve, reject) => {
            this.loginInstance.login(method).then(result =>{
                for(let a in result) {
                    this[a] = result[a];
                }
                resolve(true);
            }).catch(e => {
                reject(e);
            });
        });
    }

    file() {
        this.fileInstance.set(this);
        return this.fileInstance;
    }

    tags() {
        this.tagsInstance.set(this);
        return this.tagsInstance;
    }

    local() {
        this.localInstance.set(this);
        return this.localInstance;
    }

    aws(config) {
        this.awsInstance.set(config);
        this.awsInstance.set(this);
        return this.awsInstance.connect();
    }

    upload() {
        this.uploadInstance.set(this);
        return this.uploadInstance;
    }

    _preMeta() {
        let pre = new Promise((resolve, reject) => {
            resolve();
        });

        if (!this.metaJwt || !this.metaJwtExpiresOn || this.metaJwtExpiresOn < (new Date().getTime())/1000) {
            pre = new Promise((resolve, reject) => {
                axios.post(this.metaEndpoint + '/token', {}, {
                    headers: {
                        Authorization: this.tokenType + ' ' + this.token
                    }
                }).then(result => {
                    this.metaJwt = result.data.jwt;
                    this.metaJwtExpiresOn = result.data.expiresTimestamp;
                    resolve();
                });
            });
        }

        return pre;
    }

    _preCRS() {
        let pre = new Promise((resolve, reject) => {
            resolve();
        });

        if (!this.crsJwt || !this.crsJwtExpiresOn || this.crsJwtExpiresOn < (new Date().getTime())/1000) {
            pre = new Promise((resolve, reject) => {
                axios.post(this.crsEndpoint + '/token', {}, {
                    headers: {
                        Authorization: this.tokenType + ' ' + this.token
                    }
                }).then(result => {
                    this.crsJwt = result.data.jwt;
                    this.crsJwtExpiresOn = this.tokenExpireOn;
                    resolve();
                });
            });
        }

        return pre;
    }

    _callMeta(endPoint, method, data = {}) {
        if (method === 'get') {
            return new Promise((resolve, reject) => {
                this._preMeta().then(() => {
                    let callURI = this.metaEndpoint + endPoint;
                    if (this.debug === true) {
                        console.log(callURI);
                    }

                    axios.get(callURI, {
                        headers: {
                            Authorization: this.tokenType + ' ' + this.metaJwt
                        }
                    }).then(results => {
                        resolve(results.data.items);
                    }).catch(e => {
                        reject(e.response);
                    });
                });
            });
        } else if (method === 'post') {
            return new Promise((resolve, reject) => {
                this._preMeta().then(() => {
                    let callURI = this.metaEndpoint + endPoint;
                    if (this.debug === true) {
                        console.log(callURI);
                    }

                    axios.post(callURI, data,{
                        headers: {
                            Authorization: this.tokenType + ' ' + this.metaJwt
                        }
                    }).then(results => {
                        resolve(results.data.items);
                    }).catch(e => {
                        reject(e.response);
                    });
                });
            });
        } else if (method === 'patch') {
            return new Promise((resolve, reject) => {
                this._preMeta().then(() => {
                    let callURI = this.metaEndpoint + endPoint;
                    if (this.debug === true) {
                        console.log(callURI);
                    }

                    axios.patch(callURI, data,{
                        headers: {
                            Authorization: this.tokenType + ' ' + this.metaJwt
                        }
                    }).then(results => {
                        resolve(results.data.items);
                    }).catch(e => {
                        reject(e.response);
                    });
                });
            });
        } else if (method === 'put') {
            return new Promise((resolve, reject) => {
                this._preMeta().then(() => {
                    let callURI = this.metaEndpoint + endPoint;
                    if (this.debug === true) {
                        console.log(callURI);
                        console.log(data);
                    }
                    axios.put(callURI, data,{
                        headers: {
                            Authorization: this.tokenType + ' ' + this.metaJwt
                        }
                    }).then(results => {
                        resolve(results.data.items);
                    }).catch(e => {
                        reject(e.response);
                    });
                });
            });
        }
    }

    _callCRS(endPoint, method, data = {}, config = null) {
        if (method === 'get') {
            return new Promise((resolve, reject) => {
                this._preCRS().then(() => {
                    let callURI = this.crsEndpoint + endPoint;
                    if (this.debug === true) {
                        console.log(callURI);
                    }

                    axios.get(callURI, {
                        headers: {
                            Authorization: this.tokenType + ' ' + this.crsJwt
                        }
                    }).then(results => {
                        resolve(results.data.items);
                    }).catch(e => {
                        reject(e.response);
                    });
                });
            });
        } else if (method === 'post') {
            return new Promise((resolve, reject) => {
                this._preCRS().then(() => {
                    let callURI = this.crsEndpoint + endPoint;
                    if (this.debug === true) {
                        console.log(callURI);
                    }
                    if (!config) {
                        config = {
                            headers: {
                                Authorization: this.tokenType + ' ' + this.crsJwt
                            }
                        }
                    }
                    axios.post(callURI, data,config).then(results => {
                        resolve(results.data.items);
                    }).catch(e => {
                        reject(e.response);
                    });
                });
            });
        }
    }

};