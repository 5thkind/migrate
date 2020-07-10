const fifthKind = require('../fifthKind');

(async () => {

    let p = new fifthKind();


    await p.login({
       type: "password"
    }).then().catch(error => {
        console.log(error.message);
    });

    let pstvs = await p.tags().set({active: 1, lite: 1, inUseInSearch: 1}).getPSTVs();

    console.log(pstvs);

})();

