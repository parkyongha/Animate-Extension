const globals = require('./globals');

const net = require('net');
const events = require('events');

const PORT = 50313; // 사용할 포트 번호

/**
 * @type {net.Socket}
 */
let mySocket = null;

class SocketEventEmitter extends events.EventEmitter { }
const socketEventEmitter = new SocketEventEmitter();

globals.writeSocketDataAsync = writeSocketDataAsync;

function startSocketServer() {

    console.log("서버 열게~");

    // 소켓 서버 생성
    const server = net.createServer((socket) => {
        socket.setEncoding('utf-8');

        mySocket = socket;

        console.log('클라이언트 연결됨.');

        // 클라이언트로부터 데이터 수신
        socket.on('data', (data) => {
            const message = data.toString().trim();
            console.log(`클라이언트 메시지: ${message}`);

            // 메시지 처리 및 응답 전송 예제
            socketEventEmitter.emit('data', data);
        });

        // 클라이언트 연결 종료 이벤트
        socket.on('end', () => {
            console.log('클라이언트 연결 종료됨.');
        });

        // 오류 처리 (옵션)
        socket.on('error', (err) => {
            console.error('소켓 오류:', err);
        });
    });

    // 서버를 지정된 포트에서 대기 상태로 전환
    server.listen(PORT, () => {
        console.log(`서버가 포트 ${PORT}에서 대기 중입니다.`);

        server.on('connection', (socket) => {
            console.log('클라이언트가 연결되었습니다.');

            // 클라이언트로 데이터 전송
            socket.write('HI?\n');
        });
    });
}

/**
 * 소켓으로 데이터 전송
 * @param {Uint8Array | string} buffer 
 * @returns {Promise<void>}
 */
function writeSocketDataAsync(buffer) {
    return new Promise((resolve, reject) => {

        if (mySocket) {
            mySocket.write(buffer, "utf-8", (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
            
        } else {
            reject(new Error('No client is connected.'));
        }

    });
}

/**
 * 소켓 데이터 수신 이벤트 리스너 등록
 * @param {(data: Buffer) => void} callback 
 * @param {boolean} once 
*/
function onSocketDataListener(callback, once) {
    if (once) {
        socketEventEmitter.once('data', callback);
    } else {
        socketEventEmitter.on('data', callback);
    }
}

// 이름 바꿀 수도 있을 것 같아서 임시로 이렇게 함
module.exports = {
    startSocketServer: startSocketServer,
    sendSocketData: writeSocketDataAsync,
    onSocketDataListener: onSocketDataListener
};
