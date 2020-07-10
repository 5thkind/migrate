const axios = require('axios');
const async = require('async');

module.exports = class login {

    constructor(options) {
        this.set(options);
    }

    set(options) {
        for(let a in options) {
            this[a] = options[a];
        }
        return this;
    }

    login(method) {
        return new Promise((resolve, reject) => {
            if (!this.authEndpoint) {
                reject("Missing Auth Endpoint");
            }

            let data = {};
            if (method && method.type) {
                if (method.type === 'password' && this.username && this.password) {
                    data = {
                        client_id: this.clientId,
                        grant_type: 'password',
                        username: this.username,
                        password: this.password
                    };
                    this._callLogin(data, resolve, reject);
                } else if (method.type === 'client_credentials' && this.clientId && this.clientSecret) {
                    data = {
                        client_id: this.clientId,
                        client_secret: this.clientSecret,
                        grant_type: 'client_credentials'
                    };
                    this._callLogin(data, resolve, reject);
                } else {
                    reject('Missing Login Info');
                    return
                }
            }
        });
    }

    _callLogin(data, resolve, reject) {
        axios.post(this.authEndpoint + "/token", data).then(result => {
            this.token = result.data.access_token;
            this.tokenType = result.data.token_type;
            this.tokenExpireOn = Math.round((new Date().getTime()/1000) + result.data.expires_in);
            this.refreshToken = result.data.refresh_token;
            this.userId = result.data.userId;
            this.username = result.data.username;
            this.firstName = result.data.firstName;
            this.lastName = result.data.lastName;
            resolve(this);
        }).catch(e => {
            console.log(e.response.data);

            reject(e);
        });
    }
};
