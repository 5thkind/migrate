const fifthKind = require('../fifthKind');

(async () => {


    let p = new fifthKind();


    await p.login({
        type: "password"
    }).then().catch(error => {
        console.log(error.message);
    });

    let domainPurposeInterested = 'Film';
    let tagGroup = await p.tags().getTagsGroup('Structure');

    let domainPurpose = await p.tags().getAllDomainPurpose(domainPurposeInterested);

    let tagGroupId = tagGroup.id;
    let domainPurposeId = domainPurpose.id;

    let requiredTagKeys = await p.tags().getStructuralTagsRequiredByGroupId(tagGroupId, domainPurposeId);

    if (requiredTagKeys.count() > 1) {
        console.log('There are more than 1 key required on the structure, there is no guarantee folder scan will have the same amount');
        process.exit();
    }

    let tagKeys = await p.tags().getStructuralTagsByGroupId(tagGroupId, domainPurposeId);

    let preparedTags = tagKeys.formatTaggable(domainPurposeInterested);

    let files = await p.local().readDirectory('./test');

    let filesOnTheSystem = await p.upload().set({
        placeHolderUpload: true
    }).uploadFiles(files, 2000);

    let filesTagged = await p.upload().mapFileStructureToTagKeyStructure(filesOnTheSystem, preparedTags);

    let ingestedFiles = await p.aws().ingestingAWS(filesTagged);

    await p.upload().updateUploadFiles(ingestedFiles);

})();

