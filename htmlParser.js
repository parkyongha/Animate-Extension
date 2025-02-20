const { JSDOM } = require('jsdom');
const fs = require('fs');

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
  const dom = new JSDOM(htmlContent);
  const document = dom.window.document;

  // methods 섹션의 경우, 보통 id가 "methods"인 컨테이너가 있을 수 있으나,
  // 제공된 예제는 개별 method 요소에 id가 "method_..."로 시작하므로,
  // 전체 문서에서 id가 "method_"로 시작하는 div 요소를 찾습니다.
  const methodElements = document.querySelectorAll("div[id^='method_']");
  const methods = [];

  methodElements.forEach(el => {
    // h3.name/code에서 메서드 이름 추출
    const nameEl = el.querySelector("h3.name code");

    if (!nameEl) return;
    
    const title = nameEl.textContent.trim();

    // documentation 생성 (간단하게 description, params, returns 결합)
    let docMarkdown = "";

    // Description
    const descEl = el.querySelector("div.description");

    if (descEl) {
      const descText = descEl.textContent.trim();
      if (descText) {
        docMarkdown += `**Description:**\n${descText}\n\n`;
      }
    }

    // Parameters
    const paramsEl = el.querySelector("div.params");
    if (paramsEl) {
      docMarkdown += `**Parameters:**\n`;
      const paramItems = paramsEl.querySelectorAll("li.param");
      paramItems.forEach(paramEl => {
        const paramNameEl = paramEl.querySelector(".param-name");
        const paramName = paramNameEl ? paramNameEl.textContent.trim() : "";

        const paramTypeEl = paramEl.querySelector(".type");
        const paramType = paramTypeEl ? paramTypeEl.textContent.trim() : "";

        const paramDescEl = paramEl.querySelector(".param-description");
        const paramDesc = paramDescEl ? paramDescEl.textContent.trim() : "";

        docMarkdown += `- \`${paramName}\` (${paramType}): ${paramDesc}\n`;
      });
      docMarkdown += "\n";
    }
    // Returns
    const returnsEl = el.querySelector("div.returns");
    if (returnsEl) {
      docMarkdown += `**Returns:**\n`;

      const returnsDescEl = returnsEl.querySelector("div.returns-description");
      let returnsDesc = returnsDescEl ? returnsDescEl.textContent.trim() : "";

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
  const dom = new JSDOM(htmlContent);
  const document = dom.window.document;

  // properties 대상: id가 "property_"로 시작하는 모든 div 요소
  const propertyElements = document.querySelectorAll("div[id^='property_']");
  const properties = [];

  propertyElements.forEach(el => {
    // title: h3.name/code 내 텍스트
    const nameEl = el.querySelector("h3.name code");
    if (!nameEl) return;
    const title = nameEl.textContent.trim();

    // type: <span class="type"> 내의 텍스트 (링크 내부 텍스트)
    let type = "";
    const typeEl = el.querySelector("span.type");
    if (typeEl) {
      type = typeEl.textContent.trim();
    }

    // documentation: Markdown 문자열로 생성
    let docMarkdown = "";
    // Description
    const descEl = el.querySelector("div.description");
    if (descEl) {
      const descText = descEl.textContent.trim();
      if (descText) {
        docMarkdown += `**Description:**\n${descText}\n\n`;
      }
    }
    // Default 값: 마지막 p 태그 내에서 <strong>Default:</strong> 뒤의 텍스트 추출
    const pEls = el.querySelectorAll("p");
    let defaultValue = "";
    pEls.forEach(p => {
      if (p.textContent.includes("Default:")) {
        // "Default:" 문자열 다음의 값을 추출
        const match = p.textContent.match(/Default:\s*(.*)/);
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
      type, // 추가 정보 (필요에 따라 documentation에 포함 가능)
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

module.exports = {
  parseHtmlFromUrl
};