const globals = require('./globals');
const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const xml2js = require('xml2js');

const parser = new xml2js.Parser({ explicitArray: true });

module.exports = {
    viewProvider
};

function viewProvider(context) {
    // TreeDataProvider 생성 및 TreeView 등록
    const fileTreeDataProvider = new FileTreeDataProvider();

    // 탐색기에 뜨는 View 이름은 package.json에서 설정
    const treeView = vscode.window.createTreeView('fileListView', {
        treeDataProvider: fileTreeDataProvider,
    });

    // 새로고침 명령어 등록: refresh() 메서드를 호출
    let refreshCommand = vscode.commands.registerCommand('extension.refreshTreeView', () => {
        fileTreeDataProvider.refresh();
    });

    // 작업영역에 폴더가 추가 / 제거될 때 자동으로 refresh 호출
    vscode.workspace.onDidChangeWorkspaceFolders((event) => {
        fileTreeDataProvider.refresh();
    });

    // 파일 열기 명령어
    let openFileCommand = vscode.commands.registerCommand('extension.openFile', (filePath) => {
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
        const hasChild = !!child;
        super(
            label,
            hasChild
                ? vscode.TreeItemCollapsibleState.Expanded
                : vscode.TreeItemCollapsibleState.None
        );
        this.tooltip = filePath;
        // 자식이 없으면 파일 열기 명령 연결
        this.command = hasChild
            ? undefined
            : {
                  command: 'extension.openFile',
                  title: 'Open File',
                  arguments: [filePath],
              };

        this.children = child;
        this.iconPath = hasChild ? vscode.ThemeIcon.Folder : vscode.ThemeIcon.File;
    }
}

// Promise로 XML 읽고 파싱 후 mainFileTreeItem 생성
function parseXmlAndCreateItem(folderPath) {
    return new Promise((resolve) => {
        const projectName = path.basename(folderPath);
        const xmlFilePath = path.join(folderPath, 'actions', 'script_setting.xml');

        fs.readFile(xmlFilePath, 'utf8', (err, xmlData) => {
            // 에러가 나도, 리턴값을 resolve(null)로 주어 Promise.all에 영향 안주도록 처리
            if (err) {
                console.error('XML 파일 읽기 에러:', err);
                return resolve(null);
            }

            // globals.folderDatas 초기화
            globals.folderDatas[folderPath] = {
                xml: null,
                frames: [],
                scripts: []
            };
            const folderData = globals.folderDatas[folderPath];

            parser.parseString(xmlData, (parseErr, result) => {
                if (parseErr) {
                    console.error('XML 파싱 에러:', parseErr);
                    return resolve(null);
                }

                folderData.xml = result;
                console.log('전체 파싱 결과:', result);

                const symbols = result.scripts?.symbol || [];
                const symbolsTreeItems = [];

                symbols.forEach((symbol) => {
                    const frames = symbol.frame || [];
                    const framesTreeItems = [];

                    frames.forEach((frame) => {
                        const filePath = path.join(folderPath, 'actions', frame._);
                        const fileName = symbol.$.layerName + " : Frame " + frame.$.id;
                        framesTreeItems.push(
                            new FileTreeItem(fileName, filePath)
                        );

                        folderData.frames.push(frame);
                        folderData.scripts.push(frame._);
                    });

                    symbolsTreeItems.push(
                        new FileTreeItem(symbol.$.name, folderPath, framesTreeItems)
                    );
                });

                // 최상위 TreeItem (프로젝트명)
                const mainFileTreeItem = new FileTreeItem(
                    projectName,
                    folderPath,
                    symbolsTreeItems
                );
                console.log("Project Name:", projectName);

                return resolve(mainFileTreeItem);
            });
        });
    });
}

// TreeDataProvider 구현
class FileTreeDataProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.files = [];
        this.DataRefresh();
    }

    DataRefresh() {
        console.log("Data Refresh");
        const workspaceFolders = vscode.workspace.workspaceFolders;

        if (!workspaceFolders) {
            return;
        }

        // 폴더마다 parseXmlAndCreateItem을 호출하고, 모든 Promise가 끝나면 정렬 및 Tree 갱신
        const promises = [];

        workspaceFolders.forEach((folder) => {
            console.log("Work Space Folder:", folder.uri.fsPath);
            promises.push(parseXmlAndCreateItem(folder.uri.fsPath));
        });

        // 모든 parse 끝나면 한번에 정렬, Tree 갱신
        Promise.all(promises).then((items) => {
            // null이 아닌 아이템만 취합
            const validItems = items.filter((item) => item);

            // projectName(label) 기준 정렬
            validItems.sort((a, b) => a.label.localeCompare(b.label));

            // this.files 세팅하고 트리 갱신
            this.files = validItems;
            this._onDidChangeTreeData.fire();
        });
    }

    getTreeItem(element) {
        return element;
    }

    getChildren(element) {
        if (!element) {
            return this.files;
        }
        return element.children;
    }

    // (필요시) 데이터 갱신 메서드
    refresh() {
        this.DataRefresh();
    }
}
