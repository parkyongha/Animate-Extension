
const vscode = require('vscode');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const path = require('path');
const fs = require('fs');
const xml2js = require('xml2js');
const robot = require('robotjs');

const parser = new xml2js.Parser({ explicitArray: true });

const ApplyAndBuildLabel = 'Script 적용하고 빌드하기';
const BuildLabel = '빌드하기';
const ApplyScriptLabel = 'Script 적용하기';
const ExportScriptLabel = 'Script 내보내기';


module.exports = {
    commandProvider
};

function commandProvider(context) {

    let disposable = vscode.commands.registerCommand('extension.openCustomCommandWindow', async function () {
        // 실행할 명령 옵션 배열 (QuickPickItem 형식)
        const options = [
            { label: ApplyAndBuildLabel, description: '작성한 Script들을 Animate에 적용하고 빌드합니다' },
            { label: BuildLabel, description: '작성한 Script들을 적용하고 빌드합니다' },
            { label: ApplyScriptLabel, description: '작성한 Script들을 Animate에 적용합니다.' },
            { label: ExportScriptLabel, description: 'Animate에 있는 Script들을 JS로 내보냅니다.' },
        ];

        // QuickPick 창을 띄워서 사용자가 명령 선택
        const selected = await vscode.window.showQuickPick(options, {
            placeHolder: '실행할 명령을 선택하세요.'
        });

        // 선택된 명령에 따라 작업 실행
        if (selected) {

            switch (selected.label) {
                case BuildLabel:
                    handleJSFL("publish", "빌드 중", "빌드 실패")
                        .catch(err => console.error(err));

                    break;
                case ExportScriptLabel:
                    handleJSFL("Export Script", "Script 내보내기", "Script 내보내기 실패")
                        .catch(err => console.error(err));

                    break;
                case ApplyScriptLabel:
                    handleJSFL("Apply Script", "Script 적용하기", "Script 적용 실패")
                        .catch(err => console.error(err));

                    break;
                case ApplyAndBuildLabel:
                    // 먼저 Export Script, 성공 시 Apply Script 실행
                    handleJSFL("Apply And Publish", "Script 적용하고 빌드", "Script 적용 or 빌드 실패")
                        .catch(err => console.error(err));

                    break;
                default:
                    break;
            }
        }
    });

    context.subscriptions.push(disposable);

    // JSFL 실행 결과를 처리하는 공통 함수
    function handleJSFL(command, successMessage, errorPrefix) {
        return ExcuteJSFL(command).then(result => {
            if (result.success) {
                vscode.window.showInformationMessage(successMessage);
                return result;
            } else {
                const errorMessage = `${errorPrefix}\n ${result.error}`;
                vscode.window.showInformationMessage(errorMessage);
                return Promise.reject(errorMessage);
            }
        });
    }
}

async function ExcuteJSFL(jsflName) {
    var result = {
        success: true,
        error: ""
    }

    try {
        // 현재 실행 중인 프로세스 목록을 가져와 Animate.exe가 실행 중인지 확인합니다.
        const { stdout: tasklistOutput } = await exec('tasklist');

        if (!tasklistOutput.toLowerCase().includes('animate.exe')) {
            console.log("Animate.exe is not running.");

            result.success = false;
            result.error = "Animate가 실행 중인 상태가 아닙니다.";

            return result;
        }

        console.log("Animate.exe is running.");

        // Adobe Animate 실행 파일 경로 (환경에 맞게 수정)
        const animateExePath = await getAnimateExecutablePath();
        console.log(animateExePath);

        const jsflFileName = `jsfl/${jsflName}.jsfl`;
        const absoluteJsflPath = path.join(__dirname, jsflFileName);
        const jsflFilePath = `"${absoluteJsflPath}"`;

        // Animate를 실행하면서 JSFL 파일을 인수로 전달
        const command = `"${animateExePath}" -run ${jsflFilePath} -AlwaysRunJSFL`;
        const { stdout, stderr } = await exec(command);
        console.log(`stdout: ${stdout}`);
        console.log(`stderr: ${stderr}`);

        // autoDialogExcute 실행하고 예외 처리
        autoDialogExcute();

        return result;
    } catch (error) {
        console.error(`${error}`);

        result.success = false;
        result.error = error;

        return result;
    }
}

/**
 * Animate에서 JSFL을 실행할 것인지 물어보는 다이얼로그 팝업이 나오다면
 * JSFL을 실행하도록 자동으로 체크 후 실행
 */
function autoDialogExcute() {
    // "C:\Users[Username]\AppData\Roaming"을 반환
    const appDataPath = process.env.APPDATA;

    // 애니메이트의 Application.xml 경로 구성 
    const applicationXmlPath = path.join(appDataPath, 'Adobe', 'Animate', '2024', 'Application.xml');

    fs.readFile(applicationXmlPath, 'utf-8', (err, xmlData) => {
        if (err) {
            console.error('XML 파일 읽기 에러:', err);
            return;
        }

        parser.parseString(xmlData, (err, result) => {
            if (err) {
                console.error('XML 파싱 에러:', err);
                return;
            }

            // 전체 파싱 결과 출력 (객체 형태)
            console.log('전체 파싱 결과:', result);

            // Application Xml 객체에서 <prop.pair> 배열 찾기 
            const propPairs = result['prop.map']['prop.list'][0]['prop.pair'];

            if (!propPairs || !Array.isArray(propPairs)) {
                console.error('prop.pair 요소를 찾을 수 없습니다.');
                return;
            }

            // key가 "DontPromptForJSFLOpen"인 객체 찾기
            const JSFLOpen = propPairs.find(pair => pair.key && pair.key[0] === 'DontPromptForJSFLOpen');
            const runJSFL = propPairs.find(pair => pair.key && pair.key[0] === 'RunJSFLAsCommand');

            if (!JSFLOpen) {
                console.error('DontPromptForJSFLOpen 키를 찾을 수 없습니다.');
                return;
            }

            // 값 가져오기:
            // 만약 targetPair에 true라는 프로퍼티가 있다면 true,
            // false 프로퍼티가 있다면 false로 판단

            // 다이얼로그 팝업이 나오는 상태
            if ('false' in JSFLOpen) {

                // Run as Command가 선택되어 있지 않을 때
                // tab * 2으로 Run as Command로 커서 설정 
                // 스페이스바로 선택 후 enter로 싱해
                for (var i = 0; i < 2; i++) {
                    robot.keyTap('tab');
                    robot.setKeyboardDelay(100);
                }

                robot.keyTap('space');

                robot.keyTap('enter');
            } else {
                console.error('true 또는 false 값이 정의되어 있지 않습니다.');
                return;
            }
        });
    });
}

async function getAnimateExecutablePath() {
    try {
        // WMIC 명령어 실행
        const { stdout, stderr } = await exec('wmic process where "name=\'Animate.exe\'" get ExecutablePath');

        // 출력 예시:
        // ExecutablePath
        // C:\Program Files\Adobe\Adobe Animate 2024\Animate.exe
        const lines = stdout.split(/\r?\n/).map(line => line.trim()).filter(line => line !== '');

        if (lines.length < 2) {
            throw new Error('Animate.exe 경로를 찾을 수 없습니다.' + stderr);
        }

        // 두 번째 줄이 실제 경로
        return lines[1];
    } catch (error) {
        // 에러 발생 시 예외 던짐
        throw error;
    }
}
