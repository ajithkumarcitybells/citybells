import { useEffect, useRef, useCallback, useState } from 'react';

type TaxiSocketOptions = {
  url?: string;
  token?: string;
};

export function useTaxiSocket(opts?: TaxiSocketOptions) {
  const socketRef = useRef<any>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const mod = await import('socket.io-client');
        const io = (mod as any).default || (mod as any);
        const tokenFromStorage = typeof window !== 'undefined' ? window.localStorage.getItem('driverToken') : null;
        const token = opts?.token || tokenFromStorage || undefined;
        const sock = io(opts?.url || '/', { transports: ['websocket', 'polling'], auth: token ? { token } : undefined });
        socketRef.current = sock;
        const onConnect = () => { if (!mounted) return; setConnected(true); };
        const onDisconnect = () => { if (!mounted) return; setConnected(false); };
        sock.on('connect', onConnect);
        sock.on('disconnect', onDisconnect);
      } catch (e) {
        // best effort
        // console.error('useTaxiSocket init failed', e);
      }
    })();

    return () => {
      mounted = false;
      try {
        const s = socketRef.current;
        if (s) {
          s.disconnect();
          socketRef.current = null;
        }
      } catch (e) {
        // ignore
      }
    };
  }, [opts?.url, opts?.token]);

  const emit = useCallback((event: string, payload?: any) => {
    const s = socketRef.current;
    try {
      if (s && s.connected) s.emit(event, payload);
    } catch (e) {
      // ignore
    }
  }, []);

  const joinRoom = useCallback((room: string) => {
    const s = socketRef.current;
    try { if (s && s.connected) s.emit('join', room); } catch (e) {}
  }, []);

  return { socketRef, connected, emit, joinRoom } as const;
}
