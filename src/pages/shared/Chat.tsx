import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { useAuth, AppUser } from '../../contexts/AuthContext';
import { Send, UserCircle, Paperclip, Image as ImageIcon, X, Loader2, Search, Megaphone } from 'lucide-react';

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  attachmentUrl?: string;
  attachmentType?: 'image' | 'video';
}

export function Chat() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<AppUser[]>([]);
  const [contactSearchTerm, setContactSearchTerm] = useState('');
  
  const [selectedContact, setSelectedContact] = useState<AppUser | null>(null);
  
  // Broadcast mode state
  const [isBroadcastMode, setIsBroadcastMode] = useState(false);
  const [selectedBroadcastContacts, setSelectedBroadcastContacts] = useState<string[]>([]);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;

    const fetchContacts = async () => {
      try {
        if (user.role === 'admin') {
          // Admin sees everyone
          const q = query(collection(db, 'users'));
          const snapshot = await getDocs(q);
          const contactsData = snapshot.docs
            .map(doc => doc.data() as AppUser)
            .filter(u => u.uid !== user.uid);
          setContacts(contactsData);
        } else {
          // Students and Teachers only see users in their chatContacts
          if (!user.chatContacts || user.chatContacts.length === 0) {
            setContacts([]);
            return;
          }
          
          // Fetch users whose UID is in chatContacts
          // Firestore 'in' query supports up to 10 items. For a real app, we might need to chunk this.
          const chunks = [];
          for (let i = 0; i < user.chatContacts.length; i += 10) {
            chunks.push(user.chatContacts.slice(i, i + 10));
          }
          
          let allContacts: AppUser[] = [];
          for (const chunk of chunks) {
            const q = query(collection(db, 'users'), where('uid', 'in', chunk));
            const snapshot = await getDocs(q);
            const chunkContacts = snapshot.docs.map(doc => doc.data() as AppUser);
            allContacts = [...allContacts, ...chunkContacts];
          }
          setContacts(allContacts);
        }
      } catch (error) {
        console.error("Error fetching contacts:", error);
      }
    };

    fetchContacts();
  }, [user, user?.chatContacts]);

  useEffect(() => {
    if (!user || !selectedContact) return;

    // 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString();

    // Listen for messages between current user and selected contact from the last 7 days
    const q1 = query(
      collection(db, 'messages'),
      where('senderId', '==', user.uid),
      where('receiverId', '==', selectedContact.uid),
      where('timestamp', '>=', sevenDaysAgoStr)
    );
    
    const q2 = query(
      collection(db, 'messages'),
      where('senderId', '==', selectedContact.uid),
      where('receiverId', '==', user.uid),
      where('timestamp', '>=', sevenDaysAgoStr)
    );

    const unsubscribe1 = onSnapshot(q1, (snapshot) => {
      const msgs1 = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      updateMessages(msgs1, 'sent');
    });

    const unsubscribe2 = onSnapshot(q2, (snapshot) => {
      const msgs2 = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      updateMessages(msgs2, 'received');
    });

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [user, selectedContact]);

  const [sentMsgs, setSentMsgs] = useState<Message[]>([]);
  const [receivedMsgs, setReceivedMsgs] = useState<Message[]>([]);

  // Listen for ALL messages directed to the current user (for unread indicators & sound notification)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const initialLoadRef = useRef(true);
  
  useEffect(() => {
    if (!user) return;
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const qAllReceived = query(
      collection(db, 'messages'),
      where('receiverId', '==', user.uid),
      where('timestamp', '>=', sevenDaysAgo.toISOString())
    );

    const unsubscribe = onSnapshot(qAllReceived, (snapshot) => {
      // Logic to track changes without mutating state deeply
      if (initialLoadRef.current) {
        initialLoadRef.current = false;
        return;
      }
      
      const changes = snapshot.docChanges();
      const hasNewIncoming = changes.some(change => change.type === 'added');
      
      if (hasNewIncoming) {
        // Play subtle bloop
        try {
          // Play a muted, unobtrusive short tone sound 
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
          oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1); // Quick sweep up
          
          gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime); // very quiet
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2); // fade out fast
          
          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.2);
        } catch (e) {
          // Keep it quiet enough to avoid disturbing the runtime error limits if AudioContext is blocked
        }
        
        // Calculate newly pending messages from contacts based on current selection
        // In a real robust system, each message would need a "read" boolean, 
        // but since we derive everything from timestamps and selections in this session:
        const unreadByContact: Record<string, number> = {};
        changes.forEach(change => {
            if (change.type === 'added') {
               const msg = change.doc.data() as Message;
               if (selectedContact?.uid !== msg.senderId) {
                 unreadByContact[msg.senderId] = (unreadByContact[msg.senderId] || 0) + 1;
               }
            }
        });
        
        if (Object.keys(unreadByContact).length > 0) {
            setUnreadCounts(prev => {
                const updated = { ...prev };
                for (const [senderId, count] of Object.entries(unreadByContact)) {
                    updated[senderId] = (updated[senderId] || 0) + count;
                }
                return updated;
            })
        }
      }
    });

    return () => unsubscribe();
  }, [user, selectedContact?.uid]);

  // Reset unread count when contact is selected
  useEffect(() => {
    if (selectedContact) {
      setUnreadCounts(prev => {
        if (prev[selectedContact.uid]) {
          const updated = { ...prev };
          delete updated[selectedContact.uid];
          return updated;
        }
        return prev;
      });
    }
  }, [selectedContact]);

  const updateMessages = (newMsgs: Message[], type: 'sent' | 'received') => {
    if (type === 'sent') setSentMsgs(newMsgs);
    if (type === 'received') setReceivedMsgs(newMsgs);
  };

  useEffect(() => {
    const allMsgs = [...sentMsgs, ...receivedMsgs].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    setMessages(allMsgs);
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sentMsgs, receivedMsgs]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Check if it's image or video
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        setAttachment(file);
      } else {
        alert('Apenas fotos e vídeos são permitidos.');
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const targets = isBroadcastMode ? selectedBroadcastContacts : (selectedContact ? [selectedContact.uid] : []);
    
    if ((!newMessage.trim() && !attachment) || !user || targets.length === 0 || uploading) return;

    setUploading(true);
    try {
      let attachmentUrl = '';
      let attachmentType: 'image' | 'video' | undefined = undefined;

      if (attachment) {
        const fileExt = attachment.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const storageRef = ref(storage, `chat_attachments/${fileName}`);
        
        await uploadBytes(storageRef, attachment);
        attachmentUrl = await getDownloadURL(storageRef);
        attachmentType = attachment.type.startsWith('image/') ? 'image' : 'video';
      }

      // Send a separate message to each selected contact or broadcast list
      const promises = targets.map(targetUid => {
        const msgData: Omit<Message, 'id'> = {
          senderId: user.uid,
          receiverId: targetUid,
          content: newMessage.trim(),
          timestamp: new Date().toISOString(),
        };

        if (attachmentUrl) {
          msgData.attachmentUrl = attachmentUrl;
          msgData.attachmentType = attachmentType;
        }

        return addDoc(collection(db, 'messages'), msgData);
      });
      
      await Promise.all(promises);
      
      setNewMessage('');
      setAttachment(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (isBroadcastMode) {
        setIsBroadcastMode(false);
        setSelectedBroadcastContacts([]);
        alert("Mensagem de transmissão enviada com sucesso!");
      }
    } catch (error: any) {
      console.error("Error sending message:", error);
      if (error.code === 'storage/unauthorized') {
        alert('Erro de permissão: O Firebase Storage não está configurado para permitir uploads. Contate o administrador.');
      } else {
        alert('Erro ao enviar mensagem. Verifique sua conexão.');
      }
    } finally {
      setUploading(false);
    }
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(contactSearchTerm.toLowerCase()) ||
    contact.email.toLowerCase().includes(contactSearchTerm.toLowerCase())
  );

  const toggleBroadcastContact = (uid: string) => {
    setSelectedBroadcastContacts(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-surface border border-border-color rounded-2xl overflow-hidden text-text-main">
      {/* Contacts List */}
      <div className="w-1/3 border-r border-border-color flex flex-col">
        <div className="p-4 border-b border-border-color space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-lg">Mensagens</h2>
              <p className="text-xs text-text-dim">
                {user?.role === 'admin' ? 'Todos os usuários' : 'Seus contatos'}
              </p>
            </div>
            {user?.role === 'admin' && (
              <button
                onClick={() => {
                  setIsBroadcastMode(!isBroadcastMode);
                  setSelectedBroadcastContacts([]);
                  setSelectedContact(null);
                }}
                className={`p-2 rounded-lg transition-colors ${isBroadcastMode ? 'bg-accent text-background' : 'bg-surface-bright text-text-dim hover:text-text-main hover:bg-border-color'}`}
                title="Lista de Transmissão"
              >
                <Megaphone className="w-5 h-5" />
              </button>
            )}
          </div>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-text-dim" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-border-color rounded-xl bg-surface-bright text-sm placeholder-text-dim focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="Buscar contatos..."
              value={contactSearchTerm}
              onChange={(e) => setContactSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredContacts.map(contact => (
            <div 
              key={contact.uid}
              onClick={() => {
                if (isBroadcastMode) {
                  toggleBroadcastContact(contact.uid);
                } else {
                  setSelectedContact(contact);
                }
              }}
              className={`p-4 border-b border-border-color flex items-center cursor-pointer transition-colors ${
                (!isBroadcastMode && selectedContact?.uid === contact.uid) || (isBroadcastMode && selectedBroadcastContacts.includes(contact.uid)) ? 'bg-surface-bright border-l-4 border-l-accent' : 'hover:bg-surface-bright border-l-4 border-l-transparent'
              }`}
            >
              {isBroadcastMode && (
                <div className={`w-5 h-5 rounded border mr-3 flex items-center justify-center ${selectedBroadcastContacts.includes(contact.uid) ? 'bg-accent border-accent text-background' : 'border-border-color'}`}>
                  {selectedBroadcastContacts.includes(contact.uid) && <span className="text-xs">✓</span>}
                </div>
              )}
              <div className="w-10 h-10 rounded-full bg-border-color flex items-center justify-center mr-3">
                <UserCircle className="w-6 h-6 text-text-dim" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{contact.name}</div>
                <div className="text-xs text-text-dim capitalize">{contact.role}</div>
              </div>
              {!isBroadcastMode && unreadCounts[contact.uid] > 0 && (
                <div className="w-5 h-5 rounded-full bg-accent text-background flex items-center justify-center text-[10px] font-bold ml-2">
                  {unreadCounts[contact.uid]}
                </div>
              )}
            </div>
          ))}
          {filteredContacts.length === 0 && (
            <div className="p-4 text-center text-text-dim text-sm">Nenhum contato encontrado.</div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col relative">
        {(selectedContact && !isBroadcastMode) || (isBroadcastMode) ? (
          <>
            <div className="p-4 border-b border-border-color bg-surface-bright flex items-center">
              {isBroadcastMode ? (
                <>
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center mr-3">
                    <Megaphone className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <div className="font-semibold">Nova Lista de Transmissão</div>
                    <div className="text-xs text-text-dim">{selectedBroadcastContacts.length} contatos selecionados</div>
                  </div>
                </>
              ) : selectedContact && (
                <>
                  <div className="w-10 h-10 rounded-full bg-border-color flex items-center justify-center mr-3">
                    <UserCircle className="w-6 h-6 text-text-dim" />
                  </div>
                  <div>
                    <div className="font-semibold">{selectedContact.name}</div>
                    <div className="text-xs text-text-dim">As mensagens são apagadas após 7 dias.</div>
                  </div>
                </>
              )}
            </div>
            
            {isBroadcastMode ? (
              <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center text-center text-text-dim">
                <Megaphone className="w-16 h-16 mb-4 text-border-color" />
                <h3 className="text-lg font-medium text-text-main mb-2">Modo Lista de Transmissão</h3>
                <p className="max-w-md">
                  A mensagem que você digitar abaixo será enviada individualmente para todos os <strong>{selectedBroadcastContacts.length}</strong> contatos selecionados.
                </p>
                {selectedBroadcastContacts.length === 0 && (
                  <p className="mt-4 text-warning text-sm">Selecione pelo menos um contato na lista à esquerda.</p>
                )}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(msg => {
                const isMine = msg.senderId === user?.uid;
                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                      isMine ? 'bg-accent text-background rounded-br-none' : 'bg-surface-bright text-text-main rounded-bl-none border border-border-color'
                    }`}>
                      {msg.attachmentUrl && (
                        <div className="mb-2 rounded-lg overflow-hidden">
                          {msg.attachmentType === 'image' ? (
                            <img src={msg.attachmentUrl} alt="Anexo" className="max-w-full h-auto max-h-60 object-contain" />
                          ) : (
                            <video src={msg.attachmentUrl} controls className="max-w-full h-auto max-h-60" />
                          )}
                        </div>
                      )}
                      {msg.content && <p className="text-sm break-words">{msg.content}</p>}
                      <p className={`text-[10px] mt-1 text-right ${isMine ? 'text-background/70' : 'text-text-dim'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            )}

            {/* Attachment Preview */}
            {attachment && (
              <div className="absolute bottom-[72px] left-0 right-0 bg-surface border-t border-border-color p-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-text-main">
                  <ImageIcon className="w-4 h-4 text-accent" />
                  <span className="truncate max-w-[200px]">{attachment.name}</span>
                </div>
                <button 
                  onClick={() => { setAttachment(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="text-text-dim hover:text-warning"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            <div className="p-4 border-t border-border-color bg-surface">
              <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                <input 
                  type="file" 
                  accept="image/*,video/*" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-text-dim hover:text-accent transition-colors"
                  title="Anexar foto ou vídeo"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 bg-surface-bright border border-border-color rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent transition-colors"
                />
                <button 
                  type="submit"
                  disabled={(!newMessage.trim() && !attachment) || uploading}
                  className="bg-accent text-background p-2 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center min-w-[40px]"
                >
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-dim">
            Selecione um contato para iniciar a conversa
          </div>
        )}
      </div>
    </div>
  );
}
