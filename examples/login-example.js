const fifthKind = require('../fifthKind');

(async () => {

    let p = new fifthKind();

    await p.login({
        type: 'client_credentials'
    }).then().catch(error => {
        console.log(error.message);
    });

    console.log(p);

})();

