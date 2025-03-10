const globals = require('./globals');
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

/**
 * 텍스트 문서 변경 이벤트를 등록하여 Dirty 체크를 수행합니다.
 * @param {vscode.ExtensionContext} context
 */
function onDirtyCheck(context) {
    const onChangeText = vscode.workspace.onDidChangeTextDocument(event => {
        const filePath = event.document.fileName;
        const fileName = path.basename(filePath);

        // 파일의 부모 디렉터리의 부모 디렉터리를 사용
        const folderPath = path.resolve(path.dirname(filePath), '..');

        console.log(`텍스트 변경\nfolderPath: ${folderPath}\nfileName: ${fileName}`);

        const folderData = globals.folderDatas[folderPath];

        if (!folderData) {
            console.warn(`폴더 데이터가 없습니다: ${folderPath}`);
            return;
        }

        if (folderData.scripts.includes(fileName)) {
            markXmlDirty(folderPath, fileName);
        }
    });

    context.subscriptions.push(onChangeText);
}

/**
 * 지정된 폴더의 XML 데이터에서 해당 프레임을 Dirty 처리한 후, XML 파일로 저장합니다.
 * @param {string} folderPath - 폴더 경로
 * @param {string} fileName - 변경된 파일 이름
 */
function markXmlDirty(folderPath, fileName) {
    const folderData = globals.folderDatas[folderPath];

    const targetFrame = folderData.frames.find(frame => frame._ === fileName);
    if (targetFrame) {
        targetFrame.$.dirty = true;
        console.log(`Dirty 처리 완료: ${fileName}`);

        const actionPath = path.join(folderPath, 'actions', 'script_setting.xml');
        
        // { headless: true } 요거 필수
        const builder = new xml2js.Builder({ headless: true });
        const updatedXml = builder.buildObject(folderData.xml);

        fs.writeFile(actionPath, updatedXml, 'utf8', err => {
            if (err) {
                console.error('XML 파일 저장 중 오류 발생:', err);
            } else {
                console.log('XML 파일이 성공적으로 저장되었습니다:', actionPath);
            }
        });
    }
}

module.exports = {
    onDirtyCheck
};
