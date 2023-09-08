type RpcTransportConfig = Readonly<{
    payload: unknown;
    signal?: AbortSignal;
}>;

export interface IRpcTransport {
    <TResponse>(config: RpcTransportConfig): Promise<TResponse>;
}

type RpcWebSocketTransportConfig = Readonly<{
    payload: unknown;
    signal: AbortSignal;
}>;

export interface IRpcWebSocketTransport {
    (config: RpcWebSocketTransportConfig): Promise<AsyncIterable<unknown>>;
}
