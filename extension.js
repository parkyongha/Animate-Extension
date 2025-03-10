const vscode = require('vscode');
const htmlParser = require('./htmlParser.js');
const myCommand = require('./command.js');
const myView = require('./view.js');

let scriptNames = [];

async function activate(context) {
  console.log('Extension "yh" is now active!');

  await Initialization(context);
  
  // console.log("Electron version:", process.versions.electron);
}

// 초기화
async function Initialization(context) {

  vscode.window.showInformationMessage('Animate Extension 구성 끝');

  myCommand.commandProvider(context);

  myView.viewProvider(context);

  await htmlParser.completionItemProvider(context);

  vscode.window.showInformationMessage('Animate Extension 구성 끝');
}

function deactivate() { }

module.exports = {
  activate,
  deactivate,
  scriptNames
}

