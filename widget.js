var CO_BACKEND = 'https://cognitops-chat.onrender.com';
var coMessages = [];
var coIsOpen = false;
var coIsLoading = false;
var coWelcome = 'Hi! I can answer questions about CognitOps or help figure out if it is a good fit for your operation. What would you like to know?';

function coEscape(str) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(str));
    return d.innerHTML;
}

function coAppendMessage(role, text) {
    var el = document.getElementById('co-chat-messages');
    var div = document.createElement('div');
    div.className = 'co-msg ' + role;
    var escaped = coEscape(text);
    var linked = escaped.replace(/https?:\/\/\S+/g, function(url) {
        return '<a href="' + url + '" target="_blank" rel="noopener">Book here</a>';
    });
    div.innerHTML = linked.replace(/\n/g, '<br>');
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
}

function coToggle() {
    coIsOpen = !coIsOpen;
    document.getElementById('co-chat-window').classList.toggle('open', coIsOpen);
    if (coIsOpen && coMessages.length === 0) {
        coAppendMessage('bot', coWelcome);
        coMessages.push({ role: 'assistant', content: coWelcome });
    }
    if (coIsOpen) {
        setTimeout(function() { document.getElementById('co-chat-input').focus(); }, 100);
    }
}

function coSend() {
    if (coIsLoading) return;
    var input = document.getElementById('co-chat-input');
    var text = input.value.trim();
    if (!text) return;
    input.value = '';
    input.style.height = 'auto';
    coAppendMessage('user', text);
    coMessages.push({ role: 'user', content: text });
    coIsLoading = true;
    document.getElementById('co-chat-send').disabled = true;
    var el = document.getElementById('co-chat-messages');
    var typing = document.createElement('div');
    typing.className = 'co-typing';
    typing.id = 'co-typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    el.appendChild(typing);
    el.scrollTop = el.scrollHeight;
    fetch(CO_BACKEND + '/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: coMessages })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
        var t = document.getElementById('co-typing');
        if (t) t.remove();
        var reply = data.content || 'Something went wrong, please try again.';
        coAppendMessage('bot', reply);
        coMessages.push({ role: 'assistant', content: reply });
        coIsLoading = false;
        document.getElementById('co-chat-send').disabled = false;
    })
    .catch(function() {
        var t = document.getElementById('co-typing');
        if (t) t.remove();
        coAppendMessage('bot', 'Connection issue. Book directly at cognitops.com/demo/');
        coIsLoading = false;
        document.getElementById('co-chat-send').disabled = false;
    });
}

function coInit() {
    var btn = document.getElementById('co-chat-btn');
    if (!btn) return;
    btn.addEventListener('click', coToggle);
    document.getElementById('co-chat-close').addEventListener('click', coToggle);
    document.getElementById('co-chat-send').addEventListener('click', coSend);
    document.getElementById('co-chat-input').addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); coSend(); }
    });
    document.getElementById('co-chat-input').addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', coInit);
} else {
    coInit();
}
