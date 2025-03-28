/**
 * @typedef {Object} FolderData
 * @property {*} xml - XML 데이터 (초기값: null)
 * @property {Array<*>} frames - 프레임 배열
 * @property {Array<*>} scripts - 스크립트 배열
 */

const globals = {
    /**
     * 전역 폴더 데이터 저장소.
     * @type {Object.<string, FolderData>}
     */
    folderDatas: {
    },
};

// 디버깅용
global.globals = globals;

module.exports = globals;