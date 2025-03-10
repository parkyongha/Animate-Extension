var doc = fl.getDocumentDOM();

if (!doc) {
	fl.trace("문서를 먼저 열어주세요.");
}

main();

function main() {
	if (gotoMainTimeline() == false) {
		return;
	}

	var fileInfo = loadFiles();

	applyScript(fileInfo);

	gotoMainTimeline();
}

function loadFiles() {
	var fileInfo = {
		actionsPath: "",
		scripts: []
	}

	var path = doc.path;

	var parts = path.split("\\");
	var remainingParts = null;

	path = path.toLowerCase();

	if (path.indexOf(".xfl") !== -1) {
		// fl.trace("현재 열린 파일은 XFL 형식입니다.");
		remainingParts = parts.slice(0, parts.length - 2);

	} else if (path.indexOf(".fla") !== -1) {
		// fl.trace("현재 열린 파일은 FLA 형식입니다.");
		remainingParts = parts.slice(0, parts.length - 1);
	}

	fileInfo.actionsPath = remainingParts.join("\\") + "\\actions\\";

	// fl.trace(fileInfo.actionsPath);

	var convertedPath = convertWindowsPathToURI(fileInfo.actionsPath);

	// actionsPath 폴더의 존재 여부를 확인합니다.
	if (FLfile.exists(convertedPath)) {
		// 폴더가 존재한다면 해당 폴더의 'files' 목록을 가져옵니다.
		fileInfo.scripts = FLfile.listFolder(convertedPath, "files");

		// 파일 목록이 null 이거나 빈 배열인 경우
		if (fileInfo.scripts == null || fileInfo.scripts.length === 0) {
			fl.trace("폴더는 존재하지만 파일이 없습니다.");
		} else {
			// fl.trace("파일 목록:");
			// fl.trace(fileInfo.scripts);
		}
	} else {
		// 폴더 자체가 존재하지 않을 때
		fl.trace("폴더가 존재하지 않습니다: " + convertedPath);
	}

	return fileInfo;
}

function applyScript(fileInfo) {
	var fileURL = convertWindowsPathToURI(fileInfo.actionsPath + "script_setting.xml");
	var xmlContent = FLfile.read(fileURL);

	// XML 선언(<?xml ... ?>)을 정규식을 사용해서 제거합니다.
	xmlContent = xmlContent.replace(/<\?xml.*?\?>\s*/, "");

	var xmlData = new XML(xmlContent);
	// fl.trace("xml Data : " + xmlData.children().frame);

	for each(var frame in xmlData.children().frame) {
		var actionFile = frame.toString();

		if (frame.@dirty == false)
			continue;

		frame.@dirty = false;
		
		// 확장자 제거
		var actionFileName = actionFile.slice(0, -3);

		// 파일명 파싱 '심볼경로-레이어-프레임번호' 식으로 구성되어 있음
		var actionSep = actionFileName.split("-");

		// 심볼 경로를 구분하기 위해 넣어두었던 구분자를 다시 / 로 바꿈
		var symbolPath = actionSep[0].replace(/_#SS_/g, "/");
		var targetLayer = actionSep[1];
		var frame = actionSep[2];

		if (symbolPath == "Main")
			gotoMainTimeline();
		else
			doc.library.editItem(symbolPath);


		var timeline = doc.getTimeline();

		var layers = timeline.layers;

		var selectedLayer = layers.filter(function (layer) {
			return (layer.name === targetLayer) && layer.layerType === "normal";
		})[0];

		var output = "=== Apply Script Info ==================\n";
		output += "Symbol Path : " + symbolPath + "\n";
		output += "Layer       : " + selectedLayer.name + "\n";
		output += "Frame       : " + frame + "\n";
		output += "========================================\n\n";
		fl.trace(output);

		var script = FLfile.read(convertWindowsPathToURI(fileInfo.actionsPath + actionFile));

		if (script) {
			selectedLayer.frames[frame].actionScript = script;
		}
	}

	var newXMLString = xmlData.toXMLString();

	// 변경된 XML 문자열을 다시 파일로 저장
	if (FLfile.write(fileURL, newXMLString)) {
		fl.trace("XML 파일이 성공적으로 저장되었습니다: " + fileURL);
	} else {
		fl.trace("XML 파일 저장에 실패했습니다: " + fileURL);
	}
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