const fifthKind = require('../fifthKind');

(async () => {

    let p = new fifthKind();


    await p.login({
        type: "password"
    }).then().catch(error => {
        console.log(error.message);
    });

    let pstks = await p.tags().set({inUse: true, lite: 1}).getPSTKs();

    console.log(pstks);

})();

