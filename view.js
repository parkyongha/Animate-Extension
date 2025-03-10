const globals = require('./globals');

const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const xml2js = require('xml2js');

const parser = new xml2js.Parser({ explicitArray: true });

module.exports = {
    viewProvider
}

function viewProvider(context) {
    // TreeDataProvider 생성 및 TreeView 등록
    const fileTreeDataProvider = new FileTreeDataProvider();

    // 탐색기에 뜨는 View 이름은 package.json에서 바꾸기
    const treeView = vscode.window.createTreeView('fileListView', {
        treeDataProvider: fileTreeDataProvider,
    });

    // 새로고침 명령어 등록: refresh() 메서드를 호출
    let refreshCommand = vscode.commands.registerCommand('extension.refreshTreeView', () => {
        fileTreeDataProvider.refresh();
    });

    // 작업영역에 폴더가 추가되거나 제거될 때 자동으로 refresh 호출
    vscode.workspace.onDidChangeWorkspaceFolders((event) => {
        fileTreeDataProvider.refresh();
    });

    let openFileCommand = vscode.commands.registerCommand('extension.openFile', (filePath) => {
        // 파일 열기: 파일 경로를 사용해 텍스트 문서를 열고, 에디터에 표시합니다.
        vscode.workspace.openTextDocument(filePath).then(doc => {
            vscode.window.showTextDocument(doc);
        }, err => {
            vscode.window.showErrorMessage("파일을 열 수 없습니다: " + err.message);
        });
    });

    context.subscriptions.push(treeView, refreshCommand, openFileCommand);
}

// TreeItem 클래스 정의
class FileTreeItem extends vscode.TreeItem {
    constructor(label, filePath, child) {
        var hasChild = child !== undefined;

        super(label,
            // 자식이 있을 경우 확장 가능한 상태로 설정
            hasChild ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None);

        this.tooltip = filePath;

        // 항목 클릭 시 파일 열기 명령어 실행
        this.command = hasChild ? undefined : {
            command: 'extension.openFile',
            title: 'Open File',
            arguments: [filePath],
        };

        this.children = child;

        // 기본 파일 아이콘 사용
        this.iconPath = hasChild ? vscode.ThemeIcon.Folder : vscode.ThemeIcon.File;
    }
}

// TreeDataProvider 구현
class FileTreeDataProvider {
    constructor() {
        // onDidChangeTreeData 이벤트 emitter 준비
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;

        this.DataRefresh();
    }

    DataRefresh() {
        console.log("Data Refresh");

        const workspaceFolders = vscode.workspace.workspaceFolders;

        // 예시 파일 목록 생성 (원하는 경로로 수정 가능)
        this.files = [];

        if (!workspaceFolders) {
            return;
        }



        workspaceFolders.forEach((folder) => {
            console.log("Work Space Folders : " + folder.uri.fsPath);

            var projectName = path.basename(folder.uri.fsPath);

            // XML 파싱해서 Child에 추가

            const xmlFilePath = path.join(folder.uri.fsPath, 'actions', 'script_setting.xml');

            fs.readFile(xmlFilePath, 'utf8', (err, xmlData) => {
                if (err) {
                    console.error('XML 파일 읽기 에러:', err);
                    return;
                }

                globals.folderDatas[folder.uri.fsPath] = {
                    xml: null,
                    frames: [],
                    scripts: []
                }

                let folderData = globals.folderDatas[folder.uri.fsPath];

                // 읽어온 XML 문자열 파싱
                parser.parseString(xmlData, (err, result) => {
                    if (err) {
                        console.error('XML 파싱 에러:', err);
                        return;
                    }

                    folderData.xml = result;

                    // 전체 파싱 결과 출력 (객체 형태)
                    console.log('전체 파싱 결과:', result);

                    // 예제: <scripts> 요소 아래의 <symbol> 노드들 중 속성 name이 "Main"인 노드 찾기
                    // XML 예시:
                    // <scripts>
                    //   <symbol path="Main" layerName="script" name="Main">
                    //     <frame id="0" dirty="false">Main-script-0.js</frame>
                    //     <frame id="1" dirty="false">Main-script-1.js</frame>
                    //   </symbol>
                    // </scripts>
                    let symbols = result.scripts.symbol;

                    var symbolsTreeItems = [];

                    // 속성은 '$' 프로퍼티 안에 저장되어 있음
                    symbols.forEach(symbol => {

                        var frames = symbol.frame;

                        var framesTreeItems = [];

                        frames.forEach(frame => {
                            var filePath = path.join(folder.uri.fsPath, 'actions', frame._);

                            var fileName = symbol.$.layerName + " : Frame " + frame.$.id;

                            var frameTreeItem = new FileTreeItem(fileName, filePath);

                            framesTreeItems.push(frameTreeItem);

                            folderData.frames.push(frame);
                            folderData.scripts.push(frame._);
                        });

                        var symbolTreeItem = new FileTreeItem(symbol.$.name, folder.uri.fsPath, framesTreeItems);

                        symbolsTreeItems.push(symbolTreeItem);
                    });

                    var mainFileTreeItem = new FileTreeItem(projectName, folder.uri.fsPath, symbolsTreeItems);
                    console.log("Project Name : " + projectName);

                    this.files.push(mainFileTreeItem);

                    // 데이터가 변경됐음을 알림
                    // 다시 렌더링 하도록 요청
                    this._onDidChangeTreeData.fire();
                });

            });
        });

    }

    getTreeItem(element) {
        return element;
    }

    getChildren(element) {
        if (!element) {
            return this.files; // 이미 파싱된 결과
        }
        return element.children;
    }

    // (필요시) 데이터 갱신 메서드
    refresh() {
        this.DataRefresh();
    }
}
