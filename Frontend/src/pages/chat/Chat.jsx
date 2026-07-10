import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { chatApi } from '../../api/index';
import { useAuthStore } from '../../store/authStore';
import { useSocket } from '../../hooks/useSocket';
import { PageLoader } from '../../components/ui/Spinner';
import { isClient, isStoreUser } from '../../utils/constants';
import { Send, MessageSquare, ChevronLeft, Flag } from 'lucide-react';
import toast from 'react-hot-toast';
import { ReportarModal } from '../../components/ui/ReportarModal';

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' });
}
function formatDate(ts) {
  return new Date(ts).toLocaleDateString('es-HN', { day: 'numeric', month: 'short' });
}

function iniciales(nombre = '', apellido = '') {
  const a = (nombre || '').trim()[0] || '';
  const b = (apellido || '').trim()[0] || '';
  return (a + b).toUpperCase() || '?';
}

const AVATAR_COLORS = [
  'bg-orange-500', 'bg-blue-500', 'bg-emerald-500', 'bg-purple-500',
  'bg-pink-500', 'bg-cyan-500', 'bg-amber-500', 'bg-indigo-500',
];
function colorFor(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function Avatar({ nombre, apellido, size = 'md' }) {
  const dim = size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-11 h-11 text-base' : 'w-9 h-9 text-sm';
  const label = `${nombre || ''} ${apellido || ''}`.trim();
  return (
    <div className={`${dim} ${colorFor(label)} rounded-full flex items-center justify-center text-white font-semibold shrink-0`}>
      {iniciales(nombre, apellido)}
    </div>
  );
}

export default function Chat() {
  const user        = useAuthStore(s => s.user);
  const soyCliente  = isClient(user?.tipo);
  const socket      = useSocket();
  const qc          = useQueryClient();
  const [params]    = useSearchParams();
  const [activeId, setActiveId]     = useState(params.get('conversacion') ? Number(params.get('conversacion')) : null);
  const [messages,  setMessages]    = useState([]);
  const [input,     setInput]       = useState('');
  const [typing,    setTyping]      = useState(false);
  const [peerTyping,setPeerTyping]  = useState(false);
  const [sending,   setSending]     = useState(false);
  const [mobileView,setMobileView]  = useState('list'); // 'list' | 'messages'
  const [reportando,setReportando]  = useState(false);
  const bottomRef   = useRef(null);
  const typingTimer = useRef(null);

  const convKey = soyCliente ? 'mis-conversaciones' : 'conv-tienda';
  const fetchConvs = soyCliente
    ? () => chatApi.misConversaciones().then(r => r.data.data)
    : () => chatApi.convsTienda().then(r => r.data.data);

  const { data: conversaciones = [], isLoading } = useQuery({
    queryKey: [convKey],
    queryFn: fetchConvs,
    refetchInterval: 30_000,
  });

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    chatApi.mensajes(activeId, { limit: 60 })
      .then(r => setMessages(r.data.data.reverse()))
      .catch(() => {});
  }, [activeId]);

  // Socket events
  useEffect(() => {
    if (!socket || !activeId) return;
    socket.emit('join:conversation', { conversacionId: activeId });

    const onMsg = (msg) => {
      if (msg.conversacion_id !== activeId) {
        // New message in another conversation — invalidate list + badge
        qc.invalidateQueries([convKey]);
        qc.invalidateQueries(['chat-unread']);
        return;
      }
      setMessages(prev => [...prev, msg]);
      socket.emit('messages:read', { conversacionId: activeId });
    };

    const onTypingStart = ({ userId }) => {
      if (userId !== user.id) setPeerTyping(true);
    };
    const onTypingStop = ({ userId }) => {
      if (userId !== user.id) setPeerTyping(false);
    };

    socket.on('message:new', onMsg);
    socket.on('typing:started', onTypingStart);
    socket.on('typing:stopped', onTypingStop);

    socket.emit('messages:read', { conversacionId: activeId });
    qc.invalidateQueries(['chat-unread']);

    return () => {
      socket.off('message:new', onMsg);
      socket.off('typing:started', onTypingStart);
      socket.off('typing:stopped', onTypingStop);
    };
  }, [socket, activeId, user?.id]);

  // Notificaciones globales (badge del sidebar / lista) aunque no estés en la conversación
  useEffect(() => {
    if (!socket) return;
    const onConvUpdated = () => {
      qc.invalidateQueries([convKey]);
      qc.invalidateQueries(['chat-unread']);
    };
    socket.on('conversation:updated', onConvUpdated);
    socket.on('conversation:read', onConvUpdated);
    return () => {
      socket.off('conversation:updated', onConvUpdated);
      socket.off('conversation:read', onConvUpdated);
    };
  }, [socket, convKey]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleTyping = (e) => {
    setInput(e.target.value);
    if (!socket || !activeId) return;

    if (!typing) {
      setTyping(true);
      socket.emit('typing:start', { conversacionId: activeId });
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      setTyping(false);
      socket.emit('typing:stop', { conversacionId: activeId });
    }, 1500);
  };

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || !activeId || sending) return;

    clearTimeout(typingTimer.current);
    setTyping(false);
    socket?.emit('typing:stop', { conversacionId: activeId });

    setSending(true);
    setInput('');
    try {
      await new Promise((resolve, reject) => {
        socket.emit('message:send', { conversacionId: activeId, contenido: text }, (ack) => {
          if (ack?.error) reject(new Error(ack.error));
          else resolve(ack);
        });
      });
      qc.invalidateQueries([convKey]);
      qc.invalidateQueries(['chat-unread']);
    } catch {
      toast.error('No se pudo enviar el mensaje');
      setInput(text);
    } finally {
      setSending(false);
    }
  }, [input, activeId, socket, sending]);

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const selectConv = (conv) => {
    setActiveId(conv.id);
    setMobileView('messages');
  };

  const activeConv = conversaciones.find(c => c.id === activeId);

  if (isLoading) return <PageLoader />;

  return (
    <div className="flex h-[calc(100vh-130px)] border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">

      {/* Sidebar: lista de conversaciones */}
      <div className={`w-full md:w-80 border-r flex flex-col shrink-0 ${mobileView === 'messages' ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">Mensajes</h2>
          <p className="text-xs text-gray-400 mt-0.5">{conversaciones.length} conversacion{conversaciones.length !== 1 ? 'es' : ''}</p>
        </div>

        {conversaciones.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400 p-8 text-center">
            <MessageSquare className="w-12 h-12 text-gray-200" />
            <p className="text-sm">No tienes conversaciones aún</p>
            {soyCliente && (
              <p className="text-xs text-gray-300">Selecciona una oferta y haz clic en "Iniciar chat"</p>
            )}
          </div>
        ) : (
          <ul className="flex-1 overflow-y-auto divide-y">
            {conversaciones.map(conv => {
              const isActive = conv.id === activeId;
              const otherName = soyCliente
                ? conv.tienda_nombre
                : `${conv.cliente_nombre} ${conv.cliente_apellido ?? ''}`.trim();
              const repuesto = conv.nombre_repuesto;
              const sinLeer = soyCliente
                ? conv.mensajes_sin_leer_cliente
                : conv.mensajes_sin_leer_tienda;
              const [nom, ape] = otherName.split(' ');

              return (
                <li key={conv.id}>
                  <button onClick={() => selectConv(conv)}
                    className={`w-full text-left px-4 py-3.5 hover:bg-orange-50 transition-colors flex gap-3 items-start ${isActive ? 'bg-orange-50 border-r-2 border-orange-500' : ''}`}>
                    <Avatar nombre={nom} apellido={ape} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-semibold truncate ${isActive ? 'text-orange-600' : 'text-gray-800'}`}>
                          {otherName}
                        </p>
                        {conv.ultimo_mensaje_en && (
                          <span className="text-xs text-gray-400 shrink-0">{formatDate(conv.ultimo_mensaje_en)}</span>
                        )}
                      </div>
                      {repuesto && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">{repuesto}</p>
                      )}
                      <div className="flex items-center justify-between gap-2 mt-1">
                        {conv.ultimo_mensaje && (
                          <p className={`text-xs truncate ${sinLeer > 0 ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
                            {conv.ultimo_mensaje}
                          </p>
                        )}
                        {sinLeer > 0 && !isActive && (
                          <span className="shrink-0 min-w-[18px] h-[18px] px-1 bg-orange-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center">
                            {sinLeer > 9 ? '9+' : sinLeer}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Panel de mensajes */}
      <div className={`flex-1 flex flex-col min-w-0 ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}>
        {!activeId ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-300">
            <MessageSquare className="w-16 h-16" />
            <p className="text-sm">Selecciona una conversación</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-4 py-3 border-b flex items-center gap-3">
              <button onClick={() => setMobileView('list')} className="md:hidden p-1.5 hover:bg-gray-100 rounded-lg">
                <ChevronLeft className="w-5 h-5 text-gray-500" />
              </button>
              {activeConv && (() => {
                const headerName = soyCliente
                  ? activeConv.tienda_nombre
                  : `${activeConv.cliente_nombre ?? ''} ${activeConv.cliente_apellido ?? ''}`.trim();
                const [hn, ha] = (headerName || '').split(' ');
                return <Avatar nombre={hn} apellido={ha} size="lg" />;
              })()}
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">
                  {soyCliente
                    ? activeConv?.tienda_nombre
                    : `${activeConv?.cliente_nombre ?? ''} ${activeConv?.cliente_apellido ?? ''}`.trim()
                  }
                </p>
                {peerTyping ? (
                  <p className="text-xs text-orange-400 italic">Escribiendo...</p>
                ) : activeConv?.nombre_repuesto && (
                  <p className="text-xs text-gray-400 truncate">{activeConv.nombre_repuesto}</p>
                )}
              </div>
              {soyCliente && activeConv?.tenant_id && (
                <button onClick={() => setReportando(true)} title="Reportar tienda"
                  className="ml-auto p-1.5 text-gray-300 hover:text-red-500 rounded-lg transition-colors">
                  <Flag className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => {
                const isMine = msg.emisor_id === user.id;
                const prev = messages[i - 1];
                const showDate = i === 0 || formatDate(prev.creado_en) !== formatDate(msg.creado_en);
                const showName = !isMine && (i === 0 || prev.emisor_id !== msg.emisor_id || showDate);
                const emisorNombre = `${msg.emisor_nombre ?? ''} ${msg.emisor_apellido ?? ''}`.trim();
                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="flex items-center gap-3 my-2">
                        <div className="flex-1 h-px bg-gray-100" />
                        <span className="text-xs text-gray-400">{formatDate(msg.creado_en)}</span>
                        <div className="flex-1 h-px bg-gray-100" />
                      </div>
                    )}
                    <div className={`flex gap-2 items-end ${isMine ? 'justify-end' : 'justify-start'}`}>
                      {!isMine && (
                        <div className="w-7 shrink-0">
                          {showName && <Avatar nombre={msg.emisor_nombre} apellido={msg.emisor_apellido} size="sm" />}
                        </div>
                      )}
                      <div className="max-w-[75%]">
                        {showName && emisorNombre && (
                          <p className="text-xs text-gray-500 font-medium mb-0.5 ml-1">{emisorNombre}</p>
                        )}
                        <div className={`px-3.5 py-2 rounded-2xl text-sm ${
                          isMine
                            ? 'bg-orange-500 text-white rounded-br-sm'
                            : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                        }`}>
                          {msg.contenido}
                        </div>
                        <p className={`text-xs text-gray-400 mt-1 ${isMine ? 'text-right' : 'ml-1'}`}>
                          {formatTime(msg.creado_en)}
                          {isMine && (msg.leido || msg.leido_en) && <span className="ml-1 text-orange-300">✓✓</span>}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {peerTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-2.5">
                    <span className="flex gap-1 items-center h-4">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                    </span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t flex items-end gap-2">
              <textarea
                value={input}
                onChange={handleTyping}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder="Escribe un mensaje... (Enter para enviar)"
                className="flex-1 resize-none input-field py-2.5 text-sm max-h-28"
                style={{ lineHeight: '1.5' }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                className="p-2.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </>
        )}
      </div>

      {reportando && activeConv?.tenant_id && (
        <ReportarModal tenantId={activeConv.tenant_id} tenantNombre={activeConv.tienda_nombre}
          onClose={() => setReportando(false)} />
      )}
    </div>
  );
}
