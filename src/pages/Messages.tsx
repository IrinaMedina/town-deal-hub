import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, MessageCircle, ArrowLeft } from 'lucide-react';

interface Conversation {
  conversation_id: string;
  business_id: string;
  business_name: string;
  other_user_id: string;
  last_message: string;
  last_at: string;
  unread: number;
}

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read: boolean;
}

export default function Messages() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const businessIdParam = searchParams.get('business');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [activeBizName, setActiveBizName] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  // Auto-start conversation with a business from URL param
  useEffect(() => {
    if (businessIdParam && user) {
      startConversation(businessIdParam);
    }
  }, [businessIdParam, user]);

  const fetchConversations = async () => {
    if (!user) return;
    setLoading(true);

    // Get all messages where user is participant, group by conversation
    const { data } = await supabase
      .from('messages')
      .select('conversation_id, business_id, sender_id, receiver_id, content, created_at, read')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (!data || data.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    // Group by conversation
    const convMap = new Map<string, any>();
    const bizIds = new Set<string>();
    for (const msg of data) {
      bizIds.add(msg.business_id);
      if (!convMap.has(msg.conversation_id)) {
        convMap.set(msg.conversation_id, {
          conversation_id: msg.conversation_id,
          business_id: msg.business_id,
          other_user_id: msg.sender_id === user.id ? msg.receiver_id : msg.sender_id,
          last_message: msg.content,
          last_at: msg.created_at,
          unread: 0,
        });
      }
      if (!msg.read && msg.receiver_id === user.id) {
        const conv = convMap.get(msg.conversation_id);
        conv.unread++;
      }
    }

    // Fetch business names
    const { data: bizData } = await supabase
      .from('businesses')
      .select('id, name')
      .in('id', Array.from(bizIds));

    const bizNameMap = new Map((bizData || []).map(b => [b.id, b.name]));

    const convList: Conversation[] = Array.from(convMap.values()).map(c => ({
      ...c,
      business_name: bizNameMap.get(c.business_id) || 'Empresa',
    }));

    setConversations(convList);
    setLoading(false);
  };

  const startConversation = async (businessId: string) => {
    if (!user) return;

    // Get business info
    const { data: biz } = await supabase
      .from('businesses')
      .select('id, name, created_by')
      .eq('id', businessId)
      .single();

    if (!biz) return;

    // Conversation ID is deterministic: sorted user IDs + business ID
    const ids = [user.id, biz.created_by].sort();
    const convId = `${ids[0]}_${ids[1]}_${biz.id}`;

    setActiveConversation(convId);
    setActiveBizName(biz.name);

    // Load existing messages
    await loadMessages(convId);

    // Store business owner id for sending
    (window as any).__activeReceiver = biz.created_by;
    (window as any).__activeBizId = biz.id;
  };

  const loadMessages = async (convId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    setMessages((data || []) as Message[]);

    // Mark as read
    if (user) {
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', convId)
        .eq('receiver_id', user.id)
        .eq('read', false);
    }

    setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const openConversation = (conv: Conversation) => {
    setActiveConversation(conv.conversation_id);
    setActiveBizName(conv.business_name);
    (window as any).__activeReceiver = conv.other_user_id;
    (window as any).__activeBizId = conv.business_id;
    loadMessages(conv.conversation_id);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !activeConversation) return;
    setSending(true);

    const receiverId = (window as any).__activeReceiver;
    const bizId = (window as any).__activeBizId;

    const { error } = await supabase.from('messages').insert({
      conversation_id: activeConversation,
      sender_id: user.id,
      receiver_id: receiverId,
      business_id: bizId,
      content: newMessage.trim(),
    });

    if (!error) {
      setNewMessage('');
      await loadMessages(activeConversation);
    }
    setSending(false);
  };

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('user-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        const msg = payload.new as any;
        if (msg.receiver_id === user.id || msg.sender_id === user.id) {
          if (activeConversation && msg.conversation_id === activeConversation) {
            loadMessages(activeConversation);
          } else {
            fetchConversations();
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, activeConversation]);

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-6 max-w-3xl">
        <Card className="min-h-[70vh] flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              {activeConversation ? (
                <>
                  <Button variant="ghost" size="icon" onClick={() => { setActiveConversation(null); fetchConversations(); }}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  {activeBizName}
                </>
              ) : (
                <>
                  <MessageCircle className="h-5 w-5 text-primary" />
                  Mensajes
                </>
              )}
            </CardTitle>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col">
            {!activeConversation ? (
              // Conversation list
              loading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No tienes mensajes aún</p>
                  <p className="text-sm mt-1">Contacta con una empresa desde el directorio</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {conversations.map(conv => (
                    <div
                      key={conv.conversation_id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => openConversation(conv)}
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <MessageCircle className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <span className="font-medium truncate">{conv.business_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(conv.last_at).toLocaleDateString('es-ES')}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{conv.last_message}</p>
                      </div>
                      {conv.unread > 0 && (
                        <span className="bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {conv.unread}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : (
              // Chat view
              <>
                <ScrollArea className="flex-1 mb-4 pr-2" style={{ maxHeight: '50vh' }}>
                  <div className="space-y-3">
                    {messages.map(msg => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                          msg.sender_id === user?.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}>
                          <p>{msg.content}</p>
                          <p className={`text-[10px] mt-1 ${
                            msg.sender_id === user?.id ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          }`}>
                            {new Date(msg.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={scrollRef} />
                  </div>
                </ScrollArea>

                <div className="flex gap-2">
                  <Input
                    placeholder="Escribe un mensaje..."
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  />
                  <Button onClick={sendMessage} disabled={sending || !newMessage.trim()}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
