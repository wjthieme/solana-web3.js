import WS from 'jest-websocket-mock';
import { Client } from 'mock-socket';

import { createWebSocketConnection, RpcWebSocketConnection } from '../websocket-connection';

describe('RpcWebSocketConnection', () => {
    let abortController: AbortController;
    let connection: RpcWebSocketConnection;
    let ws: WS;
    beforeEach(async () => {
        abortController = new AbortController();
        ws = new WS('wss://fake', {
            jsonProtocol: true,
        });
        connection = await createWebSocketConnection({
            signal: abortController.signal,
            url: 'wss://fake',
        });
        await ws.connected;
    });
    afterEach(() => {
        WS.clean();
    });
    it('vends a message to consumers who have already polled for a result', async () => {
        expect.assertions(2);
        const iteratorA = connection[Symbol.asyncIterator]();
        const iteratorB = connection[Symbol.asyncIterator]();
        const resultPromiseA = iteratorA.next();
        const resultPromiseB = iteratorB.next();
        const expectedMessage = { some: 'message' };
        ws.send(expectedMessage);
        await expect(resultPromiseA).resolves.toMatchObject({ done: false, value: expectedMessage });
        await expect(resultPromiseB).resolves.toMatchObject({ done: false, value: expectedMessage });
    });
    it('does not queue messsages for a consumer until it has started to poll', async () => {
        expect.assertions(3);
        const iterator = connection[Symbol.asyncIterator]();
        ws.send({ some: 'lost message' });
        const resultPromise = iterator.next();
        ws.send({ some: 'immediately delivered message' });
        await expect(resultPromise).resolves.toMatchObject({
            done: false,
            value: { some: 'immediately delivered message' },
        });
        ws.send({ some: 'queued message 1' });
        ws.send({ some: 'queued message 2' });
        await expect(iterator.next()).resolves.toMatchObject({
            done: false,
            value: { some: 'queued message 1' },
        });
        await expect(iterator.next()).resolves.toMatchObject({
            done: false,
            value: { some: 'queued message 2' },
        });
    });
    it('returns from the iterator when the connection is aborted', async () => {
        expect.assertions(1);
        const iterator = connection[Symbol.asyncIterator]();
        const resultPromise = iterator.next();
        abortController.abort();
        await expect(resultPromise).resolves.toMatchObject({
            done: true,
            value: undefined,
        });
    });
    it('throws from the iterator when the connection encounters an error', async () => {
        expect.assertions(1);
        const iterator = connection[Symbol.asyncIterator]();
        const resultPromise = iterator.next();
        ws.error({
            code: 1006 /* abnormal closure */,
            reason: 'o no',
            wasClean: false,
        });
        await expect(resultPromise).rejects.toThrow();
    });
    it('sends a message to the websocket', async () => {
        expect.assertions(1);
        connection.send({ some: 'message' });
        await expect(ws).toReceiveMessage({ some: 'message' });
    });
    it('fatals when sending a message to a closing connection', async () => {
        expect.assertions(2);
        abortController.abort();
        expect(ws.server.clients()[0]).toHaveProperty('readyState', WebSocket.CLOSING);
        await expect(connection.send({ some: 'message' })).rejects.toThrow();
    });
    it('fatals when sending a message to a closed connection', async () => {
        expect.assertions(1);
        abortController.abort();
        await ws.closed;
        await expect(connection.send({ some: 'message' })).rejects.toThrow();
    });
    describe('given the buffer has data in it', () => {
        let client: Client;
        let oldBufferedAmount: number;
        beforeEach(async () => {
            client = await ws.connected;
            oldBufferedAmount = client.bufferedAmount;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (client as any).bufferedAmount = 1;
        });
        afterEach(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (client as any).bufferedAmount = oldBufferedAmount;
        });
        it('queues messages until the buffer becomes empty', async () => {
            expect.assertions(1);
            connection.send({ some: 'message' });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (client as any).bufferedAmount = 0;
            await expect(ws).toReceiveMessage({ some: 'message' });
        });
        it('protects against modification of the message while queued', async () => {
            expect.assertions(1);
            const message = { some: 'message' };
            connection.send(message);
            message.some = 'modified message';
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (client as any).bufferedAmount = 0;
            await expect(ws).toReceiveMessage({ some: 'message' });
        });
        it('fatals when the connection is closed while a message is queued', async () => {
            expect.assertions(1);
            const sendPromise = connection.send({ some: 'message' });
            abortController.abort();
            await expect(sendPromise).rejects.toThrow();
        });
        it('fatals when the connection encounters an error while a message is queued', async () => {
            expect.assertions(1);
            const sendPromise = connection.send({ some: 'message' });
            ws.error({
                code: 1006 /* abnormal closure */,
                reason: 'o no',
                wasClean: false,
            });
            await expect(sendPromise).rejects.toThrow();
        });
    });
});
