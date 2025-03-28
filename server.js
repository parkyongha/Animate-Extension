const net = require('net');
const EventEmitter = require('events');

class SocketServer extends EventEmitter {

    

    constructor(port = 50313) {
        super();
        this.port = port;

        /** @type {net.Server} */
        this.server = null;

        /** @type {net.Socket | null} */
        this.clientSocket = null;

        this.buffer = '';

        this.responsePrefix = "response:";
        this.doneMsg = "DONE";
    }

    start() {
        this.server = net.createServer((socket) => {
            socket.setEncoding('utf-8');
            this.clientSocket = socket;
            console.log('클라이언트 연결됨.');

            socket.on('data', (data) => this._handleData(data));
            socket.on('end', () => console.log('클라이언트 연결 종료됨.'));
            socket.on('error', (err) => console.error('소켓 오류:', err));

            // 테스트용
            this.send("Test:HI,HELLO,PAPPP");
        });

        this.server.listen(this.port, () => {
            console.log(`서버가 포트 ${this.port}에서 대기 중입니다.`);
        });
    }

    _handleData(data) {
        this.buffer += data.toString();
        let newlineIndex;
        while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
            const msg = this.buffer.slice(0, newlineIndex);
            this.buffer = this.buffer.slice(newlineIndex + 1);

            console.log('수신:', msg);

            this.emit('message', msg);

            if (msg.startsWith(this.responsePrefix)) {
                this.emit('response', msg.slice(this.responsePrefix.length));
            }

            if (msg.toUpperCase() == this.doneMsg) {
                console.log("-server.js DONE");
                this.emit('done');
            }
        }
    }

    /**
     * 데이터 전송
     * @param {string} data 
     * @returns {Promise<void>}
     */
    send(data) {
        console.log("-server.js send data:", data);
        data += '\n';

        return new Promise((resolve, reject) => {
            if (this.clientSocket) {
                this.clientSocket.write(data, 'utf-8', (err) => {
                    err ? reject(err) : resolve();
                });
            } else {
                reject(new Error('No client connected.'));
            }
        });
    }

    /**
     * "DONE" 메시지 수신 시 실행될 콜백 등록
     * @param {() => void} callback 
     */
    onDone(callback) {
        this.on('done', callback);
    }

    /**
     * 일반 메시지 수신 콜백
     * @param {(msg: string) => void} callback 
     */
    onMessage(callback) {
        this.on('message', callback);
    }

    /**
     * 요청에 대한 응답 메시지를 받을 때 콜백을 등록합니다.
     * @param {(msg: string) => void} callback 
     */
    onResponse(callback) {
        this.once('response', callback);
    }
}

const server = new SocketServer();

module.exports = server;