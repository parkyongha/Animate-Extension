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
    const debounceDelay = 300; // 300ms 딜레이
    const debounceTimers = {};
    
    // 텍스트 문서 변경 이벤트
    const onChangeText = vscode.workspace.onDidChangeTextDocument(event => {
        const filePath = event.document.fileName;
        const fileName = path.basename(filePath);

        // 현재 파일에서 2단계 상위 폴더로 이동
        const folderPath = path.resolve(path.dirname(filePath), '..');
    
        // 각 문서별로 타이머 설정 (URI 또는 파일 경로를 key로 사용)
        if (debounceTimers[filePath]) {
            clearTimeout(debounceTimers[filePath]);
        }
    
        debounceTimers[filePath] = setTimeout(() => {
            // 타이머 실행 시, Dirty 체크 실행
            console.log(`디바운스 후 처리\nfolderPath: ${folderPath}\nfileName: ${fileName}`);
            
            const folderData = globals.folderDatas[folderPath];
            
            if (folderData && folderData.scripts.includes(fileName)) {
                markXmlDirty(folderPath, fileName);
            }

            delete debounceTimers[filePath];
        }, debounceDelay);
    });


    const onSaveText = vscode.workspace.onDidSaveTextDocument(event => {

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

    if (targetFrame && targetFrame.$.dirty == 'false') {
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
