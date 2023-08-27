type Config = Readonly<{
    signal: AbortSignal;
    url: string;
}>;
type IteratorKey = symbol;
type IteratorState =
    | {
          __hasPolled: true;
          onMessage: Parameters<ConstructorParameters<typeof Promise>[0]>[0];
          onError: Parameters<ConstructorParameters<typeof Promise>[0]>[1];
      }
    | {
          __hasPolled: false;
          queuedMessages: unknown[];
      };
export type RpcWebSocketConnection = Readonly<{
    send(payload: unknown): Promise<void>;
    [Symbol.asyncIterator](): AsyncGenerator<unknown>;
}>;

export async function createWebSocketConnection({ signal, url }: Config): Promise<RpcWebSocketConnection> {
    return new Promise((resolve, reject) => {
        signal.addEventListener('abort', handleAbort, { once: true });
        const iteratorState: Map<IteratorKey, IteratorState> = new Map();
        function handleAbort() {
            if (webSocket.readyState !== WebSocket.CLOSED && webSocket.readyState !== WebSocket.CLOSING) {
                webSocket.close(1000);
            }
        }
        function handleClose(ev: CloseEvent) {
            bufferEmptyWatcher?.onCancel();
            signal.removeEventListener('abort', handleAbort);
            webSocket.removeEventListener('close', handleClose);
            webSocket.removeEventListener('error', handleError);
            webSocket.removeEventListener('open', handleOpen);
            webSocket.removeEventListener('message', handleMessage);
            iteratorState.forEach((state, iteratorKey) => {
                if (state.__hasPolled) {
                    const { onError } = state;
                    iteratorState.delete(iteratorKey);
                    onError(ev);
                } else {
                    iteratorState.delete(iteratorKey);
                }
            });
        }
        function handleError(ev: Event) {
            if (!hasConnected) {
                reject(new Error('TODO', { cause: ev }));
            }
        }
        let hasConnected = false;
        let bufferEmptyWatcher: Readonly<{ onCancel(): void; promise: Promise<void> }> | undefined;
        function handleOpen() {
            hasConnected = true;
            resolve({
                async send(payload: unknown) {
                    const message = JSON.stringify(payload);
                    if (
                        !bufferEmptyWatcher &&
                        webSocket.readyState === WebSocket.OPEN &&
                        webSocket.bufferedAmount > 0
                    ) {
                        let onCancel: () => void;
                        const promise = new Promise<void>((resolve, reject) => {
                            const intervalId = setInterval(() => {
                                if (webSocket.readyState !== WebSocket.OPEN || !(webSocket.bufferedAmount > 0)) {
                                    clearInterval(intervalId);
                                    bufferEmptyWatcher = undefined;
                                    resolve();
                                }
                            }, 20);
                            onCancel = () => {
                                bufferEmptyWatcher = undefined;
                                clearInterval(intervalId);
                                reject(new Error('TODO'));
                            };
                        });
                        bufferEmptyWatcher = {
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            // @ts-ignore
                            onCancel,
                            promise,
                        };
                    }
                    if (bufferEmptyWatcher) {
                        await bufferEmptyWatcher.promise;
                    }
                    webSocket.send(message);
                },
                async *[Symbol.asyncIterator]() {
                    const iteratorKey = Symbol(__DEV__ ? Date.now() : undefined);
                    iteratorState.set(iteratorKey, { __hasPolled: false, queuedMessages: [] });
                    try {
                        while (true) {
                            const state = iteratorState.get(iteratorKey);
                            if (!state) {
                                // There should always be state by now.
                                throw new Error('TODO');
                            }
                            if (state.__hasPolled) {
                                // You should never be able to poll twice in a row.
                                throw new Error('TODO');
                            }
                            const queuedMessages = state.queuedMessages;
                            if (queuedMessages.length) {
                                state.queuedMessages = [];
                                yield* queuedMessages;
                            } else {
                                try {
                                    yield await new Promise((onMessage, onError) => {
                                        iteratorState.set(iteratorKey, {
                                            __hasPolled: true,
                                            onError,
                                            onMessage,
                                        });
                                    });
                                } catch (e) {
                                    if (
                                        e !== null &&
                                        typeof e === 'object' &&
                                        'type' in e &&
                                        e.type === 'close' &&
                                        'wasClean' in e &&
                                        e.wasClean
                                    ) {
                                        return;
                                    } else {
                                        // TODO
                                        throw new Error('WebSocket connection closed', { cause: e });
                                    }
                                }
                            }
                        }
                    } finally {
                        iteratorState.delete(iteratorKey);
                    }
                },
            });
        }
        function handleMessage({ data }: MessageEvent) {
            const message = JSON.parse(data);
            iteratorState.forEach((state, iteratorKey) => {
                if (state.__hasPolled) {
                    const { onMessage } = state;
                    iteratorState.set(iteratorKey, { __hasPolled: false, queuedMessages: [] });
                    onMessage(message);
                } else {
                    state.queuedMessages.push(message);
                }
            });
        }
        const webSocket = new WebSocket(url);
        webSocket.addEventListener('close', handleClose);
        webSocket.addEventListener('error', handleError);
        webSocket.addEventListener('open', handleOpen);
        webSocket.addEventListener('message', handleMessage);
    });
}
