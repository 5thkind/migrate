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

};