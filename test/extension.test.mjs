const assert = require( 'assert');
const vscode = require('vscode');
// import myExtension from '../extension.js'; // 확장 모듈 테스트 시 사용

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('Sample test', () => {
    assert.strictEqual(-1, [1, 2, 3].indexOf(5));
    assert.strictEqual(-1, [1, 2, 3].indexOf(0));
  });
});
