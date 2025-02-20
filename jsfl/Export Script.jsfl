// -----------------------------------------------------------------
// 1. 문서 DOM과 내보낼 폴더 경로 설정
// -----------------------------------------------------------------
var doc = fl.getDocumentDOM();
if (!doc) {
	fl.trace("문서를 먼저 열어주세요.");
}

if (gotoMainTimeline()) {
	// 프로젝트 경로(문서가 저장된 폴더의 상위 폴더, 원하는 방식으로 수정)
	var exportFolder = GetProjectPath() + "\\actions\\";

	// 내보낼 폴더가 없으면 생성
	if (!FLfile.exists(exportFolder)) {
		FLfile.createFolder(convertWindowsPathToURI(exportFolder));
		fl.trace("폴더 생성");
	}
	fl.trace("내보낼 폴더 : " + exportFolder);

	// -----------------------------------------------------------------
	// 2. 메인 타임라인부터 재귀적으로 순회하여 액션 코드 내보내기 
	// -----------------------------------------------------------------
	var mainTimeline = doc.getTimeline();
	// 메인 타임라인에는 prefix "Main"을 사용 (필요에 따라 변경)

	var xmlDoc = "<scripts></scripts>";
	var xml = new XML(xmlDoc);

	traverseTimeline(mainTimeline, "Main", xml);

	fl.trace(xml.toXMLString());

	if (FLfile.write(convertWindowsPathToURI(exportFolder + "script_setting.xml"), xml)) {
		fl.trace("xml 내보내기 성공");
	}
} else {
	fl.trace("내보낼 스크립트가 없음!");
}

// -----------------------------------------------------------------
// 3. 재귀 함수: 타임라인의 각 레이어와 프레임, 그리고 심볼 인스턴스 순회
// ---------------------------------------------- -----------------
function traverseTimeline(timeline, prefix, xml) {
	// prefix에서 "/"를 기준으로 분할하여 _Animation 체크 (필요한 경우)
	var nameParts = prefix.split("/");

	// 현재 prefix의 마지막 부분을 심볼 이름으로 사용
	var symbolName = nameParts[nameParts.length - 1];

	// 각 레이어 순회
	for (var l = 0; l < timeline.layers.length; l++) {
		var layer = timeline.layers[l];
		var layerName = layer.name;
		if (!layerName || layerName === "") {
			layerName = "Layer" + l;
		}

		if (layer.layerType == "guide") {
			continue;
		}

		// 각 레이어마다 한 번만 재귀로 들어갈 심볼 인스턴스를 처리하기 위한 플래그
		var recursedForLayer = false;

		var exportScript = false;
		var symbolXML = '<symbol path="' + prefix + '" name="' + symbolName + '" layerName = "' + layerName + '">';

		// 각 프레임 순회
		for (var f = 0; f < layer.frames.length; f++) {
			var frame = layer.frames[f];
			var frameName = "Frame" + f;

			// 키프레임이 아니면 넘김
			if (f !== 0 && frame.startFrame != f) {
				continue
			}

			// 키프레임인지 여부(여기서는 조건 없이 액션 코드가 있으면 내보내도록 함)
			// (만약 키프레임만 처리하고 싶다면, 아래 조건에 frame.frameType === "keyframe"도 추가)
			if (frame.actionScript && frame.actionScript !== "") {

				fl.trace("prefix : " + prefix);
				// 파일명엔 \ 가 들어갈 수 없으니 중복되지 않을 구분자로 Replace
				var encryptionSymbolPath = prefix.replace(/\//g, "_#SS_");

				var fileName = encryptionSymbolPath + "-" + layerName + "-" + f + ".js";
				var filePath = exportFolder + fileName;

				fl.trace("내보낼 파일 이름: " + fileName);
				fl.trace("내보낼 파일 경로: " + filePath);

				try {
					var success = FLfile.write(convertWindowsPathToURI(filePath), frame.actionScript);
					if (success) {
						fl.trace("내보내기 성공: " + filePath);
						symbolXML += '<frame id="' + f + '" dirty="false">' + fileName + ' </frame>';
						exportScript = true;
					} else {
						fl.trace("내보내기 실패: " + filePath);
					}
				} catch (e) {
					fl.trace("내보내기 오류: " + filePath + "\n" + e);
				}
			}

			// 프레임에 포함된 요소(element) 중 심볼 인스턴스가 있다면 재귀 처리
			// 단, 한 레이어 내에서 단 한 번만 재귀하도록 함.
			if (!recursedForLayer && frame.elements && frame.elements.length > 0 || prefix == "Main") {
				for (var e = 0; e < frame.elements.length; e++) {
					var element = frame.elements[e];
					if (element.libraryItem && element.libraryItem.itemType === "movie clip") {

						// 재귀 호출: 새로운 prefix는 해당 심볼의 라이브러리 이름 사용
						traverseTimeline(element.libraryItem.timeline, element.libraryItem.name, xml);
						recursedForLayer = true; // 해당 레이어에서 한 번만 재귀 처리
						break; // 더 이상 다른 요소는 처리하지 않음
					}
				}
			}
		}

		if (exportScript) {
			symbolXML += '</symbol>';

			var newSymbol = new XML(symbolXML);
			xml.appendChild(newSymbol);
		}
	}
}

// -----------------------------------------------------------------
// 4. 헬퍼 함수들
// -----------------------------------------------------------------

function gotoMainTimeline() {
	var libraryItems = doc.library.items;
	var movieClipFound = false;

	// 라이브러리 항목 순회
	for (var i = 0; i < libraryItems.length; i++) {
		var item = libraryItems[i];
		if (item.itemType === "movie clip") {
			movieClipFound = true;
			var clipName = item.name;

			doc.library.editItem(clipName);

			break;
		}
	}

	if (!movieClipFound) {
		return false;
	}


	doc.exitEditMode();

	return true;
}

// Windows 경로를 파일 URL 형식으로 변환하는 함수
function convertWindowsPathToURI(winPath) {
	var uri = winPath.replace(/\\/g, "/");
	if (uri.charAt(1) === ":") {
		uri = "file:///" + uri.charAt(0) + "|" + uri.substring(2);
	} else {
		uri = "file:///" + uri;
	}
	return uri;
}

// 현재 문서의 전체 경로에서 프로젝트 경로(예: 마지막 두 요소 제거)를 반환하는 함수
function GetProjectPath() {
	var fullPath = doc.path;
	fl.trace("전체 파일 경로: " + fullPath);

	var parts = fullPath.split("\\");

	var remainingParts = null;

	fullPath = fullPath.toLowerCase();

	if (fullPath.indexOf(".xfl") !== -1) {
		fl.trace("현재 열린 파일은 XFL 형식입니다.");
		remainingParts = parts.slice(0, parts.length - 2);

	} else if (fullPath.indexOf(".fla") !== -1) {
		fl.trace("현재 열린 파일은 FLA 형식입니다.");
		remainingParts = parts.slice(0, parts.length - 1);
	}

	// 예: 마지막 두 요소(파일명 등)를 제거
	var remainingPath = remainingParts.join("\\");

	fl.trace("프로젝트 경로: " + remainingPath);

	return remainingPath;
}