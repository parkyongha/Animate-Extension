const vscode = require('vscode');
const htmlParser = require('./htmlParser.js');
const myCommand = require('./command.js');
const myView = require('./view.js');

async function activate(context) {
  console.log('Extension "yh" is now active!');

  const hasRun = context.globalState.get('hasRunOnce', false);  

  // 이 블록은 확장이 처음 활성화될 때만 실행됩니다.
  await Initialization(context);
  if (!hasRun) {

    // 플래그를 true로 설정해두어 이후에는 실행되지 않도록 합니다.
    context.globalState.update('hasRunOnce', true);
  }
}

// 초기화
async function Initialization(context) {

  vscode.window.showInformationMessage('구성 시작');

  myCommand.commandProvider(context);

  myView.activate(context);

  // 요소들을 가져올 html 링크
  const url = 'https://createjs.com/docs/easeljs/classes/MovieClip.html';

  let htmlData;

  try {
    htmlData = await htmlParser.parseHtmlFromUrl(url);
    console.log("Parsed HTML data:", htmlData);
  } catch (err) {
    console.error("HTML 파싱 오류:", err);
    return;
  }

  // methods와 properties를 합쳐서 하나의 배열로 구성
  const completionsArray = [
    ...htmlData.methods,
    ...htmlData.properties
  ];

  // CompletionItemProvider 등록
  const provider = vscode.languages.registerCompletionItemProvider(
    { scheme: 'file', language: 'javascript' },
    {
      provideCompletionItems(document, position) {
        return completionsArray.map(data => {
          const item = new vscode.CompletionItem(data.title);
          // kind 매핑: methods → Function, properties → Property
          item.kind = data.kind === "function" ? vscode.CompletionItemKind.Function : vscode.CompletionItemKind.Property;
          item.documentation = new vscode.MarkdownString(data.documentation);
          item.insertText = new vscode.SnippetString(data.insertText);
          return item;
        });
      }
    },
    '.' // 트리거 문자
  );

  context.subscriptions.push(provider);

  vscode.window.showInformationMessage('구성 끝');
}

function deactivate() { }

module.exports = {
  activate,
  deactivate
}

