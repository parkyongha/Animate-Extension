const vscode = require('vscode');
const cheerio = require('cheerio');

// 요소들을 가져올 html 링크
const url = 'https://createjs.com/docs/easeljs/classes/MovieClip.html';

module.exports = {
  completionItemProvider
};

async function completionItemProvider(context) {
  let htmlData;

  try {
    htmlData = await parseHtmlFromUrl(url);
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

  const completionItems = getCompletionItems();

  const createProvider = () => {
   return vscode.languages.registerCompletionItemProvider(
      { scheme: 'file', language: 'javascript' },
      {
        provideCompletionItems(document, position) {
          return completionItems;
        }
      },
      '.' // 트리거 문자
    );
 }

  // CompletionItemProvider 등록
  let provider = createProvider();
  let providerActive = true;

  // 커맨드 등록 (package.json에도 "extension.toggleProvider" 명령을 등록해야 합니다)
 let toggleProvider = vscode.commands.registerCommand('extension.toggleCompletionItemProvider', () => {
    if (providerActive) {
      // provider 비활성화: dispose() 호출하여 리소스 해제
      provider.dispose();
      providerActive = false;
      vscode.window.showInformationMessage('Provider deactivated.');
    } else {
      // provider 활성화: 새 provider 생성 후 subscriptions에 추가
      provider = createProvider();
      context.subscriptions.push(provider);
      providerActive = true;
      vscode.window.showInformationMessage('Provider activated.');
    }
  });

  context.subscriptions.push(provider);
  context.subscriptions.push(toggleProvider);

  function getCompletionItems() {
    return completionsArray.map(data => {
      const item = new vscode.CompletionItem(data.title);
      // kind 매핑: methods → Function, properties → Property
      item.kind = data.kind === "function" ? vscode.CompletionItemKind.Function : vscode.CompletionItemKind.Property;
      item.documentation = new vscode.MarkdownString(data.documentation);
      item.insertText = new vscode.SnippetString(data.insertText);
      return item;
    });
  }
}

/**
 * 주어진 HTML 콘텐츠에서 methods 정보를 파싱합니다.
 *
 * 각 메서드 요소는 id가 "method_"로 시작하는 div 요소를 대상으로 하며,
 * 아래 정보를 추출합니다.
 *
 * - title: <h3 class="name"><code>...</code></h3>의 텍스트
 * - kind: "function" (후에 CompletionItemKind.Function으로 매핑)
 * - documentation: 
 *     - Description: <div class="description"> 내의 텍스트
 *     - Parameters: <div class="params"> 내의 각 파라미터를 Markdown 리스트로 정리
 *     - Returns: <div class="returns"> 내의 리턴 타입과 설명을 Markdown으로 정리
 * - insertText: 기본 Snippet 문자열 (예: "addChild($1)$0")
 *
 * @param {string} htmlContent - HTML 콘텐츠 문자열
 * @returns {Array<Object>} - methods 배열, 각 항목은 { title, kind, documentation, insertText }
 */
function parseMethods(htmlContent) {
  const $ = cheerio.load(htmlContent);
  const methods = [];

  $("div[id^='method_']").each((i, el) => {
    const nameEl = $(el).find("h3.name code").first();
    if (!nameEl.length) return;
    const title = nameEl.text().trim();

    let docMarkdown = "";

    // Description
    const descEl = $(el).find("div.description").first();
    if (descEl.length) {
      const descText = descEl.text().trim();
      if (descText) {
        docMarkdown += `**Description:**\n${descText}\n\n`;
      }
    }

    // Parameters
    const paramsEl = $(el).find("div.params").first();
    if (paramsEl.length) {
      docMarkdown += `**Parameters:**\n`;
      $(paramsEl).find("li.param").each((j, paramEl) => {
        const paramName = $(paramEl).find(".param-name").first().text().trim();
        const paramType = $(paramEl).find(".type").first().text().trim();
        const paramDesc = $(paramEl).find(".param-description").first().text().trim();
        docMarkdown += `- \`${paramName}\` (${paramType}): ${paramDesc}\n`;
      });
      docMarkdown += "\n";
    }

    // Returns
    const returnsEl = $(el).find("div.returns").first();
    if (returnsEl.length) {
      docMarkdown += `**Returns:**\n`;
      const returnsDescEl = $(returnsEl).find("div.returns-description").first();
      let returnsDesc = returnsDescEl.text().trim();
      // 내부의 여러 공백(스페이스, 탭, 개행 등)을 단일 공백으로 치환
      returnsDesc = returnsDesc.replace(/\s+/g, ' ');
      docMarkdown += `- ${returnsDesc}\n`;
    }

    // 기본 Snippet: 메서드 이름과 괄호 (간단한 템플릿)
    const insertText = `${title}($1)$0`;

    methods.push({
      title,
      kind: "function",
      documentation: docMarkdown,
      insertText
    });
  });

  return methods;
}

/**
 * 주어진 HTML 콘텐츠에서 properties 정보를 파싱합니다.
 *
 * 각 프로퍼티 요소는 id가 "property_"로 시작하는 div 요소를 대상으로 하며,
 * 아래 정보를 추출합니다.
 *
 * - title: <h3 class="name"><code>...</code></h3>의 텍스트
 * - type: <span class="type"> 내의 텍스트 (예: "Boolean")
 * - kind: "property" (후에 CompletionItemKind.Property으로 매핑)
 * - documentation:
 *     - Description: <div class="description"> 내의 텍스트
 *     - Default: 마지막 <p> 태그 중 "Default:" 문자열 다음의 값 (예: "true")
 * - insertText: 기본 Snippet (그냥 프로퍼티 이름, 예: "actionsEnabled")
 *
 * @param {string} htmlContent - HTML 콘텐츠 문자열
 * @returns {Array<Object>} - properties 배열, 각 항목은 { title, type, kind, documentation, insertText }
 */
function parseProperties(htmlContent) {
  const $ = cheerio.load(htmlContent);
  const properties = [];

  $("div[id^='property_']").each((i, el) => {
    const nameEl = $(el).find("h3.name code").first();
    if (!nameEl.length) return;
    const title = nameEl.text().trim();

    // type: <span class="type"> 내의 텍스트
    let type = "";
    const typeEl = $(el).find("span.type").first();
    if (typeEl.length) {
      type = typeEl.text().trim();
    }

    // documentation: Markdown 문자열로 생성
    let docMarkdown = "";
    // Description
    const descEl = $(el).find("div.description").first();
    if (descEl.length) {
      const descText = descEl.text().trim();
      if (descText) {
        docMarkdown += `**Description:**\n${descText}\n\n`;
      }
    }
    // Default 값: 마지막 <p> 태그 중 "Default:" 문자열 다음의 값 추출
    let defaultValue = "";
    $(el).find("p").each((j, p) => {
      const text = $(p).text();
      if (text.includes("Default:")) {
        const match = text.match(/Default:\s*(.*)/);
        if (match && match[1]) {
          defaultValue = match[1].trim();
        }
      }
    });
    if (defaultValue) {
      docMarkdown += `**Default:** ${defaultValue}\n\n`;
    }
    // 추가로, 타입 정보를 문서에 포함 (원하는 경우)
    if (type) {
      docMarkdown = `**Type:** ${type}\n\n` + docMarkdown;
    }

    // insertText: 프로퍼티 이름 그대로
    const insertText = title;

    properties.push({
      title,
      type,
      kind: "property",
      documentation: docMarkdown,
      insertText
    });
  });

  return properties;
}

/**
 * 주어진 HTML 콘텐츠에서 methods와 properties를 모두 파싱하여 객체로 반환합니다.
 *
 * @param {string} htmlContent - HTML 콘텐츠 문자열
 * @returns {Object} - { methods: [...], properties: [...] }
 */
function parseHtmlContent(htmlContent) {
  return {
    methods: parseMethods(htmlContent),
    properties: parseProperties(htmlContent)
  };
}

/**
 * 지정한 URL에서 HTML을 가져와 파싱한 후, methods와 properties 정보를 반환하는 함수 (비동기)
 *
 * @param {string} url - HTML이 위치한 URL
 * @returns {Promise<Object>} - Promise resolving to { methods: [...], properties: [...] }
 */
async function parseHtmlFromUrl(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP 요청 실패: ${response.status} ${response.statusText}`);
  }

  const htmlContent = await response.text();

  return parseHtmlContent(htmlContent);
}

