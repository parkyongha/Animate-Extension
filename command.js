
const vscode = require('vscode');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const path = require('path');

const BuildLabel = '빌드하기';
const ApplyAndBuildLabel = 'Script 적용하고 빌드하기';
const ExportScriptLabel = 'Script 내보내기';
const ApplyScriptLabel = 'Script 적용하기';

function commandProvider(context) {

    let disposable = vscode.commands.registerCommand('extension.openCustomCommandWindow', async function () {
        // 실행할 명령 옵션 배열 (QuickPickItem 형식)
        const options = [
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
                    handleJSFL("Export Script", "Script 내보내기 완료", "Script 내보내기 실패")
                        .then(() => {
                            return handleJSFL("Apply Script", "Script 적용 완료", "Script 적용 실패");
                        })
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
        const animateExePath = '"C:\\Program Files\\Adobe\\Adobe Animate 2024\\Animate.exe"';

        const jsflFileName = `jsfl/${jsflName}.jsfl`;
        const absoluteJsflPath = path.join(__dirname, jsflFileName);
        const jsflFilePath = `"${absoluteJsflPath}"`;

        // Animate를 실행하면서 JSFL 파일을 인수로 전달
        const command = `${animateExePath} -run ${jsflFilePath} -AlwaysRunJSFL`;
        const { stdout, stderr } = await exec(command);
        console.log(`stdout: ${stdout}`);
        console.log(`stderr: ${stderr}`);

        return result;
    } catch (error) {
        console.error(`Error: ${error}`);

        result.success = false;
        result.error = error;

        return result;
    }
}

module.exports = {
    commandProvider
};