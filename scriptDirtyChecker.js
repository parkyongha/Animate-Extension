const vscode = require('vscode');

function activate(context) {
  // 텍스트 문서가 변경될 때마다 실행되는 이벤트 리스너 등록
  let disposable = vscode.workspace.onDidChangeTextDocument((event) => {
    const filePath = event.document.fileName;
    if (filePath.endsWith('script.js')) {
      markXmlDirty();
    }
  });

  context.subscriptions.push(disposable);
}

function markXmlDirty() {
  // XML 파일을 열어서 편집을 시도하는 예시
  const xmlFilePath = vscode.Uri.file('/path/to/your/file.xml');
  vscode.workspace.openTextDocument(xmlFilePath).then(doc => {
    vscode.window.showTextDocument(doc).then(editor => {
      // 예를 들어, 현재 내용에 주석을 추가하는 식으로 편집을 진행하여 dirty 상태로 만듭니다.
      editor.edit(editBuilder => {
        editBuilder.insert(new vscode.Position(0, 0), '<!-- dirty flag true -->\n');
      });
    });
  });
}

exports.activate = activate;
