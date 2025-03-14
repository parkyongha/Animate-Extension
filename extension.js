const vscode = require('vscode');

const myHtmlParser = require('./htmlParser.js');
const myCommand = require('./command.js');
const myView = require('./view.js');
const myServer = require('./server.js');
const scriptDirtyChecker = require('./scriptDirtyChecker.js');

/**
 * 
 * @param {vscode.ExtensionContext} context 
 */
async function activate(context) {
  console.log('Extension "yh" is now active!');

  myServer.startSocketServer();

  await Initialization(context);
  
  // console.log("Electron version:", process.versions.electron);
}

// 초기화
async function Initialization(context) {

  vscode.window.showInformationMessage('Animate Extension 구성 끝');

  myCommand.commandProvider(context);

  myView.viewProvider(context);

  scriptDirtyChecker.onDirtyCheck(context);

  await myHtmlParser.completionItemProvider(context);

  vscode.window.showInformationMessage('Animate Extension 구성 끝');
}

function deactivate() { }

module.exports = {
  activate,
  deactivate
}

