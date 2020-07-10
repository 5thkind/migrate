const fifthKind = require('../fifthKind');

(async () => {


    let p = new fifthKind();


    await p.login({
        type: "password"
    }).then().catch(error => {
        console.log(error.message);
    });

    let files = await p.local().readDirectory('./test');

    let filesOnTheSystem = await p.upload().set({
        placeHolderUpload: false
    }).uploadFiles(files, 2000);

    await p.upload().updateUploadFiles(filesOnTheSystem);

})();
