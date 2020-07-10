const async = require('async');

module.exports = class tags {

    constructor(options) {
        this.set(options);
    }

    set(options) {
        for(let a in options) {
            this[a] = options[a];
        }
        return this;
    }

    getTagsGroups() {
        return new Promise((resolve, reject) => {
            this._callMeta('/tags/groups', 'get').then(results => {
                resolve(results);
            }, (err) => {
                reject(err);
            });
        });

    }

    getTagsGroup(name) {
        return new Promise((resolve, reject) => {
            this._callMeta('/tags/groups', 'get').then(results => {
                resolve(results.filter(n => {
                    return n.name.toLowerCase() === name.toLowerCase();
                })[0]);
            }, (err) => {
                reject(err);
            });
        });
    }

    getAllDomainPurposes() {
        return new Promise((resolve, reject) => {
            this._callMeta('/tags/domain-purposes', 'get').then(results => {
                resolve(results);
            }, (err) => {
                reject(err);
            });
        });
    }

    getAllDomainPurpose(name) {
        return new Promise((resolve, reject) => {
            this._callMeta('/tags/domain-purposes', 'get').then(results => {
                let dp = results.filter(n => {
                    return n.value.toLowerCase() === name.toLowerCase();
                })[0];
                this.dpId = dp.id;
                resolve(dp);
            }, (err) => {
                reject(err);
            });
        });
    }

    getTagsByGroupId(id, dpId) {
        let endPoint = '/tags/groups/' + id + '/keys?domain-purpose-id=' + dpId;
        return new Promise((resolve, reject) => {
            this._callMeta(endPoint, 'get').then(results => {
                this.tags = results;
                resolve(this.tagsSubFunctions());
            }, (err) => {
                reject(err);
            });
        });
    }

    getStructuralTagsByGroupId(id, dpId) {
        let endPoint = '/tags/groups/' + id + '/keys?structural=true&domain-purpose-id=' + dpId;
        return new Promise((resolve, reject) => {
            this._callMeta(endPoint, 'get').then(results => {
                this.tags = results;
                resolve(this.tagsSubFunctions());
            }, (err) => {
                reject(err);
            });
        });
    }

    getStructuralTagsRequiredByGroupId(id, dpId) {
        let endPoint = '/tags/groups/' + id + '/keys?structural=true&required=1&domain-purpose-id=' + dpId;
        return new Promise((resolve, reject) => {
            this._callMeta(endPoint, 'get').then(results => {
                this.tags = results;
                resolve(this.tagsSubFunctions());
            }, (err) => {
                reject(err);
            });
        });
    }

    getPSTKs() {
        let endPoint = '/tags/pstks?limit=5000';
        if (this.inUse) {
            endPoint += '&in-use=1'
        }
        if (this.lite) {
            endPoint += '&lite=1'
        }

        return new Promise((resolve, reject) => {
            this._callMeta(endPoint, 'get').then(results => {
                this.pstks = results;
                resolve(results);
            }, (err) => {
                reject(err);
            });
        });
    }

    getPSTVs() {
        let endPoint = '/tags/pstvs?limit=5000';
        if (this.active) {
            endPoint += '&active=1'
        }
        if (this.lite) {
            endPoint += '&lite=1'
        }
        if (this.inUseInSearch) {
            endPoint += '&in-use-in-search=1'
        }
        if (this.inUseInInbox) {
            endPoint += '&in-use-in-inbox=1'
        }

        return new Promise((resolve, reject) => {
            this._callMeta(endPoint, 'get').then(results => {
                this.pstvs = results;
                resolve(results);
            }, (err) => {
                reject(err);
            });
        });
    }

    addTagKeys(missingTagkeys) {
        return new Promise((resolve, reject) => {
            let parentId = this.tags[this.tags.length - 1].id;
            let tagKeysAdded = [];
            async.eachSeries(missingTagkeys, (key, next) => {
                this._callMeta('/tags/keys', "post", {
                    parentId: parentId,
                    name: 'Folder ' + key,
                    dataTypeId: 3,
                    isStructural: true,
                    propertySets: [{
                        isAcceptingNewValues: true,
                        domainPurposeId: this.dpId
                    }]
                }).then(result => {
                    tagKeysAdded.push('Folder ' + key);
                    parentId = result[0]['id'];
                    next();
                });
            }, () => {
                resolve(tagKeysAdded);
            });
        });
    }

    tagsSubFunctions() {
        return {
            outputTags: () => {
                return this.tags;
            },

            count: () => {
                return this.tags.length;
            },

            isStructural: () => {
                return this.tags.filter(e => {
                    return e.isStructural === true;
                });
            },

            formatTaggable: (domainPurpose) => {
                if (domainPurpose) {
                    let tags = {
                        domainPurpose: domainPurpose,
                        tags: []
                    };
                    this.tags = this.tags.map(e => {
                        if (e.parent === null) {
                            e.tempSort = 0;
                        } else {
                            e.tempSort = e.parent.id
                        }
                        return e;
                    }).sort((a, b) => {
                        return  a.sortPosition - b.sortPosition || a.tempSort - b.tempSort || a.id - b.id;
                    }).map(e => {
                        delete e.tempSort;
                        return e;
                    });

                    tags.tags = tags.tags.concat(this.tags.map(e => {
                        return e.name
                    }));

                    return tags;
                }
            }
        }
    }

};