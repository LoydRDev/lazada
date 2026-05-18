import { Mail, MessageCircle, X } from 'lucide-react';
import { useState } from 'react';

const MessagesWidget = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="messages-float"
        aria-expanded={isOpen}
        aria-controls="messages-panel"
        onClick={() => setIsOpen(true)}
      >
        <MessageCircle className="h-5 w-5" />
        Messages
      </button>

      {isOpen && (
        <section id="messages-panel" className="messages-panel" aria-label="Messages">
          <header className="messages-panel-header">
            <div>
              <MessageCircle className="h-5 w-5" />
              <span>Messages</span>
            </div>
            <button type="button" aria-label="Close messages" onClick={() => setIsOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="messages-panel-body">
            <aside className="messages-conversation-list" aria-label="Conversations" />
            <div className="messages-empty-state">
              <Mail className="h-12 w-12" />
              <p>Once you start a new conversation, you'll see<br />it listed here.</p>
            </div>
          </div>
        </section>
      )}
    </>
  );
};

export default MessagesWidget;
